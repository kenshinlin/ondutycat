// Alert types
export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus = 'open' | 'investigating' | 'resolved' | 'falsePositive' | 'ignored';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  source: string;
  message: string;
  triggeredAt: string;
  resolvedAt?: string;
  assignedTo?: string;
  aiAnalysis?: string;
  metadata?: Record<string, any>;
}

// Menu types
export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  href: string;
  children?: MenuItem[];
}
