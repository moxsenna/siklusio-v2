# Implementation Plan - Siklusio v2 Systems Hardening & Concurrency Fixes

This plan outlines the technical implementations required to resolve critical privacy vulnerabilities, logical collisions in admin moderation, offline state desynchronizations, and client-side database error stability within the **Siklusio v2** project.

---

## Proposed Changes

### 1. Database Layer (Supabase / Postgres)

#### [MODIFY] [community.sql](file:///d:/Coding/remix_-siklusio/supabase/community.sql)
- **Goal**: Refactor `public.community_reports_after_insert()` to resolve reports automatically if a post or comment has already been kept or hidden by an admin.
- **Implementation**:
  - Add query checks at the beginning of `community_reports_after_insert()` to select `admin_reviewed_at` and `admin_review_status`.
  - If a review exists, update the newly inserted report's status to `resolved_keep` or `resolved_hide` immediately, skipping the report count increment and avoiding the moderation queue reappearance loop.

#### [NEW] [community_privacy_hardening.sql](file:///d:/Coding/remix_-siklusio/supabase/community_privacy_hardening.sql)
- **Goal**: Harden Column-Level Security for anonymous posts.
- **Implementation**:
  - Revoke broad `SELECT` privileges on `public.community_posts` and `public.community_comments` from the `authenticated` role.
  - Grant select access to all columns **except `user_id`** to `authenticated` users.
  - Ensure that normal users can only retrieve the feed via the `get_community_feed` RPC (which safely replaces the user's nickname with 'Anonim'), while protecting direct table queries from leaking `user_id`.

---

### 2. Frontend Utilities & Context (React Native / Expo Client)

#### [NEW] [errorParser.ts](file:///d:/Coding/remix_-siklusio/mobile-app/src/lib/errorParser.ts)
- **Goal**: Implement a robust DB error-string parser.
- **Implementation**:
  - Parse custom rate limit exceptions emitted by the PostgreSQL triggers (`rate_limit:post_cooldown:wait_secs:...` or `rate_limit:post_hourly:...`) with SQLSTATE `P0001`.
  - Extract the cooldown seconds and return a clean, user-friendly Indonesian message block to prevent UI crashes and raw tracebacks.

#### [NEW] [SyncManager.ts](file:///d:/Coding/remix_-siklusio/mobile-app/src/lib/SyncManager.ts)
- **Goal**: Implement collision-free cycle tracking sync.
- **Implementation**:
  - Create a client-side sync orchestrator that pulls the current user's profile state from Supabase and compares its `updated_at` timestamp with a local storage key `hs_v2_last_sync_time`.
  - If the cloud's timestamp is newer than the local sync timestamp, fetch the cloud data and update `localStorage` to resolve the conflict (Last-Write-Wins pull).
  - If the local changes are newer, push them to Supabase and update the local sync timestamp.

#### [MODIFY] [CycleContext.tsx](file:///d:/Coding/remix_-siklusio/mobile-app/src/context/CycleContext.tsx)
- **Goal**: Integrate SyncManager to securely sync state.
- **Implementation**:
  - Add a sync hook/effect inside `CycleProvider` that runs upon application initialization (once authenticated) and after any user cycle update (HPHT, length, period length changes).
  - Automatically run data reconciliation to protect data integrity.

---

## Verification Plan

### Automated Database Tests
- Run migration tests using standard SQL queries:
  1. Insert reports post-moderation to verify `resolved_keep` is applied automatically.
  2. Query `community_posts` directly via `authenticated` connection to verify that `user_id` is blocked, throwing an access error.

### Manual Verification
1. **Cooldown Interception Test**:
   - Manually submit posts twice in quick succession to verify that SQLSTATE `P0001` trigger exceptions are captured and display a warm Indonesian banner instead of a client traceback error.
2. **Cycle Sync Reconciliation Test**:
   - Simulate offline cycle edits on one device, update cloud data from another device, and reconnect the offline device to confirm cloud-pull takes priority.
