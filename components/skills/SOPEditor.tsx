"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, FileText, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tool {
  id: string;
  name: string;
  description?: string;
}

interface SOPEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  availableTools?: Tool[];
}

// Parse content to HTML with tool highlighting
function parseContentToHtml(content: string): string {
  // Match tool references in format {{Tool Name}} or @Tool Name
  return content.replace(
    /{{([^}]+)}}|@(\S+)/g,
    '<span class="tool-highlight" contenteditable="false">$&</span><span contenteditable="false">&nbsp;</span>'
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

export function SOPEditor({ value, onChange, placeholder, error, availableTools = [] }: SOPEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [toolSearchQuery, setToolSearchQuery] = useState("");
  const [cursorPosition, setCursorPosition] = useState<{ top: number; left: number } | null>(null);

  // Sync value with editor content
  useEffect(() => {
    if (editorRef.current && !document.activeElement?.contains(editorRef.current)) {
      editorRef.current.innerHTML = parseContentToHtml(value);
    }
  }, [value]);

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

  // Handle tool selection
  const handleSelectTool = (tool: Tool) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const text = extractPlainText(editorRef.current);

      // Find the position of @ or /
      const beforeCursor = text.substring(0, range.startOffset);
      const triggerMatch = beforeCursor.match(/[@/]([a-zA-Z0-9_-]*)$/);

      if (triggerMatch) {
        // Remove the trigger and typed text
        const newText = text.substring(0, triggerMatch.index) + `{{${tool.name}}} ` + text.substring(range.startOffset);
        onChange(newText);

        // Update editor content
        editorRef.current.innerHTML = parseContentToHtml(newText);

        // Move cursor to end of inserted tool
        const newRange = document.createRange();
        const toolSpans = editorRef.current.querySelectorAll(".tool-highlight");
        const lastToolSpan = toolSpans[toolSpans.length - 1];

        if (lastToolSpan && lastToolSpan.nextSibling) {
          newRange.setStartAfter(lastToolSpan.nextSibling as Node);
          newRange.collapse(true);
        } else {
          newRange.setStart(editorRef.current, editorRef.current.childNodes.length);
          newRange.collapse(true);
        }

        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    }

    setShowToolSelector(false);
    setToolSearchQuery("");
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && showToolSelector) {
      setShowToolSelector(false);
      e.preventDefault();
    }
  };

  // Filter tools based on search query
  const filteredTools = availableTools.filter((tool) =>
    tool.name.toLowerCase().includes(toolSearchQuery.toLowerCase())
  );

  // Default mock tools if none provided
  const displayTools = availableTools.length > 0 ? filteredTools : [
    { id: "1", name: "Prometheus_Query", description: "Query Prometheus metrics" },
    { id: "2", name: "Database_Health_Check", description: "Check database status" },
    { id: "3", name: "Log_Analyzer", description: "Analyze log files" },
    { id: "4", name: "API_Check", description: "Check API endpoint health" },
    { id: "5", name: "Network_Diagnostic", description: "Run network diagnostics" },
  ].filter(tool => tool.name.toLowerCase().includes(toolSearchQuery.toLowerCase()));

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium text-card-foreground">
          Standard Operating Procedure (SOP) <span className="text-red-500">*</span>
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
          "w-full min-h-[200px] px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono whitespace-pre-wrap",
          error ? "border-red-500" : "border-border",
        )}
        style={{ outline: "none" }}
        data-placeholder={placeholder || "Define the step-by-step procedure... Type / or @ to insert tools"}
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
                displayTools.map((tool, index) => (
                  <button
                    key={tool.id}
                    onClick={() => handleSelectTool(tool)}
                    className="w-full px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="text-sm font-medium text-card-foreground">
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
            <div className="px-3 py-1.5 bg-gray-50 border-t border-border text-xs text-muted-foreground">
              Use ↑↓ to navigate, Enter to select, Esc to close
            </div>
          </div>
        </>
      )}
    </div>
  );
}
