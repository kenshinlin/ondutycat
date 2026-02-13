"use client";

import { useState, useEffect } from "react";
import { Lightbulb, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Drawer,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
} from "@/components/ui/Drawer";
import { SOPEditor } from "./SOPEditor";
import { cn } from "@/utils/utils";

type SkillStatus = "active" | "inactive";

interface Skill {
  id: string;
  name: string;
  problemDescription: string;
  sop: string;
  status: SkillStatus;
}

interface Tool {
  id: string;
  name: string;
  description?: string;
}

interface SkillDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (skill: Partial<Skill>) => void;
  skill?: Skill | null;
  availableTools?: Tool[];
  useMockApi?: boolean; // Pass through to SOPEditor for testing
}

interface FormData {
  name: string;
  problemDescription: string;
  sop: string;
  status: SkillStatus;
}

const initialFormData: FormData = {
  name: "",
  problemDescription: "",
  sop: "",
  status: "active",
};

export function SkillDrawer({
  isOpen,
  onClose,
  onSave,
  skill,
  availableTools = [],
  useMockApi = false,
}: SkillDrawerProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (skill) {
      setFormData({
        name: skill.name,
        problemDescription: skill.problemDescription,
        sop: skill.sop,
        status: skill.status,
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
  }, [skill, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Skill name is required";
    }

    if (!formData.problemDescription.trim()) {
      newErrors.problemDescription = "Problem description is required";
    }

    if (!formData.sop.trim()) {
      newErrors.sop = "Standard Operating Procedure (SOP) is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    onSave({
      id: skill?.id,
      ...formData,
    });
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={skill ? "Edit Skill" : "Create New Skill"}
      description="Define problem-solving SOPs for AI agent"
      icon={
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-amber-600" />
        </div>
      }
      footer={
        <DrawerFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {skill ? "Save Changes" : "Create Skill"}
          </Button>
        </DrawerFooter>
      }
    >
      <DrawerBody>
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-1.5">
            Skill Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, name: e.target.value }));
              if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
            }}
            placeholder="e.g., Database Connection Failure"
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

        {/* Problem Description */}
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-1.5">
            Problem Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.problemDescription}
            onChange={(e) => {
              setFormData((prev) => ({
                ...prev,
                problemDescription: e.target.value,
              }));
              if (errors.problemDescription)
                setErrors((prev) => ({ ...prev, problemDescription: "" }));
            }}
            placeholder="Describe the problem this skill solves. This helps AI match the right skill to incoming alerts..."
            rows={4}
            className={cn(
              "w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none",
              errors.problemDescription ? "border-red-500" : "border-border",
            )}
          />
          {errors.problemDescription && (
            <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.problemDescription}
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            This description is used for semantic matching with incoming alerts
          </p>
        </div>

        {/* SOP (Standard Operating Procedure) */}
        <div>
          <SOPEditor
            value={formData.sop}
            onChange={(value) => {
              setFormData((prev) => ({ ...prev, sop: value }));
              if (errors.sop) setErrors((prev) => ({ ...prev, sop: "" }));
            }}
            placeholder="Define the step-by-step procedure for handling this type of issue... Type / or @ to insert tools"
            error={errors.sop}
            availableTools={availableTools}
            useMockApi={useMockApi}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            The AI agent will follow these steps when processing matching alerts
          </p>
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
                status: e.target.value as SkillStatus,
              }))
            }
            className="w-full h-10 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Only active skills are used by the AI agent for alert processing
          </p>
        </div>
      </DrawerBody>
    </Drawer>
  );
}
