import test from "node:test";
import assert from "node:assert/strict";
import { mapApiTodayRecipeGeneration, mapApiTodayRecipes } from "./todayRecipes";

test("mapApiTodayRecipeGeneration normalizes saved recipe response for UI", () => {
  const mappedGeneration = mapApiTodayRecipeGeneration({
    id: "gen-1",
    generated_for_date: "2026-06-01",
    phase: "Luteal",
    cycle_day: 24,
    days_to_next_period: 4,
    status: "active",
    ai_model: "qwen/qwen3-next-80b-a3b-instruct:free",
    credit_cost: 15,
    created_at: "2026-06-01T10:30:00Z",
  });

  const mappedResult = mapApiTodayRecipes({
    phaseBenefit: "Bantu tubuh tetap stabil selama fase luteal.",
    groceries: [
      { id: 1, name: "Telur", desc: "Protein sederhana", emoji: "🥚" },
      { id: 2, name: "Bayam", desc: "Sayur hijau kaya folat", emoji: "🥬" },
      { id: 3, name: "Tempe", desc: "Protein nabati", emoji: "🫘" },
    ],
    recipes: [
      {
        id: 1,
        title: "Tumis Bayam Telur",
        description: "Menu cepat saat energi menurun.",
        cookingTime: "15 menit",
        ingredients: ["Bayam", "Telur", "Bawang putih"],
        steps: ["Tumis bawang putih", "Masukkan bayam dan telur"],
        phaseBenefit: "Mendukung asupan zat besi.",
        emoji: "🍳",
      },
      {
        id: 2,
        title: "Tempe Panggang Kecap",
        description: "Protein hangat yang simpel.",
        cookingTime: "20 menit",
        ingredients: ["Tempe", "Kecap manis", "Bawang merah"],
        steps: ["Iris tempe", "Panggang dan oles kecap"],
        phaseBenefit: "Membantu rasa kenyang lebih lama.",
        emoji: "🍽️",
      },
    ],
    disclaimer: "Ini saran umum, sesuaikan dengan kondisi kamu.",
  });

  assert.equal(mappedGeneration.id, "gen-1");
  assert.equal(mappedGeneration.generatedForDate, "2026-06-01");
  assert.equal(mappedGeneration.creditCost, 15);

  assert.equal(mappedResult.groceries.length, 3);
  assert.equal(mappedResult.recipes.length, 2);
  assert.equal(mappedResult.recipes[0].cookingTime, "15 menit");
  assert.equal(mappedResult.disclaimer.length > 0, true);
});
