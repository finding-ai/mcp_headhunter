import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { z } from "zod";
import { scrapeRecruitCRM } from './scrapers/recruitcrm.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Store active transports
const transports = new Map();

// Create MCP Server
const server = new McpServer({
  name: "headhunter-scrapers",
  version: "1.0.0",
});

// ============================================
// REGISTER TOOLS
// ============================================

// Tool 1: Scrape RecruitCRM
server.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "scrape_recruitcrm",
        description: "Scrape candidates from RecruitCRM with a boolean search query",
        inputSchema: {
          type: "object",
          properties: {
            searchQuery: {
              type: "string",
              description: 'Boolean search query (e.g. "SOC AND CTI")',
            },
            maxResults: {
              type: "number",
              description: "Maximum number of candidates to scrape",
              default: 50,
            },
          },
          required: ["searchQuery"],
        },
      },
      {
        name: "scrape_turnover",
        description: "Scrape candidates from Turnover IT",
        inputSchema: {
          type: "object",
          properties: {
            searchQuery: {
              type: "string",
              description: "Boolean search query",
            },
            maxResults: {
              type: "number",
              default: 50,
            },
          },
          required: ["searchQuery"],
        },
      },
    ],
  };
});

// Tool execution
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "scrape_recruitcrm") {
      console.log(`🚀 Scraping RecruitCRM: "${args.searchQuery}"`);

      const result = await scrapeRecruitCRM(
        args.searchQuery,
        args.maxResults || 50
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === "scrape_turnover") {
      return {
        content: [
          {
            type: "text",
            text: "Turnover scraper coming soon",
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    console.error("❌ Tool error:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// ============================================
// SSE ENDPOINTS (Required by Dust)
// ============================================

app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "headhunter-scrapers-mcp",
    timestamp: new Date().toISOString(),
  });
});

// SSE endpoint - Initialize transport
app.get("/sse", async (req, res) => {
  console.log("📡 New SSE connection");

  const transport = new SSEServerTransport("/messages", res);
  transports.set(transport.sessionId, transport);

  // Cleanup on close
  res.on("close", () => {
    transports.delete(transport.sessionId);
    console.log(`🔌 SSE connection closed: ${transport.sessionId}`);
  });

  await server.connect(transport);
});

// Messages endpoint - Handle requests
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.get(sessionId);

  if (!transport) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await transport.handlePostMessage(req, res);
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    name: "HeadHunter Scrapers MCP",
    version: "1.0.0",
    protocol: "MCP with SSE transport",
    endpoints: {
      health: "GET /health",
      sse: "GET /sse",
      messages: "POST /messages?sessionId=<id>",
    },
    tools: ["scrape_recruitcrm", "scrape_turnover"],
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 MCP Server with SSE running on port ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`📡 SSE: http://localhost:${PORT}/sse`);
  console.log(`✉️  Messages: http://localhost:${PORT}/messages`);
});