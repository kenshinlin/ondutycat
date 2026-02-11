'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, FileJson, Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MCPConfigFormProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  error?: string;
}

const defaultMCPConfig = `{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-example"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}`;

const mcpExamples = [
  {
    name: 'Prometheus',
    config: `{
  "mcpServers": {
    "prometheus": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-prometheus"],
      "env": {
        "PROMETHEUS_URL": "http://localhost:9090"
      }
    }
  }
}`,
  },
  {
    name: 'Filesystem',
    config: `{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-filesystem", "/path/to/allowed/dir"]
    }
  }
}`,
  },
  {
    name: 'PostgreSQL',
    config: `{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://user:pass@localhost:5432/db"
      }
    }
  }
}`,
  },
];

export function MCPConfigForm({ config, onChange, error }: MCPConfigFormProps) {
  const [jsonInput, setJsonInput] = useState<string>(
    config.mcpConfig ? JSON.stringify(config.mcpConfig, null, 2) : ''
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [copiedExample, setCopiedExample] = useState<string | null>(null);

  useEffect(() => {
    if (config.mcpConfig) {
      setJsonInput(JSON.stringify(config.mcpConfig, null, 2));
    }
  }, [config.mcpConfig]);

  const handleJsonChange = (value: string) => {
    setJsonInput(value);
    setParseError(null);

    if (!value.trim()) {
      onChange({ mcpConfig: null });
      return;
    }

    try {
      const parsed = JSON.parse(value);
      onChange({ mcpConfig: parsed });
    } catch {
      setParseError('Invalid JSON format');
      onChange({ mcpConfig: null });
    }
  };

  const handleExampleClick = (example: (typeof mcpExamples)[0]) => {
    setJsonInput(example.config);
    setParseError(null);
    try {
      const parsed = JSON.parse(example.config);
      onChange({ mcpConfig: parsed });
    } catch {
      setParseError('Invalid JSON format');
    }
  };

  const handleCopyExample = async (example: (typeof mcpExamples)[0], e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(example.config);
      setCopiedExample(example.name);
      setTimeout(() => setCopiedExample(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleInsertDefault = () => {
    handleJsonChange(defaultMCPConfig);
  };

  return (
    <div className="space-y-4">
      {/* Examples */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-2">
          Quick Examples (click to use)
        </label>
        <div className="flex flex-wrap gap-2">
          {mcpExamples.map((example) => (
            <div
              key={example.name}
              onClick={() => handleExampleClick(example)}
              className="group flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-medium text-card-foreground hover:bg-accent hover:border-primary/50 transition-all cursor-pointer"
            >
              <FileJson className="w-3 h-3" />
              {example.name}
              <button
                type="button"
                onClick={(e) => handleCopyExample(example, e)}
                className="p-0.5 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Copy to clipboard"
              >
                {copiedExample === example.name ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <Copy className="w-3 h-3 text-muted-foreground" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* JSON Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-muted-foreground">
            MCP Configuration JSON
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
            error || parseError ? 'border-red-500' : 'border-border'
          )}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-gray-50/50">
            <span className="text-xs font-mono text-muted-foreground">JSON</span>
            {jsonInput && !parseError && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Valid JSON
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
            value={jsonInput}
            onChange={(e) => handleJsonChange(e.target.value)}
            placeholder={defaultMCPConfig}
            rows={12}
            className="w-full px-3 py-3 bg-background text-sm font-mono focus:outline-none resize-none"
            spellCheck={false}
          />
        </div>
        {(error || parseError) && (
          <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error || parseError}
          </p>
        )}
      </div>

      {/* Help Text */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>MCP (Model Context Protocol)</strong> allows you to connect external tools and
          servers. Enter your MCP server configuration in JSON format following the Claude Desktop
          configuration structure.
        </p>
      </div>
    </div>
  );
}
