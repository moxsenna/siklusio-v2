import test from 'node:test';
import assert from 'node:assert/strict';
import { mapApiTodayRecipeGeneration } from './todayRecipes';

test('mapApiTodayRecipeGeneration normalizes saved recipe response for UI', () => {
  const mapped = mapApiTodayRecipeGeneration({
    id: 'generation-1',
    generated_for_date: '2026-06-01',
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
  assert.equal(mapped.generatedForDate, '2026-06-01');
  assert.equal(mapped.result.recipes.length, 2);
  assert.equal(mapped.result.groceries[0].name, 'Tempe');
});
