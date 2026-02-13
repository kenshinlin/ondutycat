"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, FileText } from "lucide-react";
import { cn } from "@/utils/utils";
import { ToolSelector } from "./ToolSelector";
import { MCPToolSelector } from "./MCPToolSelector";

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
  const [isUpdatingFromOutside, setIsUpdatingFromOutside] = useState(false);

  // Sync value with editor content (only when updating from outside, not from tool insertion)
  useEffect(() => {
    if (editorRef.current && !isUpdatingFromOutside) {
      editorRef.current.innerHTML = parseContentToHtml(value);
    }
    setIsUpdatingFromOutside(false);
  }, [value]);

  // Fetch MCP tools for a selected tool
  const fetchMCPTools = useCallback(
    async (tool: Tool) => {
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
        setMcpToolError(
          err instanceof Error ? err.message : "Failed to fetch MCP tools",
        );
        setMcpTools([]);
      } finally {
        setIsLoadingMcpTools(false);
      }
    },
    [useMockApi],
  );

  // Handle input changes
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;

    // Check if we should show tool selector (only check, don't update text)
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);

      // Get text content before cursor using a range-based approach
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(editorRef.current);
      preCaretRange.setEnd(range.endContainer, range.endOffset);

      const textBeforeCursor = extractPlainText(preCaretRange.cloneContents(true) as HTMLElement);

      // Check if user typed @ or / at start of a line or after space
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
      text.lastIndexOf("@"),
      text.lastIndexOf("/"),
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
    const serverName =
      Object.keys(mcpServers)[0] || selectedMCPTool?.name || "mcp";

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
          {
            id: "3",
            name: "Log_Analyzer",
            description: "Analyze log files",
            type: "mcp" as const,
          },
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
        <ToolSelector
          tools={displayTools}
          selectedToolId={null}
          onSelectTool={handleSelectTool}
          position={cursorPosition}
          onClose={() => {
            setShowToolSelector(false);
            setToolSearchQuery("");
          }}
        />
      )}

      {/* MCP Tool Selector Popup */}
      {showMcpToolSelector && selectedMCPTool && (
        <MCPToolSelector
          mcpTools={mcpTools}
          isLoading={isLoadingMcpTools}
          error={mcpToolError}
          selectedMCPTool={selectedMCPTool}
          onSelectTool={handleSelectMCPTool}
          onBack={() => {
            setShowMcpToolSelector(false);
            setSelectedMCPTool(null);
            setMcpTools([]);
            setMcpToolError(null);
          }}
          position={cursorPosition}
        />
      )}
    </div>
  );
}
