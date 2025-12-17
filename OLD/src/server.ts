import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// ---------------------------
// ENV + INIT
// ---------------------------
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const PORT = parseInt(process.env.PORT || "3000", 10);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log("✅ Supabase initialized");

// ---------------------------
// ZOD SCHEMA
// ---------------------------
const AppelOffreSchema = z.object({
  ao_reference: z.string().min(1),
  titre: z.string().min(1),
  date_limite_candidature: z.string(),
  organisme: z.string().optional(),
  description: z.string().optional(),
  budget_estime: z.number().optional(),
  competences_requises: z.any().optional()
});

// ---------------------------
// EXPRESS SERVER
// ---------------------------
const app = express();
app.use(express.json({ limit: "50mb" }));

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ---------------------------
// MCP ROOT DISCOVERY (GET /)
// ---------------------------
app.get("/", (req, res) => {
  console.log("[MCP] GET /");
  res.json({
    name: "mcp-headhunter",
    version: "1.0.0",
    description: "MCP Server for managing Appels d'Offres"
  });
});

// ---------------------------
// MCP LIST TOOLS
// ---------------------------
app.post("/tools/list", (req, res) => {
  console.log("[MCP] POST /tools/list");

  res.json({
    tools: [
      {
        name: "save_appel_offre",
        description: "Save an Appel d'Offre into Supabase",
        input_schema: {
          type: "object",
          properties: {
            ao_reference: { type: "string", description: "AO reference" },
            titre: { type: "string", description: "Title" },
            date_limite_candidature: { type: "string", description: "ISO date" },
            organisme: { type: "string", description: "Organisme émetteur" },
            description: { type: "string", description: "Description" },
            budget_estime: { type: "number", description: "Budget en €" },
            competences_requises: { type: "object", description: "Free-form skills structure" }
          },
          required: ["ao_reference", "titre", "date_limite_candidature"]
        }
      }
    ]
  });
});

// ---------------------------
// MCP CALL TOOL
// ---------------------------
app.post("/tools/call", async (req, res) => {
  console.log("[MCP] POST /tools/call", req.body);

  try {
    const { name, arguments: args } = req.body;

    if (name !== "save_appel_offre") {
      return res.status(404).json({
        error: `Unknown tool: ${name}`
      });
    }

    const validated = AppelOffreSchema.parse(args);

    const { data, error } = await supabase
      .from("appels_offres")
      .upsert(
        {
          ...validated,
          statut: "analyse_complete",
          source: "dust_agent"
        },
        { onConflict: "ao_reference" }
      )
      .select("id, ao_reference")
      .single();

    if (error) throw new Error(error.message);

    return res.json({
      result: {
        success: true,
        message: "Appel d'offre saved successfully",
        id: data.id,
        ao_reference: data.ao_reference
      }
    });

  } catch (err: any) {
    console.error("[TOOLS/CALL ERROR]:", err);
    return res.status(500).json({
      error: err.message || "Internal server error"
    });
  }
});

// ---------------------------
// START SERVER
// ---------------------------
app.listen(PORT, () => {
  console.log(`🚀 MCP Server running at http://localhost:${PORT}`);
});
