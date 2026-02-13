import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMCPClient } from "@/lib/agent/mcp-util";

/**
 * API endpoint to get MCP tool list
 *
 * GET /api/mcp-tools?tool_id={toolId}
 *
 * Query params:
 *   - tool_id: The ID of the tool in the database
 *
 * Returns:
 *   - tools: Array of MCP tools with name and params
 *
 * Example:
 *   GET /api/mcp-tools?tool_id=abc-123-def
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const toolId = searchParams.get("tool_id");

    if (!toolId) {
      return NextResponse.json(
        { error: "Missing required parameter: tool_id" },
        { status: 400 }
      );
    }

    // Step 1: Get tool configuration from database
    const toolData = await prisma.tool.findFirst({
      where: {
        id: toolId,
      },
    });

    if (!toolData) {
      return NextResponse.json(
        { error: `Tool with ID '${toolId}' not found` },
        { status: 404 }
      );
    }

    // Step 2: Extract MCP server configuration from tool config
    const mcpJSON = (toolData.config as any)?.mcpServers;

    if (!mcpJSON) {
      return NextResponse.json(
        {
          error: `Tool with ID '${toolId}' does not have MCP server configuration`,
        },
        { status: 400 }
      );
    }

    // Step 3: Get MCP client and list available tools
    const mcpClient = await getMCPClient(toolId, mcpJSON);
    const { tools: availableTools } = await mcpClient.listTools();

    // Step 4: Format response with tool name and params
    const tools = availableTools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      params: tool.inputSchema,
    }));

    return NextResponse.json({
      success: true,
      toolId: toolData.id,
      toolName: toolData.name,
      tools,
      count: tools.length,
    });
  } catch (error) {
    console.error("Error fetching MCP tools:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
