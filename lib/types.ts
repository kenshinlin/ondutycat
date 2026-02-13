import { IssueLogType } from "@prisma/client";
import { createAgent } from "langchain";

// Alert types
export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertStatus =
  | "open"
  | "investigating"
  | "resolved"
  | "falsePositive"
  | "ignored";

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

/**
 * 日志负载类型
 * 定义日志中间件传递的数据结构
 */
export interface LogPayload {
  type: IssueLogType;
  timestamp?: string;
  content?: string;
  metadata?: {
    toolName: string;
    parameters?: Record<string, any>;
  };
  result?: unknown;
  error?: string;
}

/**
 * 日志函数类型
 * 支持字符串（向后兼容）和结构化日志
 */
export type LogFunction = (
  threadId: string,
  tenantId: string,
  message: LogPayload,
) => void;

/**
 * 中间件状态类型
 */
export interface MiddlewareState {
  messages: Array<{ content: unknown }>;
}

export type TAgent = ReturnType<typeof createAgent> | null;
