"use client";

import { useState, useEffect } from "react";
import { X, Lightbulb, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type SkillStatus = "active" | "inactive";

interface Skill {
  id: string;
  name: string;
  problemDescription: string;
  sop: string;
  status: SkillStatus;
}

interface SkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (skill: Partial<Skill>) => void;
  skill?: Skill | null;
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

export function SkillModal({ isOpen, onClose, onSave, skill }: SkillModalProps) {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-card-foreground">
                {skill ? "Edit Skill" : "Create New Skill"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Define problem-solving SOPs for AI agent
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
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
                  if (errors.name)
                    setErrors((prev) => ({ ...prev, name: "" }));
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
                  setFormData((prev) => ({ ...prev, problemDescription: e.target.value }));
                  if (errors.problemDescription)
                    setErrors((prev) => ({ ...prev, problemDescription: "" }));
                }}
                placeholder="Describe the problem this skill solves. This helps AI match the right skill to incoming alerts..."
                rows={3}
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
              <label className="block text-sm font-medium text-card-foreground mb-1.5">
                Standard Operating Procedure (SOP) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.sop}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, sop: e.target.value }));
                  if (errors.sop)
                    setErrors((prev) => ({ ...prev, sop: "" }));
                }}
                placeholder="Define the step-by-step procedure for handling this type of issue..."
                rows={8}
                className={cn(
                  "w-full px-3 py-2 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono",
                  errors.sop ? "border-red-500" : "border-border",
                )}
              />
              {errors.sop && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.sop}
                </p>
              )}
              <div className="mt-1.5 flex items-start gap-2">
                <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  The AI agent will follow these steps when processing matching alerts
                </p>
              </div>
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
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-gray-50/50">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {skill ? "Save Changes" : "Create Skill"}
          </Button>
        </div>
      </div>
    </div>
  );
}
