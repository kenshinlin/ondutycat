'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Wrench,
  Search,
  Plus,
  Code2,
  Plug,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Clock,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { ToolDrawer } from '@/components/tools/ToolDrawer';

type ToolType = 'mcp' | 'custom_code';
type ToolStatus = 'active' | 'inactive';

interface Tool {
  id: string;
  name: string;
  description?: string;
  type: ToolType;
  config: Record<string, unknown>;
  status: ToolStatus;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

const mockTools: Tool[] = [
  {
    id: 'tool-001',
    name: 'Prometheus Query',
    description: 'Query Prometheus metrics and alerts',
    type: 'mcp',
    config: {
      mcpServers: {
        prometheus: {
          command: 'npx',
          args: ['-y', '@anthropic-ai/mcp-prometheus'],
          env: { PROMETHEUS_URL: 'http://localhost:9090' },
        },
      },
    },
    status: 'active',
    createdBy: 'admin@example.com',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'tool-002',
    name: 'Database Health Check',
    description: 'Check database connection and run health queries',
    type: 'custom_code',
    config: {
      code: `async function execute(params) {
  const { connectionString, query } = params;
  // Database health check logic
  return { status: 'healthy', connections: 10 };
}`,
      parameters: {
        type: 'object',
        properties: {
          connectionString: { type: 'string' },
          query: { type: 'string' },
        },
      },
    },
    status: 'active',
    createdBy: 'devops@example.com',
    createdAt: '2025-01-14T09:30:00Z',
    updatedAt: '2025-01-14T09:30:00Z',
  },
  {
    id: 'tool-003',
    name: 'Log Analyzer',
    description: 'Analyze log files for patterns and errors',
    type: 'custom_code',
    config: {
      code: `async function execute(params) {
  const { logPath, pattern } = params;
  // Log analysis logic
  return { matches: [], count: 0 };
}`,
      parameters: {
        type: 'object',
        properties: {
          logPath: { type: 'string' },
          pattern: { type: 'string' },
        },
      },
    },
    status: 'inactive',
    createdBy: 'admin@example.com',
    createdAt: '2025-01-13T14:00:00Z',
    updatedAt: '2025-01-14T08:00:00Z',
  },
];

const typeConfig: Record<ToolType, { icon: typeof Code2; label: string; variant: 'info' | 'default' }> = {
  mcp: { icon: Plug, label: 'MCP', variant: 'info' },
  custom_code: { icon: Code2, label: 'Custom Code', variant: 'default' },
};

export default function ToolsPage() {
  const t = useTranslations('tools');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ToolType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ToolStatus | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);

  const filteredTools = mockTools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || tool.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || tool.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleCreateTool = () => {
    setEditingTool(null);
    setIsModalOpen(true);
  };

  const handleEditTool = (tool: Tool) => {
    setEditingTool(tool);
    setIsModalOpen(true);
  };

  const handleDeleteTool = (toolId: string) => {
    // TODO: Implement delete logic
    console.log('Delete tool:', toolId);
  };

  const handleToggleStatus = (tool: Tool) => {
    // TODO: Implement status toggle logic
    console.log('Toggle status:', tool.id, tool.status === 'active' ? 'inactive' : 'active');
  };

  const handleSaveTool = (toolData: Partial<Tool>) => {
    // TODO: Implement save logic
    console.log('Save tool:', toolData);
    setIsModalOpen(false);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex-none px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-linear-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Tool Management</h1>
              <p className="text-sm text-muted-foreground">Register and manage tools for AI agents</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{filteredTools.length}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {filteredTools.filter((t) => t.status === 'active').length}
              </div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {filteredTools.filter((t) => t.type === 'mcp').length}
              </div>
              <div className="text-xs text-muted-foreground">MCP</div>
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
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as ToolType | 'all')}
            className="h-9 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Types</option>
            <option value="mcp">MCP</option>
            <option value="custom_code">Custom Code</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ToolStatus | 'all')}
            className="h-9 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Create Button */}
          <Button onClick={handleCreateTool}>
            <Plus className="w-4 h-4" />
            Create Tool
          </Button>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="flex-1 overflow-y-auto p-6 bg-background">
        {filteredTools.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Wrench className="w-16 h-16 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground">No tools found</p>
            <Button onClick={handleCreateTool} className="mt-4">
              <Plus className="w-4 h-4" />
              Create Your First Tool
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map((tool) => {
              const TypeIcon = typeConfig[tool.type].icon;
              return (
                <div
                  key={tool.id}
                  className={cn(
                    'bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-all',
                    tool.status === 'inactive' && 'opacity-60'
                  )}
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            tool.type === 'mcp' ? 'bg-blue-100' : 'bg-purple-100'
                          )}
                        >
                          <TypeIcon
                            className={cn('w-5 h-5', tool.type === 'mcp' ? 'text-blue-600' : 'text-purple-600')}
                          />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-card-foreground">{tool.name}</h3>
                          <Badge variant={typeConfig[tool.type].variant} className="mt-1">
                            {typeConfig[tool.type].label}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={tool.status === 'active' ? 'success' : 'default'}>
                          {tool.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                      {tool.description || 'No description provided'}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="px-4 py-3 border-t border-border bg-gray-50/50 rounded-b-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {tool.createdBy && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{tool.createdBy}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(tool.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleStatus(tool)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                          title={tool.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          {tool.status === 'active' ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEditTool(tool)}
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTool(tool.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tool Drawer */}
      <ToolDrawer
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTool}
        tool={editingTool}
      />
    </div>
  );
}
