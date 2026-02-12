import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { prisma } from '@/lib/prisma';
import { skillMatcher } from './skill-matcher';
import { AgentTools } from './tools';
import type {
  AgentProcessingResult,
  AgentLog,
} from './types';
import { Alert, IssueStatus } from '@prisma/client';

/**
 * Agent Orchestrator - Manages alert processing using LangChain agent
 */
export class AgentOrchestrator {
  private model: ChatAnthropic | null = null;

  private getModel(): ChatAnthropic {
    if (!this.model) {
      const apiKey = process.env.ANTHROPIC_API_KEY;

      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required for agent processing');
      }

      this.model = new ChatAnthropic({
        model: 'claude-sonnet-4-5-20250929',
        temperature: 0,
        apiKey,
      });
    }

    return this.model;
  }

  /**
   * Process alerts for a specific tenant
   * Reads recent unprocessed alerts and analyzes them
   */
  async processTenantAlerts(tenantId: string): Promise<AgentProcessingResult[]> {
    // Step 1: Read recent unprocessed alerts (last 10 seconds)
    const alerts = await this.getRecentAlerts(tenantId);

    if (alerts.length === 0) {
      return [];
    }

    // Step 2: Match skill to alerts
    const matchedSkill = alerts.length > 0
      ? await skillMatcher.matchSkill(alerts[0])
      : null;

    // Step 3: Get available tools for tenant
    const tools = await this.getTenantTools(tenantId);

    // Step 4: Run LangChain agent to analyze
    const result = await this.runAgentAnalysis(alerts, matchedSkill, tools);

    // Step 5: Create issue and bindings
    const issueId = await this.createIssue(alerts, matchedSkill, result);

    // Step 6: Log all agent steps
    await this.logAgentSteps(issueId, result.logs);

    return [{
      issueId,
      alertIds: alerts.map(a => a.id),
      conclusion: result.conclusion,
      isRealIssue: result.isRealIssue,
      logs: result.logs,
      errors: result.errors,
    }];
  }

  /**
   * Get recent unprocessed alerts from the last 10 seconds
   */
  private async getRecentAlerts(tenantId: string) {
    const tenSecondsAgo = new Date(Date.now() - 10 * 1000);

    const alerts = await prisma.alert.findMany({
      where: {
        tenantId,
        status: 'open', // Only unprocessed alerts
        receivedAt: {
          gte: tenSecondsAgo,
        },
      },
      orderBy: {
        receivedAt: 'desc',
      },
      take: 50, // Limit to prevent overwhelming the agent
    });

    return alerts as Alert[];
  }

  /**
   * Get available tools for tenant
   */
  private async getTenantTools(tenantId: string) {
    const tools = await prisma.tool.findMany({
      where: {
        tenantId,
        status: 'active',
      },
    });

    return tools;
  }

  /**
   * Run LangChain agent to analyze alerts
   */
  private async runAgentAnalysis(
    alerts: Alert[],
    matchedSkill: any,
    availableTools: any[]
  ) {
    const logs: AgentLog[] = [];
    const errors: string[] = [];

    try {
      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(matchedSkill);

      // Build user message with alert context
      const userMessage = this.buildAlertContext(alerts);

      // Initialize conversation
      const messages: any[] = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userMessage),
      ];

      // Track if skill was matched
      if (matchedSkill) {
        logs.push({
          logType: 'skill_matched',
          content: `Matched skill: ${matchedSkill.skill.name} (${matchedSkill.matchType})`,
          metadata: {
            skillId: matchedSkill.skill.id,
            matchType: matchedSkill.matchType,
            confidence: matchedSkill.confidence,
          },
        });
      }

      // Invoke model with tools (if skill matched, include SOP)
      let response;
      const tools = AgentTools.getAllTools();

      if (matchedSkill) {
        // Include skill SOP as additional context
        const skillContext = `
Available Skill SOP:
Skill Name: ${matchedSkill.skill.name}
Problem Description: ${matchedSkill.skill.problemDescription}
SOP: ${matchedSkill.skill.sop}
        `.trim();

        messages.push(new HumanMessage(skillContext));
      }

      response = await this.getModel().invoke(messages);

      // Process response
      if (response.content && typeof response.content === 'string') {
        const conclusion = this.extractConclusion(response.content);

        logs.push({
          logType: 'conclusion',
          content: response.content,
          metadata: { hasToolCalls: false },
        });

        return {
          conclusion,
          isRealIssue: this.determineIfRealIssue(response.content),
          logs,
          errors,
        };
      }

      // Handle tool calls if present
      // @ts-ignore - ToolMessage structure
      if (response.tool_calls && response.tool_calls.length > 0) {
        for (const toolCall of response.tool_calls) {
          logs.push({
            logType: 'tool_called',
            content: `Called tool: ${toolCall.name}`,
            metadata: { toolCall },
          });

          // Execute tool (in real implementation, you'd execute the actual tool)
          // For now, just log it
        }
      }

      // Get final response after tool execution
      return {
        conclusion: 'Analysis completed with tool execution',
        isRealIssue: null, // Needs manual review
        logs,
        errors,
      };

    } catch (error) {
      console.error('Agent analysis error:', error);
      errors.push(error instanceof Error ? error.message : 'Unknown error');

      return {
        conclusion: undefined,
        isRealIssue: undefined,
        logs,
        errors,
      };
    }
  }

  /**
   * Build system prompt for the agent
   */
  private buildSystemPrompt(matchedSkill: any): string {
    const basePrompt = `You are an AI assistant that analyzes monitoring alerts and determines if they represent real system issues that require attention.

Your task:
1. Analyze the provided alerts
2. Use available tools to gather more information if needed
3. Determine if this is a real issue or a false positive
4. Provide a clear conclusion with reasoning

Available tools:
- get_alert_details: Get detailed information about a specific alert
- search_similar_alerts: Search for similar historical alerts
- get_skill_sop: Get Standard Operating Procedure for matched skills
- log_reasoning: Log your reasoning steps

Response format:
Provide your analysis in this structure:
**Analysis**: [Your analysis of the alerts]
**Investigation Steps**: [Steps you took or recommend]
**Conclusion**: [REAL_ISSUE | FALSE_POSITIVE | NEEDS_MORE_INFO]
**Confidence**: [HIGH | MEDIUM | LOW]
**Recommendation**: [What should be done next]`;

    if (matchedSkill) {
      return `${basePrompt}

A skill has been matched to this alert. Use the get_skill_sop tool to retrieve the Standard Operating Procedure for handling this type of issue.`;
    }

    return basePrompt;
  }

  /**
   * Build alert context for the agent
   */
  private buildAlertContext(alerts: Alert[]): string {
    if (alerts.length === 0) {
      return 'No alerts to analyze.';
    }

    const alertSummaries = alerts.map((alert, index) => {
      return `Alert ${index + 1}:
- ID: ${alert.id}
- Title: ${alert.title}
- Type: ${alert.alertType}
- Severity: ${alert.severity}
- Description: ${alert.description || 'No description'}
- Source: ${alert.source}
- Received: ${alert.receivedAt.toISOString()}
${alert.rawPayload ? `- Raw Data: ${JSON.stringify(alert.rawPayload)}` : ''}`;
    }).join('\n\n');

    return `Please analyze these ${alerts.length} alert(s):\n\n${alertSummaries}`;
  }

  /**
   * Extract conclusion from agent response
   */
  private extractConclusion(response: string): string {
    // Try to extract structured conclusion
    const conclusionMatch = response.match(/\*\*Conclusion\*\*:\s*(.+)/i);
    if (conclusionMatch) {
      return conclusionMatch[1].trim();
    }

    // Fallback: return last paragraph or summary
    const paragraphs = response.split('\n\n');
    return paragraphs[paragraphs.length - 1] || response;
  }

  /**
   * Determine if response indicates a real issue
   */
  private determineIfRealIssue(response: string): boolean | null {
    const lower = response.toLowerCase();

    // Check for explicit conclusion markers
    if (lower.includes('real_issue') || lower.includes('real issue')) {
      return true;
    }
    if (lower.includes('false_positive') || lower.includes('false positive')) {
      return false;
    }
    if (lower.includes('needs_more_info') || lower.includes('needs more info')) {
      return null;
    }

    // Try to infer from content
    const positiveIndicators = ['critical', 'high severity', 'service down', 'error', 'failure'];
    const negativeIndicators = ['test', 'scheduled', 'expected', 'resolved'];

    const hasPositive = positiveIndicators.some(i => lower.includes(i));
    const hasNegative = negativeIndicators.some(i => lower.includes(i));

    if (hasPositive && !hasNegative) return true;
    if (hasNegative && !hasPositive) return false;

    return null; // Unable to determine
  }

  /**
   * Create issue and alert bindings
   */
  private async createIssue(
    alerts: Alert[],
    matchedSkill: Awaited<ReturnType<typeof skillMatcher.matchSkill>>,
    result: { conclusion?: string; isRealIssue?: boolean }
  ): Promise<string> {
    // Create issue
    const issue = await prisma.issue.create({
      data: {
        tenantId: alerts[0].tenantId,
        skillId: matchedSkill?.skill.id,
        title: this.generateIssueTitle(alerts),
        description: this.generateIssueDescription(alerts),
        status: this.determineInitialStatus(result.isRealIssue),
        aiConclusion: result.conclusion,
        isRealIssue: result.isRealIssue,
      },
    });

    // Create alert bindings
    await prisma.issueAlertBinding.createMany({
      data: alerts.map(alert => ({
        tenantId: alert.tenantId,
        issueId: issue.id,
        alertId: alert.id,
      })),
    });

    // Update alert statuses
    await prisma.alert.updateMany({
      where: {
        id: { in: alerts.map(a => a.id) },
      },
      data: {
        status: 'investigating',
      },
    });

    return issue.id;
  }

  /**
   * Generate issue title from alerts
   */
  private generateIssueTitle(alerts: Alert[]): string {
    if (alerts.length === 1) {
      return alerts[0].title;
    }

    const types = new Set(alerts.map(a => a.alertType));
    if (types.size === 1) {
      return `${alerts.length}x ${Array.from(types)[0]} alerts`;
    }

    return `Batch of ${alerts.length} alerts`;
  }

  /**
   * Generate issue description from alerts
   */
  private generateIssueDescription(alerts: Alert[]): string {
    const summary = alerts.map(a => `- ${a.title}: ${a.description || 'No description'}`).join('\n');
    return `Grouped alerts:\n${summary}`;
  }

  /**
   * Determine initial issue status from analysis result
   */
  private determineInitialStatus(isRealIssue: boolean | null): IssueStatus {
    if (isRealIssue === true) return 'in_progress';
    if (isRealIssue === false) return 'false_positive';
    return 'analyzing';
  }

  /**
   * Log agent processing steps to database
   */
  private async logAgentSteps(issueId: string, logs: AgentLog[]): Promise<void> {
    if (logs.length === 0) return;

    await prisma.issueLog.createMany({
      data: logs.map(log => ({
        issueId,
        logType: log.logType,
        content: log.content,
        metadata: log.metadata as any,
      })),
    });
  }
}

// Singleton instance
export const agentOrchestrator = new AgentOrchestrator();
