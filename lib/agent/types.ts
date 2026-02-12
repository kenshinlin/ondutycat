import { Skill, Tool } from "@prisma/client";
import { Alert } from "../types";

/**
 * Skill match result
 */
export interface SkillMatch {
  skill: Skill;
  matchType: "semantic" | "manual_binding" | "none";
  confidence?: number;
}

/**
 * Alert processing context
 */
export interface AlertProcessingContext {
  tenantId: string;
  alerts: Alert[];
  matchedSkill?: Skill;
  availableTools: Tool[];
}

/**
 * Agent processing result
 */
export interface AgentProcessingResult {
  issueId: string;
  alertIds: string[];
  conclusion?: string;
  isRealIssue?: boolean;
  logs: AgentLog[];
  errors?: string[];
}

/**
 * Agent log entry
 */
export interface AgentLog {
  logType: "skill_matched" | "tool_called" | "reasoning" | "conclusion";
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Tool definition for LangChain agent
 */
export interface AgentTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}
