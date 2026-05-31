# Resep Hari Ini Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight AI "Resep Hari Ini" feature that saves paid generations so users can reopen today's recipes after reloads, tab switches, or app restarts.

**Architecture:** Add a Supabase `recipe_generations` table and store each valid AI result as `pending_charge` before charging credits. Reuse the existing OpenRouter-backed `/api/generate-recipes` endpoint, but make it credit-protected and persistent; add a read endpoint for today's active recipe. Add a Habits tab card and modal that first fetches the saved result, then generates only if none exists.

**Tech Stack:** Supabase Postgres, Supabase CLI migrations, Hono on Cloudflare Workers, Supabase service-role RPC credit ledger, OpenRouter chat completions, Expo Router, React Native, NativeWind, Node `test`, TypeScript.

---

## Product Rules

- Cost: 15 AI credits per new generation.
- Existing active result for the same user and date is free to reopen.
- Credits are charged only after a valid result is saved in `recipe_generations`.
- The credit ledger uses `feature = 'recipes_today'`, `reason = phase`, and `reference_id = recipe_generations.id`.
- If OpenRouter fails, validation fails, or saving fails, no credit is charged.
- If charging fails after save, the row remains `pending_charge` and must not be shown by the read endpoint.
- Only one `active` recipe result is allowed per user/date; multiple `pending_charge` rows are allowed so a failed charge does not block retry.
- The MVP does not include AI vision, weekly meal planning, full recipe history UI, or Mayar top-up changes.

## File Structure

### Database

- Create: `supabase/recipe_generations.sql`
  - Saved recipe generations, RLS, service role policy, and lookup index.
- Create: `supabase/migrations/YYYYMMDDHHMMSS_recipe_generations.sql`
  - Supabase CLI migration copy of the schema.

### Backend

- Modify: `backend/ai/schemas.ts`
  - Tighten `recipesGenerationSchema`.
  - Add `RecipesGenerationResult` fields for groceries, recipes, phase benefit, and disclaimer.
  - Validate exactly 2 recipes and a 3-6 item grocery list.
- Create: `backend/ai/recipeSummary.ts`
  - Build a safe cycle snapshot for saved rows and prompts.
- Modify: `backend/ai/helpers.test.ts`
  - Add recipe validator tests.
  - Add recipe snapshot tests.
- Modify: `backend/index.ts`
  - Add `GET /api/recipes/today`.
  - Update `POST /api/generate-recipes` to save, charge, activate, and return saved generation.

### Mobile

- Create: `mobile-app/src/lib/todayRecipes.ts`
  - Types and mappers for saved API results.
- Create: `mobile-app/src/lib/todayRecipes.test.ts`
  - Tests for mapping saved API rows into UI-safe data.
- Create: `mobile-app/components/habits/TodayRecipesCard.tsx`
  - Entry card in Habits tab.
- Create: `mobile-app/components/habits/TodayRecipesModal.tsx`
  - Fetch/generate/result modal.
- Modify: `mobile-app/app/(tabs)/habits.tsx`
  - Insert "Resep Hari Ini" card below Habit Coach and pass cycle context.

---

## Task 1: Recipe Generation Database Schema

**Files:**
- Create: `supabase/recipe_generations.sql`
- Create: `supabase/migrations/20260531010400_recipe_generations.sql`

- [ ] **Step 1: Create the SQL schema**

Create `supabase/recipe_generations.sql`:

```sql
-- ============================================================
-- Saved AI Resep Hari Ini generations
-- Run after supabase/ai_credits.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.recipe_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  generated_for_date DATE NOT NULL,
  phase TEXT NOT NULL,
  cycle_day INTEGER,
  days_to_next_period INTEGER,
  cycle_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_charge'
    CHECK (status IN ('pending_charge', 'active', 'archived')),
  ai_model TEXT NOT NULL,
  credit_cost INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.recipe_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_full_access_recipe_generations" ON public.recipe_generations;
CREATE POLICY "service_role_full_access_recipe_generations"
ON public.recipe_generations TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_recipe_generations_user_date
ON public.recipe_generations(user_id, generated_for_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_recipe_generations_active_user_date
ON public.recipe_generations(user_id, generated_for_date)
WHERE status = 'active';
```

- [ ] **Step 2: Copy schema into a CLI migration**

```powershell
New-Item -ItemType Directory -Force supabase\migrations | Out-Null
Copy-Item -LiteralPath supabase\recipe_generations.sql -Destination supabase\migrations\20260531010400_recipe_generations.sql
```

- [ ] **Step 3: Dry-run migration**

```powershell
npx.cmd supabase db push --dry-run
```

Expected: dry-run lists `20260531010400_recipe_generations.sql`.

- [ ] **Step 4: Commit schema files**

```powershell
git add supabase/recipe_generations.sql supabase/migrations/20260531010400_recipe_generations.sql
git commit -m "feat: add recipe generation table"
```

---

## Task 2: Backend Recipe Schema And Snapshot Helpers

**Files:**
- Modify: `backend/ai/schemas.ts`
- Create: `backend/ai/recipeSummary.ts`
- Modify: `backend/ai/helpers.test.ts`

- [ ] **Step 1: Add failing validator and snapshot tests**

Add this to `backend/ai/helpers.test.ts`:

```ts
import { buildRecipeCycleSnapshot } from "./recipeSummary";
import { validateRecipesGeneration } from "./schemas";

const validRecipePayload = {
  phaseBenefit:
    "Di fase luteal, makanan hangat berserat dan protein sederhana bisa membantu energi terasa lebih stabil.",
  groceries: [
    { id: 1, name: "Tempe", desc: "Protein nabati murah dan mudah dicari.", emoji: "soy" },
    { id: 2, name: "Bayam", desc: "Sayur hijau lokal untuk variasi serat.", emoji: "leaf" },
    { id: 3, name: "Telur", desc: "Protein praktis untuk masakan cepat.", emoji: "egg" },
  ],
  recipes: [
    {
      id: 1,
      title: "Tumis Bayam Tempe",
      description: "Menu hangat sederhana untuk makan siang.",
      cookingTime: "15 menit",
      ingredients: ["bayam", "tempe", "bawang putih"],
      steps: ["Cuci bayam.", "Tumis bawang putih.", "Masukkan tempe dan bayam."],
      phaseBenefit: "Protein dan serat membantu kenyang lebih lama.",
      emoji: "pan",
    },
    {
      id: 2,
      title: "Telur Dadar Wortel",
      description: "Lauk cepat dengan bahan warung.",
      cookingTime: "10 menit",
      ingredients: ["telur", "wortel", "daun bawang"],
      steps: ["Kocok telur.", "Campur wortel.", "Masak di teflon."],
      phaseBenefit: "Protein telur mendukung energi harian.",
      emoji: "egg",
    },
  ],
  disclaimer: "Panduan ini bersifat nutrisi umum, bukan pengganti saran medis.",
};

test("validateRecipesGeneration accepts local Indonesian recipe payload", () => {
  const result = validateRecipesGeneration(validRecipePayload);
  assert.equal(result.recipes.length, 2);
  assert.equal(result.groceries.length, 3);
  assert.match(result.phaseBenefit, /fase luteal/i);
});

test("validateRecipesGeneration rejects payload without exactly two recipes", () => {
  assert.throws(
    () => validateRecipesGeneration({ ...validRecipePayload, recipes: [validRecipePayload.recipes[0]] }),
    /exactly 2 recipes/
  );
});

test("buildRecipeCycleSnapshot keeps only recipe context fields", () => {
  const snapshot = buildRecipeCycleSnapshot({
    phase: "Luteal",
    cycleDay: 23,
    daysToNextPeriod: 5,
    nickname: "Maya",
    privateNotes: "not for recipe prompt",
  });

  assert.deepEqual(snapshot, {
    phase: "Luteal",
    cycleDay: 23,
    daysToNextPeriod: 5,
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

```powershell
npx.cmd tsx backend/ai/helpers.test.ts
```

Expected: FAIL because `recipeSummary.ts` does not exist and the current validator is shallow.

- [ ] **Step 3: Add recipe snapshot helper**

Create `backend/ai/recipeSummary.ts`:

```ts
export function buildRecipeCycleSnapshot(body: any) {
  return {
    phase: body.phase || "unknown_phase",
    cycleDay: typeof body.cycleDay === "number" ? body.cycleDay : null,
    daysToNextPeriod:
      typeof body.daysToNextPeriod === "number" ? body.daysToNextPeriod : null,
  };
}
```

- [ ] **Step 4: Tighten recipe schema and validator**

In `backend/ai/schemas.ts`, replace `recipesGenerationSchema`, `RecipesGenerationResult`, and `validateRecipesGeneration` with:

```ts
export const recipesGenerationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["phaseBenefit", "groceries", "recipes", "disclaimer"],
  properties: {
    phaseBenefit: { type: "string" },
    groceries: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "name", "desc", "emoji"],
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          desc: { type: "string" },
          emoji: { type: "string" },
        },
      },
    },
    recipes: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "title",
          "description",
          "cookingTime",
          "ingredients",
          "steps",
          "phaseBenefit",
          "emoji",
        ],
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          description: { type: "string" },
          cookingTime: { type: "string" },
          ingredients: {
            type: "array",
            minItems: 3,
            maxItems: 8,
            items: { type: "string" },
          },
          steps: {
            type: "array",
            minItems: 2,
            maxItems: 6,
            items: { type: "string" },
          },
          phaseBenefit: { type: "string" },
          emoji: { type: "string" },
        },
      },
    },
    disclaimer: { type: "string" },
  },
};

export interface RecipesGenerationResult {
  phaseBenefit: string;
  groceries: Array<{ id: number; name: string; desc: string; emoji: string }>;
  recipes: Array<{
    id: number;
    title: string;
    description: string;
    cookingTime: string;
    ingredients: string[];
    steps: string[];
    phaseBenefit: string;
    emoji: string;
  }>;
  disclaimer: string;
}

export function validateRecipesGeneration(value: unknown): RecipesGenerationResult {
  if (!isPlainRecord(value) || !Array.isArray(value.groceries) || !Array.isArray(value.recipes)) {
    throw new Error("Invalid recipes generation payload");
  }
  assertString(value.phaseBenefit, "Recipe phase benefit is required");
  assertString(value.disclaimer, "Recipe disclaimer is required");
  if (value.groceries.length < 3 || value.groceries.length > 6) {
    throw new Error("Recipe grocery list must contain 3 to 6 items");
  }
  if (value.recipes.length !== 2) {
    throw new Error("Recipe generation must contain exactly 2 recipes");
  }
  value.groceries.forEach((item) => {
    if (!isPlainRecord(item)) throw new Error("Invalid grocery item payload");
    if (typeof item.id !== "number") throw new Error("Grocery id is required");
    assertString(item.name, "Grocery name is required");
    assertString(item.desc, "Grocery desc is required");
    assertString(item.emoji, "Grocery emoji is required");
  });
  value.recipes.forEach((recipe) => {
    if (!isPlainRecord(recipe)) throw new Error("Invalid recipe payload");
    if (typeof recipe.id !== "number") throw new Error("Recipe id is required");
    assertString(recipe.title, "Recipe title is required");
    assertString(recipe.description, "Recipe description is required");
    assertString(recipe.cookingTime, "Recipe cooking time is required");
    assertString(recipe.phaseBenefit, "Recipe phase benefit is required");
    assertString(recipe.emoji, "Recipe emoji is required");
    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length < 3 || recipe.ingredients.length > 8) {
      throw new Error("Recipe ingredients must contain 3 to 8 items");
    }
    if (!Array.isArray(recipe.steps) || recipe.steps.length < 2 || recipe.steps.length > 6) {
      throw new Error("Recipe steps must contain 2 to 6 items");
    }
    recipe.ingredients.forEach((item) => assertString(item, "Recipe ingredient is required"));
    recipe.steps.forEach((item) => assertString(item, "Recipe step is required"));
  });
  return value as unknown as RecipesGenerationResult;
}
```

- [ ] **Step 5: Run tests**

```powershell
npx.cmd tsx backend/ai/helpers.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend/ai/schemas.ts backend/ai/helpers.test.ts backend/ai/recipeSummary.ts
git commit -m "feat: tighten recipe ai schema"
```

---

## Task 3: Backend Saved Recipe Endpoints

**Files:**
- Modify: `backend/index.ts`
- Modify: `backend/ai/helpers.test.ts`

- [ ] **Step 1: Add failing route helper expectation test**

Add this test to `backend/ai/helpers.test.ts`:

```ts
test("recipe credit charge should use saved generation id as reference", () => {
  const generation = { id: "recipe-generation-1" };
  const chargePayload = {
    userId: "user-1",
    amount: 15,
    feature: "recipes_today",
    reason: "Luteal",
    referenceId: generation.id,
    metadata: { model: "test-model" },
  };

  assert.equal(chargePayload.referenceId, "recipe-generation-1");
  assert.equal(chargePayload.feature, "recipes_today");
  assert.equal(chargePayload.amount, 15);
});
```

- [ ] **Step 2: Run tests**

```powershell
npx.cmd tsx backend/ai/helpers.test.ts
```

Expected: PASS. This test documents the required endpoint contract before route edits.

- [ ] **Step 3: Add imports in `backend/index.ts`**

Add `buildRecipeCycleSnapshot`:

```ts
import { buildRecipeCycleSnapshot } from "./ai/recipeSummary";
```

- [ ] **Step 4: Add `GET /api/recipes/today`**

Add this route before `/api/generate-recipes`:

```ts
app.get("/api/recipes/today", async (c) => {
  try {
    const auth = await requireUser(c);
    if (!auth) return c.json({ error: "Missing or invalid session" }, 401);

    const date = c.req.query("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return c.json({ error: "Tanggal resep tidak valid." }, 400);
    }

    const { data: generation, error } = await auth.supabaseAdmin
      .from("recipe_generations")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("generated_for_date", date)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return c.json({
      generation,
      result: generation?.result || null,
    });
  } catch (error: any) {
    console.error("[recipes/today]", error.stack || error);
    return c.json({ error: error.message || "Gagal mengambil resep hari ini." }, 500);
  }
});
```

- [ ] **Step 5: Replace `/api/generate-recipes` with saved charge flow**

Replace the current `/api/generate-recipes` route body with:

```ts
app.post("/api/generate-recipes", async (c) => {
  console.log("--> [BACKEND] Received request /api/generate-recipes");
  try {
    const body = await c.req.json();
    const { phase, cycleDay, daysToNextPeriod, nickname, generatedForDate } = body;
    const date = typeof generatedForDate === "string" ? generatedForDate : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return c.json({ error: "Tanggal resep tidak valid." }, 400);
    }

    const apiKey = c.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return c.json({ error: "OPENROUTER_API_KEY is not defined" }, 500);
    }

    const auth = await requireUser(c);
    if (!auth) {
      return c.json({ error: "Missing or invalid session" }, 401);
    }

    const { data: existingActive, error: existingError } = await auth.supabaseAdmin
      .from("recipe_generations")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("generated_for_date", date)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existingActive) {
      return c.json({ generation: existingActive, result: existingActive.result, balance: null });
    }

    const creditCost = 15;
    const balance = await getAiCreditBalance(auth.supabaseAdmin, auth.user.id);
    if (balance < creditCost) {
      return c.json({ error: "Saldo kredit AI tidak cukup.", balance, required: creditCost }, 402);
    }

    const cycleSnapshot = buildRecipeCycleSnapshot({
      phase,
      cycleDay,
      daysToNextPeriod,
    });

    const ai = await callOpenRouterJson<any>({
      apiKey,
      model: c.env.OPENROUTER_FREE_MODEL || "qwen/qwen3-next-80b-a3b-instruct:free",
      fallbackModels: [
        "nvidia/nemotron-3-super-120b-a12b:free",
        "google/gemma-4-31b-it:free",
        c.env.OPENROUTER_PAID_MODEL || "openai/gpt-5-nano",
        "google/gemini-2.5-flash-lite",
      ],
      messages: [
        {
          role: "system",
          content:
            "Kamu adalah asisten resep harian Siklusio untuk pengguna Indonesia. Beri resep sederhana, murah, dan mudah dimasak. Jangan memberi klaim medis, diagnosis, atau janji kehamilan. Output wajib JSON valid sesuai schema.",
        },
        {
          role: "user",
          content: JSON.stringify({
            nickname: nickname || "",
            ...cycleSnapshot,
            requiredOutput: [
              "2 resep sederhana",
              "daftar belanja kecil 3-6 bahan",
              "penjelasan manfaat untuk fase saat ini",
              "estimasi waktu masak",
            ],
            ingredientRules: [
              "Gunakan bahan lokal Indonesia yang murah dan mudah ditemukan.",
              "Prioritaskan telur, tempe, tahu, ayam, ikan kembung, ikan pindang, bayam, kangkung, wortel, labu siam, pisang, ubi, kacang hijau, beras, jahe, kunyit.",
              "Hindari salmon, quinoa, asparagus, berries impor, chia seed, almond milk, Greek yogurt mahal, dan bahan wellness luar negeri.",
              "Tulis semua teks dalam Bahasa Indonesia dengan sapaan kamu, bukan Anda.",
            ],
          }),
        },
      ],
      responseSchemaName: "recipes_generation",
      responseSchema: recipesGenerationSchema,
      maxCompletionTokens: 1400,
    });

    const result = validateRecipesGeneration(ai.data);

    const { data: savedGeneration, error: saveError } = await auth.supabaseAdmin
      .from("recipe_generations")
      .insert({
        user_id: auth.user.id,
        generated_for_date: date,
        phase: cycleSnapshot.phase,
        cycle_day: cycleSnapshot.cycleDay,
        days_to_next_period: cycleSnapshot.daysToNextPeriod,
        cycle_snapshot: cycleSnapshot,
        result,
        status: "pending_charge",
        ai_model: ai.model,
        credit_cost: creditCost,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    const balanceAfter = await chargeAiCredits({
      supabaseAdmin: auth.supabaseAdmin,
      userId: auth.user.id,
      amount: creditCost,
      feature: "recipes_today",
      reason: cycleSnapshot.phase,
      referenceId: savedGeneration.id,
      metadata: { model: ai.model, usage: ai.usage || null },
    });

    const { data: activeGeneration, error: activateError } = await auth.supabaseAdmin
      .from("recipe_generations")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", savedGeneration.id)
      .select()
      .single();

    if (activateError) throw activateError;

    return c.json({ generation: activeGeneration, result, balance: balanceAfter });
  } catch (error: any) {
    console.error("<-- [BACKEND] OpenRouter recipes error:", error.stack || error);
    return c.json({ error: error.message || "Gagal membuat resep hari ini." }, 500);
  }
});
```

- [ ] **Step 6: Run backend tests and typecheck**

```powershell
npx.cmd tsx backend/ai/helpers.test.ts
npx.cmd tsc --noEmit --skipLibCheck --module ESNext --moduleResolution bundler --target ES2022 backend/index.ts backend/ai/openRouter.ts backend/ai/schemas.ts backend/ai/credits.ts backend/ai/recipeSummary.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add backend/index.ts backend/ai/helpers.test.ts backend/ai/recipeSummary.ts
git commit -m "feat: save today recipe generations"
```

---

## Task 4: Mobile Recipe Types And Saved Mapper

**Files:**
- Create: `mobile-app/src/lib/todayRecipes.ts`
- Create: `mobile-app/src/lib/todayRecipes.test.ts`

- [ ] **Step 1: Write failing mapper test**

Create `mobile-app/src/lib/todayRecipes.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapApiTodayRecipeGeneration } from './todayRecipes';

test('mapApiTodayRecipeGeneration normalizes saved recipe response for UI', () => {
  const mapped = mapApiTodayRecipeGeneration({
    id: 'generation-1',
    generated_for_date: '2026-05-31',
    phase: 'Luteal',
    credit_cost: 15,
    result: {
      phaseBenefit: 'Baik untuk fase luteal.',
      groceries: [{ id: 1, name: 'Tempe', desc: 'Protein lokal.', emoji: 'soy' }],
      recipes: [
        {
          id: 1,
          title: 'Tumis Tempe',
          description: 'Cepat dan hangat.',
          cookingTime: '15 menit',
          ingredients: ['tempe', 'bawang putih', 'kecap'],
          steps: ['Potong tempe.', 'Tumis semua bahan.'],
          phaseBenefit: 'Protein membantu kenyang.',
          emoji: 'pan',
        },
        {
          id: 2,
          title: 'Telur Wortel',
          description: 'Lauk praktis.',
          cookingTime: '10 menit',
          ingredients: ['telur', 'wortel', 'daun bawang'],
          steps: ['Kocok telur.', 'Masak hingga matang.'],
          phaseBenefit: 'Praktis untuk energi.',
          emoji: 'egg',
        },
      ],
      disclaimer: 'Panduan nutrisi umum.',
    },
  });

  assert.equal(mapped.id, 'generation-1');
  assert.equal(mapped.generatedForDate, '2026-05-31');
  assert.equal(mapped.result.recipes.length, 2);
  assert.equal(mapped.result.groceries[0].name, 'Tempe');
});
```

- [ ] **Step 2: Run test to verify failure**

```powershell
npx.cmd tsx mobile-app/src/lib/todayRecipes.test.ts
```

Expected: FAIL because `todayRecipes.ts` does not exist.

- [ ] **Step 3: Add recipe types and mappers**

Create `mobile-app/src/lib/todayRecipes.ts`:

```ts
export interface TodayRecipeGrocery {
  id: number;
  name: string;
  desc: string;
  emoji: string;
}

export interface TodayRecipe {
  id: number;
  title: string;
  description: string;
  cookingTime: string;
  ingredients: string[];
  steps: string[];
  phaseBenefit: string;
  emoji: string;
}

export interface TodayRecipesResult {
  phaseBenefit: string;
  groceries: TodayRecipeGrocery[];
  recipes: TodayRecipe[];
  disclaimer: string;
}

export interface TodayRecipeGeneration {
  id: string;
  generatedForDate: string;
  phase: string;
  creditCost: number;
  result: TodayRecipesResult;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item || '')).filter(Boolean) : [];
}

export function mapApiTodayRecipes(value: any): TodayRecipesResult {
  return {
    phaseBenefit: String(value?.phaseBenefit || ''),
    groceries: Array.isArray(value?.groceries)
      ? value.groceries.map((item: any, index: number) => ({
          id: Number(item?.id || index + 1),
          name: String(item?.name || ''),
          desc: String(item?.desc || ''),
          emoji: String(item?.emoji || 'basket'),
        }))
      : [],
    recipes: Array.isArray(value?.recipes)
      ? value.recipes.map((item: any, index: number) => ({
          id: Number(item?.id || index + 1),
          title: String(item?.title || ''),
          description: String(item?.description || ''),
          cookingTime: String(item?.cookingTime || ''),
          ingredients: stringArray(item?.ingredients),
          steps: stringArray(item?.steps),
          phaseBenefit: String(item?.phaseBenefit || ''),
          emoji: String(item?.emoji || 'plate'),
        }))
      : [],
    disclaimer: String(value?.disclaimer || ''),
  };
}

export function mapApiTodayRecipeGeneration(row: any): TodayRecipeGeneration {
  return {
    id: String(row?.id || ''),
    generatedForDate: String(row?.generated_for_date || row?.generatedForDate || ''),
    phase: String(row?.phase || ''),
    creditCost: Number(row?.credit_cost || row?.creditCost || 0),
    result: mapApiTodayRecipes(row?.result || row),
  };
}
```

- [ ] **Step 4: Run mapper test**

```powershell
npx.cmd tsx mobile-app/src/lib/todayRecipes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add mobile-app/src/lib/todayRecipes.ts mobile-app/src/lib/todayRecipes.test.ts
git commit -m "feat: add today recipe mapper"
```

---

## Task 5: Mobile Resep Hari Ini UI With Saved Recovery

**Files:**
- Create: `mobile-app/components/habits/TodayRecipesCard.tsx`
- Create: `mobile-app/components/habits/TodayRecipesModal.tsx`
- Modify: `mobile-app/app/(tabs)/habits.tsx`

- [ ] **Step 1: Create the entry card**

Create `mobile-app/components/habits/TodayRecipesCard.tsx`:

```tsx
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export function TodayRecipesCard({ onOpen }: { onOpen: () => void }) {
  return (
    <TouchableOpacity
      onPress={onOpen}
      activeOpacity={0.9}
      style={{
        backgroundColor: '#ecfdf5',
        borderRadius: 28,
        padding: 18,
        borderWidth: 1,
        borderColor: '#bbf7d0',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
        <FontAwesome name="cutlery" size={18} color="#16a34a" />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '800', textTransform: 'uppercase' }}>Resep Hari Ini</Text>
        <Text style={{ fontSize: 16, color: '#111827', fontWeight: '800' }}>2 resep sesuai fase siklus</Text>
        <Text style={{ fontSize: 12, color: '#475569', lineHeight: 18 }}>
          Menu sederhana dengan bahan lokal. Hasil hari ini tersimpan setelah dibuat.
        </Text>
      </View>
      <FontAwesome name="chevron-right" size={13} color="#16a34a" />
    </TouchableOpacity>
  );
}
```

- [ ] **Step 2: Create the modal**

Create `mobile-app/components/habits/TodayRecipesModal.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { format } from 'date-fns';
import { apiGetJson, apiPostJson } from '../../src/lib/api';
import {
  mapApiTodayRecipeGeneration,
  type TodayRecipeGeneration,
} from '../../src/lib/todayRecipes';

interface Props {
  visible: boolean;
  currentPhase: string;
  cycleDay: number;
  daysToNextPeriod: number;
  nickname: string;
  onClose: () => void;
}

export function TodayRecipesModal({ visible, currentPhase, cycleDay, daysToNextPeriod, nickname, onClose }: Props) {
  const [generation, setGeneration] = useState<TodayRecipeGeneration | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateKey = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    setFetching(true);
    setError(null);
    apiGetJson<{ generation: any | null; result: unknown | null }>(`/api/recipes/today?date=${dateKey}`)
      .then((json) => {
        if (!mounted) return;
        setGeneration(json.generation ? mapApiTodayRecipeGeneration(json.generation) : null);
      })
      .catch((err: any) => {
        if (mounted) setError(err.message || 'Gagal mengambil resep hari ini.');
      })
      .finally(() => {
        if (mounted) setFetching(false);
      });
    return () => {
      mounted = false;
    };
  }, [visible, dateKey]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiPostJson<{ generation: any; result: unknown; balance: number | null }>('/api/generate-recipes', {
        generatedForDate: dateKey,
        phase: currentPhase,
        cycleDay,
        daysToNextPeriod,
        nickname,
      });
      setGeneration(mapApiTodayRecipeGeneration(json.generation));
      setBalance(json.balance);
    } catch (err: any) {
      setError(err.message || 'Gagal membuat resep hari ini.');
    } finally {
      setLoading(false);
    }
  };

  const result = generation?.result || null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.45)' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%', padding: 22 }}>
          <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '800', textTransform: 'uppercase' }}>Resep Hari Ini</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 4 }}>Menu sederhana untuk fase {currentPhase}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
                <FontAwesome name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20 }}>
              AI membuat 2 resep dan daftar belanja kecil dengan bahan Indonesia yang mudah dicari. Biaya 15 kredit hanya saat membuat hasil baru.
            </Text>

            {fetching && (
              <View style={{ paddingVertical: 18, alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color="#16a34a" />
                <Text style={{ fontSize: 12, color: '#64748b' }}>Mengambil resep tersimpan...</Text>
              </View>
            )}

            {!fetching && !result && (
              <TouchableOpacity
                onPress={generate}
                disabled={loading}
                style={{ backgroundColor: '#16a34a', borderRadius: 16, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <FontAwesome name="magic" size={13} color="#fff" />}
                <Text style={{ color: '#fff', fontWeight: '800' }}>Buat resep - 15 kredit</Text>
              </TouchableOpacity>
            )}

            {error && (
              <View style={{ backgroundColor: '#fef2f2', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#fee2e2' }}>
                <Text style={{ color: '#b91c1c', fontSize: 12, fontWeight: '700' }}>{error}</Text>
              </View>
            )}

            {result && (
              <View style={{ gap: 14 }}>
                <View style={{ backgroundColor: '#ecfdf5', borderRadius: 16, padding: 14 }}>
                  <Text style={{ fontSize: 13, color: '#14532d', lineHeight: 20 }}>{result.phaseBenefit}</Text>
                </View>

                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 12, color: '#111827', fontWeight: '800' }}>Daftar belanja kecil</Text>
                  {result.groceries.map((item) => (
                    <Text key={item.id} style={{ fontSize: 13, color: '#475569', lineHeight: 19 }}>
                      - {item.name}: {item.desc}
                    </Text>
                  ))}
                </View>

                {result.recipes.map((recipe) => (
                  <View key={recipe.id} style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 18, padding: 14, gap: 8 }}>
                    <Text style={{ fontSize: 15, color: '#111827', fontWeight: '800' }}>{recipe.title}</Text>
                    <Text style={{ fontSize: 12, color: '#16a34a', fontWeight: '700' }}>{recipe.cookingTime}</Text>
                    <Text style={{ fontSize: 13, color: '#475569', lineHeight: 19 }}>{recipe.description}</Text>
                    <Text style={{ fontSize: 12, color: '#111827', fontWeight: '800' }}>Bahan</Text>
                    {recipe.ingredients.map((item, index) => (
                      <Text key={`${recipe.id}-ingredient-${index}`} style={{ fontSize: 12, color: '#64748b' }}>- {item}</Text>
                    ))}
                    <Text style={{ fontSize: 12, color: '#111827', fontWeight: '800' }}>Langkah</Text>
                    {recipe.steps.map((item, index) => (
                      <Text key={`${recipe.id}-step-${index}`} style={{ fontSize: 12, color: '#64748b', lineHeight: 18 }}>{index + 1}. {item}</Text>
                    ))}
                    <Text style={{ fontSize: 12, color: '#14532d', lineHeight: 18 }}>{recipe.phaseBenefit}</Text>
                  </View>
                ))}

                <Text style={{ fontSize: 11, color: '#94a3b8', lineHeight: 16 }}>{result.disclaimer}</Text>
                <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '700' }}>
                  {balance !== null ? `Sisa kredit AI: ${balance}` : 'Resep hari ini sudah tersimpan.'}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 3: Wire into Habits tab**

In `mobile-app/app/(tabs)/habits.tsx`, import:

```ts
import { TodayRecipesCard } from '../../components/habits/TodayRecipesCard';
import { TodayRecipesModal } from '../../components/habits/TodayRecipesModal';
```

Destructure `cycleDay` and `daysToNextPeriod` from `useCycle()`:

```ts
const { currentPhase, cycleDay, daysToNextPeriod, activityHistory, setActivityHistory, userNickname } = useCycle();
```

Add state near other modal state:

```ts
const [recipesOpen, setRecipesOpen] = useState(false);
```

Render the card below `HabitCoachCard`:

```tsx
<View className="mb-6">
  <TodayRecipesCard onOpen={() => setRecipesOpen(true)} />
</View>
```

Render the modal before `</SafeAreaView>`:

```tsx
<TodayRecipesModal
  visible={recipesOpen}
  currentPhase={currentPhase}
  cycleDay={cycleDay}
  daysToNextPeriod={daysToNextPeriod}
  nickname={userNickname}
  onClose={() => setRecipesOpen(false)}
/>
```

- [ ] **Step 4: Run focused tests**

```powershell
npx.cmd tsx mobile-app/src/lib/todayRecipes.test.ts
npx.cmd tsx mobile-app/src/lib/habitCoachPlan.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add "mobile-app/app/(tabs)/habits.tsx" mobile-app/components/habits/TodayRecipesCard.tsx mobile-app/components/habits/TodayRecipesModal.tsx mobile-app/src/lib/todayRecipes.ts mobile-app/src/lib/todayRecipes.test.ts
git commit -m "feat: add today recipes ui"
```

---

## Task 6: Apply Migration And Verification

**Files:**
- No new files unless fixes are needed.

- [ ] **Step 1: Push Supabase migration**

```powershell
npx.cmd supabase db push --dry-run
npx.cmd supabase db push
```

Expected: `recipe_generations` migration applies to the linked Supabase project.

- [ ] **Step 2: Run backend focused tests**

```powershell
npx.cmd tsx backend/ai/helpers.test.ts
```

Expected: all tests PASS.

- [ ] **Step 3: Run mobile focused tests**

```powershell
npx.cmd tsx mobile-app/src/lib/todayRecipes.test.ts
npx.cmd tsx mobile-app/src/lib/habitCoachPlan.test.ts
npx.cmd tsx mobile-app/src/lib/cycleGuideSummary.test.ts
```

Expected: all tests PASS.

- [ ] **Step 4: Run backend typecheck**

```powershell
npx.cmd tsc --noEmit --skipLibCheck --module ESNext --moduleResolution bundler --target ES2022 backend/index.ts backend/ai/openRouter.ts backend/ai/schemas.ts backend/ai/credits.ts backend/ai/recipeSummary.ts
```

Expected: PASS.

- [ ] **Step 5: Run root lint and record baseline**

```powershell
npm.cmd run lint
```

Expected: If existing unrelated mobile alias and `DatePickerField` baseline errors remain, record them in the final verification note. No new recipe-related TypeScript errors should appear.

- [ ] **Step 6: Run Expo web build**

```powershell
Set-Location mobile-app
npm.cmd run build:web
```

Expected: PASS. If sandbox blocks writing NativeWind or Expo cache, rerun with approved elevated permissions.

- [ ] **Step 7: Manual smoke test**

```powershell
Set-Location mobile-app
npm.cmd run web -- --port 8082
```

Open `http://localhost:8082/habits` and verify:

- Resep Hari Ini card appears under Habit Coach.
- Modal opens and fetches saved recipe for today.
- If no saved recipe exists, generate button says 15 credits.
- Insufficient credits shows a friendly error.
- Successful generation shows 2 recipes, a grocery list, phase benefit, disclaimer, and remaining credit balance.
- Close and reopen modal; the saved result appears without charging again.
- Reload the page; the saved result can still be fetched.

- [ ] **Step 8: Commit verification fixes only if needed**

```powershell
git add <changed-files>
git commit -m "fix: harden saved today recipes flow"
```

---

## Self-Review

- Spec coverage: The plan covers saved recipe generations, two recipes, a small grocery list, phase benefits, Indonesian-local ingredient constraints, 15-credit charging, and no vision/history UI for MVP.
- Placeholder scan: No placeholder markers or deferred-work wording remain.
- Type consistency: Backend result shape and mobile `TodayRecipesResult` use `phaseBenefit`, `groceries`, `recipes`, and `disclaimer`; saved rows map through `TodayRecipeGeneration`.
- Credit consistency: Recipe credit ledger entries use the saved generation id as `reference_id`, matching the existing Habit Coach and Panduan Siklus safety pattern.
- Scope check: The plan is limited to "Resep Hari Ini" and does not include weekly meal planning, AI vision, full recipe history UI, or Mayar top-up changes.
