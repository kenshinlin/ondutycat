import { tool } from "langchain";
import { z } from "zod";
import { getMCPClient } from "../mcp-util";
import prisma from "@/lib/prisma";

/**
 * lOAD MCP tools - LangChain tool for loading MCP tools
 */
export const loadMcpTools = tool(
  async ({ toolId }, _config) => {
    try {
      if (!toolId) {
        return "Error: toolId is required";
      }

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

      // const tenantId = config?.context?.tenantId as string;

      // Get MCP client
      const mcpClient = await getMCPClient(`${toolId}`, mcpJSON);

      // List available tools to verify the tool exists
      const { tools: availableTools } = await mcpClient.listTools();

      let tools = availableTools.map((tool) => ({
        type: "function",
        function: {
          name: `${tool.name}`,
          description: `${tool.description}`,
          parameters: tool.inputSchema,
        },
      }));

      return JSON.stringify(tools, null, 2);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return `Error loading MCP tools: ${errorMessage}`;
    }
  },
  {
    name: "load_mcp_tools",
    description: `Load and return the list of available MCP (Model Context Protocol) tools for a given tool ID.

Use this when you need to retrieve the list of available MCP tools for a specific tool configuration.
The tool configuration is stored in the database and contains connection details for the MCP server.

This tool supports both STDIO, SSE, HTTPSTREAM transport types for connecting to MCP servers.`,
    schema: z.object({
      toolId: z.string().describe("The ID of the tool configuration to LOAD"),
    }),
  },
);
