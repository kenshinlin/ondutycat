import { tool } from "langchain";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMCPClient } from "../mcp-util";
/**
 * Call MCP tool - LangChain tool for calling MCP tools
 */
export const callMcp = tool(
  async ({ toolId, toolName, arguments: args }, _config) => {
    try {
      if (!toolId) {
        return "Error: toolId is required";
      }

      // const tenantId = config?.context?.tenantId as string;

      const toolData = await prisma.tool.findFirst({
        where: {
          id: toolId,
        },
      });

      if (!toolData) {
        return `Tool with ID '${toolId}' not found.`;
      }

      const mcpJSON = (toolData.config as any)?.mcpServers;

      if (!mcpJSON) {
        return `Tool with ID '${toolId}' does not have MCP server configuration.`;
      }

      // Get MCP client
      const mcpClient = await getMCPClient(`${toolId}`, mcpJSON);

      // // List available tools to verify the tool exists
      // const { tools: availableTools } = await mcpClient.listTools();

      // Call the MCP tool
      const result = await mcpClient.callTool({
        name: toolName,
        arguments: args || {},
      });

      // Format the response
      if (result.isError) {
        return `Error calling MCP tool '${toolName}': ${JSON.stringify(result.content)}`;
      }

      // Format result content
      const content = result.content;

      return `MCP tool '${toolName}' executed successfully, result: \n\n${content}`;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return `Error calling MCP tool: ${errorMessage}`;
    }
  },
  {
    name: "call_mcp_tool",
    description: `Call an MCP (Model Context Protocol) tool by ID, tool name, arguments.

Use this when you need to execute a specific MCP tool. The tool configuration is stored in the database and contains connection details
for the MCP server, query by ID.

This tool supports both STDIO, SSE, HTTPSTREAM transport types for connecting to MCP servers.`,
    schema: z.object({
      toolId: z
        .string()
        .describe("The ID of the tool configuration to use for MCP connection"),
      toolName: z.string().describe("The name of the MCP tool to call"),
      arguments: z
        .record(z.string(), z.any())
        .optional()
        .describe("Arguments to pass to the MCP tool"),
    }),
  },
);
