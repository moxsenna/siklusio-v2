import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Load env vars from .env.local first (highest priority), then fall back to .env
dotenv.config({ path: ".env.local" });
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const getSupabaseAdmin = () => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase config");
    }

    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  };

  const listAllAuthUsers = async (supabaseAdmin: ReturnType<typeof getSupabaseAdmin>) => {
    const perPage = 1000;
    const users: any[] = [];

    for (let page = 1; ; page += 1) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;

      users.push(...data.users);

      const total = "total" in data ? data.total : 0;
      if (data.users.length < perPage || (typeof total === "number" && users.length >= total)) {
        break;
      }
    }

    return users;
  };

  const requireUser = async (req: express.Request, res: express.Response) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : null;

    if (!token) {
      res.status(401).json({ error: "Missing access token" });
      return null;
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);

    if (userErr || !userData?.user) {
      res.status(401).json({ error: "Invalid or expired session" });
      return null;
    }

    return { supabaseAdmin, user: userData.user };
  };

  // API Route for generating recipes and groceries
  app.post("/api/generate-recipes", async (req, res) => {
    console.log("--> [BACKEND] Received request /api/generate-recipes");
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("<-- [BACKEND] No API key!");
        return res.status(500).json({ error: "GEMINI_API_KEY is not defined" });
      }

      const auth = await requireUser(req, res);
      if (!auth) return;

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

      const auth = await requireUser(req, res);
      if (!auth) return;

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

  // API Route for generating AI habits insight based on 7-day data
  app.post("/api/generate-habits-insight", async (req, res) => {
    console.log("--> [BACKEND] Received request /api/generate-habits-insight");
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not defined" });
      }

      const auth = await requireUser(req, res);
      if (!auth) return;

      const { weeklyData, currentPhase, nickname } = req.body;
      // weeklyData: array of { date, tasks: [{text, done}], symptoms: [string] }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Kamu adalah asisten kesehatan reproduksi wanita yang hangat dan suportif. Analisis data aktivitas dan gejala 7 hari terakhir pengguna, lalu berikan insight dan saran yang actionable.

Konteks:
- Nama panggilan: ${nickname || 'Bunda'}
- Fase siklus saat ini: ${currentPhase}
- Data 7 hari terakhir: ${JSON.stringify(weeklyData)}

Berdasarkan data di atas, buatkan analisis dalam Bahasa Indonesia yang:
1. Ringkas pola aktivitas (berapa persen target tercapai, konsistensi)
2. Analisis gejala yang muncul (frekuensi, korelasi dengan fase)
3. Berikan 3 saran spesifik dan praktis untuk minggu depan
4. Tutup dengan kalimat motivasi yang personal

PENTING:
- Gunakan bahasa yang hangat, suportif, dan tidak menggurui
- Saran harus realistis dan mudah dilakukan
- Jika data kosong/sedikit, tetap berikan saran umum yang relevan dengan fase siklus

Return ONLY raw JSON (tanpa markdown blocks) dengan format:
{
  "summary": "string (ringkasan pola 7 hari, 2-3 kalimat)",
  "symptomAnalysis": "string (analisis gejala, 1-2 kalimat. Kosongkan jika tidak ada gejala)",
  "tips": ["string", "string", "string"] (3 saran praktis),
  "motivation": "string (kalimat motivasi personal)"
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
      res.status(500).json({ error: error instanceof Error ? (error.stack || error.message) : "Gagal membuat insight" });
    }
  });

  // API Route for TWW Sanctuary AI Reassurance
  app.post("/api/generate-calming-reassurance", async (req, res) => {
    console.log("--> [BACKEND] Received request /api/generate-calming-reassurance");
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not defined" });
      }

      const { nickname, userJournal } = req.body;

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: `Kamu adalah asisten/sahabat kehamilan yang sangat menenangkan dan berempati. Pengguna bernama ${nickname} sedang berada di masa TWW (Two-Week Wait - penantian setelah ovulasi hingga haid berikutnya).
Masa ini sangat rentan memicu kecemasan (symptom spotting).
Ini adalah curahan hatinya (jurnal emosi): "${userJournal}"

Berikan balasan surat yang:
1. Menvalidasi perasaannya (tidak meremehkan).
2. Sangat hangat, empatis, dan menyemangati.
3. Mengajaknya untuk kembali fokus pada kedamaian saat ini dan mempercayai proses tubuhnya.
4. Jangan memberikan diagnosa medis atau janji kehamilan palsu.

Return ONLY raw JSON (tanpa markdown blocks) dengan format:
{
  "reassurance": "string (surat balasan hangat 2-3 paragraf singkat)",
  "breathingTip": "string (satu kalimat instruksi napas sederhana yang relevan)"
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
      res.status(500).json({ error: error instanceof Error ? (error.stack || error.message) : "Gagal membuat pesan penenang" });
    }
  });

  // API Route for Admin to fetch all profiles

  app.get("/api/admin/users", async (req, res) => {
    try {
      // ---- AUTH GATE ----
      // Caller must send Authorization: Bearer <supabase access token>.
      // We then verify the token, look up the user's profile, and require is_admin = true.
      const auth = await requireUser(req, res);
      if (!auth) return;
      const { supabaseAdmin, user } = auth;

      const { data: profile, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (profileErr) {
        return res.status(500).json({ error: profileErr.message });
      }

      if (!profile?.is_admin) {
        return res.status(403).json({ error: "Forbidden: admin access required" });
      }
      // ---- /AUTH GATE ----

      const authUsers = await listAllAuthUsers(supabaseAdmin);
      const authUsersById = new Map(authUsers.map((authUser: any) => [authUser.id, authUser]));

      const { data: profiles, error: profileError } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false });
      if (profileError) throw profileError;

      // Merge data
      const usersData = profiles.map(p => {
        const authUser = authUsersById.get(p.id);
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

  // ============================================================
  // Avatar Upload to Cloudflare R2
  // ============================================================

  const getR2Client = () => {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("Missing R2 configuration (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)");
    }

    return new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  };

  app.post("/api/upload-avatar", async (req, res) => {
    console.log("--> [BACKEND] Received request /api/upload-avatar");
    try {
      const auth = await requireUser(req, res);
      if (!auth) return;

      const { base64 } = req.body;
      if (!base64 || typeof base64 !== "string") {
        return res.status(400).json({ error: "Missing or invalid 'base64' field" });
      }

      // Validate size (base64 is ~33% larger than raw bytes)
      const estimatedBytes = Math.ceil(base64.length * 0.75);
      const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
      if (estimatedBytes > MAX_BYTES) {
        return res.status(400).json({ error: "Ukuran gambar maksimal 5 MB" });
      }

      const buffer = Buffer.from(base64, "base64");
      const bucketName = process.env.R2_BUCKET_NAME || "siklusio-avatars";
      const publicUrl = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

      if (!publicUrl) {
        return res.status(500).json({ error: "R2_PUBLIC_URL is not configured" });
      }

      // Generate unique key: avatars/{userId}/{timestamp}.webp
      const key = `avatars/${auth.user.id}/${Date.now()}.webp`;

      const r2 = getR2Client();
      await r2.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: "image/webp",
        })
      );

      const url = `${publicUrl}/${key}`;
      console.log("<-- [BACKEND] Avatar uploaded:", url);
      res.json({ url });
    } catch (error: any) {
      console.error("<-- [BACKEND] Avatar upload error:", error.stack || error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Gagal mengunggah avatar",
      });
    }
  });

  // Serve static frontend (production) or API landing page (no frontend bundled).
  // Vite middleware was removed because the standalone web frontend has been
  // retired in favour of the universal Expo `mobile-app/` codebase.
  const landingPath = path.join(process.cwd(), 'landing');
  if (fs.existsSync(landingPath) && fs.existsSync(path.join(landingPath, 'index.html'))) {
    app.use(express.static(landingPath));
    app.get('/', (req, res) => {
      res.sendFile(path.join(landingPath, 'index.html'));
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
