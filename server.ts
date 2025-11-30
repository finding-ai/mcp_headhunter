import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const PORT = parseInt(process.env.PORT || '3000');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('✅ Supabase initialized');

const AppelOffreSchema = z.object({
  ao_reference: z.string().min(1),
  titre: z.string().min(1),
  date_limite_candidature: z.string(),
  organisme: z.string().optional(),
  description: z.string().optional(),
  budget_estime: z.number().optional(),
  competences_requises: z.any().optional(),
});

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'ao-analyzer-mcp', version: '1.0.0' });
});

// SSE endpoint for Dust MCP discovery
app.get('/mcp', (req, res) => {
  console.log('[SSE] New connection');
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write('event: open\ndata: {}\n\n');

  req.on('close', () => {
    console.log('[SSE] Connection closed');
  });
});

// POST endpoint for MCP
app.post('/mcp', async (req, res) => {
  try {
    const { method, params, id } = req.body;

    if (method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        id: id,
        result: {
          tools: [{
            name: 'save_appel_offre',
            description: 'Save AO to Supabase',
            inputSchema: {
              type: 'object',
              properties: {
                ao_reference: { type: 'string' },
                titre: { type: 'string' },
                date_limite_candidature: { type: 'string' },
                organisme: { type: 'string' },
                description: { type: 'string' },
                budget_estime: { type: 'number' },
                competences_requises: { type: 'object' }
              },
              required: ['ao_reference', 'titre', 'date_limite_candidature']
            }
          }]
        }
      });
    }

    if (method === 'tools/call' && params?.name === 'save_appel_offre') {
      const args = AppelOffreSchema.parse(params.arguments);
      const { data, error } = await supabase
        .from('appels_offres')
        .upsert({ ...args, statut: 'analyse_complete', source: 'dust_agent' }, { onConflict: 'ao_reference' })
        .select('id, ao_reference')
        .single();

      if (error) throw new Error(error.message);

      return res.json({
        jsonrpc: '2.0',
        id: id,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: true, id: data.id, ao_reference: data.ao_reference })
          }]
        }
      });
    }

    return res.status(404).json({
      jsonrpc: '2.0',
      id: id,
      error: { code: -32601, message: 'Method not found' }
    });

  } catch (error: any) {
    return res.status(500).json({
      jsonrpc: '2.0',
      id: req.body.id,
      error: { code: -32603, message: error.message }
    });
  }
});

// Export for Vercel
export default app;

// Local dev server
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log('✅ Server started on port', PORT);
  });
}