import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export class MyMCP extends McpAgent {
  server = new McpServer({
    name: "mcp-headhunter",
    version: "2.0.0",
    description: "MCP Server for managing Appels d'Offres"
  });

  async init() {
    const supabase = createClient(
      this.env.SUPABASE_URL,
      this.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    console.log("✅ Supabase initialized");

// ========================================
// TOOL TEST : Connexion Supabase
// ========================================
this.server.tool(
  "test_supabase",
  "Test de connexion Supabase depuis le Worker",
  {},
  async () => {
    try {
      console.log("🧪 Testing Supabase from Worker...");
      
      // Test simple : Insérer une ligne de test
      const { data, error } = await supabase
        .from("appel_offres_analyse")
        .insert({
          ao_id: `TEST-WORKER-${Date.now()}`,
          ao_name: "Test depuis Worker MCP",
          titre_poste: "Test Tool"
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Insert failed:", error);
        return {
          content: [{
            type: "text",
            text: `❌ Erreur Supabase:\n${error.message}\n${error.details || ''}`
          }],
          isError: true
        };
      }

      console.log("✅ Insert successful:", data);
      return {
        content: [{
          type: "text",
          text: `✅ Connexion Worker → Supabase OK !\n\nLigne insérée:\nID: ${data.id}\nao_id: ${data.ao_id}\nao_name: ${data.ao_name}`
        }]
      };

    } catch (err: any) {
      console.error("❌ Unexpected error:", err);
      return {
        content: [{
          type: "text",
          text: `❌ Erreur: ${err.message}`
        }],
        isError: true
      };
    }
  }
);

    // ========================================
    // TOOL : Sauvegarder une analyse complète d'AO
    // ========================================
    this.server.tool(
      "save_appel_offre",
      "Sauvegarde une analyse complète d'appel d'offre dans Supabase",
      {
        analyse_complete: z.any().describe("JSON complet de l'analyse avec TOUS les champs du prompt system")
      },
      async (params) => {
        try {
          console.log("💾 Saving full AO analysis to Supabase...");

          const json = params.analyse_complete;

          // Insertion dans Supabase - MAPPING EXACT avec ta table
          const { data, error } = await supabase
            .from("appel_offres_analyse")
            .insert({
              // Champs obligatoires
              ao_id: json.ao_id,
              ao_name: json.titre_poste || json.ao_id,
              
              // Section I - Identification du poste
              titre_poste: json.titre_poste,
              niveau_expertise_implicite: json.niveau_expertise_implicite,
              domaine_metier: json.domaine_metier,
              type_projet: json.type_projet,
              
              // Section I - Contexte & périmètre
              description_contexte: json.description_contexte,
              objectif_global_du_projet: json.objectif_global_du_projet,
              perimetre_equipe: json.perimetre_equipe,
              taille_equipe: json.taille_equipe,
              environnement_technique_general: json.environnement_technique_general,
              
              // Section I - Missions (JSONB arrays)
              missions_techniques: json.missions_techniques,
              missions_fonctionnelles: json.missions_fonctionnelles,
              responsabilites: json.responsabilites,
              objectifs_operationnels: json.objectifs_operationnels,
              objectifs_strategiques: json.objectifs_strategiques,
              frequence_des_taches: json.frequence_des_taches,
              
              // Section I - Livrables
              livrables_attendus: json.livrables_attendus,
              kpis_attendus: json.KPIs_attendus,
              niveau_autonomie_requis: json.niveau_autonomie_requis,
              
              // Section I - Compétences techniques
              competences_obligatoires: json.competences_obligatoires,
              competences_optionnelles: json.competences_optionnelles,
              outils_mentionnes: json.outils_mentionnes,
              technologies_mentionnees: json.technologies_mentionnees,
              niveaux_requis_par_competence: json.niveaux_requis_par_competence,
              
              // Section I - Compétences implicites
              competences_implicites: json.competences_implicites,
              competences_absentes_mais_probables: json.competences_absentes_mais_probables,
              zones_d_ombre_identifiees: json.zones_d_ombre_identifiees,
              
              // Section I - Soft skills
              soft_skills_identifiees: json.soft_skills_identifiees,
              soft_skills_importantes: json.soft_skills_importantes,
              style_collaboration: json.style_collaboration,
              posture_requise: json.posture_requise,
              
              // Section I - Logistique
              localisation: json.localisation,
              mode_travail: json.mode_travail,
              jours_sur_site: json.jours_sur_site,
              mobilite_requise: json.mobilite_requise,
              langue_requise: json.langue_requise,
              
              // Section I - Cadre temporel
              date_demarrage: json.date_demarrage,
              duree: json.duree,
              renouvelable: json.renouvelable,
              urgence: json.urgence,
              
              // Section I - Administratif / Commercial
              budget_tjm: json.budget_TJM,
              budget_estimation: json.budget_estimation,
              mode_facturation: json.mode_facturation,
              informations_commerciales: json.informations_commerciales,
              statut_budget: json.statut_budget,
              
              // Section I - Environnement
              description_equipe: json.description_equipe,
              interactions_clefs: json.interactions_clefs,
              dependances_metier: json.dependances_metier,
              maturite_securite: json.maturite_securite,
              
              // Section I - Risques / alertes
              risques_identifies: json.risques_identifies,
              incoherences: json.incoherences,
              zones_faibles: json.zones_faibles,
              
              // Section I - Synthèse
              resume_court: json.resume_court,
              faisabilite: json.faisabilite,
              lisibilite_du_besoin: json.lisibilite_du_besoin,
              
              // Section II - GO / NO-GO
              details_par_critere: json.details_par_critere,
              go_no_go: json.decision_go_no_go,
              go_no_go_justification: json.justification_go_no_go,
              
              // Section III - Expertise nécessaire
              expertise_necessaire: json.expertise_necessaire,
              justification_expertise: json.justification_expertise,
              alternatives_possibles: json.alternatives_possibles,
              
              // Métadonnées (optionnelles, si tu les as)
              raw_text: json.raw_text || null,
              source_file_name: json.source_file_name || null
            })
            .select("id, ao_id, ao_name")
            .single();

          if (error) {
            console.error("❌ Supabase insert error:", error);
            return {
              content: [{
                type: "text",
                text: `❌ Erreur lors de la sauvegarde dans Supabase:\n${error.message}\n${error.details || ''}`
              }],
              isError: true
            };
          }

          console.log("✅ AO analysis saved successfully:", data);

          return {
            content: [{
              type: "text",
              text: `✅ Analyse complète sauvegardée dans Supabase\n\n` +
                    `📄 Référence AO: ${data.ao_id}\n` +
                    `🆔 ID Supabase: ${data.id}\n` +
                    `📝 Titre: ${data.ao_name}\n` +
                    `✔️ ${Object.keys(json).length} champs enregistrés`
            }]
          };

        } catch (err: any) {
          console.error("❌ Unexpected error:", err);
          return {
            content: [{
              type: "text",
              text: `❌ Erreur inattendue: ${err.message}`
            }],
            isError: true
          };
        }
      }
    );

// ========================================
// TOOL : Sauvegarder une analyse candidat
// ========================================
this.server.tool(
  "save_candidate",
  "Sauvegarde une analyse complète de candidat dans Supabase (2 tables)",
  {
    candidate_data: z.object({
      candidate_profile: z.object({}).passthrough(),
      candidate_sources: z.array(z.object({}).passthrough())
    }).describe("Objet contenant candidate_profile et candidate_sources")
  },
  async (params) => {
    try {
      console.log("💾 Saving candidate analysis to Supabase...");
      console.log("Received params:", JSON.stringify(params, null, 2));

      const json = params.candidate_data;
      
      // Validation
      if (!json || !json.candidate_profile || !json.candidate_sources) {
        console.error("❌ Missing candidate_profile or candidate_sources");
        console.error("Received:", json);
        return {
          content: [{
            type: "text",
            text: "❌ Erreur: Structure JSON invalide. Attendu: { candidate_profile: {...}, candidate_sources: [...] }"
          }],
          isError: true
        };
      }

      const profile = json.candidate_profile;
      const sources = json.candidate_sources;

      // ============================================
      // INSERTION 1 : Table candidate_profile
      // ============================================
      const { data: profileData, error: profileError } = await supabase
        .from("candidate_profile")
        .insert({
          // PAS de candidate_id - la table génère automatiquement "id"
          
          // A — Identité
          first_name: profile.first_name || null,
          last_name: profile.last_name || null,
          full_name: profile.full_name || null,
          nationalite: profile.nationalite || null,
          photo_url: profile.photo_url || null,
          
          // B — Éducation
          diplome_niveau: profile.diplome_niveau || null,
          ecole: profile.ecole || null,
          resume_education: profile.resume_education || null,
          appreciation_education: profile.appreciation_education || null,
          
          // C — Coordonnées
          telephone: profile.telephone || null,
          email: profile.email || null,
          linkedin_url: profile.linkedin_url || null,
          autres_profils: profile.autres_profils || null,
          
          // D — Logistique
          localisation: profile.localisation || null,
          geolocation_match: profile.geolocation_match || null,
          mobilite: profile.mobilite || null,
          onsite_required: profile.onsite_required || null,
          work_permit: profile.work_permit || null,
          remote_possible: profile.remote_possible || null,
          disponibilite: profile.disponibilite || null,
          date_maj_cv_globale: profile.date_maj_cv_globale || null,
          
          // E — Expériences
          experience_list: profile.experience_list || null,
          annees_experience: profile.annees_experience || null,
          missions_detaillees: profile.missions_detaillees || null,
          resume_experience: profile.resume_experience || null,
          secteurs: profile.secteurs || null,
          intercontrats_detectes: profile.intercontrats_detectes || null,
          
          // F — Compétences
          hard_skills: profile.hard_skills || null,
          soft_skills: profile.soft_skills || null,
          stack_technique: profile.stack_technique || null,
          keywords_detectes: profile.keywords_detectes || null,
          habilitations: profile.habilitations || null,
          certifications: profile.certifications || null,
          niveau_anglais: profile.niveau_anglais || null,
          
          // G — Administratif
          type_contrat: profile.type_contrat || null,
          sous_traitance: profile.sous_traitance || null,
          tjm_souhaite: profile.tjm_souhaite || null,
          tjm_max_offre: profile.tjm_max_offre || null,
          dossier_competence_existe: profile.dossier_competence_existe || null,
          url_dossier_competence: profile.url_dossier_competence || null,
          anonymisation_requise: profile.anonymisation_requise || null,
          
          // H — Métadonnées Profil
          source_principale: profile.source_principale || null,
          sources_secondaires: profile.sources_secondaires || null,
          coherence_cv_linkedin: profile.coherence_cv_linkedin || null,
          rang_linkedin: profile.rang_linkedin || null,
          historique_relationnel: profile.historique_relationnel || null,
          contact_attempted: profile.contact_attempted || null,
          invitation_status: profile.invitation_status || null,
          contacted_by: profile.contacted_by || null,
          first_contact_date: profile.first_contact_date || null,
          
          // I — Métadonnées Techniques
          last_sync: profile.last_sync || new Date().toISOString(),
          candidate_origin: profile.candidate_origin || null
        })
        .select("id, full_name")
        .single();

      if (profileError) {
        console.error("❌ Profile insert error:", profileError);
        return {
          content: [{
            type: "text",
            text: `❌ Erreur insertion profil:\n${profileError.message}\n${profileError.details || ''}\n${profileError.hint || ''}`
          }],
          isError: true
        };
      }

      console.log("✅ Profile saved:", profileData);

      // Récupérer l'UUID généré
      const candidateUUID = profileData.id;

      // ============================================
      // INSERTION 2 : Table candidate_sources
      // ============================================
      if (sources && sources.length > 0) {
        const sourcesWithCandidateId = sources.map((source: any) => ({
          id_candidat: candidateUUID,  // ✅ Nom de colonne correct
          type_source: source.type_source || null,
          url: source.url || null,
          identifiant_plateforme: source.identifiant_plateforme || null,
          date_maj_source: source.date_maj_source || null,
          fiabilite_source: source.fiabilite_source || null,
          tags_source: source.tags_source || null,
          fichier_cv_source: source.fichier_cv_source || null,
          statut_relationnel: source.statut_relationnel || null,
          historique_interactions: source.historique_interactions || null
        }));

        const { data: sourcesData, error: sourcesError } = await supabase
          .from("candidate_sources")
          .insert(sourcesWithCandidateId)
          .select("id, type_source");

        if (sourcesError) {
          console.error("❌ Sources insert error:", sourcesError);
          return {
            content: [{
              type: "text",
              text: `⚠️ Profil sauvegardé mais erreur sources:\n${sourcesError.message}\n\nProfil UUID: ${candidateUUID}`
            }],
            isError: false
          };
        }

        console.log(`✅ ${sourcesData.length} source(s) saved`);

        return {
          content: [{
            type: "text",
            text: `✅ Analyse candidat sauvegardée\n\n` +
                  `📄 UUID: ${candidateUUID}\n` +
                  `👤 Nom: ${profileData.full_name || 'N/A'}\n` +
                  `🔗 ${sourcesData.length} source(s) enregistrée(s)`
          }]
        };
      } else {
        // Pas de sources
        return {
          content: [{
            type: "text",
            text: `✅ Analyse candidat sauvegardée\n\n` +
                  `📄 UUID: ${candidateUUID}\n` +
                  `👤 Nom: ${profileData.full_name || 'N/A'}\n` +
                  `⚠️ Aucune source enregistrée`
          }]
        };
      }

    } catch (err: any) {
      console.error("❌ Unexpected error:", err);
      return {
        content: [{
          type: "text",
          text: `❌ Erreur: ${err.message}\n${err.stack || ''}`
        }],
        isError: true
      };
    }
  }
);

// ========================================
// TOOL : Lister tous les candidats
// ========================================
this.server.tool(
  "list_all_candidates",
  "Liste tous les candidats de la base Supabase",
  {
    limit: z.number().optional().default(100).describe("Nombre max de candidats"),
    localisation: z.string().optional().describe("Filtrer par localisation"),
    tjm_min: z.number().optional().describe("TJM minimum"),
    tjm_max: z.number().optional().describe("TJM maximum")
  },
  async (params) => {
    try {
      let query = supabase
        .from("candidate_profile")
        .select("id, full_name, localisation, tjm_souhaite, annees_experience, hard_skills, soft_skills, certifications, email, linkedin_url")
        .limit(params.limit || 100)
        .order("created_at", { ascending: false });

      // Filtres optionnels
      if (params.localisation) {
        query = query.ilike("localisation", `%${params.localisation}%`);
      }
      if (params.tjm_min) {
        query = query.gte("tjm_souhaite", params.tjm_min);
      }
      if (params.tjm_max) {
        query = query.lte("tjm_souhaite", params.tjm_max);
      }

      const { data, error } = await query;

      if (error) {
        return {
          content: [{
            type: "text",
            text: `❌ Erreur: ${error.message}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: `📋 ${data.length} candidat(s) trouvé(s):\n\n${JSON.stringify(data, null, 2)}`
        }]
      };
    } catch (err: any) {
      return {
        content: [{
          type: "text",
          text: `❌ Erreur: ${err.message}`
        }],
        isError: true
      };
    }
  }
);

// ========================================
// TOOL : Recherche intelligente par domaine (pour @Candidate_Finder)
// ========================================
this.server.tool(
  "search_candidates_by_domain",
  "Recherche intelligente de candidats par analyse de domaine (keywords + missions + expérience + secteurs)",
  {
    ao_id: z.string().describe("ID de l'AO"),
    domain: z.string().describe("Domaine métier identifié (ex: 'Cybersécurité', 'Data Engineering', 'DevOps', 'Cloud', 'ERP SAP')"),
    min_keywords: z.number().optional().default(2).describe("Nombre minimum de keywords pertinents"),
    max_keywords: z.number().optional().default(15).describe("Nombre maximum de keywords pertinents"),
    limit: z.number().optional().default(50).describe("Nombre max de candidats à retourner")
  },
  async (params) => {
    try {
      console.log(`🔍 Searching candidates for domain: \${params.domain}`);

      // Mapping domaine → keywords pertinents
      const domainKeywords: Record<string, string[]> = {
        "Cybersécurité": [
          "rssi", "cybersécurité", "cybersecurity", "sécurité", "ssi", "infosec",
          "iso 27001", "iso27001", "pssi", "drp", "bcp", "pca", "pra",
          "audit", "siem", "soc", "cert", "csirt", "habilitation", "secret défense",
          "pentest", "firewall", "ids", "ips", "gestion de crise", "conformité"
        ],
        "Data Engineering": [
          "data engineering", "data engineer", "data", "big data",
          "spark", "kafka", "airflow", "databricks", "snowflake",
          "aws", "azure", "gcp", "python", "scala", "sql",
          "etl", "elt", "data lake", "data warehouse", "streaming",
          "hadoop", "hive", "presto", "flink"
        ],
        "DevOps": [
          "devops", "ci/cd", "jenkins", "gitlab", "github actions",
          "docker", "kubernetes", "k8s", "terraform", "ansible",
          "aws", "azure", "gcp", "monitoring", "prometheus", "grafana",
          "helm", "argocd", "linux", "bash", "python"
        ],
        "Cloud": [
          "cloud", "aws", "azure", "gcp", "google cloud",
          "kubernetes", "docker", "terraform", "cloudformation",
          "lambda", "ec2", "s3", "rds", "dynamodb",
          "vpc", "iam", "serverless", "microservices"
        ],
        "ERP SAP": [
          "sap", "erp", "s/4hana", "sap fico", "sap mm", "sap sd",
          "sap pp", "sap hr", "abap", "fiori", "sap bw", "sap hana"
        ],
        "Architecture": [
          "architecte", "architecture", "design patterns", "microservices",
          "api", "rest", "graphql", "event-driven", "messaging",
          "kafka", "rabbitmq", "domain-driven design", "ddd"
        ]
      };

      // Récupérer les keywords du domaine (ou fallback sur liste vide)
      const relevantKeywords = domainKeywords[params.domain] || 
                               Object.values(domainKeywords).flat();
      
      console.log(`📋 \${relevantKeywords.length} keywords for domain "\${params.domain}"`);

      // Récupérer tous les candidats avec les 4 colonnes clés
      const { data: candidates, error } = await supabase
        .from("candidate_profile")
        .select(`
          id, 
          full_name, 
          keywords_detectes, 
          missions_detaillees, 
          resume_experience, 
          secteurs,
          localisation,
          tjm_souhaite,
          annees_experience,
          email,
          linkedin_url,
          disponibilite,
          type_contrat,
          hard_skills,
          soft_skills,
          certifications
        `)
        .limit(500); // Analyse large pour avoir un bon pool

      if (error) {
        console.error("❌ Supabase error:", error);
        return {
          content: [{
            type: "text",
            text: `❌ Erreur récupération candidats: \${error.message}`
          }],
          isError: true
        };
      }

      console.log(`📊 Analyzing \${candidates.length} candidates...`);

      // Analyse multi-critères de chaque candidat
      const analyzedCandidates = candidates
        .map(candidate => {
          let score = 0;
          let matchedKeywords: string[] = [];

          // 1️⃣ DIMENSION 1 : Analyse keywords_detectes (poids principal)
          const candidateKeywords = (candidate.keywords_detectes || [])
            .map((k: string) => k.toLowerCase().trim());

          matchedKeywords = candidateKeywords.filter((k: string) =>
            relevantKeywords.some(rk => 
              k.includes(rk) || rk.includes(k) || k === rk
            )
          );

          const keywordCount = matchedKeywords.length;

          // Scoring basé sur nombre de keywords pertinents
          if (keywordCount >= 11) score = 95;
          else if (keywordCount >= 6) score = 80;
          else if (keywordCount >= 4) score = 60;
          else if (keywordCount >= 2) score = 40;
          else score = 0;

          // 2️⃣ DIMENSION 2 : Bonus si missions mentionnent le domaine
          const missions = (candidate.missions_detaillees || []).join(" ").toLowerCase();
          const missionsMentionDomain = relevantKeywords.some(kw => missions.includes(kw));
          if (missionsMentionDomain) {
            score += 10;
          }

          // 3️⃣ DIMENSION 3 : Bonus si resume_experience mentionne le domaine
          const resume = (candidate.resume_experience || "").toLowerCase();
          const resumeMentionsDomain = relevantKeywords.some(kw => resume.includes(kw));
          if (resumeMentionsDomain) {
            score += 5;
          }

          // 4️⃣ DIMENSION 4 : Bonus si secteur pertinent
          const secteurs = (candidate.secteurs || []).join(" ").toLowerCase();
          const secteurMatch = relevantKeywords.some(kw => secteurs.includes(kw));
          if (secteurMatch) {
            score += 10;
          }

          // Construire la raison de sélection
          let reasons: string[] = [];
          if (keywordCount > 0) reasons.push(`\${keywordCount} keywords pertinents`);
          if (missionsMentionDomain) reasons.push("missions pertinentes");
          if (resumeMentionsDomain) reasons.push("expérience pertinente");
          if (secteurMatch) reasons.push("secteur pertinent");

          return {
            ...candidate,
            pertinence_score: Math.min(score, 100),
            keywords_matched: keywordCount,
            keywords_list: matchedKeywords,
            reason: reasons.join(", ") || "Aucun match"
          };
        })
        .filter(candidate => 
          candidate.keywords_matched >= (params.min_keywords || 2) &&
          candidate.keywords_matched <= (params.max_keywords || 15)
        )
        .sort((a, b) => b.pertinence_score - a.pertinence_score)
        .slice(0, params.limit || 50);

      console.log(`✅ \${analyzedCandidates.length} candidates qualified (\${params.min_keywords}-\${params.max_keywords} keywords)`);

      return {
        content: [{
          type: "text",
          text: `📊 \${analyzedCandidates.length} candidat(s) qualifié(s) pour le domaine "\${params.domain}":\n\n\${JSON.stringify(analyzedCandidates, null, 2)}`
        }]
      };
    } catch (err: any) {
      console.error("❌ Unexpected error:", err);
      return {
        content: [{
          type: "text",
          text: `❌ Erreur: \${err.message}\n\${err.stack || ''}`
        }],
        isError: true
      };
    }
  }
);

// ========================================
// TOOL : Récupérer candidats pré-qualifiés (pour @Candidate_Scorer)
// ========================================
this.server.tool(
  "get_prequalified_candidates",
  "Récupère la liste des candidats pré-qualifiés par @Candidate_Finder pour un AO",
  {
    ao_id: z.string().describe("ID de l'AO")
  },
  async (params) => {
    try {
      console.log(`📋 Fetching prequalified candidates for AO \${params.ao_id}...`);

      // Récupérer l'AO avec la colonne candidates_prequalified
      const { data: aoData, error } = await supabase
        .from("appel_offres_analyse")
        .select("ao_id, ao_name, candidates_prequalified")
        .eq("ao_id", params.ao_id)
        .single();

      if (error) {
        console.error("❌ Supabase error:", error);
        return {
          content: [{
            type: "text",
            text: `❌ AO non trouvé: \${error.message}`
          }],
          isError: true
        };
      }

      // Vérifier que la colonne existe et contient des données
      if (!aoData.candidates_prequalified || !aoData.candidates_prequalified.candidates) {
        console.warn("⚠️ No prequalified candidates found");
        return {
          content: [{
            type: "text",
            text: `⚠️ Aucun candidat pré-qualifié trouvé pour AO \${params.ao_id}.\n\n` +
                  `💡 Lance d'abord @Candidate_Finder pour cet AO.`
          }],
          isError: false
        };
      }

      const prequalData = aoData.candidates_prequalified;
      const candidateIds = prequalData.candidates.map((c: any) => c.candidate_id);

      console.log(`✅ Found \${candidateIds.length} prequalified candidates`);

      // Récupérer les profils complets des candidats pré-qualifiés
      const { data: candidates, error: candidatesError } = await supabase
        .from("candidate_profile")
        .select("*")
        .in("id", candidateIds);

      if (candidatesError) {
        console.error("❌ Error fetching candidate profiles:", candidatesError);
        return {
          content: [{
            type: "text",
            text: `❌ Erreur récupération profils: \${candidatesError.message}`
          }],
          isError: true
        };
      }

      // Enrichir avec les scores de pertinence
      const enrichedCandidates = candidates.map(candidate => {
        const prequal = prequalData.candidates.find((c: any) => c.candidate_id === candidate.id);
        return {
          ...candidate,
          pertinence_score: prequal?.pertinence_score || 0,
          keywords_matched: prequal?.keywords_matched || 0,
          keywords_list: prequal?.keywords_list || [],
          prequalification_reason: prequal?.reason || ""
        };
      });

      return {
        content: [{
          type: "text",
          text: `✅ \${enrichedCandidates.length} candidat(s) pré-qualifié(s) pour AO \${params.ao_id}:\n\n` +
                `🎯 Domaine: \${prequalData.domain}\n` +
                `📊 Total analysé: \${prequalData.total_analyzed}\n` +
                `✅ Total qualifié: \${prequalData.total_qualified}\n\n` +
                `\${JSON.stringify(enrichedCandidates, null, 2)}`
        }]
      };
    } catch (err: any) {
      console.error("❌ Unexpected error:", err);
      return {
        content: [{
          type: "text",
          text: `❌ Erreur: \${err.message}\n\${err.stack || ''}`
        }],
        isError: true
      };
    }
  }
);

// ========================================
// TOOL : Sauvegarder liste pré-qualifiée (pour @Candidate_Finder)
// ========================================
this.server.tool(
  "save_candidate_prequalification",
  "Sauvegarde la liste des candidats pré-qualifiés par @Candidate_Finder",
  {
    ao_id: z.string().describe("ID de l'AO"),
    domain_identified: z.string().describe("Domaine identifié"),
    candidates_prequalified: z.array(z.object({
      candidate_id: z.string(),
      full_name: z.string(),
      pertinence_score: z.number(),
      keywords_matched: z.number(),
      keywords_list: z.array(z.string()),
      reason: z.string()
    })).describe("Liste des candidats pré-qualifiés avec leurs scores"),
    total_candidates_analyzed: z.number().describe("Nombre total de candidats analysés"),
    total_candidates_qualified: z.number().describe("Nombre de candidats qualifiés")
  },
  async (params) => {
    try {
      // Log de démarrage
      console.log(`💾 Saving prequalification for AO \${params.ao_id}...`);
      
      // Créer l'objet de données à sauvegarder
      const prequalificationData = {
        domain: params.domain_identified,
        total_analyzed: params.total_candidates_analyzed,
        total_qualified: params.total_candidates_qualified,
        candidates: params.candidates_prequalified,
        updated_at: new Date().toISOString()
      };

      // UPDATE dans la table appel_offres_analyse
      const { data, error } = await supabase
        .from("appel_offres_analyse")
        .update({
          candidates_prequalified: prequalificationData
        })
        .eq("ao_id", params.ao_id)
        .select("id, ao_id, ao_name")
        .single();

      // Gestion des erreurs Supabase
      if (error) {
        console.error("❌ Supabase update error:", error);
        return {
          content: [{
            type: "text",
            text: `❌ Erreur sauvegarde prequalification:\n\nMessage: \${error.message}\n\nDétails: \${error.details || "Aucun détail disponible"}\n\nHint: \${error.hint || "Aucune suggestion"}\n\nCode: \${error.code || "Inconnu"}`
          }],
          isError: true
        };
      }

      // Vérifier que l'AO existe
      if (!data) {
        console.error("❌ No data returned - AO not found");
        return {
          content: [{
            type: "text",
            text: `❌ AO introuvable avec ao_id: \${params.ao_id}\n\nVérifie que:\n1. L'AO existe dans la table appel_offres_analyse\n2. Le champ ao_id est correct\n3. L'AO n'a pas été supprimé`
          }],
          isError: true
        };
      }

      // Succès
      console.log(`✅ Prequalification saved for AO \${data.ao_id}`);

      return {
        content: [{
          type: "text",
          text: `✅ Liste pré-qualifiée sauvegardée avec succès !\n\n` +
                `📋 AO: \${data.ao_name} (\${data.ao_id})\n` +
                `🎯 Domaine identifié: \${params.domain_identified}\n` +
                `📊 Candidats analysés: \${params.total_candidates_analyzed}\n` +
                `✅ Candidats qualifiés: \${params.total_candidates_qualified}\n\n` +
                `💾 Données sauvegardées dans la colonne candidates_prequalified`
        }]
      };

    } catch (err: any) {
      // Gestion des erreurs inattendues
      console.error("❌ Unexpected error:", err);
      
      return {
        content: [{
          type: "text",
          text: `❌ Erreur inattendue lors de la sauvegarde\n\n` +
                `Message: \${err.message}\n\n` +
                `Type: \${err.name || "Inconnu"}\n\n` +
                `Stack trace:\n\${err.stack || "Non disponible"}`
        }],
        isError: true
      };
    }
  }
);

// ========================================
// TOOL : Sauvegarder résultats de matching (batch)
// ========================================
this.server.tool(
  "save_matching_results",
  "Sauvegarde les résultats de matching pour plusieurs candidats",
  {
    matching_results: z.array(z.object({
      ao_id: z.string(),
      candidate_id: z.string(),
      score_global: z.number(),
      score_rh: z.number(),
      score_experts: z.any(), // JSONB
      score_experts_moyen: z.number(),
      analyse_rh: z.any().optional(),
      analyse_experts: z.any().optional(),
      recommandation: z.string().optional(),
      justification: z.string().optional(),
      decision: z.string().optional()
    })).describe("Liste des résultats de matching à sauvegarder")
  },
  async (params) => {
    try {
      console.log("💾 Saving matching results to Supabase...");

      const matchingData = params.matching_results.map(result => ({
        matching_id: `MATCH-${result.ao_id}-${result.candidate_id}-${Date.now()}`,
        ao_id: result.ao_id,
        candidate_id: result.candidate_id,
        score_global: result.score_global,
        score_rh: result.score_rh,
        score_experts: result.score_experts,
        score_experts_moyen: result.score_experts_moyen,
        analyse_rh: result.analyse_rh || null,
        analyse_experts: result.analyse_experts || null,
        recommandation: result.recommandation || null,
        justification: result.justification || null,
        decision: result.decision || null
      }));

      const { data, error } = await supabase
        .from("matching_results")
        .insert(matchingData)
        .select("id, matching_id, ao_id, candidate_id, score_global");

      if (error) {
        console.error("❌ Matching results insert error:", error);
        return {
          content: [{
            type: "text",
            text: `❌ Erreur insertion matching:\n${error.message}\n${error.details || ''}`
          }],
          isError: true
        };
      }

      console.log(`✅ ${data.length} matching result(s) saved`);

      return {
        content: [{
          type: "text",
          text: `✅ ${data.length} résultat(s) de matching sauvegardé(s)\n\n${JSON.stringify(data, null, 2)}`
        }]
      };
    } catch (err: any) {
      console.error("❌ Unexpected error:", err);
      return {
        content: [{
          type: "text",
          text: `❌ Erreur: ${err.message}`
        }],
        isError: true
      };
    }
  }
);

// ========================================
// TOOL : Récupérer résultats de matching
// ========================================
this.server.tool(
  "get_matching_results",
  "Récupère les résultats de matching pour un AO (shortlist)",
  {
    ao_id: z.string().describe("ID de l'AO"),
    limit: z.number().optional().default(10).describe("Nombre de candidats à récupérer")
  },
  async (params) => {
    try {
      const { data, error } = await supabase
        .from("matching_results")
        .select(`
          *,
          candidate:candidate_profile!candidate_id (
            full_name,
            email,
            linkedin_url,
            localisation,
            annees_experience,
            hard_skills,
            soft_skills
          )
        `)
        .eq("ao_id", params.ao_id)
        .order("score_global", { ascending: false })
        .limit(params.limit || 10);

      if (error) {
        return {
          content: [{
            type: "text",
            text: `❌ Erreur: ${error.message}`
          }],
          isError: true
        };
      }

      return {
        content: [{
          type: "text",
          text: `📊 ${data.length} résultat(s) de matching pour AO ${params.ao_id}:\n\n${JSON.stringify(data, null, 2)}`
        }]
      };
    } catch (err: any) {
      return {
        content: [{
          type: "text",
          text: `❌ Erreur: ${err.message}`
        }],
        isError: true
      };
    }
  }
);

// ========================================
// TOOL : Mettre à jour un résultat de matching (pour @GapAnalyzer)
// ========================================
this.server.tool(
  "update_matching_result",
  "Met à jour un résultat de matching avec gap analysis et questions",
  {
    matching_id: z.string().describe("ID du matching à mettre à jour"),
    gaps_identifies: z.any().optional().describe("Gaps identifiés (JSONB) - doit être un objet avec clés 'rh' et 'experts'"),
    questions_gap_analysis: z.any().optional().describe("Questions générées (JSONB) - doit être un array d'objets")
  },
  async (params) => {
    try {
      console.log("🔄 Updating matching result:", params.matching_id);
      
      const updateData: any = {
        updated_at: new Date().toISOString()  // ✅ Force l'update timestamp
      };
      
      // ✅ Validation et sérialisation des gaps
      if (params.gaps_identifies) {
        console.log("📝 Gaps received:", JSON.stringify(params.gaps_identifies));
        
        // Si c'est une string, on essaie de parser
        if (typeof params.gaps_identifies === 'string') {
          try {
            updateData.gaps_identifies = JSON.parse(params.gaps_identifies);
          } catch (e) {
            console.error("❌ Invalid JSON string for gaps_identifies");
            return {
              content: [{
                type: "text",
                text: `❌ Erreur: gaps_identifies doit être un objet JSON valide, pas une string`
              }],
              isError: true
            };
          }
        } else {
          updateData.gaps_identifies = params.gaps_identifies;
        }
      }
      
      // ✅ Validation et sérialisation des questions
      if (params.questions_gap_analysis) {
        console.log("📝 Questions received (count):", 
          Array.isArray(params.questions_gap_analysis) ? params.questions_gap_analysis.length : 'not an array'
        );
        
        // Si c'est une string, on essaie de parser
        if (typeof params.questions_gap_analysis === 'string') {
          try {
            updateData.questions_gap_analysis = JSON.parse(params.questions_gap_analysis);
          } catch (e) {
            console.error("❌ Invalid JSON string for questions_gap_analysis");
            return {
              content: [{
                type: "text",
                text: `❌ Erreur: questions_gap_analysis doit être un array JSON valide, pas une string`
              }],
              isError: true
            };
          }
        } else {
          updateData.questions_gap_analysis = params.questions_gap_analysis;
        }
        
        // Validation : doit être un array
        if (!Array.isArray(updateData.questions_gap_analysis)) {
          console.error("❌ questions_gap_analysis is not an array:", typeof updateData.questions_gap_analysis);
          return {
            content: [{
              type: "text",
              text: `❌ Erreur: questions_gap_analysis doit être un array, reçu: \${typeof updateData.questions_gap_analysis}`
            }],
            isError: true
          };
        }
      }

      console.log("💾 Sending to Supabase:", JSON.stringify(updateData, null, 2));

      const { data, error } = await supabase
        .from("matching_results")
        .update(updateData)
        .eq("matching_id", params.matching_id)
        .select("id, matching_id, ao_id, candidate_id, gaps_identifies, questions_gap_analysis")
        .single();

      if (error) {
        console.error("❌ Supabase update error:", error);
        return {
          content: [{
            type: "text",
            text: `❌ Erreur Supabase lors de la mise à jour:\n` +
                  `Code: \${error.code}\n` +
                  `Message: \${error.message}\n` +
                  `Détails: \${error.details || 'N/A'}\n` +
                  `Hint: \${error.hint || 'N/A'}\n\n` +
                  `Matching ID: \${params.matching_id}\n` +
                  `Données envoyées:\n\${JSON.stringify(updateData, null, 2)}`
          }],
          isError: true
        };
      }

      console.log("✅ Matching updated successfully:", data.matching_id);

      return {
        content: [{
          type: "text",
          text: `✅ Matching \${data.matching_id} mis à jour avec succès\n\n` +
                `📊 Gaps sauvegardés: \${updateData.gaps_identifies ? 'Oui' : 'Non'}\n` +
                `❓ Questions sauvegardées: \${updateData.questions_gap_analysis ? updateData.questions_gap_analysis.length : 0}`
        }]
      };
    } catch (err: any) {
      console.error("❌ Unexpected error:", err);
      return {
        content: [{
          type: "text",
          text: `❌ Erreur inattendue:\n\${err.message}\n\${err.stack || ''}`
        }],
        isError: true
      };
    }
  }
);

    // ========================================
    // TOOL 2 : Lister les AOs
    // ========================================
    this.server.tool(
      "list_appels_offres",
      "Liste les Appels d'Offres analysés dans Supabase",
      {
        limit: z.number().optional().default(50).describe("Nombre max de résultats"),
        go_no_go: z.string().optional().describe("Filtrer par décision GO/NO-GO")
      },
      async (params) => {
        try {
          let query = supabase
            .from("appel_offres_analyse")
            .select("id, ao_id, ao_name, titre_poste, go_no_go, domaine_metier, created_at")
            .limit(params.limit || 50)
            .order("created_at", { ascending: false });

          if (params.go_no_go) {
            query = query.eq("go_no_go", params.go_no_go);
          }

          const { data, error } = await query;

          if (error) {
            return {
              content: [{
                type: "text",
                text: `❌ Erreur: ${error.message}`
              }],
              isError: true
            };
          }

          return {
            content: [{
              type: "text",
              text: `📋 ${data.length} Appel(s) d'Offre trouvé(s):\n\n${JSON.stringify(data, null, 2)}`
            }]
          };
        } catch (err: any) {
          return {
            content: [{
              type: "text",
              text: `❌ Erreur: ${err.message}`
            }],
            isError: true
          };
        }
      }
    );

    // ========================================
    // TOOL 3 : Récupérer un AO spécifique
    // ========================================
    this.server.tool(
      "get_appel_offre",
      "Récupère une analyse complète d'AO par son ID ou nom",
      {
        ao_id: z.string().optional().describe("ID de l'AO"),
        ao_name: z.string().optional().describe("Nom de l'AO")
      },
      async (params) => {
        try {
          let query = supabase
            .from("appel_offres_analyse")
            .select("*");

          if (params.ao_id) {
            query = query.eq("ao_id", params.ao_id);
          } else if (params.ao_name) {
            query = query.ilike("ao_name", `%${params.ao_name}%`);
          } else {
            return {
              content: [{
                type: "text",
                text: "❌ Vous devez fournir soit ao_id, soit ao_name"
              }],
              isError: true
            };
          }

          const { data, error } = await query.single();

          if (error) {
            return {
              content: [{
                type: "text",
                text: `❌ AO non trouvé: ${error.message}`
              }],
              isError: true
            };
          }

          return {
            content: [{
              type: "text",
              text: `📄 Analyse complète de l'AO:\n\n${JSON.stringify(data, null, 2)}`
            }]
          };
        } catch (err: any) {
          return {
            content: [{
              type: "text",
              text: `❌ Erreur: ${err.message}`
            }],
            isError: true
          };
        }
      }
    );

    console.log("✅ 12 tools initialized");
  }
}

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(JSON.stringify({
        name: "mcp-headhunter",
        version: "2.0.0",
        tools: [
          "test_supabase",
          "save_appel_offre",
          "list_appels_offres",
          "get_appel_offre",
          "save_candidate",
          "list_all_candidates",
          "search_candidates_by_domain",           
          "save_candidate_prequalification",
          "get_prequalified_candidates",      
          "save_matching_results",
          "get_matching_results",
          "update_matching_result"
        ],
        status: "ready"
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/mcp') {
      return await MyMCP.serve('/mcp').fetch(request, env, ctx);
    }

    return new Response("Not Found", { status: 404 });
  }
};