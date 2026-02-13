"use client";

import { useState, useEffect, useRef } from "react";
import { Search, ChevronRight, Plug } from "lucide-react";
import { cn } from "@/utils/utils";

interface Tool {
  id: string;
  name: string;
  description?: string;
  type?: "mcp" | "custom_code";
  config?: Record<string, unknown>;
}

interface ToolSelectorProps {
  tools: Tool[];
  selectedToolId: string | null;
  onSelectTool: (tool: Tool) => void;
  position: { top: number; left: number } | null;
  onClose: () => void;
}

// First level tool selector - shows all available tools
export function ToolSelector({
  tools,
  selectedToolId,
  onSelectTool,
  position,
  onClose,
}: ToolSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredTools = tools.filter((tool) =>
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Reset selected index when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const handleSelectTool = (tool: Tool) => {
    onSelectTool(tool);
    setSearchQuery("");
    onClose();
  };

  // Scroll selected item into view
  useEffect(() => {
    if (containerRef.current) {
      const selectedButton = containerRef.current.children[
        selectedIndex
      ] as HTMLButtonElement;
      if (selectedButton) {
        selectedButton.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Popup */}
      <div
        className="fixed z-50 w-80 bg-white rounded-lg shadow-xl border border-border overflow-hidden animate-scale-in"
        style={{
          top: position?.top || 0,
          left: position?.left || 0,
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-gray-50">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              // Prevent default behavior for navigation keys
              if (["ArrowUp", "ArrowDown", "Escape"].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
              }
              console.log("handleKeydown", e.key, e);
              if (filteredTools.length === 0) return;

              switch (e.key) {
                case "ArrowDown":
                  setSelectedIndex((prev) =>
                    prev < filteredTools.length - 1 ? prev + 1 : prev,
                  );
                  break;
                case "ArrowUp":
                  setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                  break;
                case "Enter":
                  if (filteredTools[selectedIndex]) {
                    handleSelectTool(filteredTools[selectedIndex]);
                  }
                  break;
                case "Escape":
                  onClose();
                  break;
              }
            }}
            placeholder="Search tools..."
            className="flex-1 bg-transparent border-none text-sm focus:outline-none"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Tool List */}
        <div ref={containerRef} className="max-h-64 overflow-y-auto">
          {filteredTools.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No tools found
            </div>
          ) : (
            filteredTools.map((tool, index) => (
              <button
                key={tool.id}
                onClick={() => handleSelectTool(tool)}
                style={{
                  ...(selectedIndex === index
                    ? {
                        backgroundColor: "#ddd",
                      }
                    : null),
                }}
                className="hover:bg-gray-50 w-full px-2 py-1.5 text-left border-b border-gray-100 last:border-b-0 transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* {tool.type === "mcp" && (
                      <Plug className="w-3.5 h-3.5 text-blue-500" />
                    )} */}
                    <div className="text-card-foreground min-w-0 flex-1">
                      <div className="font-medium text-sm">{tool.name}</div>
                      <div
                        className="truncate text-xs"
                        title={tool.description}
                      >
                        {tool.description}
                      </div>
                    </div>
                  </div>
                  {tool.type === "mcp" && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </div>
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
  );
}
