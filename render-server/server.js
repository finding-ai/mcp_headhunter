import express from 'express';
import dotenv from 'dotenv';
import { scrapeRecruitCRM } from './scrapers/recruitcrm.js';
// import { scrapeTurnover } from './scrapers/turnover.js'; // TODO: à activer plus tard

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
      'POST /scrape/turnover',
      'GET  /mcp/tools',
      'POST /mcp/tools/call'
    ]
  });
});

// ============================================
// ENDPOINTS MCP (pour Dust)
// ============================================

// GET /mcp/tools - Liste des tools MCP disponibles
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
      }
    ]
  });
});

// POST /mcp/tools/call - Appeler un tool MCP
app.post('/mcp/tools/call', async (req, res) => {
  try {
    const { tool_name, arguments: args } = req.body;

    if (tool_name === 'scrape_recruitcrm') {
      const results = await scrapeRecruitCRM(args.searchQuery, args.maxResults || 50);
      return res.json({ success: true, data: results });
    }

    res.status(404).json({ error: 'Tool not found' });
  } catch (error) {
    console.error('❌ Erreur MCP:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log('🚀 Serveur démarré sur le port', PORT);
  console.log(`📍 http://localhost:\${PORT}`);
});