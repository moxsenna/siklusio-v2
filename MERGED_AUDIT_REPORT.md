# MERGED_AUDIT_REPORT.md

Laporan gabungan audit Siklusio dari Kiro AI dan Codex

Tanggal merge: 2026-06-01
Workspace: D:\Coding\remix_-siklusio
Branch saat merge: codex/resep-hari-ini-impl
Commit HEAD saat audit: e08f4b2ef1b9ce2b49dad64ed04a209ad71d684d

Sumber:

1. AUDIT_REPORT.md, dibuat oleh Kiro AI.
2. CODEX_AUDIT_REPORT.md, dibuat oleh Codex.
3. Validasi tambahan langsung terhadap repository, git status, git ls-files, Wrangler, Supabase dry-run, Expo/mobile checks, dan pencarian kode.

Tujuan file ini:

1. Menggabungkan dua audit tanpa menimpa laporan asli.
2. Menghapus duplikasi.
3. Mengoreksi temuan yang ternyata sudah tidak akurat.
4. Menghasilkan backlog final yang bisa dikerjakan manusia secara bertahap.

## Executive summary gabungan

Siklusio sudah punya fondasi produk yang luas dan cukup matang untuk tahap eksperimen cepat: Expo Router mobile/web, Cloudflare Worker Hono, Supabase, Mayar checkout, AI credit ledger, komunitas, admin, affiliate, R2 avatar, landing page, dan unit tests domain.

Masalah terbesar bukan kurang fitur, melainkan pagar engineering yang belum cukup kuat untuk domain sensitif: payment, auth, webhook, AI cost, data kesehatan, database migrations, dan deploy. Jika pagar ini dibereskan, codebase masih sangat mungkin dibuat enak dilanjutkan manusia. Jika tidak, fitur baru akan makin sering menambah risiko regression dan biaya onboarding.

Prioritas tertinggi setelah merge:

1. Hapus pola penyimpanan password plaintext pada pending registration.
2. Pindahkan validasi paket topup AI credit ke backend.
3. Wajibkan auth untuk /api/generate-calming-reassurance.
4. Buat webhook payment fail closed dan idempotent secara atomic.
5. Fix onboarding agar tidak memakai last_period_date default sebagai tanda selesai onboarding.
6. Fix root lint/check dan CI agar status repo bisa dipercaya.
7. Rapikan Supabase migrations agar production schema punya satu sumber kebenaran.
8. Fix workflow deploy landing yang masih menarget project Cloudflare Pages yang tidak ada.

## Status validasi terbaru

## Remediation progress

- 2026-06-01: Phase 1 P0 hardening dimulai dan diverifikasi. Endpoint TWW reassurance sekarang wajib auth, paket topup AI credit di-resolve dari katalog server-side, dan webhook Mayar fail closed saat `MAYAR_WEBHOOK_TOKEN` kosong. Test baru: `backend/securityRoutes.test.ts` dan `backend/payments/topupPackages.test.ts`.
- 2026-06-01: Phase 2 guardrail CI/deploy dimulai dan diverifikasi. Root `tsconfig.json` sekarang hanya typecheck backend, root `npm run check` menjalankan backend typecheck, mobile typecheck, dan semua `*.test.ts/js`, serta GitHub Actions landing deploy sekarang menarget `siklusio-landing`.
- 2026-06-01: Phase 3 onboarding data model dimulai dan diverifikasi. Mobile sekarang memakai `profiles.onboarding_completed` sebagai satu-satunya tanda onboarding cloud selesai, submit onboarding menyimpan flag tersebut, dan migrasi `20260601094508_onboarding_completion_flag.sql` menambah flag plus menghapus default palsu `last_period_date`.
- 2026-06-01: Phase 4 plaintext password removal dimulai dan diverifikasi. Paid checkout sekarang membuat Supabase Auth user dengan `app_metadata.siklusio_access_status = "pending_payment"`, `pending_registrations` menyimpan `user_id` tanpa password, webhook mengaktifkan user yang sama setelah payment sukses, dan mobile menahan user pending-payment di layar khusus.
- 2026-06-01: Phase 5 atomic topup webhook dimulai dan diverifikasi. Webhook topup AI credit sekarang memanggil RPC `process_paid_ai_credit_topup` sehingga claim pending topup, grant credit, dan status paid terjadi dalam satu transaksi Postgres.
- 2026-06-01: Phase 6 checkout session error handling dimulai dan diverifikasi. Paid checkout sekarang tidak mengembalikan `paymentUrl` jika insert `checkout_sessions` gagal, serta membersihkan pending registration dan Auth user baru agar tidak ada akun pending menggantung.
- 2026-06-01: Phase 7 CORS allowlist hardening dimulai dan diverifikasi. Backend tidak lagi memakai wildcard CORS; origin browser dibatasi ke domain Siklusio, localhost dev, dan tambahan `ALLOWED_ORIGINS`.
- 2026-06-02: Phase 8 avatar upload validation dimulai dan diverifikasi. `/api/upload-avatar` sekarang menolak base64 non-image sebelum R2, mendeteksi WebP/PNG/JPEG lewat magic bytes, dan menyimpan object dengan extension serta Content-Type sesuai file asli.
- 2026-06-02: Phase 9 backend log redaction dimulai dan diverifikasi. Backend sekarang punya helper redaksi log, webhook Mayar tidak lagi mencetak raw payload, checkout Mayar tidak mencetak payment URL/transaction id, dan avatar upload tidak mencetak URL publik.
- 2026-06-02: Phase 10 basic API rate limit dimulai dan diverifikasi. Backend sekarang punya fixed-window in-memory rate limiter untuk endpoint AI, checkout, dan payment webhook, dengan env override untuk limit/window serta respons 429 berisi `Retry-After`.
- 2026-06-02: Phase 11 mobile API base URL guardrail dimulai dan diverifikasi. Mobile sekarang hanya fallback ke localhost saat development; production build wajib punya `EXPO_PUBLIC_API_BASE_URL` yang valid agar tidak diam-diam memanggil localhost.
- 2026-06-02: Phase 12 today key refresh dimulai dan diverifikasi. Dashboard, Habits, Calendar guide payload, dan ActionCard sekarang memakai `useTodayKey` sehingga tanggal/fase harian refresh setelah local midnight dan saat app kembali active.
- 2026-06-02: Phase 13 analytics identity wiring dimulai dan diverifikasi. `AuthContext` sekarang memanggil `analytics.setUser` saat user login/logout dengan property aman tanpa email/WhatsApp/nama.
- 2026-06-02: Phase 14 AI feature matrix dimulai dan diverifikasi sebagai dokumentasi. `docs/FEATURE_MATRIX.md` sekarang memetakan route AI, entry point mobile, auth, cost, ledger reference, persistence, rate limit group, topup package, dan policy gap legacy/free-for-now.
- 2026-06-02: Phase 15 savings tracker sync dimulai dan diverifikasi. Mobile sekarang punya helper sync tabungan, `SyncManager.syncSavingsData`, initial sync per user, debounce upload saat tabungan berubah, dan pull nilai `0` dari cloud tanpa terhalang falsey check.
- 2026-06-02: Phase 16 sync guards dan nullable Supabase access dimulai dan diverifikasi sebagian. Sync/profile layer sekarang memakai helper `getSupabaseClientStatus`, dan profile auto-sync menunggu cloud profile load selesai lewat `canSyncCycleProfile` sebelum push lokal.
- 2026-06-02: Phase 17 auth/API nullable Supabase access dimulai dan diverifikasi. `getSupabaseAccessToken` ditambahkan, `api.ts`, `AuthContext`, `auth.tsx`, dan `payment-pending.tsx` sekarang memakai helper Supabase access eksplisit, dengan focused helper test, mobile typecheck, root `npm run check`, Wrangler dry-run, Supabase dry-run, dan scoped whitespace check sudah PASS.
- 2026-06-02: Phase 18 UI/hooks nullable Supabase access dimulai dan diverifikasi. `getAuthenticatedSupabaseClientStatus` ditambahkan, seluruh akses Supabase mobile aktif sekarang melewati helper/status atau API wrapper, direct `supabase.auth/from/rpc/storage` tidak ditemukan lagi di `mobile-app`, dan `npm run check`, Wrangler dry-run, Supabase dry-run, serta scoped whitespace check sudah PASS.
- 2026-06-02: Phase 19 Expo template cleanup dimulai dan diverifikasi. Route placeholder `/modal`, komponen template Expo orphan, obsolete `StyledText-test.js`, dan dependency `react-test-renderer` dihapus; `+not-found` sekarang memakai React Native `Text/View` langsung. `npm run check`, Wrangler dry-run, Supabase dry-run, dan scoped whitespace check sudah PASS.
- 2026-06-02: Phase 20 legacy file cleanup dimulai dan diverifikasi. File recovery/debug/generated lama `restore*.cjs`, `test-api.js`, `backend/index_restored.ts`, `metadata.json`, dan `siklusio_documentation.html` dihapus lokal setelah pencarian referensi aktif tidak menemukan pemakaian. `npm run check`, Wrangler dry-run, Supabase dry-run, scoped whitespace check, dan scan referensi legacy sudah PASS.
- 2026-06-02: Phase 21 graphify/TWW review dimulai, lalu bagian graphify superseded oleh instruksi user. `graphify-out/` ditandai sebagai folder penting dan tidak akan disentuh dalam audit cycle ini; penghapusan manual `mobile-app/assets/sounds/tww_meditation.mp3` tetap dipertahankan karena mapping TWW aktif memakai empat audio lain. `npm run check`, Wrangler dry-run, Supabase dry-run, dan scoped scan TWW sudah PASS; global whitespace check sengaja tidak dijadikan gate karena `fitur.md` dan `graphify-out` sedang punya state paralel.
- 2026-06-02: Phase 22 naming cleanup kecil dimulai dan diverifikasi. `generateMockHistory` di `CycleContext` diganti menjadi `createEmptyActivityHistory` agar tidak memberi kesan ada mock data runtime; behavior tetap sama yaitu initial fallback `{}` untuk activity history. Scan nama lama, `npm run check`, Wrangler dry-run, Supabase dry-run, dan scoped whitespace check yang mengecualikan `fitur.md` serta `graphify-out` sudah PASS.
- 2026-06-02: Phase 23 Expo SDK 54 maintenance dimulai dan diverifikasi. `expo`, `expo-font`, dan `expo-router` dipatch ke versi SDK 54 expected (`~54.0.35`, `~14.0.12`, `~6.0.24`) lewat `npx expo install --fix`, `expo-font` config plugin ditambahkan oleh Expo CLI, dan `expo-doctor@latest` sekarang PASS 18/18. `npm run check`, Wrangler dry-run, Supabase dry-run, dan scoped whitespace check sudah PASS. `npm audit --omit=dev` mobile masih FAIL 14 moderate karena fix yang ditawarkan lompat breaking ke Expo SDK 56, jadi ditahan untuk phase upgrade terpisah.
- 2026-06-02: Phase 24 daily reminder notifications dimulai dan diverifikasi. Settings reminder tidak lagi sekadar toggle memory + Alert; mobile sekarang memakai helper `dailyReminder`, adapter `expo-notifications`, Android channel `daily-reminders`, permission request, schedule harian pukul 08.00, cancel by scheduled id, dan persisted enabled/id state. Web mendapat copy fallback jujur bahwa notification lokal belum tersedia. Test baru `dailyReminder.test.ts`, `expo install --check`, `expo-doctor@latest`, `npm run check`, Wrangler dry-run, Supabase dry-run, dan scoped whitespace check sudah PASS. Mobile audit residual naik menjadi 15 moderate karena `expo-notifications`, tetap butuh upgrade lane Expo SDK 56 terpisah.
- 2026-06-02: Phase 25 AI free policy dimulai dan diverifikasi. Legacy AI endpoint `generate-cycle-report`, `generate-habits-insight`, dan `generate-calming-reassurance` sekarang memakai `resolveOpenRouterModels({ policy: "free_included" })` sehingga hanya memakai model gratis dan tidak membawa fallback OpenRouter berbayar. Fitur AI cost-bearing tetap memakai `policy: "paid"`. `docs/FEATURE_MATRIX.md` diperbarui, test baru `backend/ai/modelPolicy.test.ts` ditambahkan, dan keputusan pricing/persistence untuk legacy AI dipisahkan sebagai product lane masa depan. Focused model policy test, `npm run check`, Wrangler dry-run, Supabase dry-run, dan scoped whitespace check sudah PASS.
- 2026-06-02: Phase 26 analytics strategy cleanup dimulai dan diverifikasi. Strategi analytics sekarang eksplisit: GTM/dataLayer tetap aktif untuk web lewat `mobile-app/app/+html.tsx`, sedangkan native analytics menjadi safe no-op sampai ada fase Firebase native/dev-client terpisah. Dynamic require `@react-native-firebase/analytics` dihapus dari `analytics.ts`, public API `logEvent`, `logScreenView`, dan `setUser` tetap sama, dan test baru `mobile-app/src/lib/analytics.test.ts` memvalidasi payload GTM. Focused analytics test, scan Firebase require, `npm run check`, Wrangler dry-run, Supabase dry-run, dan scoped whitespace check sudah PASS.
- 2026-06-02: Phase 27 Supabase source-of-truth cleanup dimulai dan diverifikasi. `docs/DATABASE.md` dan `supabase/README.md` sekarang menetapkan `supabase/migrations/` sebagai source of truth untuk schema production baru, root `supabase/*.sql` sebagai legacy/manual reference, dan workflow `db:migrations:list`, `db:push:dry-run`, `db:lint`, serta `db:types`. Generated types dibuat di `supabase/types/database.types.ts` dari linked remote; docs menandai caveat bahwa tiga migration lokal Phase 3-5 masih pending remote sehingga types tidak boleh langsung diwiring ke typed client sampai schema target sinkron. Test guardrail baru `scripts/database-docs.test.js`, database CLI checks, `npm run check`, Wrangler dry-run, Supabase dry-run, dan scoped whitespace check sudah PASS.
- 2026-06-03: Phase 28 RLS/function grants dan production integration smoke selesai serta sudah apply ke Supabase production. Migration `20260602174912_phase28_rls_function_grants.sql` memperketat `SECURITY DEFINER` grants: AI credit mutation RPC dan `create_affiliate_with_coupon` service-role only, community/admin RPC authenticated-only, anon revoked, `is_admin(uid)` tidak lagi bisa probing UID lain, dan trigger helper tidak callable dari public RPC surface. Production smoke ulang memverifikasi pending-payment auth, onboarding RLS update, topup package spoof rejection, AI credit topup/idempotency, direct client grant blocked, community feed RPC tetap jalan, dan affiliate RPC service-role bekerja serta cleanup berhasil.
- 2026-06-03: Phase 29 avatar hardening dimulai dan diverifikasi lokal. Avatar upload sekarang membaca dimensi PNG/JPEG/WebP dari header ringan, menolak gambar tanpa dimensi valid atau lebih dari 2048x2048 piksel sebelum R2, dan menjalankan metadata stripping dependency-free sebelum upload: PNG ancillary chunks, JPEG APP metadata/COM segments, dan WebP EXIF/ICCP/XMP chunks. Dokumen `docs/AVATAR_POLICY.md` menuliskan runtime guardrail, alasan tidak re-encode penuh di Worker, dan workflow moderation reset avatar.

### Sudah tervalidasi oleh Codex

| Area | Status |
| --- | --- |
| Root npm run lint | PASS setelah Phase 2 guardrail |
| Mobile typecheck | PASS |
| Unit tests manual | PASS, 34 test files lewat `npm run check` setelah release |
| Wrangler Worker dry-run | PASS, upload 1501.57 KiB / gzip 297.31 KiB |
| Cloudflare Worker deployment | PASS, production Worker deploy versi `d45f782f-4c95-4f61-855f-36a37ed4d2b3` |
| Cloudflare Pages siklusio-landing | Production source `341aaf5` aktif |
| Cloudflare Pages siklusio-v2 | Production source `341aaf5` aktif |
| Supabase db push dry-run | PASS, remote database up to date setelah Phase 28 apply |
| Root npm audit --omit=dev | PASS |
| Mobile npm audit --omit=dev | FAIL, 15 moderate vulnerabilities; fix otomatis butuh breaking upgrade ke `expo@56.0.8` |
| expo-doctor | PASS, 18/18 checks setelah Phase 23 |
| Live smoke test API/landing/app | PASS, HTTP 200 |

### Status deploy / commit

- Phase 1-27 sudah masuk branch `codex/release-prep-audit-phase-1-27`, dipush ke GitHub, fast-forward ke `main`, Cloudflare Worker deployed, Cloudflare Pages landing/app aktif, dan Supabase migrations Phase 3-5 plus support table sudah apply.
- Phase 28 Supabase migration sudah apply ke production dan production smoke lulus; perubahan file migration/docs/types/test masih perlu commit/push setelah verifikasi final fase lanjutan.
- Folder/file yang user minta abaikan tetap di luar release scope: `graphify-out/`, `fitur.md`, `my-video/`, revised landing/bak paralel, dan state workspace utama yang tidak terkait.

### Estimasi phase tersisa setelah Phase 29

Estimasi realistis: 2 phase utama lagi sebelum backlog audit utama rapi untuk handoff manusia. `graphify-out/` tetap dikeluarkan dari jalur cleanup karena user menandainya sebagai folder penting.

Daftar fase yang masih direkomendasikan:

1. Phase 30: local error boundaries/fallback UI untuk fitur AI utama.
2. Phase 31: backend decomposition dan runbook/docs struktur jangka panjang.
3. Optional cleanup/upgrade lane: Supabase baseline/squash root SQL legacy, typed Supabase client adoption bertahap, plus audit npm mobile via Expo SDK 56 upgrade plan, bukan `npm audit fix --force` spontan.

## Rekonsiliasi temuan Kiro vs Codex

### Disepakati oleh kedua audit

| Temuan | Keputusan merge | Prioritas |
| --- | --- | --- |
| /api/generate-calming-reassurance tidak require auth | Valid | P0 |
| last_period_date NOT NULL DEFAULT CURRENT_DATE berbahaya untuk onboarding/akurasi medis | Valid | P1 |
| backend/index.ts terlalu besar | Valid | P2 |
| CORS global terlalu permisif | Valid | P2 |
| modal.tsx masih placeholder Expo | Valid | P3 |
| Firebase Analytics require package yang tidak terinstall | Selesai lokal Phase 26: strategi dipilih GTM web-only, native no-op sampai Firebase native/dev-client dibuat sengaja | P2/P3 |
| Ada file legacy/recovery/debug | Valid | P3 |
| graphify-out berisi generated output | Superseded: user menandai folder ini penting, jangan disentuh tanpa approval eksplisit | P3 |
| .env/docs/env naming tidak konsisten | Valid | P1 |
| CycleContext terlalu banyak tanggung jawab | Valid | P2 |

### Temuan Codex yang ditambahkan ke backlog final

| Temuan | Alasan masuk backlog | Prioritas |
| --- | --- | --- |
| pending_registrations menyimpan password plaintext | Risiko security tertinggi di audit ini | P0 |
| /api/checkout/topup mempercayai price/credits dari client | Risiko revenue dan biaya AI | P0 |
| webhook fail-open jika MAYAR_WEBHOOK_TOKEN kosong | Berbahaya untuk staging/env baru | P0/P1 |
| topup grant credit tidak atomic | Risiko double grant saat retry/race | P1 |
| checkout_session insert tidak dicek sebelum return paymentUrl | Payment flow bisa kehilangan audit/idempotency | P1 |
| root lint/typecheck gagal | CI tidak bisa dipercaya | P1 |
| GitHub Actions deploy landing salah project-name | Pipeline repo broken walau Cloudflare Git integration deploy | P1 |
| root SQL dan migrations tidak jadi satu sumber kebenaran | Selesai sebagian Phase 27: workflow/docs/types sudah rapi; baseline/squash legacy root SQL masih future cleanup sebelum deploy besar | P1 |
| avatar upload tidak validasi MIME/magic bytes | Abuse storage/moderation risk | P1/P2 |
| savings tracker hanya local | Feature sync tidak lengkap | P2 |
| reminder harian hanya toggle/Alert | Feature UI belum benar-benar berfungsi | P2 |
| date key harian bisa stale setelah midnight | Bug UX/data harian | P2 |
| backend logs mengandung PII/payment detail | Privacy/observability risk | P2 |
| mobile API base fallback localhost jika env production kosong | Deploy footgun | P2 |
| mobile dependency/expo-doctor issues | SDK 54 patch mismatch selesai lokal; npm audit residual butuh upgrade lane terpisah | P2 |

### Temuan Kiro yang diterima setelah validasi tambahan

| Temuan | Status merge | Prioritas |
| --- | --- | --- |
| storage.setItem fire-and-forget ke AsyncStorage | Valid, kemungkinan trade-off sengaja tetapi perlu dokumentasi/helper async | P3 |
| generateMockHistory selalu return {} | Valid cleanup naming | P3 |
| analytics.setUser tidak terlihat dipanggil setelah login | Valid | P2 |
| tww_meditation.mp3 tidak dipakai | Valid, file dihapus manual dan mapping memakai 4 audio lain | P3 |
| Colors.ts masih template Expo biru | Valid, brand mismatch | P3 |
| useClientOnlyValue dan beberapa template Expo cleanup | Valid jika tidak terpakai | P3 |
| community_verify.sql adalah diagnostic, bukan migration | Valid | P3 |
| activity_history_sync_hardening.sql naming tidak konsisten | Valid minor | P3 |
| Supabase client nullable perlu pola yang lebih tegas | Valid sebagai maintainability/UX improvement | P2/P3 |
| Error boundary lokal untuk komponen AI belum ada | Valid improvement | P3 |

### Temuan Kiro yang dikoreksi atau diturunkan

| Temuan Kiro | Hasil validasi merge | Keputusan |
| --- | --- | --- |
| ai_credit_topups tidak ada di schema/migration | Tidak akurat untuk state sekarang. File supabase/migrations/20260531112800_ai_credit_topups.sql ada dan Supabase dry-run up to date. | Ganti menjadi: root SQL/migrations membingungkan, plus topup punya bug security client-controlled package |
| Topup Kredit AI broken karena DB table/webhook/UI tidak ada | Tidak akurat untuk state sekarang. UI, endpoint, migration, dan webhook branch ada. | Ganti menjadi: fitur ada tetapi perlu hardening price validation dan idempotency |
| GEMINI_API_KEY ada di backend Env dan .env.example | Tidak akurat untuk backend/index.ts dan .env.example saat ini. Namun ARCHITECTURE.md masih menandai deprecated dan Cloudflare secret GEMINI_API_KEY masih ada. | Ganti menjadi cleanup secret/dokumen legacy |
| mobile-app/dist committed | Tidak terlihat tracked oleh git; status menunjukkan ignored. | Tidak masuk sebagai masalah tracked, tetap boleh cleanup lokal |
| mobile-app/.expo/audit-export committed | Tidak terlihat tracked oleh git; .expo ignored. | Tidak masuk sebagai masalah tracked |
| scratch/ committed | Tidak terlihat tracked oleh git; scratch ignored. | Tetap boleh cleanup lokal, bukan repo tracked issue |
| tips-suami.html tidak terhubung | Tidak akurat. MessageModal membangun link ke https://siklusio.web.id/tips-suami.html. | Tidak masuk cleanup |
| affiliate route tidak punya entry point UI | Tidak akurat. Settings memiliki router.push('/affiliate'), HeaderProfileButton juga navigasi ke /affiliate. | Turunkan menjadi perlu QA UX, bukan broken route |
| cycleInsightCopy tidak dipakai | Tidak akurat. Dipakai di mobile-app/components/dashboard/CycleCard.tsx. | Tidak masuk cleanup |
| GTM Container ID tidak dikonfigurasi di +html.tsx | Tidak akurat. mobile-app/app/+html.tsx memuat GTM-PX5J3XBM. | Tetap cek analytics.setUser, bukan GTM base |

## Backlog final berdasarkan prioritas

### P0. Harus dibereskan sebelum fitur baru

#### P0-1. Hapus penyimpanan password plaintext di pending_registrations

Lokasi:

- backend/index.ts
- supabase/pending_registrations.sql

Masalah:

- Password diterima saat checkout register, disimpan ke pending_registrations, lalu dipakai webhook untuk createUser.

Risiko:

- Bocor DB, backup, service role, atau log berarti password user bocor dalam bentuk asli.

Solusi minimum:

1. Jangan simpan password di database.
2. Ganti flow menjadi invite/magic link setelah payment sukses, atau create user sebelum payment dengan status non-premium.
3. Hapus kolom password melalui migration.
4. Tambahkan test untuk memastikan insert pending registration tidak menerima/menyimpan password.

Status remediation:

- Selesai lokal pada 2026-06-01 dengan strategi create Auth user sebelum payment dan tandai `pending_payment`.
- `pending_registrations` sekarang menyimpan `user_id`, bukan password; webhook mengaktifkan Auth user yang sama lewat `updateUserById`.
- Mobile menambahkan gate `payment-pending` agar user checkout yang belum dibayar tidak masuk dashboard.
- Migrasi `20260601100443_pending_registration_auth_user_id.sql` menghapus kolom password dan menghapus pending row lama yang tidak punya `user_id`.
- Belum deploy/commit. `npm run check`, `npx supabase db push --dry-run`, dan Wrangler dry-run sudah PASS.

#### P0-2. Server-side package validation untuk topup AI credit

Lokasi:

- backend/index.ts /api/checkout/topup
- mobile-app/components/common/CreditDetailModal.tsx

Masalah:

- Client mengirim packageId, price, credits.
- Backend mempercayai price dan credits.

Risiko:

- User bisa membeli credit besar dengan harga kecil memakai request manual.

Solusi minimum:

1. Client hanya kirim packageId.
2. Backend resolve price/credits dari whitelist server atau tabel server-owned.
3. Abaikan price/credits dari client.
4. Tambahkan test manipulasi payload.

#### P0-3. Require auth untuk /api/generate-calming-reassurance

Lokasi:

- backend/index.ts

Masalah:

- Endpoint AI publik memanggil OpenRouter tanpa requireUser.

Risiko:

- Abuse quota/biaya AI dan endpoint prompt publik.

Solusi minimum:

1. Tambahkan requireUser.
2. Tambahkan test 401 untuk request tanpa token.
3. Pertimbangkan debit AI credit atau rate limit per user.

#### P0-4. Webhook payment harus fail closed

Lokasi:

- backend/index.ts
- .env.example
- ARCHITECTURE.md

Masalah:

- Jika MAYAR_WEBHOOK_TOKEN kosong, kode menerima webhook tanpa validasi.
- Naming docs memakai MAYAR_WEBHOOK_SECRET, kode memakai MAYAR_WEBHOOK_TOKEN.

Catatan:

- Produksi saat audit memiliki secret MAYAR_WEBHOOK_TOKEN di Cloudflare Worker.

Solusi minimum:

1. Jika secret kosong, return 500 dan jangan proses webhook.
2. Pilih satu nama env dan konsistenkan docs, code, secret list.
3. Tambahkan test missing token dan invalid token.

## P1. High priority setelah P0

### P1-1. Perbaiki onboarding data model

Lokasi:

- supabase/schema.sql
- mobile-app/src/context/CycleContext.tsx

Masalah:

- last_period_date default CURRENT_DATE membuat user baru seolah punya HPHT valid.
- App menganggap onboarding selesai jika nickname atau last_period_date ada.

Solusi:

1. Buat last_period_date nullable.
2. Tambahkan onboarding_completed boolean default false.
3. Set true hanya setelah submit onboarding.
4. Migrasikan user lama dengan aturan eksplisit.

Status remediation:

- Selesai lokal pada 2026-06-01 lewat `mobile-app/src/lib/profileOnboarding.ts`, `mobile-app/src/context/CycleContext.tsx`, `mobile-app/app/onboarding.tsx`, `supabase/schema.sql`, dan migrasi `20260601094508_onboarding_completion_flag.sql`.
- Belum deploy/commit. `supabase db push --dry-run` sudah PASS dan hanya akan push migrasi tersebut jika dijalankan tanpa `--dry-run`.

### P1-2. Buat idempotency topup/webhook atomic

Lokasi:

- backend/index.ts
- supabase/migrations/20260601101749_atomic_ai_credit_topup_processing.sql

Masalah:

- Flow lama membaca topup `pending`, grant credit, lalu update status `paid` dari Worker.
- Retry/concurrent webhook bisa membaca `pending` bersamaan dan menggandakan grant.

Status remediation:

- Selesai lokal pada 2026-06-01.
- Worker sekarang memanggil RPC `process_paid_ai_credit_topup`.
- RPC mengklaim row dengan `UPDATE ... WHERE status = 'pending' RETURNING *`, memanggil `grant_ai_credits`, lalu mengembalikan balance dalam transaksi yang sama.
- Test baru: `backend/topupWebhook.test.ts`.
- Belum deploy/commit. `npm run check`, `npx supabase db push --dry-run`, dan Wrangler dry-run sudah PASS.

### P1-3. Cek error checkout_sessions insert

Lokasi:

- backend/index.ts payment register paid flow
- backend/checkoutRegister.test.ts

Masalah:

- checkout_sessions insert tidak dicek error sebelum return paymentUrl.

Solusi:

1. Cek error insert.
2. Jangan return paymentUrl jika session internal gagal dibuat.
3. Gunakan checkout_session id sebagai reference utama.

Status remediation:

- Selesai lokal pada 2026-06-01 untuk paid checkout error handling.
- Jika insert `checkout_sessions` gagal, backend return 500 tanpa `paymentUrl`.
- Untuk user baru yang dibuat pada request itu, backend membersihkan `pending_registrations` dan menghapus Auth user pending agar tidak ada akun menggantung.
- Test baru ditambahkan ke `backend/checkoutRegister.test.ts`.
- Belum deploy/commit. `npm run check`, `npx supabase db push --dry-run`, dan Wrangler dry-run sudah PASS.

### P1-4. Fix root lint/check dan CI

Lokasi:

- package.json
- tsconfig.json
- mobile-app/tsconfig.json

Masalah:

- npm run lint gagal karena root tsconfig masih menunjuk alias @/* ke ./frontend/src/*.

Solusi:

1. Pisahkan typecheck backend dan mobile.
2. Tambah root npm run check.
3. Masukkan test, typecheck, build web, expo-doctor, wrangler dry-run, supabase dry-run ke CI bertahap.

### P1-5. Fix GitHub Actions deploy landing

Lokasi:

- .github/workflows/deploy-landing.yml

Masalah:

- Workflow deploy ke project-name=siklusio, tetapi project itu tidak ada.

Solusi:

1. Ganti project-name ke siklusio-landing.
2. Tambah workflow atau docs untuk siklusio-v2.
3. Putuskan satu sumber deploy: GitHub Actions atau Cloudflare Git integration.

### P1-6. Rapikan Supabase migrations sebagai single source of truth

Lokasi:

- supabase/*.sql
- supabase/migrations/*

Masalah:

- Banyak SQL penting berada di root supabase, hanya sebagian masuk migrations.
- Supabase dry-run hanya memvalidasi folder migrations.

Solusi:

1. Buat baseline migration dari production schema.
2. Pindahkan root SQL menjadi migrations atau docs/reference.
3. Buat docs/DATABASE.md.
4. Generate Supabase types.

Status remediation:

- Selesai lokal Phase 27 untuk workflow dan handoff database.
- `docs/DATABASE.md` mendokumentasikan source-of-truth rule, migration status, root SQL legacy/reference status, table inventory, RPC inventory, generated types, dan command aman.
- `supabase/README.md` menjelaskan kontrak folder: `migrations/` canonical, `types/database.types.ts` generated, root SQL legacy/manual reference.
- `package.json` menambahkan `db:migrations:list`, `db:push:dry-run`, `db:types`, dan `db:lint`.
- `supabase/types/database.types.ts` dibuat dari linked remote project lewat Supabase CLI.
- Test baru `scripts/database-docs.test.js` menjaga docs/scripts/types tetap ada.
- Batasan penting: `npm run db:migrations:list` masih menunjukkan tiga migration lokal belum ada di remote, yaitu `20260601094508_onboarding_completion_flag.sql`, `20260601100443_pending_registration_auth_user_id.sql`, dan `20260601101749_atomic_ai_credit_topup_processing.sql`. Karena itu generated types adalah snapshot remote saat ini dan belum boleh dipakai untuk mengetatkan client sampai migration target sinkron.
- Belum deploy/commit. Focused database docs test, `npm run db:migrations:list`, `npm run db:push:dry-run`, `npm run db:lint`, `npm run check`, Wrangler dry-run, Supabase dry-run, dan scoped whitespace check sudah PASS.
- Sisa follow-up: baseline/squash legacy root SQL dan typed Supabase client adoption setelah schema target sinkron.

### P1-7. Validasi avatar upload

Lokasi:

- backend/index.ts /api/upload-avatar

Masalah:

- Backend menerima base64 arbitrary, menyimpan sebagai .webp dan ContentType image/webp.

Solusi:

1. Validasi magic bytes.
2. Re-encode ke WebP atau simpan sesuai MIME asli.
3. Batasi dimensi dan ukuran.
4. Pertimbangkan moderation untuk komunitas.

Status remediation:

- Validasi magic bytes selesai lokal pada 2026-06-02.
- `backend/storage/avatarImage.ts` mendeteksi WebP, PNG, dan JPEG.
- `/api/upload-avatar` menolak non-image dengan 400 sebelum konfigurasi/upload R2.
- Accepted avatar disimpan dengan extension dan `ContentType` sesuai format asli.
- Test baru: `backend/storage/avatarImage.test.ts` dan `backend/avatarUpload.test.ts`.
- Belum dikerjakan: validasi dimensi, re-encode/strip metadata, dan moderation.

## P2. Medium priority

### P2-1. Sinkronkan savings tracker ke Supabase

Lokasi:

- mobile-app/app/(tabs)/settings.tsx
- supabase/profiles target_saving/current_saving

Masalah:

- UI Simpan Tabungan hanya update local state, tidak update profiles.

Solusi:

1. Update profiles saat handleSavingsSubmit.
2. Tambahkan offline/debounce jika perlu.
3. Tambahkan test SyncManager.

Status remediation:

- Selesai lokal pada 2026-06-02 lewat `mobile-app/src/lib/savingsSync.ts`, `mobile-app/src/lib/SyncManager.ts`, dan `mobile-app/src/context/CycleContext.tsx`.
- `SavingsCard` dan Settings tetap update state lokal seperti sebelumnya, tetapi `CycleContext` sekarang menjalankan initial sync per user dan debounce sync setelah `targetSaving/currentSaving` berubah.
- `SyncManager.syncSavingsData` membaca `profiles.target_saving/current_saving/updated_at`, pull cloud jika lebih baru dari `hs_v3_savings_sync_time`, atau push local savings dengan `updated_at` baru.
- Bug falsey value diperbaiki: nilai cloud `0` untuk `target_saving` atau `current_saving` sekarang tetap dipull.
- Test baru: `mobile-app/src/lib/savingsSync.test.ts`.
- Batasan: conflict guard masih memakai `profiles.updated_at` global. Jika tabungan berkembang menjadi fitur finansial utama, tambahkan kolom `savings_updated_at` atau ledger tabungan agar konflik multi-device lebih presisi.

### P2-2. Reminder harian belum benar-benar notification

Lokasi:

- mobile-app/app/(tabs)/settings.tsx
- mobile-app/src/lib/dailyReminder.ts
- mobile-app/src/lib/expoDailyReminderNotifications.ts
- mobile-app/app/_layout.tsx

Masalah:

- Sebelum Phase 24, toggle hanya menampilkan Alert dan mengubah state memory.

Solusi:

1. Selesai lokal pada 2026-06-02.
2. `expo-notifications` ditambahkan via `npx expo install expo-notifications`.
3. `dailyReminder.ts` menambahkan helper testable untuk build copy, enable, disable, persisted preference, scheduled notification id, dan default jam 08.00.
4. `expoDailyReminderNotifications.ts` menambahkan adapter native: permission request, Android channel `daily-reminders`, daily trigger, cancel schedule, dan foreground handler.
5. `_layout.tsx` mengaktifkan notification handler sekali saat app boot.
6. Settings toggle sekarang async: enable hanya sukses jika permission/schedule berhasil, disable membatalkan schedule id yang tersimpan, dan web menampilkan fallback jujur.
7. Test baru: `mobile-app/src/lib/dailyReminder.test.ts`.
8. Belum deploy/commit. `expo install --check`, `expo-doctor@latest`, `npm run check`, Wrangler dry-run, Supabase dry-run, dan scoped whitespace check sudah PASS.
9. Batasan: local notification ini perlu diuji manual di device/emulator native setelah build karena Node/browser tidak bisa membuktikan OS benar-benar menampilkan notification.

### P2-3. Konsistensi AI credit untuk semua fitur AI

Lokasi:

- /api/generate-cycle-report
- /api/generate-habits-insight
- /api/generate-calming-reassurance
- AI feature baru lainnya

Masalah:

- Beberapa endpoint AI baru sudah memakai credit ledger, endpoint legacy belum jelas policy-nya.

Solusi:

1. Buat docs/FEATURE_MATRIX.md.
2. Tentukan cost, auth, persistence, rate limit setiap fitur AI.
3. Route semua AI cost-bearing lewat helper yang sama.

Status remediation:

- Selesai lokal pada 2026-06-02 untuk dokumentasi source-of-truth dan runtime model policy.
- `docs/FEATURE_MATRIX.md` sekarang mencatat fitur AI cost-bearing, fitur legacy/free-for-now, route, UI caller, auth, credit cost, persistence table, ledger `feature/reason/reference_id`, rate limit group, dan status policy.
- `backend/ai/modelPolicy.ts` menambahkan helper `resolveOpenRouterModels` dengan policy eksplisit `paid` dan `free_included`.
- Endpoint legacy/free-for-now `generate-cycle-report`, `generate-habits-insight`, dan `generate-calming-reassurance` sekarang auth + rate-limit + free model only, tanpa fallback OpenRouter berbayar.
- Fitur cost-bearing `generate-recipes`, `habit-coach/generate`, dan `cycle-guide/generate` tetap memakai policy `paid` sehingga boleh memakai fallback berbayar setelah fallback gratis.
- Belum deploy/commit. Focused model policy test, `npm run check`, Wrangler dry-run, Supabase dry-run, dan scoped whitespace check sudah PASS.
- Sisa keputusan produk: jika endpoint legacy mau dibuat berbayar nanti, tambahkan persistence, cost label UI, ledger reference, dan handling 402 sebelum mengubah policy menjadi `paid`.

### P2-4. Analytics strategy

Lokasi:

- mobile-app/src/lib/analytics.ts
- mobile-app/app/+html.tsx
- mobile-app/src/context/AuthContext.tsx

Masalah:

- GTM base sudah terpasang di +html.tsx.
- Firebase package tidak terinstall, fallback selalu aktif.
- analytics.setUser tidak terlihat dipanggil setelah login.

Solusi:

1. Putuskan: GTM web-only atau Firebase native juga.
2. Jika Firebase tidak dipakai, hapus require native Firebase.
3. Jika Firebase dipakai, install dan pakai dev client/native build.
4. Panggil analytics.setUser saat login/logout.

Status remediation:

- Selesai lokal pada 2026-06-02 untuk wiring identity auth.
- `mobile-app/src/lib/analyticsIdentity.ts` membangun property aman: `access_status`, `auth_provider`, dan `is_payment_pending`.
- Helper tidak memasukkan email, nama, WhatsApp, atau property PII lain ke analytics properties.
- `mobile-app/src/context/AuthContext.tsx` sekarang memanggil `analytics.setUser(user?.id ?? null, properties)` saat auth user berubah, termasuk saat logout.
- Test baru: `mobile-app/src/lib/analyticsIdentity.test.ts`.
- Belum deploy/commit. `npm run check`, `npx supabase db push --dry-run`, Wrangler dry-run, dan scoped whitespace check sudah PASS.
- Selesai lokal Phase 26 untuk keputusan strategi: Siklusio memakai GTM/dataLayer web-only untuk saat ini.
- `mobile-app/src/lib/analytics.ts` tidak lagi melakukan dynamic require `@react-native-firebase/analytics`, sehingga native build tidak membawa dependency bayangan atau fallback log yang menyesatkan.
- Native analytics sekarang safe no-op; public method `analytics.logEvent`, `analytics.logScreenView`, dan `analytics.setUser` tetap aman dipanggil dari semua platform.
- Test baru: `mobile-app/src/lib/analytics.test.ts`.
- Belum deploy/commit. Focused analytics test, scan Firebase require, `npm run check`, Wrangler dry-run, Supabase dry-run, dan scoped whitespace check sudah PASS.
- Sisa follow-up: jika native analytics dibutuhkan nanti, buat fase terpisah untuk Firebase native/dev-client, consent/privacy copy, dan test manual di device.

### P2-5. Date key harian stale setelah midnight

Lokasi:

- mobile-app/app/(tabs)/habits.tsx
- mobile-app/app/(tabs)/calendar.tsx
- mobile-app/app/(tabs)/dashboard.tsx
- mobile-app/components/dashboard/ActionCard.tsx

Solusi:

1. Buat hook useTodayKey.
2. Update saat midnight dan app focus.
3. Pakai hook di semua fitur harian.

Status remediation:

- Selesai lokal pada 2026-06-02 untuk layar harian utama.
- Helper `mobile-app/src/lib/todayKey.ts` membuat local date key tanpa UTC shift dan menghitung delay ke local midnight.
- Hook `mobile-app/src/hooks/useTodayKey.ts` refresh saat next local day dan saat `AppState` kembali `active`.
- `dashboard.tsx`, `habits.tsx`, `calendar.tsx`, dan `ActionCard.tsx` memakai today key dinamis untuk tanggal/fase/progress/payload harian.
- Test baru: `mobile-app/src/lib/todayKey.test.ts`.
- Belum deploy/commit. `npm run check`, `npx supabase db push --dry-run`, Wrangler dry-run, dan scoped whitespace check sudah PASS.

### P2-6. CORS allowlist dan basic rate limit

Lokasi:

- backend/index.ts
- backend/rateLimit.ts
- .env.example

Solusi:

1. Batasi origin production.
2. Allow localhost untuk dev.
3. Tambah rate limit untuk endpoint publik/AI/checkout.

Status remediation:

- CORS allowlist selesai lokal pada 2026-06-01.
- `backend/index.ts` memakai default allowlist domain Siklusio plus localhost dev dan `ALLOWED_ORIGINS`.
- Test baru: `backend/cors.test.ts`.
- Basic rate limit selesai lokal pada 2026-06-02.
- `backend/rateLimit.ts` menambahkan fixed-window in-memory limiter untuk endpoint AI, checkout, dan payment webhook.
- Env override terdokumentasi di `.env.example`: `AI_RATE_LIMIT_MAX`, `AI_RATE_LIMIT_WINDOW_SECONDS`, `CHECKOUT_RATE_LIMIT_MAX`, `CHECKOUT_RATE_LIMIT_WINDOW_SECONDS`, `WEBHOOK_RATE_LIMIT_MAX`, dan `WEBHOOK_RATE_LIMIT_WINDOW_SECONDS`.
- Test baru/diupdate: `backend/rateLimit.test.ts` dan `backend/securityRoutes.test.ts`.
- Belum deploy/commit. `npm run check`, `npx supabase db push --dry-run`, dan Wrangler dry-run sudah PASS.
- Catatan limitation: limiter in-memory hanya guardrail dasar per Worker isolate. Untuk enforcement global production, pertimbangkan Cloudflare WAF Rate Limiting Rules, Durable Objects, atau KV-backed counters.

### P2-7. Redaksi logs PII/payment

Lokasi:

- backend/index.ts
- backend/logging/redaction.ts

Solusi:

1. Buat logger helper.
2. Redact email, phone, token, payment URL, webhook raw body.
3. Gunakan event id/correlation id.

Status remediation:

- Selesai lokal pada 2026-06-02 untuk redaksi dasar.
- Helper `backend/logging/redaction.ts` meredaksi email, nomor telepon/WhatsApp, token/secret/password/API key, URL/link/avatar, bank/account, user id, dan transaction id pada nested payload.
- Webhook Mayar sekarang log raw body hanya sebagai `byteLength` dan body hanya sebagai summary event/boolean, bukan payload mentah.
- Checkout Mayar sekarang log status response ringkas, bukan payment URL, response body penuh, atau transaction id.
- Upload avatar tidak lagi mencetak URL publik avatar.
- Test baru/diupdate: `backend/logging/redaction.test.ts`, `backend/securityRoutes.test.ts`, dan `backend/checkoutRegister.test.ts`.
- Belum deploy/commit. `npm run check`, `npx supabase db push --dry-run`, Wrangler dry-run, dan scoped whitespace check sudah PASS.
- Sisa improvement jangka panjang: structured logger dengan request id/correlation id dan log level per environment.

### P2-8. Mobile API base URL production guardrail

Lokasi:

- mobile-app/src/lib/api.ts
- mobile-app/src/lib/apiBaseUrl.ts
- .env.example

Masalah:

- Sebelum remediation, `getApiBaseUrl()` fallback ke `http://localhost:3000` jika `EXPO_PUBLIC_API_BASE_URL` kosong.
- Pada production build, env kosong bisa membuat fitur backend gagal diam-diam karena app mencoba memanggil localhost user/device.

Solusi:

1. Extract resolver pure untuk API base URL.
2. Production-like build wajib punya `EXPO_PUBLIC_API_BASE_URL` absolute URL yang valid.
3. Fallback Expo debugger host atau localhost hanya boleh saat development.
4. Dokumentasikan env mobile/web client di `.env.example`.

Status remediation:

- Selesai lokal pada 2026-06-02.
- `mobile-app/src/lib/apiBaseUrl.ts` menambahkan `resolveApiBaseUrl`.
- `mobile-app/src/lib/api.ts` memakai resolver baru.
- Test baru: `mobile-app/src/lib/apiBaseUrl.test.ts`.
- Belum deploy/commit. `npm run check`, `npx supabase db push --dry-run`, Wrangler dry-run, dan scoped whitespace check sudah PASS.

### P2-9. Mobile dependency maintenance

Masalah:

- npm audit mobile masih memiliki 14 moderate vulnerabilities.
- expo-doctor sebelumnya menunjukkan patch version mismatch untuk `expo`, `expo-font`, dan `expo-router`.

Solusi:

1. Selesai lokal pada 2026-06-02 untuk patch mismatch SDK 54.
2. `npx expo install --fix` menaikkan `expo` ke `~54.0.35`, `expo-font` ke `~14.0.12`, dan `expo-router` ke `~6.0.24`.
3. Expo CLI menambahkan plugin `expo-font` ke `mobile-app/app.json`, dan `expo-doctor@latest` menerima konfigurasi ini dengan 18/18 checks PASS.
4. `expo-constants`, `expo-av`, dan `expo-font` masih dipakai source aktif sehingga tidak dihapus pada fase ini.
5. `npm audit --omit=dev` mobile masih FAIL 14 moderate; fix otomatis meminta `npm audit fix --force` yang akan menginstal `expo@56.0.8`, jadi harus masuk upgrade lane terpisah.
6. Belum deploy/commit. `npm run check`, Wrangler dry-run, Supabase dry-run, `expo install --check`, `expo-doctor@latest`, dan scoped whitespace check sudah PASS.

### P2-10. Sync race dan nullable Supabase pattern

Lokasi:

- mobile-app/src/context/CycleContext.tsx
- mobile-app/src/lib/SyncManager.ts
- mobile-app/src/lib/supabase.ts
- mobile-app/src/lib/api.ts
- mobile-app/src/context/AuthContext.tsx
- mobile-app/app/auth.tsx
- mobile-app/app/payment-pending.tsx

Masalah:

- Profile sync dan activity sync bisa saling race pada login awal.
- Supabase client nullable perlu pola akses yang lebih jelas.

Status remediation:

- Selesai lokal bertahap pada 2026-06-02 untuk sync/profile layer, auth/API entry points utama, dan UI/hooks mobile.
- `mobile-app/src/lib/supabaseAccess.ts` menambahkan status helper untuk nullable Supabase client, helper `getSupabaseAccessToken`, dan helper authenticated-client status `getAuthenticatedSupabaseClientStatus`, sehingga sync/API/UI code bisa mengembalikan `skipped`, `null`, atau pesan auth/config konsisten, bukan banyak variasi raw `if (!supabase)`.
- `mobile-app/src/lib/syncGuards.ts` menambahkan `canSyncCycleProfile`, dan `CycleContext` sekarang menahan auto-push profile sampai user ada, cloud profile tidak loading, HPHT ada, serta panjang siklus/haid valid.
- `SyncManager.syncProfileData`, `syncActivityHistory`, dan `syncSavingsData` memakai helper Supabase access yang sama.
- `mobile-app/src/lib/api.ts` sekarang memakai `getSupabaseAccessToken`; `AuthContext`, `auth.tsx`, dan `payment-pending.tsx` memakai `getSupabaseClientStatus` sambil menjaga pesan error user-facing yang sudah ada.
- Admin screen, onboarding, settings profile update, avatar hook, community feed, dan `HeaderProfileButton` sekarang memakai `getSupabaseClientStatus` atau `getAuthenticatedSupabaseClientStatus`.
- Pencarian `rg` untuk direct `supabase.auth/from/rpc/storage` di `mobile-app` sudah tidak menemukan match; import `supabase` masih ada sebagai input client nullable untuk helper.
- Test baru: `mobile-app/src/lib/supabaseAccess.test.ts` dan `mobile-app/src/lib/syncGuards.test.ts`.
- Scope tersisa: nullable Supabase access mobile sudah tertutup untuk direct method calls, tetapi profile/activity/savings sync masih memakai timestamp terpisah sederhana, belum model queue/transaction sync penuh. Masih perlu audit RLS/policy dan test integrasi Supabase aktual sebelum deploy production.

Solusi:

1. Serialisasi sync awal: profile dulu, lalu activity.
2. Buat getSupabaseOrThrow untuk area yang wajib configured.
3. Untuk UI, tampilkan state "Supabase belum terkonfigurasi" secara konsisten.

## P3. Cleanup dan maintainability

### P3-1. Hapus atau arsipkan legacy files

Kandidat:

- restore.cjs
- restore2.cjs
- test-api.js
- backend/index_restored.ts
- metadata.json
- siklusio_documentation.html
- Cloudflare secret GEMINI_API_KEY setelah yakin tidak dipakai

Catatan:

- Selesai lokal pada 2026-06-02 untuk file tracked legacy/recovery/debug.
- `restore.cjs` dan `restore2.cjs` dihapus karena hanya script recovery lokal dengan hardcoded path AI IDE ke `C:/Users/bimap/...`.
- `test-api.js` dihapus karena hanya manual local HTTP script untuk endpoint lama dan sudah superseded oleh backend test suite.
- `backend/index_restored.ts` dihapus karena file kosong sisa restore.
- `metadata.json` dihapus karena metadata AI Studio/Gemini lama dan tidak direferensikan runtime saat ini.
- `siklusio_documentation.html` dihapus karena generated/stale HTML documentation root yang tidak direferensikan source/config aktif dan sudah digantikan laporan/docs markdown.
- `.gitignore` menambahkan pola sempit untuk mencegah artefak recovery/debug ini masuk lagi.
- Cloudflare secret `GEMINI_API_KEY` tidak disentuh di Phase 20 karena itu external deployment state; audit secret dilakukan terpisah sebelum perubahan Cloudflare.
- dist, mobile-app/dist, mobile-app/.expo, scratch terlihat ignored, bukan tracked.
- Belum deploy/commit. `npm run check`, Wrangler dry-run, Supabase dry-run, scoped whitespace check, dan scan referensi legacy sudah PASS.

### P3-2. Rapikan graphify-out

Catatan:

- Superseded pada 2026-06-02 setelah user mengklarifikasi `graphify-out/` adalah folder penting.
- Jangan hapus, move, re-ignore, atau regenerate isi `graphify-out/` dalam audit cycle ini tanpa approval eksplisit.
- Jika perlu audit terpisah, perlakukan `graphify-out/` sebagai artefak dokumentasi/visualisasi penting dan validasi owner-nya lebih dulu.

- Belum deploy/commit. Phase lanjutan mengecualikan `graphify-out/` dari cleanup dan verification gate.

### P3-3. Hapus Expo template route/komponen

Kandidat:

- mobile-app/app/modal.tsx
- mobile-app/components/EditScreenInfo.tsx
- mobile-app/components/StyledText.tsx
- mobile-app/components/Themed.tsx jika hanya modal yang memakai
- mobile-app/components/ExternalLink.tsx jika hanya EditScreenInfo yang memakai
- mobile-app/components/useClientOnlyValue.*
- mobile-app/components/__tests__/StyledText-test.js

Catatan:

- Selesai lokal pada 2026-06-02.
- `mobile-app/app/+not-found.tsx` sudah tidak bergantung pada `components/Themed`.
- `mobile-app/app/_layout.tsx` tidak lagi mendaftarkan placeholder route `/modal`.
- File template di atas sudah dihapus lokal, dan `react-test-renderer` dihapus dari `mobile-app/package.json` serta lockfile karena hanya dipakai oleh test template.
- Pencarian aktif `Themed|EditScreenInfo|StyledText|ExternalLink|useClientOnlyValue|react-test-renderer` di `mobile-app` sudah tidak menemukan match setelah mengecualikan `graphify-out` dan lockfile.
- `useColorScheme.*` tidak ikut dihapus karena masih bisa dipakai ulang oleh komponen lain dan bukan bagian dari rantai placeholder yang terbukti orphan.
- Belum deploy/commit. `npm run check`, Wrangler dry-run, Supabase dry-run, scoped whitespace check, dan pencarian referensi template aktif sudah PASS.

### P3-4. Cleanup TWW audio asset

Temuan:

- Selesai lokal/manual pada 2026-06-02.
- User menghapus manual `mobile-app/assets/sounds/tww_meditation.mp3`, dan perubahan itu dipertahankan.
- Mapping TWW aktif memakai `tww_acoustic_nature.mp3`, `tww_deep_healing.mp3`, `tww_lofi_chill.mp3`, dan `tww_cinematic_lullaby.mp3`.
- `mobile-app/src/lib/twwSanctuaryResult.test.ts` sudah memvalidasi empat core mood ambiances.

- Belum deploy/commit. `npm run check`, Wrangler dry-run, Supabase dry-run, scoped whitespace check, scan referensi aktif, dan path absence check sudah PASS.

### P3-5. Naming cleanup

Kandidat:

- generateMockHistory -> createEmptyActivityHistory. Selesai lokal pada 2026-06-02 di Phase 22.
- activity_history_sync_hardening.sql -> migration/nama fitur yang konsisten.
- community_verify.sql -> supabase/diagnostics.
- Colors.ts update ke brand Siklusio.

Catatan:

- `mobile-app/src/context/CycleContext.tsx` sekarang memakai `createEmptyActivityHistory` untuk initial fallback `{}` agar tidak terdengar seperti runtime mock data.
- Pencarian `generateMockHistory` di source aktif sudah tidak menemukan match.
- Belum deploy/commit. `npm run check`, Wrangler dry-run, Supabase dry-run, dan scoped whitespace check yang mengecualikan `fitur.md` serta `graphify-out` sudah PASS.

### P3-6. Error boundary lokal

Area:

- TwwSanctuaryModal
- CycleGuide modal/card
- HabitCoachSheet
- Recipe card/generator

Solusi:

- Tambahkan local error boundary atau fallback UI agar error fitur AI tidak merusak seluruh app.

## File/area yang jangan dianggap broken berdasarkan merge

Bagian ini penting agar developer berikutnya tidak membuang waktu memperbaiki hal yang ternyata sudah ada.

1. ai_credit_topups: migration ada di supabase/migrations/20260531112800_ai_credit_topups.sql.
2. Topup UI: ada di mobile-app/components/common/CreditDetailModal.tsx.
3. Topup webhook branch: ada di backend/index.ts.
4. Affiliate user route: ada mobile-app/app/affiliate.tsx dan entry point dari settings/header profile.
5. tips-suami.html: dipakai oleh MessageModal via URL.
6. cycleInsightCopy.ts: dipakai oleh CycleCard.
7. GTM web app: GTM-PX5J3XBM ada di mobile-app/app/+html.tsx.
8. mobile-app/dist, mobile-app/.expo, scratch: terlihat ignored, bukan tracked.

## Rekomendasi struktur jangka panjang

Target refactor backend:

```text
backend/
  index.ts
  middleware/
    auth.ts
    cors.ts
    rateLimit.ts
  routes/
    ai.ts
    aiCredits.ts
    recipes.ts
    habitCoach.ts
    cycleGuide.ts
    checkout.ts
    webhooks.ts
    affiliates.ts
    admin.ts
    avatars.ts
  services/
    openRouter.ts
    aiCreditLedger.ts
    mayar.ts
    paymentSessions.ts
    supabaseAdmin.ts
    logger.ts
  schemas/
  tests/
```

Target docs:

```text
docs/
  ARCHITECTURE.md
  DEPLOYMENT.md
  DATABASE.md
  FEATURE_MATRIX.md
  RUNBOOK.md
  DECISIONS/
```

Target scripts:

```json
{
  "scripts": {
    "typecheck:backend": "...",
    "typecheck:mobile": "npm --prefix mobile-app run typecheck",
    "test": "...",
    "build:mobile-web": "npm --prefix mobile-app run build:web",
    "check": "npm run typecheck:backend && npm run typecheck:mobile && npm test"
  }
}
```

## Rencana eksekusi praktis

### Paket 1 hari

1. Remove plaintext password flow.
2. Server-side validate topup package.
3. Require auth untuk TWW reassurance.
4. Fail closed webhook jika secret kosong.
5. Fix npm run lint/check agar tidak gagal karena tsconfig lama.

### Paket 1 minggu

1. Semua item paket 1 hari.
2. Tambah migration onboarding_completed dan nullable last_period_date.
3. Fix GitHub Actions project-name.
4. Buat webhook/topup idempotency RPC.
5. Cek checkout_sessions insert error.
6. Sync savings tracker.
7. Tulis docs/FEATURE_MATRIX.md dan docs/DATABASE.md.

### Paket 1 bulan

1. Modularisasi backend.
2. Baseline Supabase migrations.
3. Bersihkan legacy tracked files.
4. Rapikan analytics strategy.
5. Tambah local error boundaries.
6. Setup CI lengkap dan required checks.
7. Redaksi logs dan observability.

## Definisi selesai untuk audit remediation

Remediation dianggap selesai jika:

1. npm run check tersedia dan pass.
2. Semua P0 punya test atau verifikasi manual tertulis.
3. Semua payment/webhook flow idempotent dan tidak menyimpan password plaintext.
4. Semua env wajib terdokumentasi di .env.example atau docs/DEPLOYMENT.md.
5. Supabase production schema punya migration baseline.
6. Workflow deploy tidak menunjuk project yang tidak ada.
7. README menjelaskan cara manusia menjalankan, mengetes, dan deploy project.

## Catatan akhir

Merge ini menempatkan laporan Kiro dan Codex sebagai dua lensa yang saling melengkapi. Kiro kuat menemukan cleanup, placeholder, dan area maintainability. Codex menambahkan validasi deploy, security payment/auth, dan beberapa koreksi terhadap state terbaru repo. Backlog final di atas adalah versi yang sudah direkonsiliasi agar tim manusia tidak mengejar temuan stale.
