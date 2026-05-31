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

The MVP costs 15 AI credits per new generation.

The backend prechecks the user's AI credit balance before calling OpenRouter. Credits are charged only after OpenRouter returns a valid structured response and runtime validation passes. If the model fails, returns invalid JSON, or validation fails, credits are not charged.

Generated recipes are stored before charging credits. The credit ledger entry uses `feature = 'recipes_today'`, `reason = phase`, and `reference_id = recipe_generations.id`, so users can reopen paid results and admins can audit credit usage.

Only one active recipe result is allowed per user per date. Pending rows are allowed to remain if a post-save charge fails, so the user can retry without being blocked by a stale unpaid generation.

## Architecture

The existing `/api/generate-recipes` endpoint already calls OpenRouter. It will be hardened to use the AI credit ledger, a stricter recipe schema, and a saved `recipe_generations` record. The mobile app will add a Habits tab card that opens a modal for fetching, generating, and viewing today's recipes.

The UI lives in Habits because this is an action-oriented daily feature. If nutrition becomes larger later, it can move into a dedicated nutrition section without changing the backend contract.

## Data Flow

1. Mobile reads `currentPhase`, `cycleDay`, `daysToNextPeriod`, and `userNickname` from `CycleContext`.
2. User opens "Resep Hari Ini" from the Habits tab.
3. Mobile calls `GET /api/recipes/today?date=YYYY-MM-DD`.
4. If an active recipe exists for that user/date, mobile displays it without charging credits.
5. If no active recipe exists, user taps generate and mobile calls `POST /api/generate-recipes`.
6. Backend authenticates user.
7. Backend checks balance for 15 credits.
8. Backend calls OpenRouter with Indonesian-local ingredient rules.
9. Backend validates the structured response.
10. Backend saves a `recipe_generations` row as `pending_charge`.
11. Backend charges 15 credits with `reference_id = recipe_generations.id`.
12. Backend marks the row `active`.
13. Backend returns `{ generation, result, balance }`.
14. Mobile displays recipes, grocery list, phase benefit, and updated credit balance.

## Error Handling

If the user is unauthenticated, the backend returns 401. If credits are insufficient, the backend returns 402 with `balance` and `required`. If OpenRouter fails or returns invalid content, the backend returns an error without saving or charging credits. If saving succeeds but charging fails, the row remains `pending_charge` and should not be shown as an active paid result.

The mobile modal shows friendly copy for insufficient credits and a retry button for transient errors. Reloads and tab switches should recover the active saved result for the current date.

## Testing

Backend tests cover recipe validator strictness, recipe snapshot helpers, and credit charging with saved references. Mobile tests cover mapping API recipe payloads into UI-safe data.

Verification uses focused Node tests, backend typecheck, root lint baseline awareness, and Expo web build.

## Out Of Scope

- AI vision scan of refrigerator or pantry.
- Weekly meal plan.
- Full recipe history UI beyond reopening today's active result.
- Mayar credit top-up UI changes.
- Nutrition macros or medical diet recommendations.
