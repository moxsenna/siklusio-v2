# CODEX_AUDIT_REPORT.md

Audit independen Codex untuk Siklusio

Tanggal audit: 2026-06-01
Workspace: D:\Coding\remix\_-siklusio
Branch saat audit: codex/resep-hari-ini-impl
Commit HEAD: e08f4b2ef1b9ce2b49dad64ed04a209ad71d684d
Commit message: feat: add saved today recipes flow

Catatan penting: laporan ini sengaja dibuat terpisah dari AUDIT_REPORT.md agar bisa dibandingkan dengan audit lain.

## Ringkasan eksekutif

Kode Siklusio sudah punya fondasi produk yang cukup luas: backend Hono di Cloudflare Workers, aplikasi Expo Router, Supabase Auth/DB, Cloudflare Pages untuk landing/app web, sistem AI credit, checkout Mayar, komunitas, admin, avatar R2, dan beberapa test unit domain.

Namun area yang paling perlu diamankan sebelum pengembangan panjang adalah payment/auth, schema data, CI/CD, dan maintainability. Temuan paling berat:

1. Password user disimpan plaintext di tabel pending_registrations selama pembayaran pending.
2. Endpoint topup AI credit mempercayai price dan credits dari client.
3. Endpoint TWW reassurance bisa memanggil OpenRouter tanpa autentikasi.
4. User baru bisa dianggap sudah onboarding karena last_period_date default CURRENT_DATE.
5. Root lint/typecheck gagal karena konfigurasi tsconfig root masih menunjuk ke frontend lama.
6. Workflow GitHub deploy landing memakai project Cloudflare Pages yang tidak ada.
7. Banyak SQL produksi berada di root supabase/\*.sql, bukan migrations, sehingga histori schema sulit dilacak manusia.
8. Backend utama sudah terlalu besar dan bercampur domain, sehingga biaya onboarding developer manusia akan makin mahal.

## Status deploy dan fitur yang belum deploy

### Sudah deploy

- Cloudflare Pages project siklusio-landing sudah memiliki Production deployment dari source e08f4b2.
- Cloudflare Pages project siklusio-v2 sudah memiliki Production deployment dari source e08f4b2.
- Cloudflare Worker siklusio-backend memiliki deployment terbaru pada 2026-06-01T04:37:51Z.
- Supabase CLI dry-run menyatakan remote database up to date terhadap folder supabase/migrations.
- Smoke test live berhasil:
  - https://api.siklusio.web.id/ mengembalikan 200.
  - https://siklusio.web.id/ mengembalikan 200.
  - https://app.siklusio.web.id/ mengembalikan 200.

### Belum deploy / belum masuk commit

- landing/index.html punya perubahan lokal belum commit.
- landing/checkout.html punya perubahan lokal belum commit.
- landing/landing2.html punya perubahan lokal belum commit.
- landing/SIKLUSIO_PRODUCT_SPEC.md masih untracked.
- AUDIT_REPORT.md masih untracked dan bukan bagian laporan ini.

Kesimpulan: fitur di commit HEAD e08f4b2 tampak sudah masuk production Pages. Perubahan landing lokal yang sedang ada di working tree belum deploy karena belum commit.

### Deploy pipeline yang membingungkan

File .github/workflows/deploy-landing.yml deploy ke project-name=siklusio, tetapi Cloudflare Pages project yang ada adalah:

- siklusio-landing
- siklusio-v2

Artinya workflow repo ini stale/broken walaupun Cloudflare Git integration tampaknya tetap melakukan deploy production ke project yang benar.

## Hasil verifikasi teknis

| Pemeriksaan                                            | Status | Catatan                                                                                                          |
| ------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------- |
| npm run lint di root                                   | FAIL   | tsc --noEmit gagal karena root tsconfig masih mengarah alias @/_ ke ./frontend/src/_ dan ikut compile mobile-app |
| npx tsc --noEmit di mobile-app                         | PASS   | Typecheck mobile lewat tsconfig mobile berhasil                                                                  |
| Unit tests manual                                      | PASS   | 67 test lulus dari backend dan mobile-app                                                                        |
| npx wrangler deploy --dry-run                          | PASS   | Bundle Worker sukses, upload estimate 1489.86 KiB raw / 293.69 KiB gzip                                          |
| npx wrangler whoami                                    | PASS   | Login Cloudflare akun moxsenna@gmail.com                                                                         |
| wrangler secret list                                   | PASS   | MAYAR_WEBHOOK_TOKEN, MAYAR_API_KEY, OPENROUTER_API_KEY, Supabase, dan R2 secrets ada di Worker                   |
| wrangler pages deployment list                         | PASS   | siklusio-landing dan siklusio-v2 punya production deployment source e08f4b2                                      |
| wrangler pages deployment list --project-name siklusio | FAIL   | Project tidak ada, mengonfirmasi workflow lama salah target                                                      |
| npm audit --omit=dev root                              | PASS   | 0 vulnerabilities                                                                                                |
| npm audit --omit=dev mobile-app                        | FAIL   | 14 moderate vulnerabilities transitive dari Expo/Metro stack                                                     |
| npx expo-doctor                                        | FAIL   | 1/18 check gagal karena versi expo, expo-font, expo-router sedikit tidak sesuai SDK 54                           |
| npm run build:web mobile-app                           | PASS   | Expo web export berhasil                                                                                         |
| npx supabase db push --dry-run                         | PASS   | Remote DB dianggap up to date terhadap folder migrations                                                         |

## Temuan critical

### C1. Password pendaftaran disimpan plaintext selama pembayaran pending

Lokasi:

- backend/index.ts:1499 menerima password dari request checkout.
- backend/index.ts:1659-1668 menyimpan password ke pending_registrations.
- backend/index.ts:1888-1891 memakai pending.password untuk membuat Supabase Auth user.
- supabase/pending_registrations.sql:6-14 mendefinisikan kolom password TEXT NOT NULL.

Dampak:

- Jika database/service role/log/backup bocor, password user bocor dalam bentuk asli.
- Ini berisiko tinggi untuk keamanan dan kepercayaan user, apalagi produk menyimpan data sensitif terkait kesehatan dan promil.
- Pola ini juga membuat compliance jangka panjang lebih berat.

Saran fix:

1. Jangan simpan password di pending_registrations.
2. Buat checkout_session dengan token opaque/signed, bukan password.
3. Setelah pembayaran sukses, buat flow "set password" via Supabase magic link/invite atau create user sebelum pembayaran dengan status non-premium lalu aktifkan premium setelah webhook.
4. Hapus kolom password dari pending_registrations setelah migrasi aman.
5. Rotasi password user jika pernah ada data produksi yang tersimpan lama dalam bentuk plaintext.

### C2. Topup AI credit mempercayai price dan credits dari client

Lokasi:

- mobile-app/components/common/CreditDetailModal.tsx:14-19 mendefinisikan paket di client.
- mobile-app/components/common/CreditDetailModal.tsx:52-56 mengirim packageId, price, credits ke backend.
- backend/index.ts:562 menerima packageId, price, credits dari body.
- backend/index.ts:574 memakai price sebagai finalAmount.
- backend/index.ts:617-626 menyimpan credits_amount dari request client.

Dampak:

- User yang sudah login bisa memanggil API langsung dan meminta credits besar dengan price kecil.
- Webhook akan meng-grant credits sesuai record topup yang berasal dari input client.
- Ini langsung berdampak ke revenue dan biaya AI.

Saran fix:

1. Pindahkan katalog paket ke backend atau tabel database server-owned.
2. Client hanya boleh mengirim packageId.
3. Backend resolve price dan credits dari whitelist server.
4. Simpan snapshot package_name, amount_rp, credits_amount dari server.
5. Tambahkan test bahwa manipulasi price/credits dari client ditolak.

## Temuan high

### H1. Endpoint TWW reassurance tidak memerlukan login tetapi memanggil OpenRouter

Lokasi:

- backend/index.ts:473-521.

Fakta:

- Endpoint /api/generate-calming-reassurance langsung membaca body dan memanggil callOpenRouterJson.
- Tidak ada requireUser(c).
- Model memakai free model sebagai primary, tetapi fallbackModels menyertakan OPENROUTER_PAID_MODEL.

Dampak:

- Endpoint AI publik bisa diabuse untuk konsumsi quota/biaya.
- Bisa dipakai sebagai prompt endpoint publik tanpa kontrol user/rate limit.

Saran fix:

1. Tambahkan requireUser(c).
2. Gunakan sistem AI credit yang sama dengan fitur AI lain.
3. Tambahkan rate limit per user dan per IP.
4. Tambahkan test unauthorized request harus 401.

### H2. User baru bisa dianggap onboarding selesai karena last_period_date default CURRENT_DATE

Lokasi:

- supabase/schema.sql:11 membuat last_period_date DATE NOT NULL DEFAULT CURRENT_DATE.
- supabase/schema.sql:43-58 trigger handle_new_user tidak mengisi HPHT nyata.
- mobile-app/src/context/CycleContext.tsx:205 memakai cloudProfile.nickname || cloudProfile.last_period_date sebagai tanda onboarding selesai.
- mobile-app/src/context/CycleContext.tsx:226 setIsOnboardingCompleted(true).

Dampak:

- User baru bisa melewati onboarding hanya karena DB otomatis memberi HPHT hari ini.
- Prediksi siklus, masa subur, dan copy kesehatan menjadi tidak akurat.
- Ini sensitif karena produk terkait kesehatan/reproduksi.

Saran fix:

1. Ubah last_period_date menjadi nullable.
2. Tambahkan kolom eksplisit onboarding_completed boolean default false.
3. Set onboarding_completed true hanya setelah user submit onboarding.
4. Migrasikan user lama dengan aturan jelas, jangan otomatis berdasarkan last_period_date.
5. Update app agar null HPHT diarahkan ke onboarding.

### H3. Webhook payment fail-open jika secret tidak ada di env

Lokasi:

- backend/index.ts:1733-1739.
- .env.example tidak mendokumentasikan MAYAR_WEBHOOK_TOKEN.

Fakta produksi saat audit:

- wrangler secret list menunjukkan MAYAR_WEBHOOK_TOKEN sudah ada di Worker.

Dampak:

- Produksi saat ini punya secret, tetapi code behavior tetap berbahaya untuk environment baru/staging: jika secret lupa dipasang, webhook tetap diterima.
- Onboarding developer manusia bisa salah deploy environment baru yang payment webhook-nya terbuka.

Saran fix:

1. Fail closed: jika MAYAR_WEBHOOK_TOKEN kosong, return 500 dan jangan proses webhook.
2. Dokumentasikan secret di .env.example dan docs/DEPLOYMENT.md.
3. Tambahkan deploy check yang memverifikasi secret wajib ada.
4. Tambahkan test untuk missing token dan invalid token.

### H4. Topup idempotency tidak atomic, berpotensi double grant pada retry/race

Lokasi:

- backend/index.ts:1818-1822 cek topup.status.
- backend/index.ts:1826-1834 grant_ai_credits.
- backend/index.ts:1841-1845 update status paid.

Dampak:

- Jika grant berhasil tetapi update status gagal, webhook retry bisa grant lagi.
- Jika dua webhook masuk bersamaan saat status masih pending, keduanya bisa grant.

Saran fix:

1. Buat RPC transaksi tunggal process_paid_topup(mayar_transaction_id).
2. Di dalam transaksi, lock row topup FOR UPDATE.
3. Update status menjadi processing/paid atomik.
4. Tambahkan unique idempotency key di ai_credit_ledger berdasarkan reference_id + feature.

### H5. Payment registration mengembalikan paymentUrl walau checkout_session insert tidak dicek

Lokasi:

- backend/index.ts:1706-1719 insert checkout_sessions.
- backend/index.ts:1721-1722 tetap return paymentUrl tanpa cek error.

Dampak:

- Jika checkout_sessions insert gagal, user tetap bisa bayar.
- Webhook mungkin masih membuat user dari pending_registrations, tetapi idempotency, affiliate conversion, dan reference initial credit bisa hilang/rusak.

Saran fix:

1. Cek error insert checkout_sessions.
2. Jika gagal, jangan return paymentUrl.
3. Pertimbangkan urutan: buat session internal dulu, lalu Mayar, lalu update session dengan mayar link/id.
4. Gunakan session id sebagai reference utama, jangan email sebagai lookup utama.

### H6. Root lint/typecheck gagal, jadi CI dasar belum bisa dipercaya

Lokasi:

- package.json:11 npm run lint menjalankan tsc --noEmit.
- tsconfig.json:18-21 alias @/_ masih menunjuk ./frontend/src/_.
- mobile-app/tsconfig.json:5-9 alias mobile yang benar adalah ./\*.

Dampak:

- Root npm run lint gagal walaupun mobile typecheck sendiri pass.
- Developer baru akan mengira repo broken.
- CI yang memakai npm run lint akan menolak merge/deploy.

Saran fix:

1. Pisah tsconfig backend dan mobile.
2. Root script:
   - typecheck:backend
   - typecheck:mobile
   - test
   - build:web
   - check
3. Jangan compile mobile-app dari tsconfig root kecuali project references sudah benar.
4. Hapus alias frontend lama.

### H7. GitHub Actions deploy landing menarget project Cloudflare Pages yang tidak ada

Lokasi:

- .github/workflows/deploy-landing.yml:30 project-name=siklusio.

Fakta:

- wrangler pages deployment list --project-name siklusio gagal Project not found.
- Project yang benar adalah siklusio-landing dan siklusio-v2.

Dampak:

- Workflow manual/push dari GitHub akan gagal.
- Ada dua sistem deploy yang tidak sinkron: Cloudflare Git integration bekerja, workflow repo salah.

Saran fix:

1. Ganti project-name ke siklusio-landing untuk landing.
2. Tambahkan workflow terpisah untuk mobile web ke siklusio-v2 atau dokumentasikan Cloudflare Git integration sebagai satu-satunya deploy path.
3. Tambahkan status badge/check required agar deploy failure terlihat.

### H8. Supabase schema management split antara root SQL dan migrations

Lokasi:

- supabase/\*.sql berisi banyak schema/feature.
- supabase/migrations hanya berisi 6 migration AI credit/habit/cycle/recipe/topup.

Dampak:

- supabase db push --dry-run hanya memvalidasi folder migrations, bukan semua root SQL.
- Developer manusia sulit tahu file mana yang sudah pernah diaplikasikan ke production.
- Risiko environment baru tidak punya community, affiliates, coupons, pending_registrations, checkout_sessions, CRM, dan RLS hardening.

Saran fix:

1. Buat baseline migration dari production schema saat ini.
2. Pindahkan root SQL menjadi migration bernomor atau arsipkan sebagai docs/reference.
3. Tambahkan docs/DATABASE.md yang menjelaskan urutan migration dan seed.
4. Generate Supabase types untuk frontend/backend.

### H9. Avatar upload menerima arbitrary base64 tapi selalu disimpan sebagai image/webp

Lokasi:

- backend/index.ts:994-1006 decode base64.
- backend/index.ts:1014-1041 menyimpan .webp dengan ContentType image/webp tanpa validasi magic bytes/re-encode.

Dampak:

- User bisa upload konten non-image yang disajikan dari CDN dengan MIME image/webp.
- Risiko abuse storage, moderation, dan file poisoning.

Saran fix:

1. Validasi magic bytes WebP/PNG/JPEG.
2. Re-encode server-side ke WebP jika ingin memaksa .webp.
3. Batasi dimensi gambar.
4. Scan/moderasi avatar jika komunitas publik.
5. Simpan extension sesuai MIME asli jika tidak re-encode.

## Temuan medium

### M1. CORS global terlalu longgar

Lokasi:

- backend/index.ts:52-53 app.use("\*", cors()).

Dampak:

- Semua origin bisa memanggil endpoint browser, termasuk endpoint AI, checkout, dan upload.
- Auth bearer tetap diperlukan pada banyak endpoint, tetapi abuse surface tetap lebih besar.

Saran fix:

1. Batasi origin ke app.siklusio.web.id, siklusio.web.id, localhost dev.
2. Pertimbangkan CORS berbeda untuk endpoint publik vs authenticated.

### M2. AI endpoint legacy belum konsisten dengan sistem credit

Lokasi:

- backend/index.ts:352 /api/generate-cycle-report memanggil OpenRouter.
- backend/index.ts:411 /api/generate-habits-insight memanggil OpenRouter.

Dampak:

- Fitur recipe, habit coach, dan cycle guide memakai debit/persist AI credit.
- Cycle report dan habits insight lama tidak terlihat memakai credit ledger yang sama.
- Produk akan sulit dijelaskan: mana AI gratis, mana AI berbayar.

Saran fix:

1. Buat policy produk: semua AI berbayar, atau beberapa legacy free.
2. Jika berbayar, route semua AI lewat helper debitAndRecordAiFeature.
3. Jika gratis, beri rate limit dan dokumentasi feature matrix.

### M3. Savings tracker local-only walau schema punya target_saving/current_saving

Lokasi:

- mobile-app/app/(tabs)/settings.tsx:270-282 hanya set local context.
- mobile-app/app/(tabs)/settings.tsx:295-302 profile submit sync field lain, bukan saving.
- supabase/schema.sql:17-18 punya target_saving/current_saving.

Dampak:

- Nilai tabungan bisa hilang antar device/session.
- Admin CRM menampilkan field saving, tapi app user tidak selalu sync.

Saran fix:

1. Sync current_saving dan target_saving ke profiles saat handleSavingsSubmit.
2. Tambahkan debounce/offline queue jika ingin UX tetap cepat.
3. Tambahkan test SyncManager untuk savings.

### M4. Reminder harian hanya toggle UI, belum schedule notification/persist setting

Lokasi:

- mobile-app/app/(tabs)/settings.tsx:319-335 handleReminderToggle hanya Alert.
- mobile-app/app/(tabs)/settings.tsx:570-590 UI menjanjikan notifikasi fase siklus/nutrisi.

Dampak:

- Fitur terlihat aktif tetapi tidak benar-benar mengirim notifikasi.
- Tidak persist ke storage/profile.

Saran fix:

1. Implement expo-notifications untuk native.
2. Untuk web, jelaskan keterbatasan atau pakai Web Push jika disiapkan.
3. Simpan preference reminder di storage dan Supabase.
4. Jika belum siap, ubah copy menjadi "preview notifikasi" atau sembunyikan toggle.

### M5. Date key harian bisa stale jika app terbuka melewati tengah malam

Lokasi:

- mobile-app/app/(tabs)/habits.tsx:108 todayDateKey dibuat useMemo dengan dependency kosong.
- mobile-app/app/(tabs)/calendar.tsx:49 generatedForDate juga format(new Date()) saat render.
- mobile-app/app/(tabs)/dashboard.tsx:22 todayKey dihitung saat render.
- mobile-app/components/dashboard/ActionCard.tsx:16 todayKey dihitung saat render.

Dampak:

- Habit Coach/current plan dan recipe harian bisa tetap memakai tanggal kemarin sampai remount.

Saran fix:

1. Buat hook useTodayKey yang update saat midnight dan saat app focus.
2. Pakai hook yang sama di semua fitur harian.

### M6. Header credit chip bisa stale setelah generate fitur AI

Lokasi:

- mobile-app/components/common/HeaderCreditChip.tsx refresh balance saat modal close.
- Beberapa screen update local aiCreditBalance masing-masing setelah generate.

Dampak:

- User bisa melihat saldo di header berbeda dengan saldo di card fitur.

Saran fix:

1. Buat shared CreditBalanceContext.
2. Invalidasi/refetch balance setelah semua endpoint generate AI sukses.
3. Refresh on focus.

### M7. Dependency mobile punya vulnerability transitive dan versi Expo tidak pas SDK

Fakta:

- npm audit --omit=dev di mobile-app: 14 moderate vulnerabilities.
- expo-doctor: expo, expo-font, expo-router perlu disesuaikan dengan SDK 54.

Dampak:

- Risiko security transitive dari postcss/uuid via Expo stack.
- Upgrade paksa audit menyarankan expo 56, yang berpotensi breaking.

Saran fix:

1. Jalankan npx expo install --check lalu upgrade patch SDK 54 dulu.
2. Rencanakan upgrade Expo SDK besar secara terpisah.
3. Jangan npm audit fix --force tanpa branch upgrade khusus.

### M8. Logging backend mengandung PII/payment detail

Lokasi contoh:

- backend/index.ts:1696 log body Mayar.
- backend/index.ts:1721 log paymentUrl.
- backend/index.ts:1744 log raw webhook body.
- backend/index.ts:1756 log webhook body.
- backend/index.ts:1869 log email.
- backend/index.ts:1999 log user id.

Dampak:

- Cloudflare logs bisa berisi email, WhatsApp, payment link, webhook body, dan data transaksi.

Saran fix:

1. Buat logger structured dengan redaction.
2. Jangan log raw webhook body di production.
3. Pakai correlation id dan event id, bukan PII.

### M9. Mobile API base fallback ke localhost jika EXPO_PUBLIC_API_BASE_URL tidak ada

Lokasi:

- mobile-app/src/lib/api.ts:18-29.
- .env.example belum mendokumentasikan EXPO_PUBLIC_API_BASE_URL.

Dampak:

- Build production yang lupa env akan call http://localhost:3000.
- Sulit didiagnosis oleh developer baru.

Saran fix:

1. Di production, throw error jelas jika EXPO_PUBLIC_API_BASE_URL kosong.
2. Dokumentasikan env mobile di .env.example dan docs/DEPLOYMENT.md.
3. Pertimbangkan app.config.ts untuk validasi env saat build.

### M10. Email duplicate check checkout tidak memakai pagination helper

Lokasi:

- backend/index.ts:1516 listUsers() tanpa pagination.
- backend/index.ts:72-85 sebenarnya ada helper listAllAuthUsers.

Dampak:

- Jika Supabase listUsers default hanya page pertama, duplicate email bisa tidak terdeteksi di awal.
- createUser tetap akan gagal, tetapi UX dan payment pending flow bisa jadi kacau.

Saran fix:

1. Pakai listAllAuthUsers atau cari user lewat endpoint/strategi yang scalable.
2. Lebih baik gunakan pending checkout session dan biarkan createUser error ditangani sebelum payment.

## Temuan low / cleanup

### L1. Expo template modal masih diekspor sebagai route

Lokasi:

- mobile-app/app/\_layout.tsx:87 mendaftarkan modal.
- mobile-app/app/modal.tsx:1-18 masih template Expo.
- mobile-app/components/EditScreenInfo.tsx masih komponen template.

Dampak:

- Route /modal ikut ter-export di build web.
- Developer baru melihat placeholder dan bingung apakah fitur belum selesai.

Saran:

- Hapus route modal jika tidak dipakai, atau ganti dengan modal produk nyata.

### L2. File dan dependency legacy dari fase lama masih ada

Contoh:

- backend/index_restored.ts
- restore.cjs
- restore2.cjs
- metadata.json
- test-api.js
- siklusio_documentation.html
- package.json dependencies: @google/genai, dotenv, express, googleapis, playwright, @types/express, esbuild
- Cloudflare secret GEMINI_API_KEY masih ada walau runtime sekarang OpenRouter.

Dampak:

- Membingungkan developer manusia.
- Menambah dependency tree dan waktu audit.
- Dokumentasi HTML masih menyebut Express/Gemini, padahal runtime sekarang Hono/OpenRouter.

Saran:

1. Buat folder archive/legacy jika masih ingin menyimpan.
2. Hapus dependency yang tidak di-import runtime.
3. Rebuild README dan docs dari kondisi terbaru.
4. Hapus secret lama setelah yakin tidak dipakai.

### L3. README masih template AI Studio

Lokasi:

- README.md:1-20.

Dampak:

- Tidak menjelaskan cara menjalankan backend Worker, mobile app, Supabase, Pages, atau deploy.
- Developer baru akan salah langkah dari hari pertama.

Saran:

- Tulis ulang README sebagai onboarding manusia:
  - arsitektur singkat
  - prerequisites
  - env setup
  - local dev
  - test/check commands
  - deploy
  - troubleshooting

### L4. .env.example tidak sesuai runtime sekarang

Lokasi:

- .env.example:13-19 masih memakai VITE*SUPABASE*\* dan menyebut Express.
- Tidak ada EXPO_PUBLIC_SUPABASE_URL.
- Tidak ada EXPO_PUBLIC_SUPABASE_ANON_KEY.
- Tidak ada EXPO_PUBLIC_API_BASE_URL.
- Tidak ada MAYAR_API_KEY.
- Tidak ada MAYAR_WEBHOOK_TOKEN.

Dampak:

- Setup local/staging rawan salah.
- Mobile dan Worker memakai naming env berbeda.

Saran:

- Pisahkan env docs:
  - backend Worker secrets
  - backend Worker vars
  - mobile public env
  - local only

### L5. package scripts belum mencerminkan monorepo

Lokasi:

- package.json:7-12 hanya dev/deploy/clean/lint.
- mobile-app/package.json:5-10 hanya start/android/ios/web/build:web.

Dampak:

- Test suite yang sebenarnya ada tidak punya satu command resmi.
- clean memakai rm -rf, kurang ramah Windows/PowerShell.

Saran:

1. Tambah root scripts:
   - test
   - typecheck:backend
   - typecheck:mobile
   - build:mobile-web
   - lint
   - check
2. Gunakan rimraf atau script node untuk clean lintas OS.

### L6. graphify-out report sudah stale

Fakta:

- graphify-out/GRAPH_REPORT.md dibuat dari commit a9f8ad02, sedangkan HEAD sekarang e08f4b2.
- Graph output juga sempat memasukkan cache/node_modules/artefak build, sehingga noise tinggi.

Saran:

- Jika graphify dipakai sebagai dokumentasi, buat command exclude jelas:
  - node_modules
  - mobile-app/node_modules
  - graphify-out/cache
  - .expo
  - dist
  - package-lock.json

## Fitur yang tampak belum berfungsi penuh

1. Reminder harian: UI aktif, tetapi belum benar-benar schedule notification.
2. Savings tracker cloud sync: UI menyimpan local, tetapi tidak sync ke Supabase.
3. Header AI credit: bisa tidak langsung refresh setelah generate/topup.
4. Habit fallback checklist: fallbackTasks dihitung tetapi tidak dipakai sebagai task harian. Jika habit free checklist masih bagian produk, fitur ini regress. Jika sengaja AI-only, hapus fallbackTasks dan update copy produk.
5. Modal route: route ada, tetapi isinya placeholder Expo.
6. Root lint: command resmi gagal.
7. GitHub landing deploy workflow: target project salah.

## Sampah/legacy yang sebaiknya dibereskan

Prioritas bersih-bersih:

1. Hapus atau arsipkan backend/index_restored.ts.
2. Hapus atau arsipkan restore.cjs dan restore2.cjs.
3. Hapus metadata.json jika tidak lagi pakai AI Studio.
4. Hapus test-api.js jika tidak jadi test resmi.
5. Hapus atau regenerate siklusio_documentation.html karena menyebut Express/Gemini lama.
6. Hapus Expo placeholder route modal dan komponen template terkait jika tidak dipakai.
7. Bersihkan dependency root yang tidak punya import runtime.
8. Hapus secret GEMINI_API_KEY setelah yakin tidak dipakai.
9. Rapikan graphify-out agar hanya output terbaru yang relevan disimpan.

## Rekomendasi siklus development jangka panjang

### 1. Buat struktur repo yang manusiawi

Target struktur:

```text
backend/
  routes/
    ai.ts
    payments.ts
    admin.ts
    affiliates.ts
    avatars.ts
  services/
    aiCredits.ts
    mayar.ts
    supabaseAdmin.ts
    logger.ts
  schemas/
  tests/

mobile-app/
  app/
  components/
  src/
    context/
    hooks/
    lib/
    features/

supabase/
  migrations/
  seed.sql
  README.md

docs/
  ARCHITECTURE.md
  DEPLOYMENT.md
  DATABASE.md
  FEATURE_MATRIX.md
  RUNBOOK.md
  DECISIONS/
```

Prinsip:

- Backend route tipis, business logic di services.
- Semua input/output API punya schema validator.
- Semua fitur AI lewat satu abstraction credit ledger.
- Semua payment event lewat satu payment service yang idempotent.

### 2. Standarkan bahasa dan naming

Rekomendasi:

- UI copy tetap Bahasa Indonesia.
- Identifier code gunakan English yang konsisten untuk domain teknis: paymentSession, creditLedger, onboardingCompleted.
- Istilah produk boleh Bahasa Indonesia jika sudah brand-specific: "Siklus", "Tabungan", "Promil".
- Jangan campur komentar "FIX-1" di runtime code. Pindahkan konteks historis ke docs/DECISIONS atau changelog.
- File test mengikuti nama file yang dites.

Tujuannya bukan sok Inggris, tapi agar developer manusia bisa menebak lokasi dan tanggung jawab file dengan cepat.

### 3. Jadikan CI sebagai pagar utama

Minimal command root:

```bash
npm run check
```

Isi check:

1. typecheck backend.
2. typecheck mobile.
3. unit tests backend/mobile.
4. expo-doctor.
5. mobile web export.
6. wrangler deploy dry-run.
7. supabase db push dry-run.

Deploy hanya boleh setelah check pass.

### 4. Payment/auth harus jadi domain paling ketat

Aturan jangka panjang:

- Client tidak boleh menentukan harga, credit, role, atau status payment.
- Webhook harus fail closed.
- Semua webhook event harus idempotent.
- Jangan simpan password plaintext.
- Gunakan payment session id, bukan email, sebagai primary reference.
- Simpan audit trail payment yang redacted.

### 5. Database harus punya satu sumber kebenaran

Aturan:

- Semua perubahan schema masuk supabase/migrations.
- Root SQL non-migration hanya boleh docs/reference, bukan file eksekusi utama.
- Setiap migration punya tanggal, tujuan, dan rollback note.
- Generate types setelah migration.
- RLS diuji dengan role anon, authenticated, service_role, admin.

### 6. Produk AI perlu feature matrix

Buat docs/FEATURE_MATRIX.md:

| Feature         | Endpoint                          | Auth               | Credit cost | Persisted | Rate limit | Status |
| --------------- | --------------------------------- | ------------------ | ----------- | --------- | ---------- | ------ |
| Today Recipes   | /api/generate-recipes             | required           | yes         | yes       | planned    | active |
| Habit Coach     | /api/habit-coach/generate         | required           | yes         | yes       | planned    | active |
| Cycle Guide     | /api/cycle-guide/generate         | required           | yes         | yes       | planned    | active |
| TWW Reassurance | /api/generate-calming-reassurance | should be required | decide      | no        | missing    | risk   |
| Cycle Report    | /api/generate-cycle-report        | required           | decide      | no        | missing    | legacy |
| Habits Insight  | /api/generate-habits-insight      | required           | decide      | no        | missing    | legacy |

Matrix ini akan menyelamatkan developer berikutnya dari "fitur ini gratis atau lupa debit credit?".

### 7. Observability dan privacy

Tambahkan:

- Logger dengan redaction email/phone/payment URL/token.
- Error monitoring untuk Worker dan app.
- Alert untuk webhook 5xx.
- Audit log admin actions.
- Retention policy untuk data sensitif.

### 8. Roadmap hardening 30 hari

Minggu 1:

- Fix plaintext pending password.
- Fix topup server-owned package.
- Require auth untuk TWW reassurance.
- Fix webhook fail-closed.
- Fix root lint/check scripts.

Minggu 2:

- Fix onboarding_completed.
- Convert root SQL ke migration baseline.
- Fix deploy workflow project names.
- Sync savings to Supabase.
- Implement or hide reminder notification.

Minggu 3:

- Modularisasi backend payment/AI/admin.
- Add payment webhook tests.
- Add AI credit consistency tests.
- Add CORS allowlist dan basic rate limit.

Minggu 4:

- Rewrite README.
- Add docs/ARCHITECTURE.md, DEPLOYMENT.md, DATABASE.md, FEATURE_MATRIX.md.
- Clean legacy files/dependencies.
- Setup required CI checks.

## Prioritas tindakan

Jika hanya punya waktu 1 hari:

1. Stop simpan password plaintext.
2. Server-side validate topup package.
3. Require auth untuk TWW reassurance.
4. Fail closed webhook jika secret kosong.
5. Fix root lint/typecheck script.

Jika punya waktu 1 minggu:

1. Semua item 1 hari.
2. Fix onboarding_completed dan nullable last_period_date.
3. Fix GitHub Actions project-name.
4. Tambah test payment/topup/webhook.
5. Tulis README baru.

Jika ingin siap dikerjakan manusia jangka panjang:

1. Modularisasi backend.
2. Rapikan migrations.
3. Buat docs feature matrix dan architecture.
4. Bersihkan legacy.
5. Jadikan npm run check sebagai standar wajib sebelum deploy.

## Catatan akhir

Siklusio sudah punya banyak fitur yang sebenarnya cukup ambisius untuk ukuran codebase kecil. Masalah utamanya bukan "kurang fitur", tetapi terlalu banyak domain penting hidup berdampingan tanpa pagar yang cukup: payment, auth, AI cost, data kesehatan, komunitas, dan admin.

Kalau pagar payment/auth/schema dibereskan dulu, codebase ini masih sangat bisa dibuat enak dilanjutkan manusia. Kalau tidak, setiap fitur baru akan membawa risiko regression yang makin susah dilacak.
