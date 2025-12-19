import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from 'http';
import { scrapeRecruitCRM } from './scrapers/recruitcrm.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 10000;

// ============================================
// 1. CRÉATION DU SERVEUR MCP
// ============================================
const mcpServer = new Server(
  {
    name: 'headhunter-scrapers',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============================================
// 2. ENREGISTREMENT DES TOOLS
// ============================================

// Tool 1: Scrape RecruitCRM
mcpServer.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'scrape_recruitcrm',
        description: 'Scrape candidates from RecruitCRM with a boolean search query',
        inputSchema: {
          type: 'object',
          properties: {
            searchQuery: {
              type: 'string',
              description: 'Boolean search query (e.g. "SOC AND CTI")',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of candidates to scrape',
              default: 50,
            },
          },
          required: ['searchQuery'],
        },
      },
      {
        name: 'scrape_turnover',
        description: 'Scrape candidates from Turnover IT with a boolean search query',
        inputSchema: {
          type: 'object',
          properties: {
            searchQuery: {
              type: 'string',
              description: 'Boolean search query',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of candidates',
              default: 50,
            },
          },
          required: ['searchQuery'],
        },
      },
    ],
  };
});

// Tool execution
mcpServer.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'scrape_recruitcrm') {
      console.log(`🚀 Executing scrape_recruitcrm with query: "${args.searchQuery}"`);
      
      const result = await scrapeRecruitCRM(
        args.searchQuery,
        args.maxResults || 50
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } else if (name === 'scrape_turnover') {
      // TODO: À implémenter
      return {
        content: [
          {
            type: 'text',
            text: 'Turnover scraper coming soon',
          },
        ],
      };
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    console.error('❌ Tool execution error:', error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// ============================================
// 3. SERVEUR HTTP POUR RENDER
// ============================================

const httpServer = createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'headhunter-scrapers-mcp',
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // MCP endpoint
  if (url.pathname === '/mcp' && req.method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const request = JSON.parse(body);
        
        // Route vers le bon handler MCP
        let response;
        
        if (request.method === 'tools/list') {
          const handler = mcpServer.getRequestHandler('tools/list');
          response = await handler(request);
        } else if (request.method === 'tools/call') {
          const handler = mcpServer.getRequestHandler('tools/call');
          response = await handler(request);
        } else {
          throw new Error(`Unknown method: ${request.method}`);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        
      } catch (error) {
        console.error('❌ MCP request error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: {
            code: -32603,
            message: error.message,
          },
        }));
      }
    });
    
    return;
  }

  // Root endpoint (info)
  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'HeadHunter Scrapers MCP',
      version: '1.0.0',
      endpoints: {
        health: 'GET /health',
        mcp: 'POST /mcp',
      },
      tools: [
        'scrape_recruitcrm',
        'scrape_turnover',
      ],
    }));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ============================================
// 4. DÉMARRAGE
// ============================================

httpServer.listen(PORT, () => {
  console.log('🚀 MCP Server started');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 MCP: http://localhost:${PORT}/mcp`);
  console.log('✅ Ready to receive MCP requests');
});