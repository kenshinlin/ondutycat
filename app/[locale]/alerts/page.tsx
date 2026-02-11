'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Bell,
  Search,
  AlertTriangle,
  AlertCircle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  User,
  Eye,
  MoreVertical,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type Severity = 'critical' | 'high' | 'medium' | 'low';
type Status = 'open' | 'investigating' | 'resolved' | 'falsePositive' | 'ignored';

interface Alert {
  id: string;
  severity: Severity;
  status: Status;
  source: string;
  message: string;
  triggeredAt: string;
  assignedTo?: string;
  aiAnalysis?: string;
}

const mockAlerts: Alert[] = [
  {
    id: 'ALT-001',
    severity: 'critical',
    status: 'open',
    source: 'Prometheus',
    message: 'API response time exceeded 5s threshold for 5 minutes',
    triggeredAt: '2025-01-15T10:30:00Z',
    assignedTo: 'John Doe',
  },
  {
    id: 'ALT-002',
    severity: 'high',
    status: 'investigating',
    source: 'CloudWatch',
    message: 'Database connection pool utilization at 95%',
    triggeredAt: '2025-01-15T10:15:00Z',
    assignedTo: 'Jane Smith',
    aiAnalysis: 'Possible connection leak detected. Review database connection settings and verify proper connection closure in application code.',
  },
  {
    id: 'ALT-003',
    severity: 'medium',
    status: 'open',
    source: 'Datadog',
    message: 'Memory usage trending upward on web-server-03',
    triggeredAt: '2025-01-15T09:45:00Z',
  },
  {
    id: 'ALT-004',
    severity: 'low',
    status: 'resolved',
    source: 'Prometheus',
    message: 'Brief spike in error rate on login service',
    triggeredAt: '2025-01-15T09:00:00Z',
    assignedTo: 'System',
  },
  {
    id: 'ALT-005',
    severity: 'high',
    status: 'falsePositive',
    source: 'CloudWatch',
    message: 'CPU usage spike detected on backup-server',
    triggeredAt: '2025-01-15T08:30:00Z',
  },
];

const severityConfig: Record<Severity, { icon: typeof AlertTriangle; color: string; bgClass: string }> = {
  critical: { icon: AlertOctagon, color: 'text-red-600', bgClass: 'bg-red-50 border-red-200' },
  high: { icon: AlertTriangle, color: 'text-orange-600', bgClass: 'bg-orange-50 border-orange-200' },
  medium: { icon: AlertCircle, color: 'text-yellow-600', bgClass: 'bg-yellow-50 border-yellow-200' },
  low: { icon: Bell, color: 'text-blue-600', bgClass: 'bg-blue-50 border-blue-200' },
};

const statusConfig: Record<Status, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
  open: { variant: 'danger', label: 'Open' },
  investigating: { variant: 'warning', label: 'Investigating' },
  resolved: { variant: 'success', label: 'Resolved' },
  falsePositive: { variant: 'info', label: 'False Positive' },
  ignored: { variant: 'default', label: 'Ignored' },
};

export default function AlertsPage() {
  const t = useTranslations('alerts');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<Status | 'all'>('all');

  const filteredAlerts = mockAlerts.filter((alert) => {
    const matchesSearch = alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.source.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = selectedSeverity === 'all' || alert.severity === selectedSeverity;
    const matchesStatus = selectedStatus === 'all' || alert.status === selectedStatus;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex-none px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-linear-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{t('title')}</h1>
              <p className="text-sm text-muted-foreground">{t('description')}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{filteredAlerts.length}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {filteredAlerts.filter(a => a.severity === 'critical').length}
              </div>
              <div className="text-xs text-muted-foreground">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {filteredAlerts.filter(a => a.severity === 'high').length}
              </div>
              <div className="text-xs text-muted-foreground">High</div>
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
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>

          {/* Severity Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value as Severity | 'all')}
            className="h-9 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">{t('filterBySeverity')}</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as Status | 'all')}
            className="h-9 px-3 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">{t('filterByStatus')}</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="falsePositive">False Positive</option>
            <option value="ignored">Ignored</option>
          </select>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="flex-1 overflow-y-auto bg-white">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bell className="w-16 h-16 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground">{t('noAlerts')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Triggered At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Analysis</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAlerts.map((alert) => {
                  const SeverityIcon = severityConfig[alert.severity].icon;
                  const statusConf = statusConfig[alert.status];

                  return (
                    <tr key={alert.id} className="hover:bg-gray-50 transition-colors">
                      {/* ID */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-600">
                        {alert.id}
                      </td>

                      {/* Severity */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={cn('p-1.5 rounded border', severityConfig[alert.severity].bgClass)}>
                            <SeverityIcon className={cn('w-4 h-4', severityConfig[alert.severity].color)} />
                          </div>
                          <span className={cn('text-sm font-medium capitalize', severityConfig[alert.severity].color)}>
                            {alert.severity}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={statusConf.variant}>{statusConf.label}</Badge>
                      </td>

                      {/* Message */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900 max-w-md truncate">{alert.message}</p>
                      </td>

                      {/* Source */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="info">{alert.source}</Badge>
                      </td>

                      {/* Triggered At */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(alert.triggeredAt).toLocaleString()}
                        </div>
                      </td>

                      {/* Assigned To */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {alert.assignedTo ? (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {alert.assignedTo}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* AI Analysis */}
                      <td className="px-6 py-4">
                        {alert.aiAnalysis ? (
                          <div className="flex items-start gap-1 max-w-xs">
                            <div className="w-4 h-4 rounded bg-blue-100 flex items-center justify-center flex-none mt-0.5">
                              <span className="text-[10px] font-medium text-blue-600">AI</span>
                            </div>
                            <p className="text-xs text-gray-600 line-clamp-2">{alert.aiAnalysis}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
