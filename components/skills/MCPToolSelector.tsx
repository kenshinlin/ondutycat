"use client";

import { useState } from "react";
import { ChevronRight, Loader2, AlertCircle, Plug } from "lucide-react";
import { cn } from "@/utils/utils";

interface MCPTool {
  name: string;
  description: string;
  params: any;
}

interface Tool {
  id: string;
  name: string;
  description?: string;
  type?: "mcp" | "custom_code";
  config?: Record<string, unknown>;
}

interface MCPToolSelectorProps {
  mcpTools: MCPTool[];
  isLoading: boolean;
  error: string | null;
  selectedMCPTool: Tool | null;
  onSelectTool: (tool: MCPTool) => void;
  onBack: () => void;
  position: { top: number; left: number } | null;
}

// Second level MCP tool selector - shows available tools from selected MCP server
export function MCPToolSelector({
  mcpTools,
  isLoading,
  error,
  selectedMCPTool,
  onSelectTool,
  onBack,
  position,
}: MCPToolSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMcpTools = mcpTools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelectTool = (tool: MCPTool) => {
    onSelectTool(tool);
    setSearchQuery("");
  };

  const handleBack = () => {
    onBack();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onBack} />

      {/* Popup */}
      <div
        className="fixed z-50 w-96 bg-white rounded-lg shadow-xl border border-border overflow-hidden animate-scale-in"
        style={{
          top: position?.top || 0,
          left: position?.left || 0,
        }}
      >
        {/* Header */}
        <div className="flex flex-col">
          <div className="flex gap-2 items-center p-2 border-b border-border bg-blue-50">
            <Plug className="w-4 h-4 text-blue-600" />
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${selectedMCPTool?.name || "MCP"} tools...`}
                className="flex-1 bg-transparent border-none text-sm focus:outline-none font-medium text-blue-900"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          {isLoading && <div className="w-4 h-4" />}

          {/* Tool List */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading MCP tools...</span>
              </div>
            ) : error ? (
              <div className="px-3 py-8 text-center text-sm text-red-600 flex flex-col items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            ) : filteredMcpTools.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                {searchQuery
                  ? "No matching tools found"
                  : "No MCP tools available"}
              </div>
            ) : (
              filteredMcpTools.map((tool, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectTool(tool)}
                  className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors group"
                >
                  <div className="text-sm font-medium text-card-foreground group-hover:text-blue-700 transition-colors">
                    {tool.name}
                  </div>
                  {tool.description && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {tool.description}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer hint */}
          <div className="px-3 py-1.5 bg-blue-50 border-t border-border text-xs text-blue-700">
            Select an MCP tool to insert as {`<server>.<tool>`}
          </div>
        </div>
      </div>
    </>
  );
}
