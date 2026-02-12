import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { prisma } from "@/lib/prisma";
import type { AgentProcessingResult, AgentLog } from "./types";
import { Alert, IssueStatus } from "@prisma/client";
import { createAgent } from "langchain";
import { skillMiddleware } from "./middlewares/skill";
import { MemorySaver } from "@langchain/langgraph";
import { xmlToJSON } from "../utils/xml";
import { systemPrompt } from "./prompt";
import { callMcp } from "./tools/call-mcp";
import { runCodeTool } from "./tools/run-code";
import { loadTool } from "./tools/load-tool";

interface AnalysisResult {
  analysis?: {
    summary?: string;
    detailed_analysis?: string;
    conclusion?: string;
    severity?: string;
    recommendation?: string;
  };
  isRealIssue?: boolean | null;
  logs?: AgentLog[];
  errors?: string[];
}

/**
 * Agent Orchestrator - Manages alert processing using LangChain agent
 */
export class AgentOrchestrator {
  private model: ChatAnthropic | null = null;

  private agent: ReturnType<typeof createAgent> | null = null;

  private getModel(): ChatAnthropic {
    if (!this.model) {
      const apiKey = process.env.ANTHROPIC_API_KEY;

      if (!apiKey) {
        throw new Error(
          "ANTHROPIC_API_KEY environment variable is required for agent processing",
        );
      }

      this.model = new ChatAnthropic({
        model: "claude-sonnet-4-5-20250929",
        temperature: 0,
        apiKey,
      });
    }

    return this.model;
  }

  private getAgent() {
    if (!this.agent) {
      this.agent = createAgent({
        model: this.model || this.getModel(),
        tools: [loadTool, callMcp, runCodeTool],
        systemPrompt: this.buildSystemPrompt(),
        middleware: [skillMiddleware],
        checkpointer: new MemorySaver(),
      });
    }
    return this.agent;
  }

  /**
   * Process alerts for a specific tenant
   * Analyzes the provided alerts and creates issues
   */
  async processTenantAlerts(alerts: Alert[]): Promise<AgentProcessingResult[]> {
    if (alerts.length === 0) {
      return [];
    }

    // Step 1: Match skill to alerts
    // const matchedSkill = await skillMatcher.matchSkills(alerts);

    // Step 2: Get available tools for tenant
    const tools = await this.getTenantTools(alerts[0].tenantId);

    // Step 3: Run LangChain agent to analyze
    const result = await this.invoke(alerts);

    // Step 4: Create issue and bindings
    const issueId = await this.createIssue(alerts, result);

    // Step 5: Log all agent steps
    await this.logAgentSteps(issueId, result.logs);

    return [
      {
        issueId,
        alertIds: alerts.map((a) => a.id),
        conclusion: result.conclusion,
        isRealIssue: result.isRealIssue ?? undefined,
        logs: result.logs,
        errors: result.errors,
      },
    ];
  }

  /**
   * Get available tools for tenant
   */
  private async getTenantTools(tenantId: string) {
    const tools = await prisma.tool.findMany({
      where: {
        tenantId,
        status: "active",
      },
    });

    return tools;
  }

  /**
   * Run LangChain agent to analyze alerts
   */
  private async invoke(alerts: Alert[]): Promise<AnalysisResult> {
    const logs: AgentLog[] = [];
    const errors: string[] = [];

    try {
      // Build system prompt
      const systemPrompt = this.buildSystemPrompt();

      // Build user message with alert context
      const userMessage = this.buildAlertContext(alerts);

      // Initialize conversation
      const messages: any[] = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userMessage),
      ];

      // Invoke model with tools
      const response = await this.getAgent().invoke(messages);

      // Parse XML response
      const analysisResult = await this.parseXMLResponse(response);

      return {
        ...analysisResult,
        isRealIssue: this.determineIfRealIssueFromXML(analysisResult),
        logs,
        errors,
      };
    } catch (error) {
      console.error("Agent analysis error:", error);
      errors.push(error instanceof Error ? error.message : "Unknown error");

      return {
        isRealIssue: null,
        logs,
        errors,
      };
    }
  }

  /**
   * Parse XML response from agent
   */
  private async parseXMLResponse(
    response: any,
  ): Promise<AnalysisResult | null> {
    try {
      const responseText =
        typeof response === "string" ? response : JSON.stringify(response);

      // Extract XML from response (in case there's text before/after)
      const xmlMatch = responseText.match(/<analysis>[\s\S]*?<\/analysis>/);
      if (!xmlMatch) {
        console.warn("No XML analysis found in response");
        return null;
      }

      const xmlContent = xmlMatch[0];
      const result = await xmlToJSON(xmlContent);

      return result as AnalysisResult;
    } catch (error) {
      console.error("XML parsing error:", error);
      return null;
    }
  }

  /**
   * Determine if response indicates a real issue from parsed XML
   */
  private determineIfRealIssueFromXML(
    result: AnalysisResult | null,
  ): boolean | null {
    if (!result?.analysis?.conclusion) {
      return null;
    }

    const conclusion = result.analysis.conclusion?.toUpperCase();

    if (conclusion.includes("REAL_ISSUE") || conclusion === "REAL_ISSUE") {
      return true;
    }
    if (
      conclusion.includes("FALSE_POSITIVE") ||
      conclusion === "FALSE_POSITIVE"
    ) {
      return false;
    }
    if (
      conclusion.includes("NEEDS_MORE_INFO") ||
      conclusion === "NEEDS_MORE_INFO"
    ) {
      return null;
    }

    return null;
  }

  /**
   * Build system prompt for the agent
   */
  private buildSystemPrompt(): string {
    return systemPrompt;
  }

  /**
   * Build alert context for the agent
   */
  private buildAlertContext(alerts: Alert[]): string {
    if (alerts.length === 0) {
      return "No alerts to analyze.";
    }

    const alertSummaries = alerts
      .map((alert, index) => {
        return `Alert ${index + 1}:
- ID: ${alert.id}
- Title: ${alert.title}
- Type: ${alert.alertType}
- Severity: ${alert.severity}
- Description: ${alert.description || "No description"}
- Source: ${alert.source}
- Received: ${alert.receivedAt.toISOString()}
${alert.rawPayload ? `- Raw Data: ${JSON.stringify(alert.rawPayload)}` : ""}`;
      })
      .join("\n\n");

    return `Please analyze these ${alerts.length} alert(s):\n\n${alertSummaries}`;
  }

  /**
   * Create issue and alert bindings
   */
  private async createIssue(
    alerts: Alert[],
    result: { conclusion?: string; isRealIssue?: boolean | null },
  ): Promise<string> {
    // Get first matched skill ID if available

    // Create issue
    const issue = await prisma.issue.create({
      data: {
        tenantId: alerts[0].tenantId,
        title: this.generateIssueTitle(alerts),
        description: this.generateIssueDescription(alerts),
        status: this.determineInitialStatus(result.isRealIssue ?? null),
        aiConclusion: result.conclusion,
        isRealIssue: result.isRealIssue ?? null,
      },
    });

    // Create alert bindings
    await prisma.issueAlertBinding.createMany({
      data: alerts.map((alert) => ({
        tenantId: alert.tenantId,
        issueId: issue.id,
        alertId: alert.id,
      })),
    });

    // Update alert statuses
    await prisma.alert.updateMany({
      where: {
        id: { in: alerts.map((a) => a.id) },
      },
      data: {
        status: "investigating",
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

    const types = new Set(alerts.map((a) => a.alertType));
    if (types.size === 1) {
      return `${alerts.length}x ${Array.from(types)[0]} alerts`;
    }

    return `Batch of ${alerts.length} alerts`;
  }

  /**
   * Generate issue description from alerts
   */
  private generateIssueDescription(alerts: Alert[]): string {
    const summary = alerts
      .map((a) => `- ${a.title}: ${a.description || "No description"}`)
      .join("\n");
    return `Grouped alerts:\n${summary}`;
  }

  /**
   * Determine initial issue status from analysis result
   */
  private determineInitialStatus(isRealIssue: boolean | null): IssueStatus {
    if (isRealIssue === true) return "in_progress";
    if (isRealIssue === false) return "false_positive";
    return "analyzing";
  }

  /**
   * Log agent processing steps to database
   */
  private async logAgentSteps(
    issueId: string,
    logs: AgentLog[],
  ): Promise<void> {
    if (logs.length === 0) return;

    await prisma.issueLog.createMany({
      data: logs.map((log) => ({
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
