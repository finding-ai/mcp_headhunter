import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { randomUUID } from "crypto";
import { z } from "zod";
import { scrapeRecruitCRM } from './scrapers/recruitcrm.js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

// ============================================
// CRÉER LE SERVEUR MCP (comme Cloudflare)
// ============================================
const server = new McpServer({
  name: "headhunter-scrapers",
  version: "1.0.0",
});

// ============================================
// REGISTER TOOLS (exactement comme Cloudflare)
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
// TRANSPORT STREAMABLE HTTP (comme Cloudflare)
// ============================================
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
});

// Connecter le serveur au transport
await server.connect(transport);

console.log("✅ MCP Server connected to transport");

// ============================================
// EXPRESS APP (comme Cloudflare Worker.fetch)
// ============================================
const app = createMcpExpressApp({
  host: "0.0.0.0", // Pour Render
});

// ============================================
// ENDPOINT 1 : GET / → Info (comme Cloudflare)
// ============================================
app.get("/", (req, res) => {
  res.json({
    name: "headhunter-scrapers",
    version: "1.0.0",
    tools: ["scrape_recruitcrm", "scrape_turnover"],
    transport: "StreamableHTTP",
    status: "ready"
  });
});

// ============================================
// ENDPOINT 2 : POST /mcp → Protocole MCP
// ============================================
app.post("/mcp", async (req, res) => {
  await transport.handleRequest(req, res, req.body);
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 MCP Server running on port ${PORT}`);
  console.log(`📍 Info: http://localhost:${PORT}/`);
  console.log(`📡 MCP: http://localhost:${PORT}/mcp`);
});