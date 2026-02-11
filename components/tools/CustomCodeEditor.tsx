'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Check, Play, Code2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomCodeEditorProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  error?: string;
}

const defaultCode = `/**
 * Tool execution function
 * @param {Object} params - The parameters passed to the tool
 * @returns {Promise<Object>} The result of the tool execution
 */
async function execute(params) {
  const { param1, param2 } = params;

  // Your custom logic here
  // You can use fetch() for HTTP requests
  // You can use console.log() for debugging

  return {
    success: true,
    data: {
      message: "Tool executed successfully",
      // Add your result data here
    }
  };
}`;

const codeExamples = [
  {
    name: 'HTTP Request',
    code: `async function execute(params) {
  const { url, method = 'GET', body } = params;

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  return {
    success: response.ok,
    status: response.status,
    data
  };
}`,
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to request' },
        method: { type: 'string', description: 'HTTP method (GET, POST, etc.)' },
        body: { type: 'object', description: 'Request body for POST/PUT' },
      },
      required: ['url'],
    },
  },
  {
    name: 'Database Query',
    code: `async function execute(params) {
  const { query, parameters = [] } = params;

  // Note: In production, use proper database client
  // This is a simplified example

  console.log('Executing query:', query);
  console.log('Parameters:', parameters);

  // Simulate database query
  const results = [];

  return {
    success: true,
    rowCount: results.length,
    rows: results
  };
}`,
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'SQL query to execute' },
        parameters: { type: 'array', description: 'Query parameters' },
      },
      required: ['query'],
    },
  },
  {
    name: 'Log Analysis',
    code: `async function execute(params) {
  const { logContent, pattern } = params;

  // Search for pattern in logs
  const lines = logContent.split('\\n');
  const matches = lines.filter(line => line.includes(pattern));

  // Extract timestamps and error levels
  const errors = matches.map(line => {
    const timestampMatch = line.match(/\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}:\\d{2}/);
    return {
      timestamp: timestampMatch ? timestampMatch[0] : null,
      message: line
    };
  });

  return {
    success: true,
    matchCount: matches.length,
    errors
  };
}`,
    parameters: {
      type: 'object',
      properties: {
        logContent: { type: 'string', description: 'Log content to analyze' },
        pattern: { type: 'string', description: 'Pattern to search for' },
      },
      required: ['logContent', 'pattern'],
    },
  },
];

export function CustomCodeEditor({ config, onChange, error }: CustomCodeEditorProps) {
  const [code, setCode] = useState<string>((config.code as string) || '');
  const [parameters, setParameters] = useState<string>(
    config.parameters ? JSON.stringify(config.parameters, null, 2) : ''
  );
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (config.code) {
      setCode(config.code as string);
    }
    if (config.parameters) {
      setParameters(JSON.stringify(config.parameters, null, 2));
    }
  }, [config]);

  const handleCodeChange = (value: string) => {
    setCode(value);
    updateConfig(value, parameters);
  };

  const handleParametersChange = (value: string) => {
    setParameters(value);
    updateConfig(code, value);
  };

  const updateConfig = (codeValue: string, paramsValue: string) => {
    setParseError(null);

    let parsedParams = null;
    if (paramsValue.trim()) {
      try {
        parsedParams = JSON.parse(paramsValue);
      } catch {
        setParseError('Invalid parameters JSON');
        return;
      }
    }

    onChange({
      code: codeValue,
      parameters: parsedParams,
    });
  };

  const handleExampleClick = (example: (typeof codeExamples)[0]) => {
    setCode(example.code);
    setParameters(JSON.stringify(example.parameters, null, 2));
    setParseError(null);
    onChange({
      code: example.code,
      parameters: example.parameters,
    });
  };

  const handleInsertDefault = () => {
    handleCodeChange(defaultCode);
  };

  return (
    <div className="space-y-4">
      {/* Examples */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">
          Code Templates (click to use)
        </label>
        <div className="flex flex-wrap gap-2">
          {codeExamples.map((example) => (
            <button
              key={example.name}
              type="button"
              onClick={() => handleExampleClick(example)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium text-card-foreground hover:bg-accent hover:border-primary/50 transition-all"
            >
              <Code2 className="w-3 h-3" />
              {example.name}
            </button>
          ))}
        </div>
      </div>

      {/* Code Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-muted-foreground">
            JavaScript Code <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={handleInsertDefault}
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            Insert Template
          </button>
        </div>
        <div
          className={cn(
            'relative rounded-lg border bg-background overflow-hidden',
            error ? 'border-red-500' : 'border-border'
          )}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-gray-50/50">
            <span className="text-xs font-mono text-muted-foreground">JavaScript</span>
            {code && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Code entered
              </span>
            )}
          </div>
          <textarea
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder={defaultCode}
            rows={20}
            className="w-full px-3 py-3 bg-background text-sm font-mono focus:outline-none resize-none"
            spellCheck={false}
          />
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>

      {/* Parameters Schema */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-muted-foreground">
            Parameters Schema (JSON Schema)
          </label>
        </div>
        <div
          className={cn(
            'relative rounded-lg border bg-background overflow-hidden',
            parseError ? 'border-red-500' : 'border-border'
          )}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-gray-50/50">
            <span className="text-xs font-mono text-muted-foreground">JSON Schema</span>
            {parameters && !parseError && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Valid Schema
              </span>
            )}
            {parseError && (
              <span className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {parseError}
              </span>
            )}
          </div>
          <textarea
            value={parameters}
            onChange={(e) => handleParametersChange(e.target.value)}
            placeholder={`{
  "type": "object",
  "properties": {
    "param1": { "type": "string", "description": "Parameter description" }
  },
  "required": ["param1"]
}`}
            rows={12}
            className="w-full px-3 py-3 bg-background text-sm font-mono focus:outline-none resize-none"
            spellCheck={false}
          />
        </div>
      </div>

      {/* Help Info */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex gap-2">
          <Info className="w-4 h-4 text-amber-600 flex-none mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p>
              <strong>Sandbox Environment:</strong> Your code runs in a secure sandbox with access
              to:
            </p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>
                <code className="bg-amber-100 px-1 rounded">fetch()</code> - Make HTTP requests
              </li>
              <li>
                <code className="bg-amber-100 px-1 rounded">console.log()</code> - Debug output
              </li>
              <li>
                <code className="bg-amber-100 px-1 rounded">params</code> - Input parameters object
              </li>
            </ul>
            <p className="mt-2">
              <strong>Note:</strong> The function must be named <code className="bg-amber-100 px-1 rounded">execute</code> and return a
              Promise.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
