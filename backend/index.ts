import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

// Load env vars from .env.local first (highest priority), then fall back to .env
dotenv.config({ path: ".env.local" });
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for generating recipes and groceries
  app.post("/api/generate-recipes", async (req, res) => {
    console.log("--> [BACKEND] Received request /api/generate-recipes");
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("<-- [BACKEND] No API key!");
        return res.status(500).json({ error: "GEMINI_API_KEY is not defined" });
      }

      const { phase } = req.body;
      console.log("--> [BACKEND] Phase requested:", phase);

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      console.log("--> [BACKEND] Calling Gemini API...");
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: `Generate smart grocery recommendations for a pregnant or trying-to-conceive woman, specifically currently in the ${phase} phase of her menstrual cycle.
        Also generate 2 simple, healthy daily recipes suitable for this phase.
        IMPORTANT: 
        1. All generated text (names, descriptions, titles, ingredients) MUST be in Indonesian (Bahasa Indonesia).
        2. ONLY recommend groceries and ingredients that are very common, affordable, and easy to find in local Indonesian traditional markets (pasar) or standard Indonesian supermarkets (e.g., bayam, tempe, tahu, ikan kembung, telur ayam, kangkung, dll.). Avoid western/rare ingredients like quinoa, asparagus, berries, or salmon if there are cheaper common local alternatives like ikan kembung, ayam, atau pisang.
        Return ONLY a raw JSON object string (do not include markdown blocks like \`\`\`json) matching this exact schema:
        {
          "groceries": [ { "id": number, "name": string, "desc": string, "emoji": string } ],
          "recipes": [ { "id": number, "title": string, "description": string, "ingredients": [string], "emoji": string } ]
        }`,
        config: {
          responseMimeType: "application/json",
        }
      });

      console.log("--> [BACKEND] Received Gemini response.");
      let text = response.text || "";
      text = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      if (!text) throw new Error("No text generated");
      console.log("--> [BACKEND] Parsing JSON...");
      const result = JSON.parse(text);
      console.log("<-- [BACKEND] Returning success.");
      res.json(result);
    } catch (error: any) {
      console.error("<-- [BACKEND] Gemini API Error / Exception:");
      console.error(error.stack || error);
      res.status(500).json({ error: error instanceof Error ? (error.stack || error.message) : "Sesuatu yang tidak terduga terjadi" });
    }
  });

  // API Route for generating AI cycle report
  app.post("/api/generate-cycle-report", async (req, res) => {
    console.log("--> [BACKEND] Received request /api/generate-cycle-report");
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not defined" });
      }

      const { cycleData, phase, cycleDay, daysToNextPeriod, fertilityWindow } = req.body;

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: `Analyze the user's menstrual cycle and generate an actionable AI report.
        Context:
        - Current phase: ${phase}
        - Cycle day: ${cycleDay}
        - Days to next period: ${daysToNextPeriod}
        - Fertile window: ${fertilityWindow.start} to ${fertilityWindow.end}
        - Activity & Body Data logic: ${JSON.stringify(cycleData).slice(0, 500)} // limited to avoid massive prompts
        
        Write a supportive and professional report IN INDONESIAN. 
        It MUST be structured as a JSON with the following exact keys (no markdown formatting, just raw JSON).
        {
          "summary": string (a short, encouraging paragraph summarizing their current cycle state),
          "bodyInsights": [ string ] (2-3 bullet points about what their body is doing right now based on the phase),
          "actionPlan": [ string ] (3 practical actions to do today/this week for pregnancy success or wellbeing),
          "encouragement": string (a warm, supportive closing remark)
        }`,
        config: {
          responseMimeType: "application/json",
        }
      });

      let text = response.text || "";
      text = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      const result = JSON.parse(text);
      res.json(result);
    } catch (error: any) {
      console.error(error.stack || error);
      res.status(500).json({ error: error instanceof Error ? (error.stack || error.message) : "Gagal membuat laporan" });
    }
  });

  // API Route for Admin to fetch all profiles
  app.get("/api/admin/users", async (req, res) => {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        return res.status(500).json({ error: "Missing Supabase config. Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in settings/secrets." });
      }

      // Initialize Supabase with the service_role key to bypass RLS
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      // ---- AUTH GATE ----
      // Caller must send Authorization: Bearer <supabase access token>.
      // We then verify the token, look up the user's profile, and require is_admin = true.
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : null;

      if (!token) {
        return res.status(401).json({ error: "Missing access token" });
      }

      const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
      if (userErr || !userData?.user) {
        return res.status(401).json({ error: "Invalid or expired session" });
      }

      const { data: profile, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("is_admin")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (profileErr) {
        return res.status(500).json({ error: profileErr.message });
      }

      if (!profile?.is_admin) {
        return res.status(403).json({ error: "Forbidden: admin access required" });
      }
      // ---- /AUTH GATE ----

      // Example: Fetch from Auth users if needed using supabaseAdmin.auth.admin.listUsers()
      // But for now, just fetch from the public.profiles table
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
      if (authError) throw authError;

      const { data: profiles, error: profileError } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false });
      if (profileError) throw profileError;

      // Merge data
      const usersData = profiles.map(p => {
        const authUser = authUsers.users.find((u: any) => u.id === p.id);
        return {
          ...p,
          email: authUser?.email,
          last_sign_in_at: authUser?.last_sign_in_at
        }
      });

      res.json({ users: usersData });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Failed to fetch users" });
    }
  });

  // Serve static frontend (production) or API landing page (no frontend bundled).
  // Vite middleware was removed because the standalone web frontend has been
  // retired in favour of the universal Expo `mobile-app/` codebase.
  const distPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    app.get('/', (req, res) => {
      res.send('Siklusio API Server is running.');
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
