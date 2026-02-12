import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { AgentTool } from './types';

/**
 * Define tools that the agent can use to investigate alerts
 */
export class AgentTools {
  /**
   * Get detailed information about a specific alert
   */
  static getAlertDetails() {
    return {
      name: 'get_alert_details',
      description: 'Get detailed information about a specific alert including its payload, source, and history',
      inputSchema: {
        type: 'object',
        properties: {
          alertId: {
            type: 'string',
            description: 'The UUID of the alert to fetch details for',
          },
        },
        required: ['alertId'],
      },
      handler: async ({ alertId }: { alertId: string }) => {
        const alert = await prisma.alert.findUnique({
          where: { id: alertId },
          include: {
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        if (!alert) {
          return JSON.stringify({ error: 'Alert not found' });
        }

        return JSON.stringify({
          id: alert.id,
          title: alert.title,
          description: alert.description,
          alertType: alert.alertType,
          severity: alert.severity,
          source: alert.source,
          status: alert.status,
          receivedAt: alert.receivedAt,
          rawPayload: alert.rawPayload,
          assignedTo: alert.assignedUser,
        });
      },
    };
  }

  /**
   * Search for similar historical alerts
   */
  static searchSimilarAlerts() {
    return {
      name: 'search_similar_alerts',
      description: 'Search for similar historical alerts that might help understand the current alert pattern',
      inputSchema: {
        type: 'object',
        properties: {
          tenantId: {
            type: 'string',
            description: 'The tenant ID to search within',
          },
          keywords: {
            type: 'string',
            description: 'Keywords to search for in alert titles and descriptions',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of similar alerts to return',
            default: 5,
          },
        },
        required: ['tenantId', 'keywords'],
      },
      handler: async ({ tenantId, keywords, limit = 5 }: { tenantId: string; keywords: string; limit?: number }) => {
        const keywordArray = keywords.split(/\s+/).filter(k => k.length > 2);

        const alerts = await prisma.alert.findMany({
          where: {
            tenantId,
            OR: keywordArray.map(keyword => ({
              OR: [
                { title: { contains: keyword, mode: 'insensitive' } },
                { description: { contains: keyword, mode: 'insensitive' } },
                { alertType: { contains: keyword, mode: 'insensitive' } },
              ],
            })),
          },
          take: limit,
          orderBy: { receivedAt: 'desc' },
          select: {
            id: true,
            title: true,
            description: true,
            alertType: true,
            severity: true,
            status: true,
            receivedAt: true,
          },
        });

        return JSON.stringify({
          count: alerts.length,
          alerts,
        });
      },
    };
  }

  /**
   * Get skill SOP for reference
   */
  static getSkillSOP() {
    return {
      name: 'get_skill_sop',
      description: 'Get the Standard Operating Procedure (SOP) for a specific skill',
      inputSchema: {
        type: 'object',
        properties: {
          skillId: {
            type: 'string',
            description: 'The UUID of the skill to get SOP for',
          },
        },
        required: ['skillId'],
      },
      handler: async ({ skillId }: { skillId: string }) => {
        const skill = await prisma.skill.findUnique({
          where: { id: skillId },
        });

        if (!skill) {
          return JSON.stringify({ error: 'Skill not found' });
        }

        return JSON.stringify({
          name: skill.name,
          problemDescription: skill.problemDescription,
          sop: skill.sop,
        });
      },
    };
  }

  /**
   * Log a reasoning step
   */
  static logReasoning() {
    return {
      name: 'log_reasoning',
      description: 'Log a reasoning step during the analysis process',
      inputSchema: {
        type: 'object',
        properties: {
          thought: {
            type: 'string',
            description: 'The reasoning or thought process to log',
          },
        },
        required: ['thought'],
      },
      handler: async ({ thought }: { thought: string }) => {
        // This will be handled by the agent orchestrator
        return JSON.stringify({
          type: 'reasoning',
          content: thought,
          timestamp: new Date().toISOString(),
        });
      },
    };
  }

  /**
   * Execute a custom code tool
   */
  static executeCustomTool() {
    return {
      name: 'execute_custom_tool',
      description: 'Execute a custom JavaScript code tool defined in the system',
      inputSchema: {
        type: 'object',
        properties: {
          toolId: {
            type: 'string',
            description: 'The UUID of the custom tool to execute',
          },
          input: {
            type: 'object',
            description: 'Input parameters to pass to the tool',
          },
        },
        required: ['toolId', 'input'],
      },
      handler: async ({ toolId, input }: { toolId: string; input: Record<string, unknown> }) => {
        const tool = await prisma.tool.findUnique({
          where: { id: toolId },
        });

        if (!tool || tool.type !== 'custom_code') {
          return JSON.stringify({ error: 'Custom tool not found' });
        }

        if (tool.status !== 'active') {
          return JSON.stringify({ error: 'Tool is not active' });
        }

        try {
          // WARNING: Executing arbitrary JavaScript code is dangerous
          // In production, use proper sandboxing (e.g., vm2, isolated-vm)
          // This is a simplified implementation for demonstration
          const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
          const fn = new AsyncFunction('input', 'params', tool.customCode || '');
          const result = await fn(input, { console });

          return JSON.stringify({
            success: true,
            result,
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },
    };
  }

  /**
   * Get all available tools as LangChain tool format
   */
  static getAllTools(): AgentTool[] {
    return [
      {
        name: 'get_alert_details',
        description: 'Get detailed information about a specific alert including its payload, source, and history',
        inputSchema: {
          type: 'object',
          properties: {
            alertId: { type: 'string' },
          },
          required: ['alertId'],
        },
      },
      {
        name: 'search_similar_alerts',
        description: 'Search for similar historical alerts that might help understand the current alert pattern',
        inputSchema: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            keywords: { type: 'string' },
            limit: { type: 'number' },
          },
          required: ['tenantId', 'keywords'],
        },
      },
      {
        name: 'get_skill_sop',
        description: 'Get the Standard Operating Procedure (SOP) for a specific skill',
        inputSchema: {
          type: 'object',
          properties: {
            skillId: { type: 'string' },
          },
          required: ['skillId'],
        },
      },
      {
        name: 'log_reasoning',
        description: 'Log a reasoning step during the analysis process',
        inputSchema: {
          type: 'object',
          properties: {
            thought: { type: 'string' },
          },
          required: ['thought'],
        },
      },
    ];
  }
}
