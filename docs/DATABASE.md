# Siklusio Database Guide

Tanggal audit terakhir: 2026-06-03.

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

Hasil `npm run db:migrations:list` pada 2026-06-04 setelah rilis reorganisasi repositori:

| Migration | Local | Remote | Catatan |
| --- | --- | --- | --- |
| `20260531010100_ai_credits.sql` | Ada | Ada | AI balance, ledger, dan RPC credit dasar |
| `20260531010200_habit_coach.sql` | Ada | Ada | Habit Coach plans dan days |
| `20260531010300_cycle_guides.sql` | Ada | Ada | Saved cycle guide |
| `20260531010401_cycle_guides_unique.sql` | Ada | Ada | Unique/idempotency guide |
| `20260531010402_recipe_generations.sql` | Ada | Ada | Saved recipe generation |
| `20260531112800_ai_credit_topups.sql` | Ada | Ada | Topup table |
| `20260601094508_onboarding_completion_flag.sql` | Ada | Ada | Phase 3 onboarding completion flag |
| `20260601100443_pending_registration_auth_user_id.sql` | Ada | Ada | Phase 4 pending registration tanpa plaintext password |
| `20260601101749_atomic_ai_credit_topup_processing.sql` | Ada | Ada | Phase 5 atomic topup RPC |
| `20260602164929_checkout_affiliate_support_tables.sql` | Ada | Ada | Production support tables untuk checkout, affiliate, dan conversion |
| `20260602174912_phase28_rls_function_grants.sql` | Ada | Ada | Phase 28 function grants, RPC affiliate, dan hardening `is_admin` |
| `20260604094057_rate_limit_db.sql` | Ada | Ada | Inisialisasi tabel rate limit utama |
| `20260604100412_rate_limit_row_lock.sql` | Ada | Ada | Penambahan row locking untuk rate limit |
| `20260604104737_rate_limit_atomic_lock.sql` | Ada | Ada | Implementasi pg_advisory_xact_lock untuk atomisitas rate limit |

Implikasi & Status Integrasi:
- **Typed Client Aktif**: Seluruh client Supabase di frontend (`mobile-app/src/lib/supabase.ts`) maupun backend (`backend/src/services/supabaseAdmin.ts`) sudah terikat penuh menggunakan pengetikan data generik `createClient<Database>(...)`.
- **Waspada Perubahan Manual**: File `supabase/types/database.types.ts` dihasilkan secara otomatis dari CLI generator. **Dilarang keras mengubah file ini secara manual**.
- **Alur Perubahan**: Setiap perubahan skema database lokal harus didaftarkan melalui file migrasi baru (`npx supabase migration new <nama>`), diaplikasikan ke database remote, lalu jalankan `npm run db:types` untuk memperbarui type definitions TypeScript.

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
- Phase 28 sudah mengaudit dan memperketat function grants: AI credit mutation dan affiliate helper service-role only, community/admin RPC authenticated-only, anon revoked, dan `is_admin(uid)` tidak bisa dipakai untuk probing UID lain.

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

1. Create a deliberate baseline/squash plan for root `supabase/*.sql` legacy snippets.
2. Add deeper integration tests for RLS policies using real authenticated non-admin/admin users.
3. Adopt typed Supabase clients in mobile/backend incrementally now that generated types match production.
4. Review exposed views before adding any future Data API surface; use security-invoker views or explicit grants.
5. Keep `npm run db:push:dry-run`, `npm run db:lint`, and `npm run db:types` as required release gates.
