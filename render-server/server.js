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

/*
// Scrape Turnover
app.post('/scrape/turnover', async (req, res) => {
  try {
    const { searchQuery, maxResults = 50 } = req.body;
    
    console.log('🚀 Scraping Turnover...');
    const result = await scrapeTurnover(searchQuery, maxResults);
    
    res.json(result);
  } catch (error) {
    console.error('❌ Erreur scraping Turnover:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});*/

// Route test
app.get('/', (req, res) => {
  res.json({
    message: 'HeadHunter Scraper API',
    endpoints: [
      'GET  /health',
      'POST /scrape/recruitcrm',
      'POST /scrape/turnover'
    ]
  });
});

app.listen(PORT, () => {
  console.log('🚀 Serveur démarré sur le port', PORT);
  console.log(`📍 http://localhost:\${PORT}`);
});