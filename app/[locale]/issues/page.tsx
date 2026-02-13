"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  FileText,
  Search,
  Plus,
  MoreVertical,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Bot,
  ArrowRight,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/utils";
import { IssueDetailDrawer } from "@/components/issues/IssueDetailDrawer";

type IssueStatus =
  | "analyzing"
  | "in_progress"
  | "resolved"
  | "false_positive"
  | "unable_to_resolve";

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

const mockIssues: Issue[] = [
  {
    id: "ISS-001",
    title: "Database Connection Pool Exhaustion",
    description:
      "Multiple alerts indicating database connection pool utilization exceeding 90% threshold",
    status: "resolved",
    isRealIssue: true,
    aiConclusion:
      "Confirmed connection pool exhaustion. Root cause identified as unclosed connections in payment service. Recommended increasing pool size from 50 to 100 and fixing connection leak in payment-processing module.",
    skillId: "skill-001",
    skillName: "Database Connection Failure",
    assignedTo: "john@example.com",
    createdBy: "system",
    createdAt: "2025-01-15T10:30:00Z",
    updatedAt: "2025-01-15T11:45:00Z",
    resolvedAt: "2025-01-15T11:45:00Z",
    alerts: [
      {
        id: "ALT-001",
        source: "Prometheus",
        severity: "critical",
        message: "Database connection pool utilization at 95%",
        triggeredAt: "2025-01-15T10:30:00Z",
      },
      {
        id: "ALT-002",
        source: "Datadog",
        severity: "high",
        message: "Application database query timeout increased",
        triggeredAt: "2025-01-15T10:25:00Z",
      },
    ],
    logs: [
      {
        id: "log-001",
        logType: "skill_matched",
        content:
          "Matched skill: Database Connection Failure (confidence: 0.94)",
        metadata: { skillId: "skill-001", confidence: 0.94 },
        createdAt: "2025-01-15T10:31:00Z",
      },
      {
        id: "log-002",
        logType: "tool_called",
        content:
          "Called Database_Health_Check: Connection pool at 95% (47/50 connections active)",
        metadata: {
          toolName: "Database_Health_Check",
          result: { activeConnections: 47, poolSize: 50 },
        },
        createdAt: "2025-01-15T10:31:30Z",
      },
      {
        id: "log-003",
        logType: "tool_called",
        content:
          "Called Log_Analyzer: Found 15 connection timeout errors in payment-service logs",
        metadata: {
          toolName: "Log_Analyzer",
          errorCount: 15,
          service: "payment-service",
        },
        createdAt: "2025-01-15T10:32:00Z",
      },
      {
        id: "log-004",
        logType: "reasoning",
        content:
          "Analysis indicates connection leak in payment-service. The service creates connections but fails to close them in error scenarios. This matches pattern of connection pool exhaustion.",
        createdAt: "2025-01-15T10:35:00Z",
      },
      {
        id: "log-005",
        logType: "conclusion",
        content:
          "REAL ISSUE: Database connection pool exhaustion caused by connection leak in payment-service. Immediate actions: 1) Increase pool size, 2) Fix connection handling in payment-processing module",
        metadata: { isRealIssue: true, severity: "critical" },
        createdAt: "2025-01-15T10:36:00Z",
      },
    ],
  },
  {
    id: "ISS-002",
    title: "API Response Time Degradation",
    description: "Spike in API response times for checkout endpoint",
    status: "in_progress",
    isRealIssue: null,
    aiConclusion: null,
    skillId: "skill-003",
    skillName: "API Response Time Degradation",
    assignedTo: "jane@example.com",
    createdBy: "system",
    createdAt: "2025-01-15T11:00:00Z",
    updatedAt: "2025-01-15T11:15:00Z",
    alerts: [
      {
        id: "ALT-003",
        source: "CloudWatch",
        severity: "high",
        message: "Checkout API response time exceeded 3s threshold",
        triggeredAt: "2025-01-15T11:00:00Z",
      },
    ],
    logs: [
      {
        id: "log-006",
        logType: "skill_matched",
        content:
          "Matched skill: API Response Time Degradation (confidence: 0.89)",
        metadata: { skillId: "skill-003", confidence: 0.89 },
        createdAt: "2025-01-15T11:01:00Z",
      },
      {
        id: "log-007",
        logType: "tool_called",
        content:
          "Called API_Check: Checkout endpoint showing 3.2s average response time",
        metadata: {
          toolName: "API_Check",
          endpoint: "/checkout",
          avgResponseTime: 3200,
        },
        createdAt: "2025-01-15T11:01:30Z",
      },
      {
        id: "log-008",
        logType: "reasoning",
        content: "Investigating slow queries and external dependencies...",
        createdAt: "2025-01-15T11:15:00Z",
      },
    ],
  },
  {
    id: "ISS-003",
    title: "Scheduled Backup CPU Spike",
    description:
      "CPU usage spike detected on backup server during maintenance window",
    status: "false_positive",
    isRealIssue: false,
    aiConclusion:
      "False positive. CPU spike occurred during scheduled backup window (02:00-04:00 UTC). This is expected behavior and does not require action.",
    skillId: "skill-004",
    skillName: "High CPU Usage",
    createdBy: "system",
    createdAt: "2025-01-15T02:30:00Z",
    updatedAt: "2025-01-15T02:45:00Z",
    alerts: [
      {
        id: "ALT-004",
        source: "Prometheus",
        severity: "medium",
        message: "CPU usage spike detected on backup-server",
        triggeredAt: "2025-01-15T02:30:00Z",
      },
    ],
    logs: [
      {
        id: "log-009",
        logType: "skill_matched",
        content: "Matched skill: High CPU Usage (confidence: 0.76)",
        metadata: { skillId: "skill-004", confidence: 0.76 },
        createdAt: "2025-01-15T02:31:00Z",
      },
      {
        id: "log-010",
        logType: "tool_called",
        content: "Called Process_Monitor: Backup process utilizing 85% CPU",
        metadata: {
          toolName: "Process_Monitor",
          processName: "backup-job",
          cpuUsage: 85,
        },
        createdAt: "2025-01-15T02:31:30Z",
      },
      {
        id: "log-011",
        logType: "reasoning",
        content: "High CPU caused by backup-job process. Checking schedule...",
        createdAt: "2025-01-15T02:32:00Z",
      },
      {
        id: "log-012",
        logType: "conclusion",
        content:
          "FALSE POSITIVE: CPU spike is from scheduled backup job running during maintenance window. This is expected behavior.",
        metadata: { isRealIssue: false, scheduledTask: "backup-job" },
        createdAt: "2025-01-15T02:45:00Z",
      },
    ],
  },
  {
    id: "ISS-004",
    title: "Memory Leak in Web Service",
    description: "Gradual memory increase pattern detected on web-server-03",
    status: "analyzing",
    isRealIssue: null,
    aiConclusion: null,
    skillId: "skill-002",
    skillName: "High Memory Usage",
    createdBy: "system",
    createdAt: "2025-01-15T09:00:00Z",
    updatedAt: "2025-01-15T09:00:00Z",
    alerts: [
      {
        id: "ALT-005",
        source: "Datadog",
        severity: "high",
        message: "Memory usage trending upward on web-server-03",
        triggeredAt: "2025-01-15T09:00:00Z",
      },
    ],
    logs: [
      {
        id: "log-013",
        logType: "skill_matched",
        content: "Matched skill: High Memory Usage (confidence: 0.91)",
        metadata: { skillId: "skill-002", confidence: 0.91 },
        createdAt: "2025-01-15T09:01:00Z",
      },
    ],
  },
  {
    id: "ISS-005",
    title: "External API Failure",
    description: "Third-party payment gateway API returning 5xx errors",
    status: "unable_to_resolve",
    isRealIssue: null,
    aiConclusion:
      "Unable to determine root cause. External payment gateway API is failing. No access to external service metrics. Recommended: Contact payment gateway provider and check their status page.",
    skillId: "skill-003",
    skillName: "API Response Time Degradation",
    createdBy: "system",
    createdAt: "2025-01-14T18:00:00Z",
    updatedAt: "2025-01-14T18:30:00Z",
    alerts: [
      {
        id: "ALT-006",
        source: "CloudWatch",
        severity: "critical",
        message: "Payment gateway API returning 503 errors",
        triggeredAt: "2025-01-14T18:00:00Z",
      },
    ],
    logs: [
      {
        id: "log-014",
        logType: "skill_matched",
        content:
          "Matched skill: API Response Time Degradation (confidence: 0.82)",
        metadata: { skillId: "skill-003", confidence: 0.82 },
        createdAt: "2025-01-14T18:01:00Z",
      },
      {
        id: "log-015",
        logType: "tool_called",
        content:
          "Called API_Check: External payment gateway returning 503 Service Unavailable",
        metadata: {
          toolName: "API_Check",
          endpoint: "payment-gateway-api.com",
          statusCode: 503,
        },
        createdAt: "2025-01-14T18:01:30Z",
      },
      {
        id: "log-016",
        logType: "reasoning",
        content:
          "External API failing. Checking if we have visibility into payment gateway infrastructure...",
        createdAt: "2025-01-14T18:15:00Z",
      },
      {
        id: "log-017",
        logType: "conclusion",
        content:
          "UNABLE TO RESOLVE: External payment gateway is failing. No access to provider infrastructure. Recommend escalating to payment gateway support team.",
        metadata: {
          externalService: "payment-gateway-api.com",
          actionRequired: "contact-provider",
        },
        createdAt: "2025-01-14T18:30:00Z",
      },
    ],
  },
];

const statusConfig: Record<
  IssueStatus,
  {
    variant: "success" | "warning" | "danger" | "info" | "default";
    label: string;
    icon: typeof CheckCircle2;
  }
> = {
  resolved: { variant: "success", label: "Resolved", icon: CheckCircle2 },
  in_progress: { variant: "warning", label: "In Progress", icon: Clock },
  analyzing: { variant: "info", label: "Analyzing", icon: Bot },
  false_positive: {
    variant: "default",
    label: "False Positive",
    icon: XCircle,
  },
  unable_to_resolve: {
    variant: "danger",
    label: "Unable to Resolve",
    icon: AlertCircle,
  },
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

export default function IssuesPage() {
  const t = useTranslations("issues");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<IssueStatus | "all">(
    "all",
  );
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  const filteredIssues = mockIssues.filter((issue) => {
    const matchesSearch =
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (issue.skillName &&
        issue.skillName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus =
      selectedStatus === "all" || issue.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleViewIssue = (issue: Issue) => {
    setSelectedIssue(issue);
    setIsDetailDrawerOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-linear-to-br from-blue-500/20 to-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Issues</h1>
              <p className="text-sm text-muted-foreground">
                AI-processed alerts with analysis
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {filteredIssues.length}
              </div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredIssues.filter((i) => i.status === "analyzing").length}
              </div>
              <div className="text-xs text-muted-foreground">Analyzing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {
                  filteredIssues.filter((i) => i.status === "in_progress")
                    .length
                }
              </div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredIssues.filter((i) => i.status === "resolved").length}
              </div>
              <div className="text-xs text-muted-foreground">Resolved</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search issues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) =>
              setSelectedStatus(e.target.value as IssueStatus | "all")
            }
            className="h-9 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="analyzing">Analyzing</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="false_positive">False Positive</option>
            <option value="unable_to_resolve">Unable to Resolve</option>
          </select>
        </div>
      </div>

      {/* Issues List */}
      <div className="flex-1 p-6 bg-background">
        {filteredIssues.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <FileText className="w-16 h-16 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground">No issues found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredIssues.map((issue) => {
              const statusConf = statusConfig[issue.status];
              const StatusIcon = statusConf.icon;

              return (
                <div
                  key={issue.id}
                  className="bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-all"
                >
                  {/* Issue Header */}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {issue.id}
                          </span>
                          <Badge
                            variant={statusConf.variant}
                            className="flex items-center gap-1.5"
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusConf.label}
                          </Badge>
                          {issue.isRealIssue !== null && (
                            <Badge
                              variant={
                                issue.isRealIssue ? "success" : "default"
                              }
                            >
                              {issue.isRealIssue
                                ? "Real Issue"
                                : "False Positive"}
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-base font-semibold text-card-foreground mb-1">
                          {issue.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {issue.description}
                        </p>
                      </div>

                      <button
                        onClick={() => handleViewIssue(issue)}
                        className="flex-none p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Issue Details */}
                  <div className="p-4 space-y-3">
                    {/* AI Conclusion */}
                    {issue.aiConclusion && (
                      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Bot className="w-4 h-4 text-blue-600 flex-none mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-blue-600 mb-1">
                              AI Conclusion
                            </p>
                            <p className="text-sm text-gray-700">
                              {issue.aiConclusion}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Skill Info */}
                    {issue.skillName && (
                      <div className="flex items-center gap-2 text-sm">
                        <Sparkles className="w-4 h-4 text-purple-500 flex-none" />
                        <span className="text-muted-foreground">
                          Matched Skill:
                        </span>
                        <span className="font-medium text-card-foreground">
                          {issue.skillName}
                        </span>
                      </div>
                    )}

                    {/* Related Alerts */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {issue.alerts.length} Related Alert
                        {issue.alerts.length > 1 ? "s" : ""}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {issue.alerts.map((alert) => (
                          <div
                            key={alert.id}
                            className={cn(
                              "flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs",
                              severityColors[alert.severity],
                            )}
                          >
                            <span className="font-medium">{alert.source}</span>
                            <ChevronRight className="w-3 h-3 opacity-60" />
                            <span className="truncate max-w-[150px]">
                              {alert.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Issue Footer */}
                  <div className="px-4 py-3 border-t border-border bg-gray-50/50 rounded-b-lg">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>Created by {issue.createdBy}</span>
                        </div>
                        {issue.assignedTo && (
                          <div className="flex items-center gap-1">
                            <span>Assigned to {issue.assignedTo}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(issue.updatedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Issue Detail Drawer */}
      <IssueDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => {
          setIsDetailDrawerOpen(false);
          setSelectedIssue(null);
        }}
        issue={selectedIssue}
      />
    </div>
  );
}
