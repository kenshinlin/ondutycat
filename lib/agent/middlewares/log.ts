import { LogFunction, MiddlewareState } from "@/lib/types";
import { createMiddleware } from "langchain";
import { z } from "zod";

const contextSchema = z.object({
  // [!code highlight]
  tenantId: z.string(), // 当前 team ID，作为 agent 参数
  threadId: z.string(),
});

/**
 * 创建日志中间件
 * 使用结构化日志格式
 */
export const createLoggingMiddleware = (log: LogFunction) =>
  createMiddleware({
    name: "LoggingMiddleware",
    contextSchema,
    beforeModel: (state: MiddlewareState, runtime) => {
      const tenantId = runtime.context?.tenantId;
      const threadId = runtime.context?.threadId;

      const lastMessage = state.messages[state.messages.length - 1];
      // 使用结构化日志记录 AI 思考过程
      log(threadId, tenantId, {
        type: "ask_ai",
        timestamp: new Date().toISOString(),
        content: `Calling LLM: ${JSON.stringify(lastMessage.content).slice(0, 200)}...`,
      });
      return;
    },
    afterModel: (state: MiddlewareState, runtime) => {
      const tenantId = runtime.context?.tenantId;
      const threadId = runtime.context?.threadId;
      const lastMessage = state.messages[state.messages.length - 1];
      // AI 返回的回答内容
      log(threadId, tenantId, {
        type: "ai_response",
        timestamp: new Date().toISOString(),
        content: JSON.stringify(lastMessage.content).slice(0, 500),
      });
      return;
    },
    wrapToolCall: async (request, handler) => {
      const toolName = request.toolCall.name;
      const args = request.toolCall.args;
      const tenantId = request.runtime.context?.tenantId;
      const threadId = request.runtime.context?.threadId;

      try {
        // 记录工具调用开始
        log(threadId, tenantId, {
          type: "tool_call",
          timestamp: new Date().toISOString(),
          metadata: {
            toolName,
            parameters: args,
          },
        });

        const result = await handler(request);

        // 记录工具调用结果
        log(threadId, tenantId, {
          type: "tool_call",
          timestamp: new Date().toISOString(),
          metadata: {
            toolName,
            parameters: args,
          },
          result,
        });

        return result;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);

        // 记录工具调用错误
        log(threadId, tenantId, {
          type: "tool_call",
          timestamp: new Date().toISOString(),
          metadata: {
            toolName,
            parameters: args,
          },
          error: errorMessage,
        });

        throw e;
      }
    },
  });
