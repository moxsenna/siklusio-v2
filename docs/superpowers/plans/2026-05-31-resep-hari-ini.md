# Resep Hari Ini Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight AI "Resep Hari Ini" feature that generates two Indonesian recipes, a small grocery list, and phase-specific nutrition benefits for 15 AI credits.

**Architecture:** Reuse the existing OpenRouter-backed `/api/generate-recipes` endpoint, but harden it with AI credit checks, stricter structured output, and runtime validation. Add a Habits tab card and modal that calls the endpoint, displays the result, and shows updated AI credit balance.

**Tech Stack:** Hono on Cloudflare Workers, Supabase service-role RPC credit ledger, OpenRouter chat completions, Expo Router, React Native, NativeWind, Node `test`, TypeScript.

---

## File Structure

### Backend

- Modify: `backend/ai/schemas.ts`
  - Tighten `recipesGenerationSchema`.
  - Add `TodayRecipeResult` fields for groceries, recipes, phase benefit, and disclaimer.
  - Validate exactly 2 recipes and a small grocery list.
- Modify: `backend/ai/helpers.test.ts`
  - Add test for charging credits with nullable `referenceId`.
  - Add test for rejecting invalid recipe payloads.
- Modify: `backend/ai/credits.ts`
  - Allow `chargeAiCredits` to accept `referenceId?: string | null`.
- Modify: `backend/index.ts`
  - Update `/api/generate-recipes` to precheck 15 credits, call OpenRouter, validate result, charge credits, and return `{ result, balance }`.

### Mobile

- Create: `mobile-app/src/lib/todayRecipes.ts`
  - Types and mapper for API results.
- Create: `mobile-app/src/lib/todayRecipes.test.ts`
  - Tests for mapper defaults and required fields.
- Create: `mobile-app/components/habits/TodayRecipesCard.tsx`
  - Entry card in Habits tab.
- Create: `mobile-app/components/habits/TodayRecipesModal.tsx`
  - Generate and result modal.
- Modify: `mobile-app/app/(tabs)/habits.tsx`
  - Insert "Resep Hari Ini" card below Habit Coach and pass cycle context.

---

## Task 1: Backend Recipe Schema And Validator

**Files:**
- Modify: `backend/ai/schemas.ts`
- Modify: `backend/ai/helpers.test.ts`

- [ ] **Step 1: Add failing validator tests**

Add this to `backend/ai/helpers.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify failure**

```powershell
npx.cmd tsx backend/ai/helpers.test.ts
```

Expected: FAIL because `validateRecipesGeneration` currently accepts shallow payloads and does not enforce exactly two recipes.

- [ ] **Step 3: Tighten recipe schema and validator**

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

- [ ] **Step 4: Run validator tests**

```powershell
npx.cmd tsx backend/ai/helpers.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add backend/ai/schemas.ts backend/ai/helpers.test.ts
git commit -m "feat: tighten recipe ai schema"
```

---

## Task 2: Backend Credit-Protected Recipe Endpoint

**Files:**
- Modify: `backend/ai/credits.ts`
- Modify: `backend/ai/helpers.test.ts`
- Modify: `backend/index.ts`

- [ ] **Step 1: Add failing nullable reference credit test**

Add this to `backend/ai/helpers.test.ts`:

```ts
import { chargeAiCredits } from "./credits";

test("chargeAiCredits allows nullable reference for stateless AI features", async () => {
  let rpcPayload: Record<string, unknown> | null = null;
  const supabaseAdmin = {
    async rpc(name: string, params: Record<string, unknown>) {
      assert.equal(name, "charge_ai_credits");
      rpcPayload = params;
      return { data: 85, error: null };
    },
  };

  const balance = await chargeAiCredits({
    supabaseAdmin,
    userId: "user-1",
    amount: 15,
    feature: "recipes_today",
    reason: "Luteal",
    referenceId: null,
    metadata: { model: "test-model" },
  });

  assert.equal(balance, 85);
  assert.equal(rpcPayload?.p_reference_id, null);
});
```

- [ ] **Step 2: Run test to verify failure**

```powershell
npx.cmd tsx backend/ai/helpers.test.ts
```

Expected: FAIL at TypeScript/runtime level because `referenceId` currently expects a string.

- [ ] **Step 3: Allow nullable reference IDs**

In `backend/ai/credits.ts`, change the `chargeAiCredits` param type:

```ts
referenceId?: string | null;
```

And keep the RPC payload as:

```ts
p_reference_id: params.referenceId || null,
```

- [ ] **Step 4: Update `/api/generate-recipes`**

In `backend/index.ts`, replace the body of `/api/generate-recipes` with this behavior:

```ts
app.post("/api/generate-recipes", async (c) => {
  console.log("--> [BACKEND] Received request /api/generate-recipes");
  try {
    const { phase, cycleDay, daysToNextPeriod, nickname } = await c.req.json();
    const apiKey = c.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return c.json({ error: "OPENROUTER_API_KEY is not defined" }, 500);
    }

    const auth = await requireUser(c);
    if (!auth) {
      return c.json({ error: "Missing or invalid session" }, 401);
    }

    const creditCost = 15;
    const balance = await getAiCreditBalance(auth.supabaseAdmin, auth.user.id);
    if (balance < creditCost) {
      return c.json({ error: "Saldo kredit AI tidak cukup.", balance, required: creditCost }, 402);
    }

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
            phase,
            cycleDay,
            daysToNextPeriod,
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
    const balanceAfter = await chargeAiCredits({
      supabaseAdmin: auth.supabaseAdmin,
      userId: auth.user.id,
      amount: creditCost,
      feature: "recipes_today",
      reason: phase || "unknown_phase",
      referenceId: null,
      metadata: { model: ai.model, usage: ai.usage || null },
    });

    return c.json({ result, balance: balanceAfter });
  } catch (error: any) {
    console.error("<-- [BACKEND] OpenRouter recipes error:", error.stack || error);
    return c.json({ error: error.message || "Gagal membuat resep hari ini." }, 500);
  }
});
```

- [ ] **Step 5: Run backend tests and typecheck**

```powershell
npx.cmd tsx backend/ai/helpers.test.ts
npx.cmd tsc --noEmit --skipLibCheck --module ESNext --moduleResolution bundler --target ES2022 backend/index.ts backend/ai/openRouter.ts backend/ai/schemas.ts backend/ai/credits.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add backend/index.ts backend/ai/credits.ts backend/ai/helpers.test.ts
git commit -m "feat: charge credits for recipe ai"
```

---

## Task 3: Mobile Recipe Types And Mapper

**Files:**
- Create: `mobile-app/src/lib/todayRecipes.ts`
- Create: `mobile-app/src/lib/todayRecipes.test.ts`

- [ ] **Step 1: Write failing mapper test**

Create `mobile-app/src/lib/todayRecipes.test.ts`:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapApiTodayRecipes } from './todayRecipes';

test('mapApiTodayRecipes normalizes recipe response for UI', () => {
  const mapped = mapApiTodayRecipes({
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
  });

  assert.equal(mapped.recipes.length, 2);
  assert.equal(mapped.recipes[0].title, 'Tumis Tempe');
  assert.equal(mapped.groceries[0].name, 'Tempe');
  assert.match(mapped.disclaimer, /nutrisi umum/i);
});
```

- [ ] **Step 2: Run test to verify failure**

```powershell
npx.cmd tsx mobile-app/src/lib/todayRecipes.test.ts
```

Expected: FAIL because `todayRecipes.ts` does not exist.

- [ ] **Step 3: Add recipe types and mapper**

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

## Task 4: Mobile Resep Hari Ini UI

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
          Menu sederhana dengan bahan lokal yang mudah dicari.
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
import React, { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { apiPostJson } from '../../src/lib/api';
import { mapApiTodayRecipes, type TodayRecipesResult } from '../../src/lib/todayRecipes';

interface Props {
  visible: boolean;
  currentPhase: string;
  cycleDay: number;
  daysToNextPeriod: number;
  nickname: string;
  onClose: () => void;
}

export function TodayRecipesModal({ visible, currentPhase, cycleDay, daysToNextPeriod, nickname, onClose }: Props) {
  const [result, setResult] = useState<TodayRecipesResult | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiPostJson<{ result: unknown; balance: number }>('/api/generate-recipes', {
        phase: currentPhase,
        cycleDay,
        daysToNextPeriod,
        nickname,
      });
      setResult(mapApiTodayRecipes(json.result));
      setBalance(json.balance);
    } catch (err: any) {
      setError(err.message || 'Gagal membuat resep hari ini.');
    } finally {
      setLoading(false);
    }
  };

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
              AI akan membuat 2 resep dan daftar belanja kecil dengan bahan Indonesia yang mudah dicari. Biaya 15 kredit setelah hasil valid.
            </Text>

            {!result && (
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
                {balance !== null && <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '700' }}>Sisa kredit AI: {balance}</Text>}
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

## Task 5: Verification

**Files:**
- No new files unless fixes are needed.

- [ ] **Step 1: Run backend focused tests**

```powershell
npx.cmd tsx backend/ai/helpers.test.ts
```

Expected: all tests PASS.

- [ ] **Step 2: Run mobile focused tests**

```powershell
npx.cmd tsx mobile-app/src/lib/todayRecipes.test.ts
npx.cmd tsx mobile-app/src/lib/habitCoachPlan.test.ts
npx.cmd tsx mobile-app/src/lib/cycleGuideSummary.test.ts
```

Expected: all tests PASS.

- [ ] **Step 3: Run backend typecheck**

```powershell
npx.cmd tsc --noEmit --skipLibCheck --module ESNext --moduleResolution bundler --target ES2022 backend/index.ts backend/ai/openRouter.ts backend/ai/schemas.ts backend/ai/credits.ts
```

Expected: PASS.

- [ ] **Step 4: Run root lint and record baseline**

```powershell
npm.cmd run lint
```

Expected: If the existing mobile alias and `DatePickerField` baseline errors remain, record them in the final verification note. No new recipe-related TypeScript errors should appear.

- [ ] **Step 5: Run Expo web build**

```powershell
Set-Location mobile-app
npm.cmd run build:web
```

Expected: PASS. If sandbox blocks writing NativeWind or Expo cache, rerun with approved elevated permissions.

- [ ] **Step 6: Manual smoke test**

```powershell
Set-Location mobile-app
npm.cmd run web -- --port 8082
```

Open `http://localhost:8082/habits` and verify:

- Resep Hari Ini card appears under Habit Coach.
- Modal opens.
- Generate button says 15 credits.
- Insufficient credits shows a friendly error.
- Successful generation shows 2 recipes, a grocery list, phase benefit, disclaimer, and remaining credit balance.

- [ ] **Step 7: Commit verification fixes only if needed**

```powershell
git add <changed-files>
git commit -m "fix: harden today recipes flow"
```

---

## Self-Review

- Spec coverage: The plan covers two recipes, a small grocery list, phase benefits, Indonesian-local ingredient constraints, 15-credit charging, and no vision/history for MVP.
- Placeholder scan: No placeholder markers or deferred-work wording remain.
- Type consistency: Backend result shape and mobile `TodayRecipesResult` use the same fields: `phaseBenefit`, `groceries`, `recipes`, and `disclaimer`.
- Scope check: The plan is intentionally limited to "Resep Hari Ini" and does not include weekly meal planning, AI vision, saved recipe history, or Mayar top-up changes.
