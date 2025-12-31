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

// ============================================
// STEALTH MODE NIVEAU 3.5 (BOOSTÉ)
// ============================================
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
  
  // Masquer Playwright - NIVEAU 3.5
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.navigator.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en-US', 'en'] });
    delete navigator.__proto__.webdriver;
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 1 });
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
  });
  
  return context;
}

// ============================================
// DÉLAIS ALÉATOIRES ÉLARGIS (NIVEAU 3.5)
// ============================================
const randomDelay = (min, max) => Math.floor(min + Math.random() * (max - min));
const humanDelay = () => randomDelay(200, 800);
const readDelay = () => randomDelay(2000, 6000);
const navigationDelay = () => randomDelay(3000, 8000);

export async function scrapeRecruitCRM(searchQuery = null, maxResults = 50, additionalFilters = []) {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SCRAPING RECRUITCRM - MODE STEALTH 3.5');
  if (searchQuery) {
    console.log(`🔍 Recherche: "${searchQuery}"`);
  }
  if (additionalFilters.length > 0) {
    console.log(`🎯 Filtres additionnels: ${additionalFilters.join(', ')}`);
  }
  console.log('='.repeat(60) + '\n');
  
  const browser = await chromium.launch({ 
    headless: process.env.HEADLESS === 'true',
    slowMo: randomDelay(120, 300),
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security'
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
    await page.waitForTimeout(humanDelay());
    
    // Frappe email caractère par caractère
    const email = process.env.RECRUITCRM_LOGIN;
    const emailInput = page.locator('input[type="email"]');
    await emailInput.click();
    for (const char of email) {
      await emailInput.type(char, { delay: randomDelay(50, 150) });
    }
    await page.waitForTimeout(humanDelay());
    
    // Frappe password caractère par caractère
    const password = process.env.RECRUITCRM_PASSWORD;
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.click();
    for (const char of password) {
      await passwordInput.type(char, { delay: randomDelay(50, 150) });
    }
    await page.waitForTimeout(humanDelay());
    
    await page.click('button:has-text("Login")');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // NOUVEAU : Simuler lecture dashboard
    await page.waitForTimeout(readDelay());
    await page.evaluate(() => {
      window.scrollBy(0, 200 + Math.random() * 200);
    });
    await page.waitForTimeout(humanDelay());
    console.log('✅ Connecté\n');
    
    // ===========================================
    // 2. NAVIGATION VERS CANDIDATS
    // ===========================================
    console.log('📋 Navigation vers candidats...');
    await page.goto('https://app.recruitcrm.io/v2/candidates', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    await page.waitForTimeout(readDelay());
    
    // ===========================================
    // 3. ✨ SÉLECTION DE LA BASE (NOUVEAU)
    // ===========================================
    console.log('📂 Sélection de la base "Tous les Candidats"...');
    await page.click('text=Tous les Candidats');
    await page.waitForTimeout(readDelay());
    
    // NOUVEAU : Vérifier que la liste est chargée
    await page.waitForSelector('tr[role="row"]', { timeout: 10000 });
    console.log('✅ Base complète chargée (2.0K candidats)\n');
    
    // ===========================================
    // 4. RECHERCHE BOOLÉENNE (si fournie)
    // ===========================================
    if (searchQuery) {
      console.log(`🔍 Recherche booléenne: "${searchQuery}"`);
      
      const searchInput = page.locator('input[placeholder*="booléenne"], input[placeholder*="Recherche"]').first();
      await searchInput.click();
      await page.waitForTimeout(humanDelay());
      
      // Frappe caractère par caractère
      for (const char of searchQuery) {
        await searchInput.type(char, { delay: randomDelay(40, 180) });
      }
      await page.waitForTimeout(humanDelay());
      
      // Clic sur bouton "Chercher"
      await page.click('button:has-text("Chercher")');
      
      console.log('⏳ Chargement des résultats...');
      await page.waitForTimeout(readDelay());
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      
      console.log('✅ Résultats recherche initiale chargés\n');
    }
    
    // ===========================================
    // 5. ✨ AFFINAGE RECHERCHE (NOUVEAU)
    // ===========================================
    if (additionalFilters.length > 0) {
      console.log('🎯 Application des filtres additionnels...');
      
      for (const filter of additionalFilters) {
        console.log(`  → Filtre: ${filter}`);
        
        try {
          // Cliquer sur le tag dans le panneau latéral gauche
          await page.click(`text=${filter}`, { timeout: 5000 });
          await page.waitForTimeout(humanDelay());
          
          console.log(`  ✓ Filtre "${filter}" appliqué`);
        } catch (error) {
          console.log(`  ✗ Filtre "${filter}" non trouvé, ignoré`);
        }
      }
      
      // Attendre que les résultats se mettent à jour
      console.log('⏳ Rechargement avec filtres...');
      await page.waitForTimeout(readDelay());
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      
      console.log('✅ Filtres appliqués\n');
    }
    
    // ===========================================
    // 6. EXTRAIRE LA LISTE DES CANDIDATS
    // ===========================================
    console.log('🔍 Extraction de la liste filtrée...');
    
    const candidateLinks = await page.evaluate(() => {
      const rows = document.querySelectorAll('tr[role="row"]');
      const links = [];
      
      for (let row of rows) {
        const link = row.querySelector('a[href*="/candidate/"]');
        if (link) links.push(link.href);
      }
      
      return [...new Set(links)];
    });
    
    console.log(`📊 ${candidateLinks.length} candidats trouvés après filtrage`);
    
    if (candidateLinks.length === 0) {
      console.log('⚠️  Aucun candidat trouvé');
      return { success: true, count: 0, data: [] };
    }
    
    const linksToScrape = candidateLinks.slice(0, maxResults);
    console.log(`🎯 Scraping de ${linksToScrape.length} candidats\n`);
    
    // ===========================================
    // 7. SCRAPER CHAQUE CANDIDAT
    // ===========================================
    const candidates = [];
    
    for (let i = 0; i < linksToScrape.length; i++) {
      const url = linksToScrape[i];
      console.log(`[${i + 1}/${linksToScrape.length}] Scraping candidat...`);
      
      try {
        await page.goto(url, { 
          waitUntil: 'networkidle', 
          timeout: 30000 
        });
        
        // Scroll simulation (lecture humaine)
        await page.evaluate(() => {
          const scrollAmount = 150 + Math.random() * 400;
          window.scrollBy(0, scrollAmount);
        });
        await page.waitForTimeout(humanDelay());
        
        // Temps de lecture variable
        await page.waitForTimeout(readDelay());
        
        // Extraction complète
        const candidateData = await page.evaluate(() => {
          const getText = (selector) => {
            const el = document.querySelector(selector);
            return el ? el.textContent.trim() : '';
          };
          
          const nom = getText('h1') || document.title.split('|')[0]?.trim() || '';
          
          const emailEl = document.querySelector('a[href^="mailto:"]');
          const email = emailEl ? emailEl.textContent.trim() : '';
          
          const telEl = document.querySelector('a[href^="tel:"]');
          const telephone = telEl ? telEl.textContent.trim() : '';
          
          const localisation = getText('[class*="Localit"]') || '';
          
          const competences = [];
          document.querySelectorAll('[class*="Compétence"], [class*="competence"], [class*="skill"]').forEach(el => {
            const text = el.textContent.trim();
            if (text && !competences.includes(text)) competences.push(text);
          });
          
          const cvEl = document.querySelector('a[href*="CV"], a[download]');
          const cv_url = cvEl ? cvEl.href : '';
          
          const linkedinEl = document.querySelector('a[href*="linkedin.com"]');
          const linkedin = linkedinEl ? linkedinEl.href : '';
          
          const entreprise = getText('[class*="Entreprise"]') || '';
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
        console.log(`  ✓ ${candidateData.nom || 'Candidat'} - ${candidateData.email || 'Pas d\'email'}`);
        
        // Scroll aléatoire avant de partir
        await page.evaluate(() => {
          const direction = Math.random() > 0.5 ? 1 : -1;
          const scrollAmount = (100 + Math.random() * 300) * direction;
          window.scrollBy(0, scrollAmount);
        });
        await page.waitForTimeout(humanDelay());
        
        // Délai entre candidats
        await page.waitForTimeout(navigationDelay());
        
        // Scroll occasionnel
        if (Math.random() > 0.4) {
          await page.evaluate(() => {
            window.scrollBy(0, -(80 + Math.random() * 150));
          });
          await page.waitForTimeout(randomDelay(400, 1000));
        }
        
      } catch (error) {
        console.log(`  ✗ Erreur: ${error.message}`);
      }
    }
    
    console.log(`\n✅ ${candidates.length} candidats extraits\n`);
    
    // ===========================================
    // 8. SAUVEGARDER DANS SUPABASE
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
        console.log(`✅ ${data.length} candidats sauvegardés\n`);
      }
    }
    
    return { 
      success: true, 
      count: candidates.length, 
      data: candidates,
      searchQuery,
      filtersApplied: additionalFilters
    };
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error.message);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

// ============================================
// TEST DIRECT
// ============================================
const isMainModule = process.argv[1] === new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
if (isMainModule) {
  const query = process.argv[2] || null;
  const max = parseInt(process.argv[3]) || 5;
  const filters = process.argv.slice(4); // Filtres additionnels
  
  scrapeRecruitCRM(query, max, filters).then(result => {
    console.log('='.repeat(60));
    console.log('📊 RÉSULTAT');
    console.log('='.repeat(60));
    console.log(`Succès: ${result.success ? '✅' : '❌'}`);
    console.log(`Candidats: ${result.count}`);
    if (result.filtersApplied?.length > 0) {
      console.log(`Filtres: ${result.filtersApplied.join(', ')}`);
    }
    if (result.count > 0) {
      console.log('\n📋 Aperçu:');
      console.log(JSON.stringify(result.data[0], null, 2));
    }
    process.exit(0);
  });
}