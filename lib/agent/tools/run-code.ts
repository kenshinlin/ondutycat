import { tool } from "langchain";
import { z } from "zod";
import vm from "vm";

interface RunCodeOptions {
  code: string;
  input?: Record<string, unknown>;
  timeout?: number;
}

interface RunCodeResult {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTime?: number;
  logs?: string[];
}

/**
 * Execute JavaScript code in a VM context
 */
async function executeInVM(options: RunCodeOptions): Promise<RunCodeResult> {
  const { code, input = {}, timeout = 5000 } = options;
  const startTime = Date.now();
  const logs: string[] = [];

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  try {
    // Intercept console calls to capture output
    console.log = (...args: unknown[]) => {
      logs.push(`[LOG] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
    };
    console.error = (...args: unknown[]) => {
      logs.push(`[ERROR] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
    };
    console.warn = (...args: unknown[]) => {
      logs.push(`[WARN] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
    };

    // Create a custom console for the sandbox
    const sandboxConsole = {
      log: (...args: unknown[]) => {
        logs.push(`[LOG] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
      },
      error: (...args: unknown[]) => {
        logs.push(`[ERROR] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
      },
      warn: (...args: unknown[]) => {
        logs.push(`[WARN] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`);
      },
    };

    // Create a sandbox with fetch function and standard JS APIs
    const sandbox: Record<string, unknown> = {
      INPUT: input,
      console: sandboxConsole,
      fetch: async (url: string, options?: RequestInit) => {
        try {
          const response = await fetch(url, options);
          const text = await response.text();

          // Try to parse as JSON
          let data: unknown = text;
          try {
            data = JSON.parse(text);
          } catch {
            // Keep as text
          }

          return {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            data,
          };
        } catch (error) {
          throw new Error(`Fetch failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      Promise,
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Error,
      Map,
      Set,
      URL,
      URLSearchParams,
      encodeURIComponent,
      decodeURIComponent,
      encodeURI,
      decodeURI,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
    };

    // Create context
    const context = vm.createContext(sandbox);

    // Wrap code in an async IIFE to handle both sync and async code
    const wrappedCode = `
      (async () => {
        try {
          ${code}
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })()
    `;

    // Compile script
    const script = new vm.Script(wrappedCode);

    // Run with timeout using Promise.race for better timeout control
    const timeoutPromise = new Promise<RunCodeResult>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Execution timeout: code took longer than ${timeout}ms`));
      }, timeout);
    });

    const executionPromise = script.runInContext(context, {
      timeout,
      displayErrors: true,
    }) as Promise<RunCodeResult>;

    const result = await Promise.race([executionPromise, timeoutPromise]);

    const executionTime = Date.now() - startTime;

    // If code returned an error result
    if (result && result.success === false) {
      return {
        success: false,
        error: result.error,
        executionTime,
        logs: logs.length > 0 ? logs : undefined,
      };
    }

    // Return successful result with logs
    return {
      success: true,
      result: result || undefined,
      executionTime,
      logs: logs.length > 0 ? logs : undefined,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;

    if (error instanceof Error) {
      // Handle timeout
      if (error.message.includes("timeout")) {
        return {
          success: false,
          error: `Execution timeout: code took longer than ${timeout}ms`,
          executionTime,
          logs: logs.length > 0 ? logs : undefined,
        };
      }

      return {
        success: false,
        error: error.message,
        executionTime,
        logs: logs.length > 0 ? logs : undefined,
      };
    }

    return {
      success: false,
      error: "Unknown error occurred",
      executionTime,
      logs: logs.length > 0 ? logs : undefined,
    };
  } finally {
    // Restore original console
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }
}

/**
 * Tool to execute JavaScript code with fetch support
 */
export const runCodeTool = tool(
  async ({ code, input, timeout }) => {
    const result = await executeInVM({
      code,
      input,
      timeout,
    });

    return JSON.stringify(result, null, 2);
  },
  {
    name: "run_code",
    description: `Execute JavaScript code safely.

This tool runs JavaScript code with following features:
- Execution timeout (default 5000ms)
- Built-in fetch function for HTTP/HTTPS requests
- Access to INPUT object containing provided input data
- Access to standard JavaScript APIs (Promise, JSON, Math, etc.)
- Console output capture

Example usage:
  code: "return INPUT.x + INPUT.y;"
  input: { "x": 5, "y": 3 }
  Result: { "success": true, "result": 8 }

Fetch example:
  code: "const res = await fetch('https://api.example.com/data'); return res.data;"

Use this for:
- Performing calculations or data transformations
- Making HTTP/HTTPS requests to external APIs
- Testing small code snippets
- Processing JSON data`,
    schema: z.object({
      code: z
        .string()
        .describe(
          "The JavaScript code to execute. Can use return statement to output a result. Can be async.",
        ),
      input: z
        .record(z.string(), z.unknown())
        .optional()
        .default({})
        .describe("Input data accessible as INPUT object"),
      timeout: z
        .number()
        .optional()
        .default(5000)
        .describe("Maximum execution time in milliseconds (default: 5000)"),
    }),
  },
);
