import { prisma } from "@/lib/prisma";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/**
 * MCP client cache to reuse connections
 * Key: toolId, Value: { client, transport }
 */
const mcpClientCache = new Map<string, { client: Client; transport: any }>();

/**
 * Get or create MCP client for a tool
 */
export async function getMCPClient(cacheKey: string, config: any) {
  // Check cache first
  const cached = mcpClientCache.get(cacheKey);
  if (cached) {
    return cached.client;
  }

  // Create new client based on transport type
  const client = new Client(
    {
      name: "dod-platform-agent",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );

  let transport: any;
  let transportType = config.type || "stdio"; // httpStream, sse, stdio

  switch (transportType) {
    case "stdio": {
      // STDIO transport for local MCP servers
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: config.env || {},
      });
      break;
    }
    case "httpStream": {
      // HTTP streaming transport for remote MCP servers
      transport = new StreamableHTTPClientTransport(new URL(config.url));
      break;
    }
    case "sse": {
      // SSE transport for HTTP-based MCP servers
      transport = new SSEClientTransport(new URL(config.url));
      break;
    }
    default:
      throw new Error(`Unsupported transport type: ${config.transportType}`);
  }

  await client.connect(transport);

  // Cache the client
  mcpClientCache.set(cacheKey, { client, transport });

  return client;
}

/**
 * Close MCP client (for cleanup)
 */
export async function closeMCPClient(toolId: string) {
  const cached = mcpClientCache.get(toolId);
  if (cached) {
    await cached.client.close();
    mcpClientCache.delete(toolId);
  }
}

/**
 * Close all cached MCP clients (for cleanup/shutdown)
 */
export async function closeAllMCPClients() {
  const promises = Array.from(mcpClientCache.keys()).map((toolId) =>
    closeMCPClient(toolId),
  );
  await Promise.allSettled(promises);
}
