import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHttpServerTransport } from "@modelcontextprotocol/sdk/server/streamable-http.js";
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
// REGISTER TOOLS (API correcte)
// ============================================

// Tool 1: Scrape RecruitCRM
server.tool(
  "scrape_recruitcrm",
  "Scrape candidates from RecruitCRM with a boolean search query",
  {
    searchQuery: z.string().describe('Boolean search query (e.g. "SOC AND CTI")'),
    maxResults: z.number().default(50).describe("Maximum number of candidates"),
  },
  async (params) => {
    try {
      console.log(`🚀 Scraping RecruitCRM: "${params.searchQuery}"`);

      const result = await scrapeRecruitCRM(
        params.searchQuery,
        params.maxResults
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error("❌ Scrape error:", error);
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
  }
);

// Tool 2: Scrape Turnover
server.tool(
  "scrape_turnover",
  "Scrape candidates from Turnover IT",
  {
    searchQuery: z.string().describe("Boolean search query"),
    maxResults: z.number().default(50),
  },
  async (params) => {
    return {
      content: [
        {
          type: "text",
          text: "Turnover scraper coming soon",
        },
      ],
    };
  }
);

// ============================================
// SSE ENDPOINTS
// ============================================

app.use(express.json());

// Health check
// APRÈS
app.get("/", async (req, res) => {
  const accept = req.headers.accept || '';
  
  // Si Dust demande du SSE → on lui donne
  if (accept.includes('text/event-stream')) {
    const transport = new SSEServerTransport("/messages", res);
    transports.set(transport.sessionId, transport);
    
    res.on("close", () => {
      transports.delete(transport.sessionId);
    });
    
    await server.connect(transport);
  } else {
    // Sinon → info JSON normale
    res.json({
      name: "HeadHunter Scrapers MCP",
      version: "1.0.0",
      tools: ["scrape_recruitcrm", "scrape_turnover"],
    });
  }
});

// SSE endpoint - Initialize transport
app.get("/sse", async (req, res) => {
  console.log("📡 New SSE connection");

  const transport = new StreamableHttpServerTransport("/messages", res);
  transports.set(transport.sessionId, transport);

  // Cleanup on close
  res.on("close", () => {
    transports.delete(transport.sessionId);
    console.log(`🔌 Closed: ${transport.sessionId}`);
  });

  await server.connect(transport);
});

// MCP endpoint (pour Dust - copie de /sse)
app.get("/mcp", async (req, res) => {
  console.log("📡 MCP SSE connection");
  
  const transport = new StreamableHttpServerTransport("/messages", res);
  transports.set(transport.sessionId, transport);
  
  res.on("close", () => {
    transports.delete(transport.sessionId);
    console.log(`🔌 MCP connection closed: \${transport.sessionId}`);
  });
  
  await server.connect(transport);
});

// Messages endpoint
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
app.get("/", async (req, res) => {
  const accept = req.headers.accept || '';
  
  // Si Dust demande du SSE, on lui donne
  if (accept.includes('text/event-stream')) {
    console.log("📡 SSE connection on root endpoint");
    
    const transport = new StreamableHttpServerTransport("/messages", res);
    transports.set(transport.sessionId, transport);

    res.on("close", () => {
      transports.delete(transport.sessionId);
      console.log(`🔌 Closed: \${transport.sessionId}`);
    });

    await server.connect(transport);
  } else {
    // Requête normale = info JSON
    res.json({
      name: "HeadHunter Scrapers MCP",
      version: "1.0.0",
      transport: "SSE",
      tools: ["scrape_recruitcrm", "scrape_turnover"],
    });
  }
});

// ============================================
// START
// ============================================

app.listen(PORT, () => {
  console.log(`🚀 MCP Server with SSE on port ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`📡 SSE: http://localhost:${PORT}/sse`);
});