import { tool } from "langchain";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getMCPClient } from "../mcp-util";

export const loadTool = tool(
  async ({ toolId, name }) => {
    if (!toolId || !name) {
      return "Error: toolId and name is required";
    }

    // Find and return the requested tools
    const toolData = await prisma.tool.findFirst({
      where: {
        id: toolId,
      },
    });

    if (!toolData) {
      return `No tool found with the provided ID: ${toolId}`;
    }

    // if (toolData.status !== "active") {
    //   return `Tool with ID '${toolId}' is not active. Current status: ${toolData.status}`;
    // }

    let result = "";
    result += `## Loaded tool
- Name: ${toolData.name}
- Tool ID: ${toolData.id}

## Description:
${toolData.description || "No description"}

## Type
${toolData.type}
`;

    // If type is mcp, fetch tools from MCP server
    if (toolData.type === "mcp") {
      const mcpJSON = (toolData.config as any)?.mcpServers;

      if (mcpJSON) {
        try {
          // Get MCP client using toolData.name as cache key
          const mcpClient = await getMCPClient(toolData.name, mcpJSON);

          // List available tools from MCP server
          const { tools: availableTools } = await mcpClient.listTools();

          const targetToolName = name.includes(".") ? name.split(".")[1] : name; // The specific tool name to find and display
          // Find the tool that matches the provided name
          const matchedTool = availableTools.find(
            (tool: any) => tool.name === targetToolName,
          );

          if (matchedTool) {
            result += `
## MCP Tool: ${matchedTool.name}

${matchedTool.description || "No description"}

**Input Schema:**
\`\`\`json
${JSON.stringify(matchedTool.inputSchema, null, 2)}
\`\`\`

`;
          } else {
            result += `\n⚠️ No MCP tool found with name: ${name}\n\n`;
            result += `## Available MCP Tools (${availableTools.length} tools)\n\n`;
            availableTools.forEach((tool: any, index: number) => {
              result += `${index + 1}. ${tool.name}\n`;
            });
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          result += `\n⚠️ Error loading MCP tools: ${errorMessage}\n`;
        }
      } else {
        result += `\n⚠️ No MCP server configuration found.\n`;
      }
    }

    result += `## Config
${JSON.stringify(toolData.config, null, 2)}\n\n`;

    return result;
  },
  {
    name: "load_tool",
    description: `Load the full information of tool into the agent's context.

Use this when you need detailed information about specific tool, including
their configuration, description, and type. This will provide you with
comprehensive information about each tool.`,
    schema: z.object({
      toolId: z.string().describe("The ID of the tool to load"),
      name: z.string().describe("The name of the tool to load"),
    }),
  },
);
