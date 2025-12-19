import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(StealthPlugin());
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Stealth mode niveau 3
async function createStealthContext(browser) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    deviceScaleFactor: 1,
    hasTouch: false,
    javaScriptEnabled: true,
    permissions: []
  });
  
  // Masquer Playwright
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.navigator.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en-US', 'en'] });
  });
  
  return context;
}

export async function scrapeRecruitCRM(searchQuery = null, maxResults = 50) {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SCRAPING RECRUITCRM');
  if (searchQuery) {
    console.log(`🔍 Recherche: "\${searchQuery}"`);
  }
  console.log('='.repeat(60) + '\n');
  
const browser = await chromium.launch({ 
  headless: process.env.HEADLESS === 'true',
  slowMo: 150 + Math.random() * 100,  // 150-250ms entre actions
  args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox'
    ]
  });
  
  const context = await createStealthContext(browser);
  const page = await context.newPage();
  
  try {
    // ===========================================
    // 1. LOGIN
    // ===========================================
    console.log('🔐 Connexion...');
    await page.goto('https://app.recruitcrm.io/login', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    await page.waitForTimeout(1000 + Math.random() * 1000);
    
    await page.fill('input[type="email"]', process.env.RECRUITCRM_LOGIN);
    await page.waitForTimeout(300 + Math.random() * 500);
    
    await page.fill('input[type="password"]', process.env.RECRUITCRM_PASSWORD);
    await page.waitForTimeout(300 + Math.random() * 500);
    
    await page.click('button:has-text("Login")');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('✅ Connecté\n');
    
    // ===========================================
    // 2. ALLER SUR "TOUS LES CANDIDATS"
    // ===========================================
    console.log('📋 Navigation vers candidats...');
    await page.goto('https://app.recruitcrm.io/v2/candidates', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    await page.waitForTimeout(2000 + Math.random() * 1000);
    
    // Cliquer sur "Tous les Candidats" (2.0K)
    await page.click('text=Tous les Candidats');
    await page.waitForTimeout(2000);
    console.log('✅ Liste complète chargée\n');
    
    // ===========================================
    // 3. RECHERCHE BOOLÉENNE (si fournie)
    // ===========================================
    if (searchQuery) {
      console.log(`🔍 Recherche booléenne: "\${searchQuery}"`);
      
      // Cliquer sur le champ de recherche booléenne
      const searchInput = page.locator('input[placeholder*="Recherche"]').first();
      await searchInput.click();
      await page.waitForTimeout(500);
      
      // Taper la requête caractère par caractère (plus humain)
      for (const char of searchQuery) {
        await searchInput.type(char, { delay: 50 + Math.random() * 100 });
      }
      
      await page.waitForTimeout(1000);
      
      // Attendre que les suggestions apparaissent
      await page.waitForSelector('text=Chercher', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);
      
      // Cliquer sur le bouton "Chercher +"
      await page.click('button:has-text("Chercher")');
      
      // Attendre que les résultats se chargent
      console.log('⏳ Chargement des résultats filtrés...');
      await page.waitForTimeout(3000 + Math.random() * 2000);
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      
      console.log('✅ Résultats chargés\n');
    }
    
    // ===========================================
    // 4. EXTRAIRE LA LISTE DES CANDIDATS
    // ===========================================
    console.log('🔍 Extraction de la liste...');
    
    const candidateLinks = await page.evaluate(() => {
      const rows = document.querySelectorAll('tr[role="row"]');
      const links = [];
      
      for (let row of rows) {
        const link = row.querySelector('a[href*="/candidate/"]');
        if (link) {
          links.push(link.href);
        }
      }
      
      return [...new Set(links)]; // Déduplicate
    });
    
    console.log(`📊 \${candidateLinks.length} candidats trouvés`);
    
    if (candidateLinks.length === 0) {
      console.log('⚠️  Aucun candidat trouvé');
      return { success: true, count: 0, data: [] };
    }
    
    const linksToScrape = candidateLinks.slice(0, maxResults);
    console.log(`🎯 Scraping de \${linksToScrape.length} candidats\n`);
    
    // ===========================================
    // 5. SCRAPER CHAQUE CANDIDAT
    // ===========================================
    const candidates = [];
    
    for (let i = 0; i < linksToScrape.length; i++) {
      const url = linksToScrape[i];
      console.log(`[\${i + 1}/\${linksToScrape.length}] Scraping candidat...`);
      
      try {
     await page.goto(url, { 
  waitUntil: 'domcontentloaded', 
  timeout: 30000 
});

// Scroll simulation (lecture de la page)
await page.evaluate(() => {
  const scrollAmount = 200 + Math.random() * 300;
  window.scrollBy(0, scrollAmount);
});
await page.waitForTimeout(1000);

// Temps de lecture variable (humain)
const readTime = 2000 + Math.random() * 3000; // 2-5 secondes
await page.waitForTimeout(readTime);

        
        // Extraction des données
        const candidateData = await page.evaluate(() => {
          const getText = (selector) => {
            const el = document.querySelector(selector);
            return el ? el.textContent.trim() : '';
          };
          
          // Nom
          const nom = getText('h1') || document.title.split('|')[0]?.trim() || '';
          
          // Email
          const emailEl = document.querySelector('a[href^="mailto:"]');
          const email = emailEl ? emailEl.textContent.trim() : '';
          
          // Téléphone
          const telEl = document.querySelector('a[href^="tel:"]');
          const telephone = telEl ? telEl.textContent.trim() : '';
          
          // Localisation
          const localisation = getText('[class*="Localit"]') || '';
          
          // Compétences
          const competences = [];
          document.querySelectorAll('[class*="Compétence"], [class*="competence"]').forEach(el => {
            const text = el.textContent.trim();
            if (text && !competences.includes(text)) competences.push(text);
          });
          
          // CV Finding (lien téléchargement)
          const cvEl = document.querySelector('a[href*="CV"], a[download]');
          const cv_url = cvEl ? cvEl.href : '';
          
          // LinkedIn
          const linkedinEl = document.querySelector('a[href*="linkedin.com"]');
          const linkedin = linkedinEl ? linkedinEl.href : '';
          
          // Entreprise actuelle
          const entreprise = getText('[class*="Entreprise"]') || '';
          
          // Date de disponibilité
          const dispo = getText('[class*="Disponible"]') || '';
          
          return {
            nom,
            email,
            telephone,
            localisation,
            entreprise,
            competences,
            cv_url,
            linkedin,
            disponibilite: dispo,
            url: window.location.href,
            scraped_at: new Date().toISOString()
          };
        });
        
        candidates.push(candidateData);
        console.log(`  ✓ \${candidateData.nom || 'Candidat'} - \${candidateData.email || 'Pas d\'email'}`);
        
// Scroll aléatoire avant de partir (comportement humain)
await page.evaluate(() => {
  const scrollAmount = 100 + Math.random() * 200;
  window.scrollBy(0, scrollAmount);
});
await page.waitForTimeout(800);

// Délai plus long entre candidats (4-8 sec)
const delay = 4000 + Math.random() * 4000;
await page.waitForTimeout(delay);

// Scroll de temps en temps pour simuler lecture
if (Math.random() > 0.6) {
  await page.evaluate(() => {
    window.scrollBy(0, -80 - Math.random() * 120);
  });
  await page.waitForTimeout(600);
}
        
      } catch (error) {
        console.log(`  ✗ Erreur: \${error.message}`);
      }
    }
    
    console.log(`\n✅ \${candidates.length} candidats extraits\n`);
    
    // ===========================================
    // 6. SAUVEGARDER DANS SUPABASE
    // ===========================================
    if (candidates.length > 0) {
      console.log('💾 Sauvegarde Supabase...');
      
      const toInsert = candidates.map(c => ({
        source: 'recruitcrm',
        raw_data: c,
        scraped_at: new Date().toISOString()
      }));
      
      const { data, error } = await supabase
        .from('raw_scrap_candidats')
        .insert(toInsert)
        .select();
      
      if (error) {
        console.error('❌ Supabase:', error.message);
      } else {
        console.log(`✅ \${data.length} candidats sauvegardés\n`);
      }
    }
    
    return { 
      success: true, 
      count: candidates.length, 
      data: candidates,
      searchQuery 
    };
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}