import { NextRequest, NextResponse } from "next/server";

/**
 * Mock API endpoint for testing MCP tool selection UI/UX
 * This simulates the response from /api/mcp-tools for development testing
 *
 * GET /api/mcp-tools-mock?tool_id=xxx
 *
 * Returns different mock MCP tools based on tool_id prefix
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const toolId = searchParams.get("tool_id");

  if (!toolId) {
    return NextResponse.json(
      { error: "Missing required parameter: tool_id" },
      { status: 400 }
    );
  }

  // Mock MCP tools based on tool ID
  let mockMcpTools: any[] = [];

  if (toolId.includes("fs")) {
    // Filesystem MCP tools
    mockMcpTools = [
      {
        name: "read_file",
        description: "Read the complete contents of a file",
        params: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path of the file to read"
            }
          },
          required: ["path"]
        }
      },
      {
        name: "write_file",
        description: "Create or overwrite a file with content",
        params: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path of the file to write"
            },
            content: {
              type: "string",
              description: "Content to write to the file"
            }
          },
          required: ["path", "content"]
        }
      },
      {
        name: "list_directory",
        description: "List contents of a directory",
        params: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path of the directory to list"
            }
          },
          required: ["path"]
        }
      },
      {
        name: "search_files",
        description: "Search for files matching a pattern",
        params: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to search in"
            },
            pattern: {
              type: "string",
              description: "Search pattern (glob)"
            }
          },
          required: ["path", "pattern"]
        }
      }
    ];
  } else if (toolId.includes("pg")) {
    // PostgreSQL MCP tools
    mockMcpTools = [
      {
        name: "query",
        description: "Execute a PostgreSQL query",
        params: {
          type: "object",
          properties: {
            sql: {
              type: "string",
              description: "SQL query to execute"
            }
          },
          required: ["sql"]
        }
      },
      {
        name: "execute_sql",
        description: "Execute SQL and return results",
        params: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "SQL query string"
            },
            params: {
              type: "array",
              description: "Query parameters"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "get_schema",
        description: "Get database schema information",
        params: {
          type: "object",
          properties: {
            table_name: {
              type: "string",
              description: "Optional table name filter"
            }
          }
        }
      },
      {
        name: "list_tables",
        description: "List all tables in the database",
        params: {
          type: "object",
          properties: {}
        }
      }
    ];
  } else if (toolId.includes("prom")) {
    // Prometheus MCP tools
    mockMcpTools = [
      {
        name: "query",
        description: "Execute PromQL query",
        params: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "PromQL query string"
            },
            time: {
              type: "string",
              description: "Evaluation timestamp"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "query_range",
        description: "Execute PromQL range query",
        params: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "PromQL query string"
            },
            start: {
              type: "string",
              description: "Start timestamp"
            },
            end: {
              type: "string",
              description: "End timestamp"
            },
            step: {
              type: "string",
              description: "Query resolution step"
            }
          },
          required: ["query", "start", "end"]
        }
      },
      {
        name: "list_metrics",
        description: "List all available metrics",
        params: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "get_labels",
        description: "Get label values for a metric",
        params: {
          type: "object",
          properties: {
            metric_name: {
              type: "string",
              description: "Name of the metric"
            }
          },
          required: ["metric_name"]
        }
      }
    ];
  } else {
    // Default mock tools for any other MCP server
    mockMcpTools = [
      {
        name: "get_status",
        description: "Get current status",
        params: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "execute_operation",
        description: "Execute an operation",
        params: {
          type: "object",
          properties: {
            operation: {
              type: "string",
              description: "Operation to execute"
            }
          },
          required: ["operation"]
        }
      }
    ];
  }

  // Simulate network delay for realistic UX
  await new Promise(resolve => setTimeout(resolve, 500));

  return NextResponse.json({
    success: true,
    toolId: toolId,
    toolName: toolId.includes("fs") ? "Filesystem MCP" :
              toolId.includes("pg") ? "PostgreSQL MCP" :
              toolId.includes("prom") ? "Prometheus MCP" : "MCP Server",
    tools: mockMcpTools,
    count: mockMcpTools.length,
  });
}
