"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, FileText, Search, ChevronRight, Loader2, AlertCircle, Plug } from "lucide-react";
import { cn } from "@/utils/utils";

interface Tool {
  id: string;
  name: string;
  description?: string;
  type?: "mcp" | "custom_code";
  config?: Record<string, unknown>;
}

interface MCPTool {
  name: string;
  description: string;
  params: any;
}

interface SOPEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  availableTools?: Tool[];
  useMockApi?: boolean; // Enable mock API for testing
}

// Parse content to HTML with tool highlighting
function parseContentToHtml(content: string): string {
  // Match tool references in format {{Tool Name}} or @Tool Name
  return content.replace(
    /{{([^}]+)}}|@(\S+)/g,
    '<span class="tool-highlight" contenteditable="false">$&</span><span contenteditable="false">&nbsp;</span>',
  );
}

// Convert HTML back to plain text
function htmlToPlainText(html: string): string {
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
}

// Extract plain text value from editor
function extractPlainText(editor: HTMLElement): string {
  const cloned = editor.cloneNode(true) as HTMLElement;
  const toolHighlights = cloned.querySelectorAll(".tool-highlight");
  toolHighlights.forEach((span) => {
    const text = span.textContent || "";
    span.replaceWith(document.createTextNode(text));
  });
  return cloned.textContent || cloned.innerText || "";
}

export function SOPEditor({
  value,
  onChange,
  placeholder,
  error,
  availableTools = [],
  useMockApi = false,
}: SOPEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [toolSearchQuery, setToolSearchQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [selectedMCPTool, setSelectedMCPTool] = useState<Tool | null>(null);
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([]);
  const [isLoadingMcpTools, setIsLoadingMcpTools] = useState(false);
  const [mcpToolError, setMcpToolError] = useState<string | null>(null);
  const [showMcpToolSelector, setShowMcpToolSelector] = useState(false);
  const [mcpSearchQuery, setMcpSearchQuery] = useState("");
  const [isUpdatingFromOutside, setIsUpdatingFromOutside] = useState(false);

  // Sync value with editor content (only when updating from outside, not from tool insertion)
  useEffect(() => {
    if (editorRef.current && !isUpdatingFromOutside) {
      editorRef.current.innerHTML = parseContentToHtml(value);
    }
    setIsUpdatingFromOutside(false);
  }, [value]);

  // Fetch MCP tools for a selected tool
  const fetchMCPTools = useCallback(async (tool: Tool) => {
    setIsLoadingMcpTools(true);
    setMcpToolError(null);
    setShowMcpToolSelector(true);

    try {
      // Use mock API for testing if enabled
      const apiUrl = useMockApi
        ? `/api/mcp-tools-mock?tool_id=${tool.id}`
        : `/api/mcp-tools?tool_id=${tool.id}`;

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch MCP tools");
      }

      setMcpTools(data.tools || []);
    } catch (err) {
      setMcpToolError(err instanceof Error ? err.message : "Failed to fetch MCP tools");
      setMcpTools([]);
    } finally {
      setIsLoadingMcpTools(false);
    }
  }, [useMockApi]);

  // Handle input changes
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;

    const text = extractPlainText(editorRef.current);
    onChange(text);

    // Check if we should show tool selector
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const textBeforeCursor = text.substring(0, range.startOffset);

      // Check if user typed @ or / at the start of a line or after space
      const match = textBeforeCursor.match(/[@/]([a-zA-Z0-9_-]*)$/);

      if (match) {
        setToolSearchQuery(match[1]);
        const rect = range.getBoundingClientRect();
        setCursorPosition({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX,
        });
        setShowToolSelector(true);
      } else {
        setShowToolSelector(false);
      }
    }
  }, [onChange]);

  // Insert tool name into editor
  const insertToolName = (toolName: string) => {
    if (!editorRef.current) return;

    // Get current text content
    const text = extractPlainText(editorRef.current);

    // Find the last occurrence of @ or / trigger
    const lastTriggerIndex = Math.max(
      text.lastIndexOf('@'),
      text.lastIndexOf('/')
    );

    let newText: string;
    if (lastTriggerIndex === -1) {
      // No trigger found, just append at end
      newText = text + `{{${toolName}}} `;
    } else {
      // Replace from trigger to end with tool name
      const beforeTrigger = text.substring(0, lastTriggerIndex);
      newText = beforeTrigger + `{{${toolName}}} `;
    }

    // Prevent useEffect from overwriting our manual update
    setIsUpdatingFromOutside(true);

    // Update parent component state
    onChange(newText);

    // Immediately update editor content with highlighting
    editorRef.current!.innerHTML = parseContentToHtml(newText);

    // Move cursor to end of editor
    setTimeout(() => {
      const selection = window.getSelection();
      const newRange = document.createRange();
      newRange.selectNodeContents(editorRef.current!);
      newRange.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(newRange);
    }, 0);

    setToolSearchQuery("");
  };

  // Handle tool selection from the first popup
  const handleSelectTool = (tool: Tool) => {
    if (tool.type === "mcp") {
      // For MCP tools, fetch available tools and show second popup
      setSelectedMCPTool(tool);
      fetchMCPTools(tool);
      setShowToolSelector(false);
    } else {
      // For non-MCP tools, insert directly
      insertToolName(tool.name);
      setShowToolSelector(false);
      setToolSearchQuery("");
    }
  };

  // Handle MCP tool selection from the second popup
  const handleSelectMCPTool = (mcpTool: MCPTool) => {
    // Get MCP server name from config
    const mcpServers = (selectedMCPTool?.config as any)?.mcpServers || {};
    const serverName = Object.keys(mcpServers)[0] || selectedMCPTool?.name || "mcp";

    // Format as <server_name>.<tool_name>
    const toolName = `${serverName}.${mcpTool.name}`;
    insertToolName(toolName);

    setShowMcpToolSelector(false);
    setSelectedMCPTool(null);
    setMcpTools([]);
    setMcpToolError(null);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (showMcpToolSelector) {
        setShowMcpToolSelector(false);
        setSelectedMCPTool(null);
        setMcpTools([]);
        setMcpToolError(null);
        e.preventDefault();
      } else if (showToolSelector) {
        setShowToolSelector(false);
        e.preventDefault();
      }
    }
  };

  // Filter tools based on search query
  const filteredTools = availableTools.filter((tool) =>
    tool.name.toLowerCase().includes(toolSearchQuery.toLowerCase()),
  );

  // Default mock tools if none provided
  const displayTools =
    availableTools.length > 0
      ? filteredTools
      : [
          {
            id: "1",
            name: "Prometheus_Query",
            description: "Query Prometheus metrics",
          },
          {
            id: "2",
            name: "Database_Health_Check",
            description: "Check database status",
          },
          { id: "3", name: "Log_Analyzer", description: "Analyze log files", type: "mcp" as const },
          {
            id: "4",
            name: "API_Check",
            description: "Check API endpoint health",
          },
          {
            id: "5",
            name: "Network_Diagnostic",
            description: "Run network diagnostics",
          },
        ].filter((tool) =>
          tool.name.toLowerCase().includes(toolSearchQuery.toLowerCase()),
        );

  // Filter MCP tools based on search query
  const filteredMcpTools = mcpTools.filter((tool) =>
    tool.name.toLowerCase().includes(mcpSearchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(mcpSearchQuery.toLowerCase())
  );

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-card-foreground">
          Standard Operating Procedure (SOP){" "}
          <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileText className="w-3.5 h-3.5" />
          <span>Type / or @ to insert tools</span>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning
        className={cn(
          "w-full min-h-[400px] px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono whitespace-pre-wrap",
          error ? "border-red-500" : "border-border",
        )}
        style={{ outline: "none" }}
        data-placeholder={
          placeholder ||
          "Define the step-by-step procedure... Type / or @ to insert tools"
        }
      />

      {/* Custom placeholder */}
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .tool-highlight {
          background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
          color: #1e40af;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
          font-size: 0.875rem;
          display: inline-block;
          margin: 0 2px;
        }
      `}</style>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <X className="w-3 h-3" />
          {error}
        </p>
      )}

      {/* Tool Selector Popup */}
      {showToolSelector && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowToolSelector(false)}
          />

          {/* Popup */}
          <div
            className="fixed z-50 w-72 bg-white rounded-lg shadow-xl border border-border overflow-hidden animate-scale-in"
            style={{
              top: cursorPosition?.top || 0,
              left: cursorPosition?.left || 0,
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-gray-50">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={toolSearchQuery}
                onChange={(e) => setToolSearchQuery(e.target.value)}
                placeholder="Search tools..."
                className="flex-1 bg-transparent border-none text-sm focus:outline-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Tool List */}
            <div className="max-h-64 overflow-y-auto">
              {displayTools.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No tools found
                </div>
              ) : (
                displayTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => handleSelectTool(tool)}
                    className="w-full px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {tool.type === "mcp" && (
                          <Plug className="w-3.5 h-3.5 text-blue-500" />
                        )}
                        <div className="text-sm font-medium text-card-foreground">
                          {tool.name}
                        </div>
                      </div>
                      {tool.type === "mcp" && (
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      )}
                    </div>
                    {tool.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 ml-6">
                        {tool.description}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="px-3 py-1.5 bg-gray-50 border-t border-border text-xs text-muted-foreground">
              Use ↑↓ to navigate, Enter to select, Esc to close
            </div>
          </div>
        </>
      )}

      {/* MCP Tool Selector Popup */}
      {showMcpToolSelector && selectedMCPTool && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setShowMcpToolSelector(false);
              setSelectedMCPTool(null);
              setMcpTools([]);
              setMcpToolError(null);
            }}
          />

          {/* Popup */}
          <div
            className="fixed z-50 w-96 bg-white rounded-lg shadow-xl border border-border overflow-hidden animate-scale-in"
            style={{
              top: cursorPosition?.top || 0,
              left: cursorPosition?.left || 0,
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-blue-50">
              <Plug className="w-4 h-4 text-blue-600" />
              <div className="flex-1">
                <input
                  type="text"
                  value={mcpSearchQuery}
                  onChange={(e) => setMcpSearchQuery(e.target.value)}
                  placeholder={`Search ${selectedMCPTool.name} tools...`}
                  className="w-full bg-transparent border-none text-sm focus:outline-none font-medium text-blue-900"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              {isLoadingMcpTools && (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              )}
            </div>

            {/* Tool List */}
            <div className="max-h-64 overflow-y-auto">
              {isLoadingMcpTools ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading MCP tools...</span>
                </div>
              ) : mcpToolError ? (
                <div className="px-3 py-8 text-center text-sm text-red-600 flex flex-col items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>{mcpToolError}</span>
                </div>
              ) : filteredMcpTools.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {mcpSearchQuery ? "No matching tools found" : "No MCP tools available"}
                </div>
              ) : (
                filteredMcpTools.map((mcpTool, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectMCPTool(mcpTool)}
                    className="w-full px-3 py-2.5 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors group"
                  >
                    <div className="text-sm font-medium text-card-foreground group-hover:text-blue-700 transition-colors">
                      {mcpTool.name}
                    </div>
                    {mcpTool.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {mcpTool.description}
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
        </>
      )}
    </div>
  );
}
