import { tool } from "langchain";
import { z } from "zod";

interface RunCodeOptions {
  code: string;
  input?: Record<string, unknown>;
  timeout?: number;
  memoryLimit?: number;
  enableFetch?: boolean;
}

interface RunCodeResult {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTime?: number;
}

/**
 * Safely execute JavaScript code in an isolated VM environment
 * Uses v8-sandbox to prevent code from affecting the main process
 */
async function executeInV8Sandbox(
  options: RunCodeOptions,
): Promise<RunCodeResult> {
  const {
    code,
    input = {},
    timeout = 5000,
    memoryLimit = 128,
    enableFetch = true,
  } = options;

  // Dynamic import of v8-sandbox (installed via pkg)
  const Sandbox = (await import("v8-sandbox")).default;

  let sandbox: InstanceType<typeof Sandbox> | null = null;

  try {
    // Create sandbox instance with memory limit and fetch enabled
    sandbox = new Sandbox({
      httpEnabled: enableFetch,
      timersEnabled: true,
      memory: memoryLimit,
    });

    // Prepare globals - include INPUT as the input parameter
    const globals: Record<string, unknown> = {
      INPUT: input,
    };

    // Build the sandbox code
    // v8-sandbox requires setResult({ value, error }) to return results
    let sandboxCode = `
      (function() {
        try {
          var tool = ${code};
          var result = tool(INPUT);

          // Handle promises
          if (result && typeof result.then === 'function') {
            result.then(function(r) {
              setResult({ value: { success: true, result: r } });
            }).catch(function(error) {
              setResult({ value: { success: false, error: error.message || String(error) } });
            });
          } else {
            setResult({ value: { success: true, result: result } });
          }
        } catch (error) {
          setResult({ value: { success: false, error: error.message || String(error) } });
        }
      })();
    `;

    const startTime = Date.now();
    const executionResult = await sandbox.execute({
      code: sandboxCode,
      timeout,
      globals,
    });
    const executionTime = Date.now() - startTime;

    // Shutdown the sandbox
    await sandbox.shutdown();
    sandbox = null;

    // Check for execution errors
    if (executionResult.error) {
      return {
        success: false,
        error: String(executionResult.error),
        executionTime,
      };
    }

    // Return the value (which contains our success/result/error object)
    return {
      ...(executionResult.value as RunCodeResult),
      executionTime,
    };
  } catch (error) {
    // Clean up sandbox if it still exists
    if (sandbox) {
      try {
        await sandbox.shutdown();
      } catch {
        // Ignore cleanup errors
      }
    }

    if (error instanceof Error) {
      // Handle common v8-sandbox errors
      if (error.message.includes("timeout")) {
        return {
          success: false,
          error: `Execution timeout: code took longer than ${timeout}ms`,
        };
      }

      if (error.message.includes("memory")) {
        return {
          success: false,
          error: `Memory limit exceeded: ${memoryLimit}MB`,
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Unknown error occurred",
    };
  }
}

/**
 * Tool to safely execute JavaScript code in an isolated environment
 */
export const runCodeTool = tool(
  async ({ code, input, timeout, memoryLimit, enableFetch }, config) => {
    const result = await executeInV8Sandbox({
      code,
      input,
      timeout,
      memoryLimit,
      enableFetch,
    });

    return JSON.stringify(result, null, 2);
  },
  {
    name: "run_code",
    description: `Execute JavaScript code in a secure, isolated VM environment.

This tool runs JavaScript code safely with the following constraints:
- Memory limit (default 128MB)
- Execution timeout (default 5000ms)
- Optional fetch support for HTTP/HTTPS requests (enabled by default)
- No access to file system or main process globals
- Only has access to the provided INPUT object and fetch function

The code should be a function that takes INPUT as its parameter and returns a result.

Example usage:
  code: "(input) => { return input.x + input.y; }"
  input: { "x": 5, "y": 3 }
  Result: { "success": true, "result": 8 }

Fetch example:
  code: "(input) => { const response = await fetch('https://api.example.com/data'); return response.data; }"
  Note: response has {ok, status, statusText, headers, data} properties

Use this for:
- Performing calculations or data transformations
- Validating or processing user input
- Making HTTP/HTTPS requests to external APIs
- Testing small code snippets
- Running untrusted code safely

Do NOT use for:
- File operations (not supported)
- Requests to non-HTTP/non-HTTPS endpoints (blocked)
- Long-running operations (will timeout)`,
    schema: z.object({
      code: z
        .string()
        .describe(
          "The JavaScript code to execute. Should be a function that accepts INPUT as a parameter. Can be async.",
        ),
      input: z
        .record(z.string(), z.unknown())
        .optional()
        .default({})
        .describe("Input data to pass to the code function"),
      timeout: z
        .number()
        .optional()
        .default(5000)
        .describe("Maximum execution time in milliseconds (default: 5000)"),
      memoryLimit: z
        .number()
        .optional()
        .default(128)
        .describe("Memory limit in MB (default: 128)"),
      enableFetch: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          "Enable fetch function for HTTP/HTTPS requests (default: true)",
        ),
    }),
  },
);
