# Siklusio Onboarding Data Model Hardening

## Objective

Prevent new or incomplete profiles from being treated as fully onboarded just because `profiles.last_period_date` has a database default.

## Problem

`profiles.last_period_date` is currently `NOT NULL DEFAULT CURRENT_DATE`, while the mobile app marks onboarding as complete when either `nickname` or `last_period_date` exists in the cloud profile. A freshly created profile can therefore bypass onboarding with a fake HPHT value.

## Approach

1. Add a small pure helper for deciding whether a cloud profile has completed onboarding.
2. Require an explicit `onboarding_completed` flag for completion.
3. Set that flag when onboarding finishes in the mobile app.
4. Add a Supabase migration that introduces the flag and removes the misleading HPHT default.
5. Backfill only profiles that look meaningfully completed, without trusting `last_period_date` alone.

## Tasks

1. Write tests for incomplete cloud profiles and explicit completed profiles.
2. Implement the helper and use it from `CycleContext`.
3. Update onboarding submit to persist `onboarding_completed: true`.
4. Create migration with `supabase migration new`.
5. Update `supabase/schema.sql` to match the migration.
6. Run `npm run check`, `supabase db push --dry-run`, and scoped whitespace checks.
7. Update the merged audit report with the remediation status.

## Verification

- The helper test must first fail before production code exists.
- `npm run check` must pass after implementation.
- `supabase db push --dry-run` must list the pending migration without applying it.
