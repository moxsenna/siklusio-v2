# Resep Hari Ini Design

## Goal

Build a lightweight AI recipe feature that gives users two simple Indonesian recipes for today, a small grocery list, and a short explanation of why the suggestions fit the user's current cycle phase.

## Product Boundary

Resep Hari Ini answers: "Hari ini enaknya masak apa yang cocok dengan fase siklusku?"

It does not replace Habit Coach. It does not create checklist habits. It does not interpret cycle predictions beyond using the current phase as nutrition context. It does not use vision in the MVP.

## MVP Output

Each generation returns:

- Two recipes.
- A small grocery list of common Indonesian ingredients.
- A phase benefit explanation.
- Estimated cooking time per recipe.
- Simple ingredients and steps.
- A non-medical nutrition disclaimer.

The feature must prioritize ingredients that are affordable and easy to find in Indonesia, such as telur, tempe, tahu, ayam, ikan kembung, bayam, kangkung, wortel, labu siam, pisang, ubi, kacang hijau, beras, jahe, and kunyit.

The feature must avoid ingredients that are expensive, imported, or hard to find for the target market, such as salmon, quinoa, asparagus, imported berries, chia seed, almond milk, and Greek yogurt.

## Credit Rule

The MVP costs 15 AI credits per generation.

The backend prechecks the user's AI credit balance before calling OpenRouter. Credits are charged only after OpenRouter returns a valid structured response and runtime validation passes. If the model fails, returns invalid JSON, or validation fails, credits are not charged.

Because MVP does not store recipe history, the credit ledger entry uses `feature = 'recipes_today'`, `reason = phase`, and `reference_id = null`.

## Architecture

The existing `/api/generate-recipes` endpoint already calls OpenRouter. It will be hardened to use the AI credit ledger and a stricter recipe schema. The mobile app will add a Habits tab card that opens a modal for generating and viewing today's recipes.

The UI lives in Habits because this is an action-oriented daily feature. If nutrition becomes larger later, it can move into a dedicated nutrition section without changing the backend contract.

## Data Flow

1. Mobile reads `currentPhase`, `cycleDay`, `daysToNextPeriod`, and `userNickname` from `CycleContext`.
2. User opens "Resep Hari Ini" from the Habits tab.
3. Mobile calls `POST /api/generate-recipes`.
4. Backend authenticates user.
5. Backend checks balance for 15 credits.
6. Backend calls OpenRouter with Indonesian-local ingredient rules.
7. Backend validates the structured response.
8. Backend charges 15 credits.
9. Backend returns `{ result, balance }`.
10. Mobile displays recipes, grocery list, phase benefit, and updated credit balance.

## Error Handling

If the user is unauthenticated, the backend returns 401. If credits are insufficient, the backend returns 402 with `balance` and `required`. If OpenRouter fails or returns invalid content, the backend returns an error without charging credits.

The mobile modal shows friendly copy for insufficient credits and a retry button for transient errors.

## Testing

Backend tests cover recipe validator strictness and credit helper support for nullable references. Mobile tests cover mapping API recipe payloads into UI-safe data.

Verification uses focused Node tests, backend typecheck, root lint baseline awareness, and Expo web build.

## Out Of Scope

- AI vision scan of refrigerator or pantry.
- Weekly meal plan.
- Saved recipe history.
- Mayar credit top-up UI changes.
- Nutrition macros or medical diet recommendations.
