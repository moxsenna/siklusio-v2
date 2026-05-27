# Task List: Siklusio v2 Hardening

- `[x]` 1. Database Layer Hardening
  - `[x]` Update `community_reports_after_insert` in `supabase/community.sql`
  - `[x]` Create `supabase/community_privacy_hardening.sql` for Column-Level SELECT constraints
- `[x]` 2. Frontend Layer Hardening
  - `[x]` Create `mobile-app/src/lib/errorParser.ts` for rate limit trigger errors
  - `[x]` Create `mobile-app/src/lib/SyncManager.ts` for cycle tracking desync resolution
  - `[x]` Modify `mobile-app/src/context/CycleContext.tsx` to integrate SyncManager
- `[x]` 3. Verification & Validation
  - `[x]` Test Column Anonymity RLS restrictions
  - `[x]` Test custom exception banner mapping
  - `[x]` Verify cycle HPHT synchronization under offline/online transitions
