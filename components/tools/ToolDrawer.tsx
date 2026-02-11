"use client";

import { useState, useEffect } from "react";
import { Plug, Code2, AlertCircle, Wrench } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter } from "@/components/ui/Drawer";
import { MCPConfigForm } from "./MCPConfigForm";
import { CustomCodeEditor } from "./CustomCodeEditor";
import { cn } from "@/lib/utils";

type ToolType = "mcp" | "custom_code";
type ToolStatus = "active" | "inactive";

interface Tool {
  id: string;
  name: string;
  description?: string;
  type: ToolType;
  config: Record<string, unknown>;
  status: ToolStatus;
}

interface ToolDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tool: Partial<Tool>) => void;
  tool?: Tool | null;
}

interface FormData {
  name: string;
  description: string;
  type: ToolType;
  config: Record<string, unknown>;
  status: ToolStatus;
}

const initialFormData: FormData = {
  name: "",
  description: "",
  type: "mcp",
  config: {},
  status: "active",
};

export function ToolDrawer({ isOpen, onClose, onSave, tool }: ToolDrawerProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");

  useEffect(() => {
    if (tool) {
      setFormData({
        name: tool.name,
        description: tool.description || "",
        type: tool.type,
        config: tool.config,
        status: tool.status,
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
    setActiveTab("form");
  }, [tool, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Tool name is required";
    }

    if (formData.type === "mcp") {
      if (!formData.config.mcpConfig) {
        newErrors.config = "MCP configuration is required";
      }
    } else if (formData.type === "custom_code") {
      if (!formData.config.code) {
        newErrors.config = "Code is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    onSave({
      id: tool?.id,
      ...formData,
    });
  };

  const handleConfigChange = (config: Record<string, unknown>) => {
    setFormData((prev) => ({ ...prev, config }));
    if (errors.config) {
      setErrors((prev) => ({ ...prev, config: "" }));
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={tool ? "Edit Tool" : "Create New Tool"}
      description="Configure a tool for AI agents to use during alert processing"
      icon={
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <Wrench className="w-5 h-5 text-blue-600" />
        </div>
      }
      footer={
        <DrawerFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {tool ? "Save Changes" : "Create Tool"}
          </Button>
        </DrawerFooter>
      }
    >
      <DrawerBody>
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-card-foreground">
            Basic Information
          </h3>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1.5">
              Tool Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, name: e.target.value }));
                if (errors.name)
                  setErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="e.g., Prometheus Query"
              className={cn(
                "w-full h-10 px-3 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring",
                errors.name ? "border-red-500" : "border-border",
              )}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Describe what this tool does..."
              rows={4}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1.5">
              Tool Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    type: "mcp",
                    config: {},
                  }))
                }
                className={cn(
                  "flex-1 p-4 rounded-lg border-2 transition-all text-left",
                  formData.type === "mcp"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50",
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      formData.type === "mcp"
                        ? "bg-primary/10"
                        : "bg-gray-100",
                    )}
                  >
                    <Plug
                      className={cn(
                        "w-5 h-5",
                        formData.type === "mcp"
                          ? "text-primary"
                          : "text-gray-500",
                      )}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-card-foreground">
                      MCP
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Connect MCP server tools
                    </div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    type: "custom_code",
                    config: {},
                  }))
                }
                className={cn(
                  "flex-1 p-4 rounded-lg border-2 transition-all text-left",
                  formData.type === "custom_code"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50",
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      formData.type === "custom_code"
                        ? "bg-primary/10"
                        : "bg-gray-100",
                    )}
                  >
                    <Code2
                      className={cn(
                        "w-5 h-5",
                        formData.type === "custom_code"
                          ? "text-primary"
                          : "text-gray-500",
                      )}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-card-foreground">
                      Custom Code
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Write JavaScript code
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-card-foreground">
            Configuration
          </h3>

          {formData.type === "mcp" ? (
            <MCPConfigForm
              config={formData.config}
              onChange={handleConfigChange}
              error={errors.config}
            />
          ) : (
            <CustomCodeEditor
              config={formData.config}
              onChange={handleConfigChange}
              error={errors.config}
            />
          )}
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-1.5">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                status: e.target.value as ToolStatus,
              }))
            }
            className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </DrawerBody>
    </Drawer>
  );
}
