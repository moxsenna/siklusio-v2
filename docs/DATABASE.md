# Siklusio Database Guide

Tanggal audit terakhir: 2026-06-02.

Dokumen ini adalah handoff database untuk developer manusia. Tujuannya sederhana: perubahan schema jangan lagi tersebar antara SQL manual, ingatan developer, dan migration history yang berbeda.

## Source Of Truth

`supabase/migrations/` adalah source of truth untuk perubahan schema production baru.

Aturan kerja:

1. Buat perubahan schema baru dengan `supabase migration new <nama_deskriptif>`.
2. Edit file migration yang dibuat CLI, jangan membuat nama timestamp manual.
3. Jalankan `npm run db:push:dry-run` sebelum apply ke remote.
4. Setelah migration benar-benar apply ke environment target, jalankan `npm run db:types`.
5. Commit migration, generated types, dan update docs dalam satu perubahan.

## Current Migration State

Hasil `npx supabase migration list --linked` pada 2026-06-02:

| Migration | Local | Remote | Catatan |
| --- | --- | --- | --- |
| `20260531010100_ai_credits.sql` | Ada | Ada | AI balance, ledger, dan RPC credit dasar |
| `20260531010200_habit_coach.sql` | Ada | Ada | Habit Coach plans dan days |
| `20260531010300_cycle_guides.sql` | Ada | Ada | Saved cycle guide |
| `20260531010401_cycle_guides_unique.sql` | Ada | Ada | Unique/idempotency guide |
| `20260531010402_recipe_generations.sql` | Ada | Ada | Saved recipe generation |
| `20260531112800_ai_credit_topups.sql` | Ada | Ada | Topup table |
| `20260601094508_onboarding_completion_flag.sql` | Ada | Belum | Phase 3 local remediation, pending remote |
| `20260601100443_pending_registration_auth_user_id.sql` | Ada | Belum | Phase 4 local remediation, pending remote |
| `20260601101749_atomic_ai_credit_topup_processing.sql` | Ada | Belum | Phase 5 local remediation, pending remote |

Implikasi:

- `npm run db:push:dry-run` masih akan menampilkan tiga migration pending di atas.
- `supabase/types/database.types.ts` saat ini dibuat dari linked remote, jadi file itu adalah snapshot remote production saat ini.
- Jangan wire generated types ke `createClient<Database>()` dulu jika itu membuat local code bertabrakan dengan migration lokal yang belum apply remote.
- Setelah tiga migration pending dipush, jalankan ulang `npm run db:types` dan baru pertimbangkan typed Supabase client adoption.

## Legacy Root SQL

File `supabase/*.sql` di root folder adalah legacy/manual reference snippets. Mereka berguna untuk memahami sejarah fitur, tetapi bukan lagi jalur utama untuk perubahan production baru.

Contoh file legacy/reference:

| File | Status |
| --- | --- |
| `supabase/schema.sql` | Bootstrap/core reference untuk `profiles` dan `activity_history`; bukan schema lengkap production |
| `supabase/community*.sql` | Reference untuk community tables, privacy hardening, rate limit, admin RPC, avatar, dan comments RPC |
| `supabase/affiliates.sql`, `affiliate_conversions.sql`, `affiliate_rpc.sql` | Reference affiliate dan payout tracking |
| `supabase/pending_registrations.sql`, `checkout_sessions.sql`, `coupons.sql` | Reference checkout/payment support |
| `supabase/activity_history_sync_hardening.sql` | Reference trigger `updated_at` activity history |
| `supabase/community_verify.sql` | Diagnostic SQL, bukan DDL migration |

Rule: jangan copy-paste root SQL langsung ke production untuk fitur baru. Jika isinya masih dibutuhkan, fold ke migration yang dibuat dengan CLI dan verifikasi dry-run.

## Generated Types

Generated types berada di:

```text
supabase/types/database.types.ts
```

Cara regenerate:

```powershell
npm run db:types
```

Catatan:

- File ini generated, jangan edit manual.
- Saat ini command memakai linked project: `supabase gen types --linked --lang=typescript --schema public`.
- Jika ingin types dari local migrations sebelum remote apply, jalankan local Supabase database lalu ubah workflow menjadi `supabase gen types --local --lang=typescript --schema public`.

## App Table Inventory

Tabel dan view yang terlihat dipakai backend/mobile:

| Area | Tables / Views |
| --- | --- |
| Core profile | `profiles`, `activity_history` |
| AI credit | `ai_credit_balances`, `ai_credit_ledger`, `ai_credit_topups` |
| AI saved results | `recipe_generations`, `habit_coach_plans`, `habit_coach_plan_days`, `cycle_guides` |
| Checkout/payment | `pending_registrations`, `checkout_sessions`, `coupons` |
| Affiliate | `affiliates`, `affiliate_conversions` |
| Community | `community_posts`, `community_comments`, `community_reactions`, `community_reports` |
| Admin/CRM | `crm_profiles` |
| Storage metadata | `profiles.avatar_url`, `profiles.avatar_kind` |

## RPC / Function Inventory

RPC yang terlihat dipanggil app:

| Function | Caller |
| --- | --- |
| `ensure_ai_credit_balance` | Backend AI credit helper |
| `charge_ai_credits` | Backend AI credit helper |
| `grant_ai_credits` | Backend AI credit helper |
| `process_paid_ai_credit_topup` | Mayar topup webhook |
| `create_affiliate_with_coupon` | Backend affiliate/admin flows |
| `get_community_feed` | Mobile community feed |
| `get_post_comments` | Mobile community comments |
| `admin_get_moderation_queue` | Mobile admin screen |
| `admin_moderate_target` | Mobile admin screen |
| `admin_reset_user_avatar` | Mobile admin screen |

Important security notes:

- Public exposed tables should have RLS enabled.
- `SECURITY DEFINER` functions need explicit review because they can bypass RLS.
- Views exposed to clients should use `security_invoker = true` on Postgres 15+ or be protected by grants/RLS-compatible access patterns.
- Phase 28 should audit RLS and function grants before production deploy.

## Commands

```powershell
npm run db:migrations:list
npm run db:push:dry-run
npm run db:lint
npm run db:types
```

Deployment rule:

- `db:push:dry-run` is safe and does not apply migrations.
- Do not run `supabase db push` without explicit deploy approval.
- If dry-run lists unexpected migrations, stop and reconcile before deploy.

## Long-Term Cleanup

Recommended future database cleanup:

1. Apply or intentionally defer the three pending Phase 3-5 migrations.
2. Regenerate `supabase/types/database.types.ts` after the target schema changes.
3. Create a deliberate baseline/squash plan for root `supabase/*.sql` legacy snippets.
4. Audit RLS, grants, views, and `SECURITY DEFINER` functions.
5. Adopt typed Supabase clients in mobile/backend only after generated types match the intended environment.
