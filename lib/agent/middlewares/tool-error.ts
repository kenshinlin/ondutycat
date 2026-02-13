import { createMiddleware, ToolMessage } from "langchain";
export { toolStrategy } from "langchain";

/**
 * 创建工具错误处理中间件
 */
export const createToolErrorhandlerMiddleware = (maxAttempts: number = 1) => {
  return createMiddleware({
    name: "ToolRetryWithErrorHandling",
    wrapToolCall: async (request, handler) => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          // 执行工具
          const result = await handler(request);
          return result;
        } catch (error) {
          // 安全地获取错误信息
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          // 如果是最后一次重试，返回错误信息给 Agent
          if (attempt === maxAttempts - 1) {
            console.error("tool execute error", String(error));
            console.error("tool execute error", errorMessage);
            return new ToolMessage({
              content: `Fail, please fix, or try other tools,Error：\n${errorMessage}`,
              tool_call_id: request.toolCall.id || "unknown",
            });
          }

          // 还有重试机会，记录日志并继续
          console.log(
            `重试 ${attempt + 1}/${maxAttempts} 后出错: ${errorMessage}`,
          );
        }
      }

      // 理论上无法到达这里
      throw new Error("max retry attempts exceeded");
    },
  });
};
