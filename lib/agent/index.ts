/**
 * Agent Module Exports
 *
 * This module provides the agent functionality for processing alerts.
 *
 * Usage:
 *   import { agentOrchestrator } from '@/lib/agent';
 *   const results = await agentOrchestrator.processTenantAlerts(tenantId);
 */

export { AgentOrchestrator, agentOrchestrator } from './agent-orchestrator';
export { SkillMatcher, skillMatcher } from './skill-matcher';
export { AgentTools } from './tools';
export * from './types';
