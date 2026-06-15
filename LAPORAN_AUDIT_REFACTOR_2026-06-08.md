# Laporan Audit & Refaktor Siklusio

**Tanggal:** 8 Juni 2026  
**Scope:** Seluruh monorepo — `backend/`, `mobile-app/`, `supabase/`, `landing/`, `scripts/`, CI/CD, konfigurasi root  
**Metode:** Audit statis paralel (3 area), verifikasi manual temuan kritis, perbandingan dengan `AUDIT_REPORT.md` (1 Jun) dan `CODEX_AUDIT_REPORT.md`, analisis graphify (`graphify-out/GRAPH_REPORT.md`, commit `ae3bf5cf`)  
**Status test saat audit:** 40 file test lulus (`npm test`)

---

## Ringkasan Eksekutif

Siklusio adalah monorepo aplikasi pelacak siklus menstruasi & promil dengan stack **Expo/React Native** (universal), **Hono** di Cloudflare Workers, dan **Supabase** (PostgreSQL + Auth). Arsitektur produk sudah matang — fitur luas (AI credit ledger, komunitas anonim, checkout Mayar, affiliate, admin CRM, WhatsApp autoresponder) dengan fondasi dokumentasi dan guardrail test yang baik.

**Verdict keseluruhan: B- (fungsional & terdeploy, tetapi utang teknis signifikan di maintainability, keamanan edge-case, dan konsistensi schema.)**

| Dimensi | Skor | Catatan |
|---------|------|---------|
| Arsitektur produk | **A-** | Domain jelas, fitur lengkap, dokumentasi kuat |
| Backend maintainability | **C+** | Sudah dimodularisasi ke `src/`, tapi controller masih "god function" |
| Mobile maintainability | **C** | 2 file ekstrem (>1800 & >1298 baris), Context overloaded |
| Database / schema | **C-** | 23 file SQL legacy + 18 migrations, bootstrap tidak reproducible |
| Keamanan | **B-** | Auth & rate limit ada; beberapa celah edge-case tersisa |
| CI/CD | **C+** | `npm run check` ada; `format:check`, `db:lint`, secret scan belum |
| Test coverage | **B-** | 40 test files; kuat di `src/lib/`, nol di UI/hooks/context |
| Type safety | **C+** | `strict: true`, tapi ~90+ `any` di backend, ~80+ di mobile |

**5 aksi ROI tertinggi (urut prioritas):**

1. Perbaiki webhook bulk-update session `pending` → `paid` (risiko korupsi data pembayaran)
2. Migrasikan `community_privacy_hardening.sql` ke migrations (risiko deanonymisasi komunitas)
3. Ekstrak `PaymentActivationService` — hilangkan ~800 baris duplikasi di 3 controller
4. Pecah `admin.tsx` (1819 baris) dan `CycleContext` (479 baris, 30+ field)
5. Meter endpoint AI gratis (`generate-cycle-report`, `generate-habits-insight`) — cegah abuse OpenRouter

---

## Progress Sejak Audit 1 Juni 2026

| Temuan lama | Status sekarang |
|-------------|-----------------|
| Backend monolith `backend/index.ts` | ✅ **Diperbaiki** — modular `backend/src/` (controllers, routes, services, middlewares) |
| `/api/generate-calming-reassurance` tanpa auth | ✅ **Diperbaiki** — `requireUser()` ada di semua endpoint AI |
| Tabel `ai_credit_topups` tidak ada | ✅ **Diperbaiki** — migration `20260531112800_ai_credit_topups.sql` |
| `GEMINI_API_KEY` unused di Env | ✅ **Diperbaiki** — sudah dihapus dari `backend/src/env.ts` |
| Root lint gagal (tsconfig frontend lama) | ✅ **Diperbaiki** — `npm run check` lulus |
| Password plaintext di `pending_registrations` | ⚠️ **Perlu verifikasi** — masih ada di flow checkout; audit ulang enkripsi |
| `last_period_date NOT NULL DEFAULT CURRENT_DATE` | ⚠️ **Belum pasti** — perlu cek migration `20260601094508_onboarding_completion_flag.sql` |
| Komponen template Expo tidak terpakai | ⚠️ **Sebagian** — perlu audit ulang `mobile-app/components/` |
| `graphify-out/` di-commit | ⚠️ **Masih** — sebagian file masih tracked |

---

## BAGIAN 1 — Masalah Kritis (P0)

Harus diperbaiki sebelum scale pengguna atau audit keamanan eksternal.

### 1.1 Webhook Mayar: bulk-mark semua session pending sebagai paid

**File:** `backend/src/controllers/webhook.mayar.controller.ts` (baris 393–398)

Saat satu pembayaran sukses, kode meng-update **semua** `checkout_sessions` dengan email yang sama dan status `pending`, bukan hanya session yang cocok.

```typescript
// Fallback: update any pending checkout sessions under the same email to paid
await supabaseAdmin.from("checkout_sessions")
  .update({ status: "paid", paid_at: new Date().toISOString() })
  .eq("email", email.toLowerCase())
  .eq("status", "pending");
```

**Dampak:** Status pembayaran salah jika user retry checkout; side effect CAPI/affiliate ganda.  
**Perbaikan:** Update hanya `session.id` atau `mayar_transaction_id` yang match.  
**Effort:** S (0.5 hari)

---

### 1.2 Community privacy hardening belum di migrations

**File legacy:** `supabase/community_privacy_hardening.sql`  
**Status:** Tidak ada di `supabase/migrations/` (18 file migration saat ini)

File ini melakukan `REVOKE SELECT` pada kolom `user_id` di `community_posts` dan `community_comments`, memaksa akses hanya via RPC `get_community_feed`. Tanpa ini, REST query langsung bisa mengekspos identitas poster anonim.

**Dampak:** Pelanggaran privasi/GDPR — deanonymisasi komunitas.  
**Perbaikan:** Buat migration `20260608_community_privacy_hardening.sql`, verifikasi grants di production.  
**Effort:** S (0.5–1 hari)

---

### 1.3 Schema tidak reproducible dari migrations saja

**Masalah:** 23 file `supabase/*.sql` di root (legacy) vs 18 migrations. Tabel inti (`profiles`, `activity_history`) dan seluruh fitur komunitas hanya ada di legacy SQL. Migration pertama `20260531010100_ai_credits.sql` secara eksplisit menyatakan *"Run after supabase/schema.sql"*.

**Dampak:** `supabase db reset` dari nol gagal; onboarding developer baru fragile; disaster recovery tidak deterministic.  
**Perbaikan:** Baseline migration yang menggabungkan semua legacy DDL, arsipkan root SQL ke `supabase/legacy/`.  
**Effort:** L (2–3 hari)

---

### 1.4 Metadata Supabase CLI ter-commit di git

**File:** `supabase/.temp/` (linked-project.json, pooler-url, project-ref, dll.)

**Dampak:** Kebocoran project ref dan endpoint database pooler.  
**Perbaikan:** Tambah `supabase/.temp/` ke `.gitignore`, `git rm -r --cached`, rotasi credential jika repo pernah public.  
**Effort:** S (0.5 hari)

---

### 1.5 Token Fonnte hardcoded di `.env.example`

**File:** `.env.example` baris ~131 — `FONNTE_TOKEN="DG3gCGwRT82hbRVP46fb"` (bukan placeholder)

**Perbaikan:** Ganti dengan placeholder, rotasi token di dashboard Fonnte.  
**Effort:** S (0.25 hari)

---

### 1.6 Meta CAPI test event code bypass

**File:** `backend/src/controllers/checkout.controller.ts` (baris 102–111)

Jika `META_TEST_MODE_SECRET` tidak diset, `test_event_code` dari client langsung diterima tanpa validasi.

**Dampak:** Siapapun bisa menyuntikkan test event ke production CAPI.  
**Perbaikan:** Tolak `test_event_code` jika secret tidak ada; wajibkan secret di production.  
**Effort:** S (0.25 hari)

---

## BAGIAN 2 — Prioritas Tinggi (P1)

### 2.1 Backend: God controllers & duplikasi logika pembayaran

| File | Baris | Masalah |
|------|------:|---------|
| `adminCrm.controller.ts` | 684 | `overrideAdminCrmPaymentStatus` ~412 baris |
| `checkout.controller.ts` | 601 | `checkoutRegister` ~437 baris |
| `webhook.mayar.controller.ts` | 445 | `handleMayarWebhook` ~482 baris |
| `ai.reassurance.controller.ts` | 409 | AI lifecycle inline |

**Duplikasi 3×** di checkout, webhook, dan admin CRM:
- `grantPremiumInitialAiCredits`
- Affiliate commission + `affiliate_conversions`
- Meta CAPI `Purchase` event
- `upsertAdminCrmLead`
- `sendWhatsappAutoresponder`
- Auth user activation
- `pending_registrations` cleanup

**Rekomendasi:** Ekstrak `PaymentActivationService` + `CheckoutRegistrationService` + `WebhookPaymentProcessor`.  
**Effort:** L (1–2 minggu)

---

### 2.2 Backend: Endpoint AI tanpa meter kredit

| Endpoint | Auth | Rate limit | Charge kredit |
|----------|------|------------|---------------|
| `/api/generate-cycle-report` | ✅ | ✅ | ❌ |
| `/api/generate-habits-insight` | ✅ | ✅ | ❌ |
| `/api/generate-calming-reassurance` | ✅ | ✅ | ✅ (25) |
| `/api/cycle-guide/generate` | ✅ | ✅ | ✅ (40) |

User terautentikasi bisa menghabiskan OpenRouter tanpa batas kredit (hanya rate limit ~20 req/min).

**Rekomendasi:** Selaraskan dengan pola paid-feature (balance check → generate → charge) atau daily cap.  
**Effort:** M (3–5 hari)

---

### 2.3 Backend: Admin auth tidak di route layer

**File:** `backend/src/routes/admin.route.ts`

Tidak ada middleware `requireAdmin` di level router. Proteksi per-handler dan tidak konsisten:
- Coupon/users: inline `requireUser` + query `is_admin`
- Affiliate/CRM/WhatsApp: helper `requireAdmin()`

**Risiko:** Endpoint admin baru bisa ship tanpa auth jika copy-paste salah.  
**Rekomendasi:** `router.use("/api/admin/*", requireAdminMiddleware)`.  
**Effort:** M (1–2 hari)

---

### 2.4 Backend: Error internal bocor ke client

**File:** `backend/src/middlewares/errorHandler.ts` — mengembalikan `err.message` mentah.

~40+ controller juga return `error.message` di response 500. Checkout mengembalikan error Supabase auth langsung.

**Rekomendasi:** Envelope error standar `{ error, code }`; log detail server-side saja.  
**Effort:** S–M (1–2 hari)

---

### 2.5 Backend: `checkoutRegister` list semua auth users

**File:** `checkout.controller.ts` (baris ~127)

`supabaseAdmin.auth.admin.listUsers()` dipanggil setiap registrasi untuk cek email — O(n), PII di memory.

**Rekomendasi:** `getUserByEmail`, atau handle duplicate error dari `createUser`.  
**Effort:** M (1 hari)

---

### 2.6 Backend: ~90+ penggunaan `any`

Hotspot: `supabaseAdmin: any`, `callOpenRouterJson<any>`, `catch (error: any)` (~50 blok), `c: any` di recipes controller.

**Rekomendasi:** Type `supabaseAdmin` dari `database.types.ts`; `unknown` + type guard di catch.  
**Effort:** M (1 minggu)

---

### 2.7 Mobile: God screen `admin.tsx` (1819 baris)

Mencakup users, moderation, coupons, CSV export, auth, tab routing — padahal sebagian admin sudah diekstrak (`AdminCrmPanel`, `AdminAffiliatePanel`, `AdminWhatsappAutoresponderPanel`).

**Rekomendasi:** Ekstrak `AdminUsersPanel`, `AdminModerationPanel`, `AdminCouponsPanel`.  
**Effort:** L (1 minggu)

---

### 2.8 Mobile: God context `CycleContext` (479 baris, 30+ field)

Dikonsumsi 15+ komponen. Perubahan `activityHistory` me-render semua consumer.

**Rekomendasi:** Split ke `CycleDataContext`, `ProfileContext`, `SavingsContext`; atau selector hooks (`useCyclePhase()`, `useActivityHistory()`).  
**Effort:** L (2 minggu)

---

### 2.9 Mobile: Community feed tanpa virtualisasi

**File:** `app/(tabs)/community.tsx` — `ScrollView` + `.map()`, bukan `FlatList`/`FlashList`.

**Dampak:** Performa buruk pada feed panjang; satu-satunya `FlatList` di app ada di `HistoryView`.  
**Effort:** M (2–3 hari)

---

### 2.10 Mobile: Test ada tapi tidak runnable dari npm

20 file test di `src/lib/` (node:test), tapi `mobile-app/package.json` tidak punya script `test`.

**Rekomendasi:** Tambah `"test": "node --import tsx --test src/lib/**/*.test.ts"` + CI step.  
**Effort:** S (0.5 hari)

---

### 2.11 CI/CD gaps

| Check | Ada di package.json | Ada di CI? |
|-------|---------------------|------------|
| `typecheck:backend` + `typecheck:mobile` | ✅ | ✅ |
| `npm test` | ✅ | ✅ |
| `format:check` | ✅ | ❌ |
| `db:lint` | ✅ | ❌ |
| `db:push:dry-run` | ✅ | ❌ |
| Secret scanning | — | ❌ |
| Supabase migration review | — | ❌ |

**Tambahan:** `deploy-backend.yml` deploy `backend/index.ts` (shim) vs `wrangler.jsonc` pakai `backend/src/index.ts` — inkonsisten.

**Effort:** M (1–1.5 hari)

---

### 2.12 Duplikasi SQL legacy vs migrations

23 file root `supabase/*.sql` duplikat atau mirror migrations (terverifikasi byte-identical untuk `ai_credits`, `habit_coach`, `cycle_guides`, dll.).

**Rekomendasi:** Pindah ke `supabase/legacy/` dengan banner peringatan; extend `scripts/database-docs.test.js` untuk gagal jika file SQL baru muncul di root.  
**Effort:** M (1 hari)

---

## BAGIAN 3 — Prioritas Menengah (P2)

### 3.1 Backend

| # | Masalah | File | Effort |
|---|---------|------|--------|
| B1 | Duplikasi AI lifecycle (cycle guide, recipes, reassurance, habit coach) | 4 controller + `habitCoachPlanLifecycle.ts` | M |
| B2 | Tidak ada validasi input Zod di HTTP boundary | Semua controller | M |
| B3 | `Env` interface tidak lengkap (rate limit vars) | `env.ts` vs `rateLimit.ts` | S |
| B4 | Logging inkonsisten — ~45 `console.log` vs `logging/redaction.ts` | controllers, services | S |
| B5 | `pending_charge` recovery hanya di TWW reassurance | `ai.reassurance.controller.ts` | M |
| B6 | Service layer tipis/menyesatkan (re-export shim) | `services/aiCreditLedger.ts`, `schemas/requestSchemas.ts` | S |
| B7 | Magic numbers tersebar (37000, credit costs 15/25/40, bonus 500) | controllers | S |
| B8 | Test gap: admin, fonnte, mayar, adminCrm services | — | L |

### 3.2 Mobile

| # | Masalah | File | Effort |
|---|---------|------|--------|
| M1 | `settings.tsx` god screen (957 baris) | `app/(tabs)/settings.tsx` | L |
| M2 | Admin panels monolitik (CRM 1298, WhatsApp 853, Affiliate 772 baris) | `src/features/admin/*.tsx` | L |
| M3 | ~80+ `any` di 35 file | admin, habits, community hook | M |
| M4 | Duplikasi error parsing — `translateError` vs `parseDbError` (dead code) | `useCommunityFeed.ts`, `errorParser.ts` | S |
| M5 | Duplikasi alert/confirm web vs native di 10+ file | community, settings, admin, dll. | S |
| M6 | `api.ts` — 4 fungsi HTTP ~85% identik | `src/lib/api.ts` | S |
| M7 | Styling inkonsisten (NativeWind + inline hex di 30+ file) | widespread | M |
| M8 | Tidak ada `React.memo` di list children | `PostCard`, admin rows | M |
| M9 | `JSON.stringify` deep compare di sync | `CycleContext.tsx` | M |
| M10 | `useCycleData` hook tidak dipakai | `src/hooks/useCycleData.ts` | S |
| M11 | Import path inkonsisten (`@/` vs `../src/`) | `app/*` vs `src/features/*` | S |
| M12 | `SafeAreaView` dari RN deprecated (8 screen) | tab screens, auth | S |
| M13 | Nol test untuk hooks, context, features, screens | — | L |

### 3.3 Infra & Landing

| # | Masalah | Effort |
|---|---------|--------|
| I1 | Env naming: backend pakai `VITE_SUPABASE_URL`, mobile `EXPO_PUBLIC_*` | M |
| I2 | Root `package.json` name `siklusio-backend` — misleading monorepo | S |
| I3 | `ARCHITECTURE.md` root stale vs `docs/ARCHITECTURE.md` | S |
| I4 | Landing fragmentasi (5+ HTML variant, tracking duplikat) | M |
| I5 | `supabase/config.toml` tidak ada | S |
| I6 | `check_rate_limit` SECURITY DEFINER tanpa `search_path` | S |
| I7 | Admin CRM RPC pakai `search_path = public, auth` (tidak selaras Phase 28) | S |
| I8 | Import types fragile (`../../../../../supabase/types/...`) | S |
| I9 | Unused deps root: `express`, `playwright` | S |
| I10 | `clean` script `rm -rf` gagal di Windows | S |

---

## BAGIAN 4 — Prioritas Rendah (P3)

| # | Masalah | Effort |
|---|---------|--------|
| L1 | Konsolidasi laporan audit (4+ file di root + graphify-out) ke `docs/audits/` | S |
| L2 | `constants/Colors.ts` overlap `src/theme/tokens.ts` | S |
| L3 | `Image` RN vs `expo-image` (4 usage) | S |
| L4 | `console.warn/info` di production path (~20) | S |
| L5 | Dark mode partial — kebanyakan screen hardcode light | M |
| L6 | Landing asset nama dengan spasi | S |
| L7 | `handoff-docs.test.js` UTF-8 BOM | S |
| L8 | Duplicate entrypoint `backend/index.ts` shim | S |
| L9 | `graphify-out/` partially committed, stale (commit `ae3bf5cf`) | S |
| L10 | Shared API contract types antara backend ↔ mobile | L (future) |

---

## BAGIAN 5 — Analisis Per Modul

### 5.1 Backend (`backend/src/`)

**Struktur saat ini (baik):**
```
src/
├── ai/           # Prompts, schemas, model policy
├── controllers/  # 11 file — target refaktor utama
├── middlewares/  # auth, cors, rateLimit, errorHandler
├── routes/       # Thin Hono routers
├── services/     # mayar, fonnte, metaCapi, supabase
├── storage/      # Avatar processing
├── payments/     # Topup packages
└── logging/      # PII redaction (underused)
```

**Kekuatan:**
- Rate limiting per-endpoint
- AI output validation (`ai/schemas.ts`, 401 baris)
- 17 test files (checkout, webhook, security, redaction)
- Tidak ada TODO/FIXME/HACK di codebase
- Modularisasi dari monolith sudah selesai

**Kelemahan utama:**
- Controller = service layer (missing domain layer)
- Duplikasi payment flow 3×
- Type safety lemah di boundary HTTP

---

### 5.2 Mobile App (`mobile-app/`)

**Statistik file besar (>300 baris):** 17 file

| Baris | File |
|------:|------|
| 1819 | `app/admin.tsx` |
| 1298 | `src/features/admin/AdminCrmPanel.tsx` |
| 957 | `app/(tabs)/settings.tsx` |
| 853 | `src/features/admin/AdminWhatsappAutoresponderPanel.tsx` |
| 772 | `src/features/admin/AdminAffiliatePanel.tsx` |
| 659 | `app/(tabs)/habits.tsx` |
| 653 | `app/onboarding.tsx` |
| 649 | `src/features/dashboard/TwwSanctuaryModal.tsx` |
| 643 | `app/affiliate.tsx` |
| 479 | `src/context/CycleContext.tsx` |

**Kekuatan:**
- Feature folders (`src/features/`) sudah ada
- `src/lib/` sangat teruji (20 test files): `cyclePrediction`, `habitCoachPlan`, `syncGuards`, `paymentAccess`, dll.
- `newArchEnabled: true`, `typedRoutes` enabled
- `habits.tsx` sudah pakai `useTransition`, `useMemo`, `useCallback`

**Kelemahan utama:**
- Route screens masih menampung business logic
- State management tidak konsisten (Context vs hooks vs inline)
- Zero UI/integration test

---

### 5.3 Supabase (`supabase/`)

**Kekuatan:**
- 18 migrations ter-deploy (remote up-to-date per dry-run)
- Generated types committed (`types/database.types.ts`)
- Phase 28 RLS function grants
- Guardrail `scripts/database-docs.test.js`

**Kelemahan utama:**
- Dual source of truth (legacy SQL + migrations)
- Privacy hardening belum migrated
- `.temp/` committed
- Tidak ada `config.toml`

---

### 5.4 Landing (`landing/`)

**Kekuatan:**
- `conversionFunnel.test.js` (8 tests) — tracking discipline
- GTM-first, Meta Pixel off by default

**Kelemahan:**
- 5+ HTML variants (`index.html`, `lpv2.html`, `landing2.html`, `checkout-conversion-revised.html`)
- Tracking snippet copy-paste di setiap file
- `AG_INSTRUCTIONS.md` referensi file yang tidak ada

---

### 5.5 CI/CD & Tooling

**Kekuatan:**
- `npm run check` = typecheck backend + mobile + test
- `scripts/run-tests.mjs` auto-discover semua `*.test.ts/js`
- Prettier + format scripts
- Wrangler config benar (`backend/src/index.ts`)

**Kelemahan:**
- Format check tidak di CI
- DB lint tidak di CI
- Deploy landing workflow target project stale (`siklusio` vs `siklusio-landing`)

---

## BAGIAN 6 — Roadmap Refaktor

### Sprint 1: Keamanan & Integritas Data (3–4 hari)

| # | Task | Effort | Owner hint |
|---|------|--------|------------|
| 1 | Fix webhook bulk session update | S | backend |
| 2 | Migration community privacy hardening | S | supabase |
| 3 | Hapus `supabase/.temp/` dari git + gitignore | S | infra |
| 4 | Rotasi Fonnte token + fix `.env.example` | S | infra |
| 5 | Fix Meta test event bypass | S | backend |
| 6 | Error handler — jangan leak `err.message` | S | backend |

### Sprint 2: Backend Architecture (1–2 minggu)

| # | Task | Effort |
|---|------|--------|
| 1 | Ekstrak `PaymentActivationService` | L |
| 2 | Route-level `requireAdmin` middleware | M |
| 3 | Meter AI endpoints gratis | M |
| 4 | Generic `AiGenerationService` lifecycle | M |
| 5 | Zod validation layer | M |

### Sprint 3: Mobile Architecture (2–3 minggu)

| # | Task | Effort |
|---|------|--------|
| 1 | Pecah `admin.tsx` → 3 panel | L |
| 2 | Decompose `CycleContext` | L |
| 3 | Community `FlatList` + memoized `PostCard` | M |
| 4 | Platform alert utility + consolidate error parsing | S |
| 5 | Refactor `api.ts` single fetch helper | S |
| 6 | Wire `npm test` di mobile-app | S |
| 7 | Pecah `settings.tsx` | L |

### Sprint 4: Schema & Infra (1–2 minggu)

| # | Task | Effort |
|---|------|--------|
| 1 | Baseline migration (core + community schema) | L |
| 2 | Arsipkan legacy SQL | M |
| 3 | Extend CI (format:check, db:lint, secret scan) | M |
| 4 | Env var rename (`SUPABASE_URL`) | M |
| 5 | Landing canonicalization + shared `tracking.js` | M |
| 6 | Type path alias `@siklusio/database` | S |

### Sprint 5: Polish & Coverage (ongoing)

| # | Task | Effort |
|---|------|--------|
| 1 | ESLint + react-hooks di mobile | S |
| 2 | Admin/integration tests backend | L |
| 3 | Hook/component tests mobile | L |
| 4 | Remove unused deps, fix Windows scripts | S |
| 5 | Konsolidasi docs audit | S |

**Total estimasi:** 8–14 hari dev (Sprint 1–4), + ongoing untuk Sprint 5.

---

## BAGIAN 7 — Apa yang Sudah Baik (Jangan Diubah)

1. **Dokumentasi produk** — `ARCHITECTURE.md`, `PRD.md`, `brand_guideline.md`, `docs/DATABASE.md` sangat lengkap
2. **AI credit ledger** — transaksi server-side, charge setelah validasi JSON sukses
3. **Komunitas anonim** — desain RPC + rate limit + auto-hide trigger solid (tinggal migrate privacy hardening)
4. **SyncManager** — Last-Write-Wins reconciliation untuk offline sync
5. **Guardrail tests** — `database-docs.test.js`, `handoff-docs.test.js`, `conversionFunnel.test.js`
6. **Logging redaction** — infrastruktur PII redaction ada (`logging/redaction.ts`)
7. **Rate limiting** — per-endpoint dengan DB-backed atomic lock
8. **Backend modularisasi** — migrasi dari monolith ke `src/` structure sudah selesai
9. **Test suite** — 40 files, 0 failures saat audit
10. **Wrangler config** — entry point benar, secrets terdaftar

---

## BAGIAN 8 — Matriks Risiko

| Risiko | Probabilitas | Impact | Mitigasi |
|--------|-------------|--------|----------|
| Deanonymisasi komunitas via REST SELECT | Medium | **Kritis** | Sprint 1 #2 |
| Korupsi status checkout session | Medium | **Tinggi** | Sprint 1 #1 |
| Abuse OpenRouter via AI gratis | Tinggi | **Tinggi** | Sprint 2 #3 |
| DB tidak reproducible | Tinggi | **Tinggi** | Sprint 4 #1 |
| Admin endpoint tanpa auth | Rendah | **Tinggi** | Sprint 2 #2 |
| Performa feed komunitas | Tinggi | **Medium** | Sprint 3 #3 |
| Developer onboarding lambat | Tinggi | **Medium** | Sprint 2–3 (god files) |

---

## BAGIAN 9 — Referensi File Kunci

```
D:\Coding\remix_-siklusio\
├── backend/src/
│   ├── controllers/
│   │   ├── adminCrm.controller.ts      # 684 baris — refactor #1
│   │   ├── checkout.controller.ts      # 601 baris — refactor #2
│   │   └── webhook.mayar.controller.ts # 445 baris — bug P0 #1.1
│   ├── middlewares/
│   │   ├── auth.ts                     # requireUser, requireAdmin
│   │   └── errorHandler.ts             # leak P0 #1.6
│   └── routes/admin.route.ts           # no admin middleware P1 #2.3
├── mobile-app/
│   ├── app/admin.tsx                   # 1819 baris — refactor #1
│   ├── app/(tabs)/community.tsx        # no FlatList P1 #2.9
│   ├── app/(tabs)/settings.tsx        # 957 baris
│   └── src/context/CycleContext.tsx    # 479 baris — refactor #2
├── supabase/
│   ├── community_privacy_hardening.sql # NOT in migrations P0 #1.2
│   ├── schema.sql                      # legacy only P0 #1.3
│   ├── .temp/                          # committed secrets P0 #1.4
│   └── migrations/                     # 18 files
├── landing/                            # 5+ HTML variants P2 #I4
├── .github/workflows/ci.yml            # gaps P1 #2.11
├── .env.example                        # Fonnte token P0 #1.5
└── graphify-out/GRAPH_REPORT.md        # 18966 nodes, stale ae3bf5cf
```

---

## Lampiran: Skorcard per Dimensi

| Dimensi | Jun 2026 (audit ini) | Target setelah Sprint 1–4 |
|---------|---------------------|---------------------------|
| Keamanan edge-case | C+ | B+ |
| Backend maintainability | C+ | B |
| Mobile maintainability | C | B- |
| Schema reproducibility | D+ | B |
| CI/CD | C+ | B |
| Test coverage breadth | C+ | B- |
| Type safety | C+ | B- |
| **Keseluruhan** | **B-** | **B+** |

---

*Laporan ini digenerate dari audit paralel backend, mobile-app, dan infra/config pada 8 Juni 2026. Untuk eksplorasi arsitektur interaktif, buka `graphify-out/graph.html` (perlu rebuild jika stale).*