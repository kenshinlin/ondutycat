import { ChatAnthropic } from "@langchain/anthropic";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { AgentProcessingResult, AgentLog } from "./types";
import { Alert, IssueStatus } from "@prisma/client";
import { skillMiddleware } from "./middlewares/skill";
import { MemorySaver } from "@langchain/langgraph";
import { xmlToJSON } from "../../utils/xml";
import { systemPrompt } from "./prompt";
import { callMcp } from "./tools/call-mcp";
import { runCodeTool } from "./tools/run-code";
import { loadTool } from "./tools/load-tool";
import { LogPayload, TAgent } from "../types";
import { createAgent } from "./util";
import { uuid } from "@/utils/utils";

interface AnalysisResult {
  analysis?: {
    summary?: string;
    detailed_analysis?: string;
    conclusion?: string;
    severity?: string;
    recommendation?: string;
  };
  isRealIssue?: boolean | null;
  error?: string;
}

/**
 * Agent Orchestrator - Manages alert processing using LangChain agent
 */
export class AgentOrchestrator {
  private model: ChatAnthropic | null = null;

  private agent: TAgent = null;

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
        log: this.logFn,
      });
    }
    return this.agent;
  }

  /**
   * Log function for middleware - writes logs to database
   */
  private logFn = (threadId: string, tenantId: string, logData: LogPayload) => {
    if (!threadId || !tenantId) {
      console.warn("logFn called without threadId or tenantId set");
      return;
    }

    const metadata = logData.metadata;

    try {
      // Write to database asynchronously (don't await to avoid blocking)
      prisma.threadLog
        .create({
          data: {
            threadId,
            tenantId,
            logType: logData.type,
            content: logData.content || "",
            metadata:
              metadata && Object.keys(metadata).length > 0
                ? metadata
                : Prisma.DbNull,
          },
        })
        .catch((error: unknown) => {
          console.error("Failed to write log to database:", error);
        });
    } catch (error) {
      console.error("Error in logFn:", error);
    }
  };

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
    // const tools = await this.getTenantTools(alerts[0].tenantId);

    const threadId = uuid();

    const issueId = await this.createIssue(alerts, threadId);

    // Step 3: Run LangChain agent to analyze
    const result = await this.invoke(alerts, threadId);

    // Step 4: Update issue with analysis results
    await prisma.issue.update({
      where: { id: issueId },
      data: {
        title: result.analysis?.summary,
        description: result.analysis?.detailed_analysis,
        aiConclusion: result.analysis?.conclusion,
        isRealIssue: result.isRealIssue ?? null,
        severity: result.analysis?.severity,
        recommendation: result.analysis?.recommendation,
        status: this.determineInitialStatus(result.isRealIssue),
      },
    });

    return [
      {
        issueId,
        alertIds: alerts.map((a) => a.id),
        conclusion: result.analysis?.conclusion,
        isRealIssue: result.isRealIssue ?? undefined,
        error: result.error,
      },
    ];
  }

  /**
   * Run LangChain agent to analyze alerts
   */
  private async invoke(
    alerts: Alert[],
    threadId: string,
  ): Promise<AnalysisResult> {
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
      const response = await this.getAgent().invoke(messages, {
        configurable: {
          runId: threadId,
          context: {
            tenantId: alerts[0].tenantId,
            threadId,
          },
        },
      });

      // Parse XML response
      const analysisResult = await this.parseXMLResponse(response);

      return {
        ...analysisResult,
        isRealIssue: this.determineIfRealIssueFromXML(analysisResult),
      };
    } catch (error) {
      console.error("Agent analysis error:", error);

      return {
        isRealIssue: null,
        error: (error as any).message || "agent error",
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
   * Create issue and link alerts
   */
  private async createIssue(
    alerts: Alert[],
    threadId: string,
  ): Promise<string> {
    // Create issue
    const issue = await prisma.issue.create({
      data: {
        tenantId: alerts[0].tenantId,
        threadId,
      },
    });

    // Update alert statuses and link to issue
    await prisma.alert.updateMany({
      where: {
        id: { in: alerts.map((a) => a.id) },
      },
      data: {
        status: "investigating",
        issueId: issue.id,
      },
    });

    return issue.id;
  }

  /**
   * Determine initial issue status from analysis result
   */
  private determineInitialStatus(
    isRealIssue: boolean | null | undefined,
  ): IssueStatus {
    if (isRealIssue === true) return "in_progress";
    if (isRealIssue === false) return "false_positive";
    return "analyzing";
  }
}

// Singleton instance
export const agentOrchestrator = new AgentOrchestrator();
