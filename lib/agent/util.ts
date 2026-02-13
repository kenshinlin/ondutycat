/**
 * Agent 工具函数
 * 日志中间件和错误处理中间件
 */

import {
  createMiddleware,
  createAgent as langchainCreateAgent,
  ResponseFormat,
  toolStrategy,
  CreateAgentParams,
} from "langchain";

import { HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { createFilesystemMiddleware } from "deepagents";
import { LogFunction } from "../types";
import { createToolErrorhandlerMiddleware } from "./middlewares/tool-error";
import { createLoggingMiddleware } from "./middlewares/log";

/**
 * 文件系统配置类型
 */
export interface FilesystemConfig {
  backend?: unknown;
  customToolDescriptions?: {
    ls?: string;
    read_file?: string;
    write_file?: string;
    edit_file?: string;
  };
}

/**
 * 创建 Agent 配置类型
 */
export interface CreateAgentConfig extends CreateAgentParams {
  // model?: string | LanguageModelLike;
  // systemPrompt: string;
  // middleware?: Array<ReturnType<typeof createMiddleware>>;
  // responseFormat?: (ResponseFormat | undefined) & ResponseFormat;
  log?: LogFunction;
  maxAttempts?: number;
  withFiles?: boolean | FilesystemConfig;
  // tools?: (DynamicTool | DynamicStructuredTool)[];
  // checkpointer?:
}

/**
 * 格式化响应
 * 用于解析包含工具调用结果的消息内容
 */
export async function formatResponse<T>(params: {
  content: unknown;
  responseFormat: ResponseFormat;
  log?: LogFunction;
}): Promise<T> {
  const agent = createAgent({
    systemPrompt: "Transform the following content to JSON: ",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    responseFormat: toolStrategy(params.responseFormat as any) as any,
    log: params.log,
    maxAttempts: 1,
  });

  const result = await agent.invoke({
    messages: [new HumanMessage(JSON.stringify(params.content))],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.structuredResponse as T;
}

/**
 * 创建 Agent 的统一封装函数
 *
 * 默认使用：
 * - ChatOpenAI with deepseek-chat model
 * - ToolErrorHandlerMiddleware (maxAttempts: 3)
 * - LoggingMiddleware (如果提供 log 函数)
 * - FilesystemMiddleware (如果 withFiles 为 true 或提供了配置)
 *
 * @param config - Agent 配置
 * @returns Agent 实例
 */
export const createAgent = (config: Partial<CreateAgentConfig>) => {
  // 使用默认 model 或传入的 model
  const model =
    config.model ||
    new ChatOpenAI({
      model: "deepseek-chat",
      temperature: 0.7,
      apiKey: process.env.DEEPSEEK_API_KEY,
      configuration: {
        baseURL: "https://api.deepseek.com/v1",
      },
    });

  // 构建默认中间件
  const middleware = config.middleware || [];
  const defaultMiddleware: Array<ReturnType<typeof createMiddleware>> = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createToolErrorhandlerMiddleware(config.maxAttempts || 3) as any,
  ];

  // 如果提供了 log 函数，添加日志中间件
  if (config.log) {
    defaultMiddleware.push(createLoggingMiddleware(config.log));
  }

  // 如果需要文件系统中间件
  if (config.withFiles) {
    const fsConfig: FilesystemConfig =
      typeof config.withFiles === "object" ? config.withFiles : {};
    defaultMiddleware.push(
      createFilesystemMiddleware({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        backend: (fsConfig.backend || undefined) as any,
        customToolDescriptions: fsConfig.customToolDescriptions || {
          ls: "使用 ls 工具列出文件列表",
          read_file: "使用 read_file 工具读取文件内容",
          // write_file: "使用 write_file 工具写入文件内容到 /temp/ 目录",
          edit_file:
            "使用 edit_file 工具修改文件内容，必须传 file_path, old_string, new_string 参数",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any,
    );
  }

  return langchainCreateAgent({
    model: model,
    systemPrompt: config.systemPrompt,
    tools: config.tools,
    // responseFormat 必填？？
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    responseFormat: config.responseFormat as any,
    middleware: [...defaultMiddleware, ...middleware],
  });
};
