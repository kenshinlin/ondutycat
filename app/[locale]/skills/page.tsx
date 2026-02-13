"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Lightbulb,
  Search,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Clock,
  User,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/utils";
import { SkillDrawer } from "@/components/skills/SkillDrawer";

type SkillStatus = "active" | "inactive";

interface Tool {
  id: string;
  name: string;
  description?: string;
  type?: "mcp" | "custom_code";
  config?: Record<string, unknown>;
}

interface Skill {
  id: string;
  name: string;
  problemDescription: string;
  sop: string;
  status: SkillStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

const mockSkills: Skill[] = [
  {
    id: "skill-001",
    name: "Database Connection Failure",
    problemDescription:
      "Handles database connection timeout and connection pool exhaustion issues",
    sop: `1. Check database connection pool status
2. Verify database server availability
3. Review slow query logs for blocking queries
4. Check network connectivity between app and database
5. Verify connection pool configuration
6. If connection pool exhausted:
   - Identify long-running queries
   - Kill blocking sessions if necessary
   - Consider increasing pool size
7. Restart application connection pool if needed`,
    status: "active",
    createdBy: "admin@example.com",
    createdAt: "2025-01-15T10:00:00Z",
    updatedAt: "2025-01-15T10:00:00Z",
  },
  {
    id: "skill-002",
    name: "High Memory Usage",
    problemDescription:
      "Investigates and resolves high memory consumption issues",
    sop: `1. Get current memory usage metrics
2. Check for memory leaks in application logs
3. Identify top memory-consuming processes
4. Review heap memory allocation
5. Check for cache overflow
6. Analyze memory dump if available
7. Recommend memory limit adjustments if needed`,
    status: "active",
    createdBy: "devops@example.com",
    createdAt: "2025-01-14T09:30:00Z",
    updatedAt: "2025-01-14T09:30:00Z",
  },
  {
    id: "skill-003",
    name: "API Response Time Degradation",
    problemDescription:
      "Handles slow API response time and endpoint performance issues",
    sop: `1. Identify affected endpoints
2. Check API gateway metrics
3. Review database query performance for slow endpoints
4. Check external service dependencies
5. Review application error rates
6. Analyze request/response payload sizes
7. Check rate limiting status
8. Review CDN and caching status`,
    status: "inactive",
    createdBy: "admin@example.com",
    createdAt: "2025-01-13T14:00:00Z",
    updatedAt: "2025-01-14T08:00:00Z",
  },
];

const mockTools: Tool[] = [
  {
    id: "tool-001",
    name: "Prometheus_Query",
    description: "Query Prometheus metrics and alerts",
  },
  {
    id: "tool-002",
    name: "Database_Health_Check",
    description: "Check database connection and run health queries",
  },
  {
    id: "tool-003",
    name: "Log_Analyzer",
    description: "Analyze log files for patterns and errors",
    type: "custom_code",
  },
  {
    id: "tool-004",
    name: "API_Check",
    description: "Check API endpoint health and response times",
  },
  {
    id: "tool-005",
    name: "Network_Diagnostic",
    description: "Run network diagnostics and connectivity tests",
  },
  {
    id: "tool-006",
    name: "Container_Inspect",
    description: "Inspect container status and logs",
  },
  {
    id: "tool-007",
    name: "Process_Monitor",
    description: "Monitor system processes and resource usage",
  },
  // MCP Tools - these will trigger the second level popup
  {
    id: "tool-mcp-fs",
    name: "Filesystem MCP",
    description: "MCP server for filesystem operations",
    type: "mcp",
    config: {
      mcpServers: {
        filesystem: {
          command: "npx",
          args: ["-y", "@anthropic-ai/mcp-server-filesystem", "/tmp/allowed"],
        },
      },
    },
  },
  {
    id: "tool-mcp-pg",
    name: "PostgreSQL MCP",
    description: "MCP server for PostgreSQL database queries",
    type: "mcp",
    config: {
      mcpServers: {
        postgres: {
          command: "npx",
          args: ["-y", "@anthropic-ai/mcp-server-postgres"],
          env: {
            DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
          },
        },
      },
    },
  },
  {
    id: "tool-mcp-prom",
    name: "Prometheus MCP",
    description: "MCP server for Prometheus metrics",
    type: "mcp",
    config: {
      mcpServers: {
        prometheus: {
          command: "npx",
          args: ["-y", "@anthropic-ai/mcp-server-prometheus"],
          env: {
            PROMETHEUS_URL: "http://localhost:9090",
          },
        },
      },
    },
  },
];

export default function SkillsPage() {
  const t = useTranslations("skills");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<SkillStatus | "all">(
    "all",
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);

  const filteredSkills = mockSkills.filter((skill) => {
    const matchesSearch =
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.problemDescription
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      skill.sop.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatus === "all" || skill.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreateSkill = () => {
    setEditingSkill(null);
    setIsModalOpen(true);
  };

  const handleEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    setIsModalOpen(true);
  };

  const handleDeleteSkill = (skillId: string) => {
    // TODO: Implement delete logic
    console.log("Delete skill:", skillId);
  };

  const handleToggleStatus = (skill: Skill) => {
    // TODO: Implement status toggle logic
    console.log(
      "Toggle status:",
      skill.id,
      skill.status === "active" ? "inactive" : "active",
    );
  };

  const handleSaveSkill = (skillData: Partial<Skill>) => {
    // TODO: Implement save logic
    console.log("Save skill:", skillData);
    setIsModalOpen(false);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex-none px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-linear-to-br from-amber-500/20 to-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Skills</h1>
              <p className="text-sm text-muted-foreground">
                Problem-solving SOPs for AI agent
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {filteredSkills.length}
              </div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredSkills.filter((s) => s.status === "active").length}
              </div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-500">
                {filteredSkills.filter((s) => s.status === "inactive").length}
              </div>
              <div className="text-xs text-muted-foreground">Inactive</div>
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
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) =>
              setSelectedStatus(e.target.value as SkillStatus | "all")
            }
            className="h-9 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Create Button */}
          <Button onClick={handleCreateSkill}>
            <Plus className="w-4 h-4" />
            Create Skill
          </Button>
        </div>
      </div>

      {/* Skills Grid */}
      <div className="flex-1 overflow-y-auto p-6 bg-background">
        {filteredSkills.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Lightbulb className="w-16 h-16 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground">No skills found</p>
            <Button onClick={handleCreateSkill} className="mt-4">
              <Plus className="w-4 h-4" />
              Create Your First Skill
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSkills.map((skill) => (
              <div
                key={skill.id}
                className={cn(
                  "bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-all",
                  skill.status === "inactive" && "opacity-60",
                )}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Lightbulb className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-card-foreground truncate">
                          {skill.name}
                        </h3>
                        <Badge
                          variant={
                            skill.status === "active" ? "success" : "default"
                          }
                          className="mt-1"
                        >
                          {skill.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 space-y-3">
                  {/* Problem Description */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Problem
                      </span>
                    </div>
                    <p className="text-sm text-card-foreground line-clamp-2">
                      {skill.problemDescription}
                    </p>
                  </div>

                  {/* SOP Preview */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <FileText className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs font-medium text-muted-foreground">
                        SOP
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono bg-gray-50/50 p-2 rounded overflow-hidden relative">
                      <div
                        className="overflow-hidden"
                        style={{
                          maxHeight: "4.2em", // 3行文字的高度 (每行约1.4em)
                          lineHeight: "1.4em",
                        }}
                      >
                        {skill.sop}
                      </div>
                      {/* 省略号 */}
                      <div className="absolute bottom-2 right-2 bg-gray-50/50 text-muted-foreground text-xs leading-none">
                        ...
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-4 py-3 border-t border-border bg-gray-50/50 rounded-b-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {skill.createdBy && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span className="truncate max-w-[100px]">
                            {skill.createdBy}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(skill.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleStatus(skill)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                        title={
                          skill.status === "active" ? "Deactivate" : "Activate"
                        }
                      >
                        {skill.status === "active" ? (
                          <PowerOff className="w-4 h-4" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEditSkill(skill)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSkill(skill.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Skill Drawer */}
      <SkillDrawer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSkill}
        skill={editingSkill}
        availableTools={mockTools}
        useMockApi={true}
      />
    </div>
  );
}
