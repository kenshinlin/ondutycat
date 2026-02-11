"use client";

import { useState } from "react";
import {
  X,
  Bot,
  Clock,
  User,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

type IssueStatus = "analyzing" | "in_progress" | "resolved" | "false_positive" | "unable_to_resolve";

interface IssueLog {
  id: string;
  logType: "skill_matched" | "tool_called" | "reasoning" | "conclusion";
  content: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface Alert {
  id: string;
  source: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  triggeredAt: string;
}

interface Issue {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  isRealIssue: boolean | null;
  aiConclusion: string | null;
  skillId?: string;
  skillName?: string;
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  alerts: Alert[];
  logs?: IssueLog[];
}

interface IssueDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  issue: Issue | null;
}

const statusConfig: Record<
  IssueStatus,
  { variant: "success" | "warning" | "danger" | "info" | "default"; label: string }
> = {
  resolved: { variant: "success", label: "Resolved" },
  in_progress: { variant: "warning", label: "In Progress" },
  analyzing: { variant: "info", label: "Analyzing" },
  false_positive: { variant: "default", label: "False Positive" },
  unable_to_resolve: { variant: "danger", label: "Unable to Resolve" },
};

const severityColors: Record<"critical" | "high" | "medium" | "low", string> = {
  critical: "text-red-600 bg-red-50 border-red-200",
  high: "text-orange-600 bg-orange-50 border-orange-200",
  medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
  low: "text-blue-600 bg-blue-50 border-blue-200",
};

const logTypeConfig: Record<
  IssueLog["logType"],
  { icon: typeof Sparkles; color: string; bgColor: string; label: string }
> = {
  skill_matched: {
    icon: Sparkles,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    label: "Skill Matched",
  },
  tool_called: {
    icon: ArrowRight,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    label: "Tool Called",
  },
  reasoning: {
    icon: Bot,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    label: "AI Reasoning",
  },
  conclusion: {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-50",
    label: "Conclusion",
  },
};

export function IssueDetailDrawer({ isOpen, onClose, issue }: IssueDetailDrawerProps) {
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  if (!isOpen || !issue) return null;

  const statusConf = statusConfig[issue.status];

  const toggleAlertExpand = (alertId: string) => {
    setExpandedAlerts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  };

  const toggleLogExpand = (logId: string) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, logId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedLogId(logId);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl animate-slide-in-right overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Bot className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-card-foreground">
                  {issue.id}
                </h2>
                <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Issue Details & AI Processing</p>
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
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Issue Title & Description */}
            <div>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">
                {issue.title}
              </h3>
              <p className="text-sm text-muted-foreground">{issue.description}</p>
            </div>

            {/* AI Conclusion */}
            {issue.aiConclusion && (
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-none">
                    <Bot className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900 mb-1.5">
                      AI Analysis Conclusion
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {issue.aiConclusion}
                    </p>
                    {issue.isRealIssue !== null && (
                      <div className="mt-3 flex items-center gap-2">
                        {issue.isRealIssue ? (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Real Issue Confirmed
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-full">
                            <AlertCircle className="w-3.5 h-3.5" />
                            False Positive
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Matched Skill */}
            {issue.skillName && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <p className="text-sm font-medium text-purple-900">Matched Skill</p>
                </div>
                <p className="text-base font-semibold text-card-foreground">
                  {issue.skillName}
                </p>
              </div>
            )}

            {/* Related Alerts */}
            <div>
              <h4 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
                <span>Related Alerts</span>
                <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
                  {issue.alerts.length}
                </span>
              </h4>
              <div className="space-y-2">
                {issue.alerts.map((alert) => {
                  const isExpanded = expandedAlerts.has(alert.id);
                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        "border rounded-lg overflow-hidden",
                        severityColors[alert.severity]
                      )}
                    >
                      <div
                        className="p-3 cursor-pointer hover:bg-black/5 transition-colors"
                        onClick={() => toggleAlertExpand(alert.id)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xs font-mono font-medium opacity-80 flex-none">
                              {alert.id}
                            </span>
                            <span className="text-xs font-semibold uppercase flex-none">
                              {alert.source}
                            </span>
                            <span className="text-sm truncate flex-1">
                              {alert.message}
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 flex-none" />
                          ) : (
                            <ChevronDown className="w-4 h-4 flex-none" />
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-2 border-t border-black/10">
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-medium opacity-70">Severity:</span>
                              <span className="font-semibold uppercase">{alert.severity}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 opacity-70" />
                              <span>{new Date(alert.triggeredAt).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Processing Logs */}
            {issue.logs && issue.logs.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-card-foreground mb-3 flex items-center gap-2">
                  <span>AI Processing Logs</span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
                    {issue.logs.length}
                  </span>
                </h4>
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-200" />

                  <div className="space-y-3">
                    {issue.logs.map((log, index) => {
                      const config = logTypeConfig[log.logType];
                      const LogIcon = config.icon;
                      const isExpanded = expandedLogs.has(log.id);

                      return (
                        <div key={log.id} className="relative flex gap-3">
                          {/* Icon */}
                          <div
                            className={cn(
                              "relative z-10 w-10 h-10 rounded-full border-2 border-white flex items-center justify-center flex-none",
                              config.bgColor
                            )}
                          >
                            <LogIcon className={cn("w-4 h-4", config.color)} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div
                              className={cn(
                                "border rounded-lg overflow-hidden transition-colors",
                                log.logType === "conclusion" && "border-green-200 bg-green-50"
                              )}
                            >
                              <div
                                className="p-3 cursor-pointer hover:bg-black/5 transition-colors"
                                onClick={() => toggleLogExpand(log.id)}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        "text-xs font-semibold uppercase",
                                        config.color
                                      )}
                                    >
                                      {config.label}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(log.createdAt).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(log.content, log.id);
                                      }}
                                      className="p-1 rounded hover:bg-black/10 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                      {copiedLogId === log.id ? (
                                        <Check className="w-3.5 h-3.5 text-green-600" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4 text-gray-400" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4 text-gray-400" />
                                    )}
                                  </div>
                                </div>
                                <p
                                  className={cn(
                                    "text-sm",
                                    isExpanded ? "text-gray-700" : "text-gray-600 line-clamp-2"
                                  )}
                                >
                                  {log.content}
                                </p>
                              </div>

                              {isExpanded && log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div className="px-3 pb-3 pt-2 border-t border-black/10 bg-black/5">
                                  <p className="text-xs font-medium text-gray-700 mb-2">Metadata:</p>
                                  <pre className="text-xs bg-gray-100 rounded p-2 overflow-x-auto">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Issue Metadata */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created By</span>
                <span className="font-medium">{issue.createdBy}</span>
              </div>
              {issue.assignedTo && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Assigned To</span>
                  <span className="font-medium">{issue.assignedTo}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created At</span>
                <span className="font-medium">{new Date(issue.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Updated At</span>
                <span className="font-medium">{new Date(issue.updatedAt).toLocaleString()}</span>
              </div>
              {issue.resolvedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Resolved At</span>
                  <span className="font-medium">{new Date(issue.resolvedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
