import express from 'express';
import dotenv from 'dotenv';
import { scrapeRecruitCRM } from './scrapers/recruitcrm.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'headhunter-scraper',
    timestamp: new Date().toISOString()
  });
});

// Scrape RecruitCRM
app.post('/scrape/recruitcrm', async (req, res) => {
  try {
    const { searchQuery, maxResults = 50 } = req.body;
    
    console.log('🚀 Scraping RecruitCRM...');
    const result = await scrapeRecruitCRM(searchQuery, maxResults);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Erreur scraping RecruitCRM:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Route test
app.get('/', (req, res) => {
  res.json({
    message: 'HeadHunter Scraper API',
    endpoints: [
      'GET  /health',
      'POST /scrape/recruitcrm',
      'POST /mcp'
    ]
  });
});

// ============================================
// ENDPOINTS MCP (protocole SSE pour Dust)
// ============================================

app.post('/mcp', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { method, params } = req.body;

  try {
    if (method === 'tools/list') {
      const response = {
        tools: [
          {
            name: 'scrape_recruitcrm',
            description: 'Scrape candidates from RecruitCRM with a boolean search query',
            inputSchema: {
              type: 'object',
              properties: {
                searchQuery: {
                  type: 'string',
                  description: 'Boolean search query (e.g. "SOC AND CTI")'
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of candidates to scrape',
                  default: 50
                }
              },
              required: ['searchQuery']
            }
          }
        ]
      };
      res.write(`data: \${JSON.stringify(response)}\n\n`);
      res.end();
    }

    else if (method === 'tools/call') {
      const { name, arguments: args } = params;

      if (name === 'scrape_recruitcrm') {
        const results = await scrapeRecruitCRM(args.searchQuery, args.maxResults || 50);
        const response = {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
        res.write(`data: \${JSON.stringify(response)}\n\n`);
        res.end();
      } else {
        throw new Error('Tool not found');
      }
    }

    else {
      throw new Error('Unknown method');
    }

  } catch (error) {
    console.error('❌ Erreur MCP:', error);
    const errorResponse = {
      error: {
        code: -32603,
        message: error.message
      }
    };
    res.write(`data: \${JSON.stringify(errorResponse)}\n\n`);
    res.end();
  }
});

// ============================================
// ENDPOINTS MCP STANDARD (pour Dust)
// ============================================

// GET /mcp/tools - Liste des tools disponibles
app.get('/mcp/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'scrape_recruitcrm',
        description: 'Scrape candidates from RecruitCRM with a boolean search query',
        inputSchema: {
          type: 'object',
          properties: {
            searchQuery: {
              type: 'string',
              description: 'Boolean search query (e.g. "SOC AND CTI")'
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of candidates to scrape',
              default: 50
            }
          },
          required: ['searchQuery']
        }
      },
      {
        name: 'scrape_turnover',
        description: 'Scrape candidates from Turnover IT with a boolean search query',
        inputSchema: {
          type: 'object',
          properties: {
            searchQuery: {
              type: 'string',
              description: 'Boolean search query'
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of candidates',
              default: 50
            }
          },
          required: ['searchQuery']
        }
      }
    ]
  });
});

// POST /mcp/tools/call - Appeler un tool
app.post('/mcp/tools/call', async (req, res) => {
  try {
    const { tool_name, arguments: args } = req.body;

    if (tool_name === 'scrape_recruitcrm') {
      const result = await scrapeRecruitCRM(args.searchQuery, args.maxResults || 50);
      res.json({
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      });
    } 
    else if (tool_name === 'scrape_turnover') {
      // TODO: À implémenter plus tard
      res.json({
        content: [
          {
            type: 'text',
            text: 'Turnover scraper coming soon'
          }
        ]
      });
    }
    else {
      throw new Error('Unknown tool');
    }

  } catch (error) {
    console.error('❌ Erreur MCP:', error);
    res.status(500).json({
      error: {
        code: -32603,
        message: error.message
      }
    });
  }
});

app.listen(PORT, () => {
  console.log('🚀 Serveur démarré sur le port', PORT);
  console.log(`📍 http://localhost:\${PORT}`);
});