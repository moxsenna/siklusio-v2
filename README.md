# Siklusio v2

## What this app is
Siklusio v2 adalah aplikasi pendamping siklus menstruasi dan program hamil (promil) yang dirancang khusus untuk perempuan Indonesia. Aplikasi ini membantu pengguna melacak fase siklus tubuhnya (Menstruasi, Folikular, Ovulasi, Luteal), memprediksi masa subur, mencatat kebiasaan harian (*habits*) dan gejala, memfasilitasi keterlibatan suami secara langsung melalui WhatsApp, menyajikan ruang afirmasi dan ketenangan mental pada fase luteal (*TWW Sanctuary*), serta menyajikan *insight* dan rekomendasi kesehatan terpersonalisasi yang didukung oleh AI.

## Product positioning
**"Promil lebih terarah, suami lebih paham, hati lebih tenang."**
Siklusio diposisikan sebagai pendamping personal yang hangat, informatif, dan privat untuk mendukung perjalanan promil. Siklusio **bukanlah** alat diagnosis medis atau pengganti konsultasi dengan dokter kandungan, bidan, atau tenaga medis profesional. Fokus utama aplikasi adalah pada edukasi, pembiasaan harian yang suportif, pelacakan berbasis data siklus, dan dukungan emosional tanpa dihakimi.

## Architecture overview
Siklusio v2 menggunakan struktur monorepo dengan komponen utama sebagai berikut:
1. **Frontend App (`mobile-app/`)**: Aplikasi universal satu codebase (Android, iOS, Web) yang dikembangkan menggunakan **Expo SDK 54**, **React Native (v0.81)**, dan **Expo Router 6**. Desain UI disesuaikan dengan NativeWind v4 (Tailwind CSS v3 untuk React Native) menggunakan palet warna Material Design 3 pink/violet/teal.
2. **Backend API (`backend/`)**: Server API berbasis framework **Hono (TypeScript)** yang dideploy ke **Cloudflare Workers**. Backend menangani koordinasi AI via OpenRouter, penanganan webhook pembayaran Mayar, validasi paket kredit AI, proxy upload avatar ke Cloudflare R2, dan verifikasi token autentikasi.
3. **Database (`supabase/`)**: Database **PostgreSQL** di hosting **Supabase** dengan Row Level Security (RLS) diaktifkan secara ketat pada semua tabel. Menyediakan fungsi database terproteksi (`SECURITY DEFINER` RPC) serta Postgres triggers untuk sinkronisasi data, rate limiting komunitas, dan auto-hide konten bermasalah.
4. **Landing & Checkout Page (`landing/`)**: Halaman statis HTML/CSS untuk presentasi produk dan form checkout Premium yang terintegrasi dengan Payment Gateway Mayar.
5. **Storage**: **Cloudflare R2** untuk penyimpanan dan penayangan aset dinamis seperti avatar kustom pengguna.

## Local setup
**Prerequisites:** Node.js (v18+) dan Supabase CLI (untuk pengelolaan database).

1. Clone repository ke mesin lokal Anda.
2. Install dependensi di root direktori untuk keperluan backend dan database tooling:
   ```bash
   npm install
   ```
3. Pindah ke direktori mobile app dan install dependensinya:
   ```bash
   cd mobile-app
   npm install
   ```
4. Salin file `.env.example` menjadi `.env.local` dan lengkapi nilai variabel lingkungan (seperti token OpenRouter, kunci akses Supabase, API key Mayar, dan konfigurasi R2).
5. Jalankan command development server yang sesuai (lihat bagian *Development commands*).

## Environment variables
Semua variabel lingkungan yang dibutuhkan didokumentasikan di file [.env.example](.env.example). Kategori utamanya meliputi:
- **AI (OpenRouter):** `OPENROUTER_API_KEY`, `OPENROUTER_FREE_MODEL` (model gratis untuk insight reguler), `OPENROUTER_PAID_MODEL` (model berbayar sebagai fallback).
- **Supabase:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` (kunci super-admin backend, wajib dirahasiakan).
- **Mayar Payment:** `MAYAR_API_KEY` dan `MAYAR_WEBHOOK_TOKEN` (untuk memvalidasi callback sukses).
- **Cloudflare R2:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`.
- **CORS & Rate Limiting:** `ALLOWED_ORIGINS` (daftar asal URL yang diizinkan), serta parameter window/max untuk limiter backend (`AI_RATE_LIMIT_MAX`, dll).
- **Client base URL:** `EXPO_PUBLIC_API_BASE_URL` (wajib diisi dengan URL API backend sesungguhnya pada build production).

## Development commands
Jalankan perintah-perintah berikut dari root direktori proyek:

- **Menjalankan Server API Backend (Wrangler dev di port 3000):**
  ```bash
  npm run dev
  ```
- **Melakukan Pengecekan Kode Secara Global (typecheck backend, typecheck mobile, dan testing):**
  ```bash
  npm run check
  ```
- **Melakukan Typecheck Kode Backend:**
  ```bash
  npm run typecheck:backend
  ```
- **Melakukan Typecheck Kode Mobile:**
  ```bash
  npm run typecheck:mobile
  ```
- **Menjalankan Seluruh Unit Test (`*.test.ts`/`*.test.js`):**
  ```bash
  npm run test
  ```

Jalankan perintah berikut di dalam direktori `mobile-app/`:
- **Memulai Expo Development Server:**
  ```bash
  npm run start
  ```
- **Menjalankan Aplikasi di Simulator Android:**
  ```bash
  npm run android
  ```
- **Menjalankan Aplikasi di Simulator iOS:**
  ```bash
  npm run ios
  ```
- **Menjalankan Aplikasi di Browser (Web):**
  ```bash
  npm run web
  ```
- **Mengekspor Build Produksi Platform Web:**
  ```bash
  npm run build:web
  ```

Jalankan perintah database dari root direktori (menggunakan Supabase CLI):
- **Melihat Status Migrasi Database:**
  ```bash
  npm run db:migrations:list
  ```
- **Melakukan Dry-Run Migrasi (Verifikasi Tanpa Push):**
  ```bash
  npm run db:push:dry-run
  ```
- **Menghasikan TypeScript Types Berdasarkan Schema Database:**
  ```bash
  npm run db:types
  ```
- **Melakukan Linting Schema Database Remote:**
  ```bash
  npm run db:lint
  ```

## Database migration workflow
- **Canonical Path / Source of Truth:** `supabase/migrations/` adalah satu-satunya sumber kebenaran untuk perubahan skema database production. File `.sql` manual di direktori root `supabase/` adalah legacy/manual reference saja.
- **Langkah Pembuatan Migrasi Baru:**
  1. Generate file migrasi baru menggunakan CLI:
     ```bash
     npx supabase migration new <nama_deskriptif>
     ```
  2. Tulis perintah DDL (SQL) Anda di dalam file baru yang dihasilkan di folder `supabase/migrations/`.
  3. Lakukan dry-run untuk memastikan kecocokan lokal dan remote:
     ```bash
     npm run db:push:dry-run
     ```
  4. Jalankan linting skema database:
     ```bash
     npm run db:lint
     ```
  5. Lakukan deploy/push skema ke database setelah disetujui:
     ```bash
     npx supabase db push
     ```
  6. Perbarui type definisi TypeScript:
     ```bash
     npm run db:types
     ```
  7. Commit file migrasi baru, file type `database.types.ts` yang diperbarui, dan dokumen penjelasan terkait dalam satu commit/PR.
- **Validasi Manual Produksi:** Minimal jalankan migration lint (`npm run db:lint`) dan dry-run (`npm run db:push:dry-run`) secara manual sebelum melakukan push skema baru ke lingkungan produksi.

## Testing workflow
- File test diletakkan berdampingan (*co-located*) dengan modul fitur terkait menggunakan penamaan `<nama_file>.test.ts` atau `<nama_file>.test.js`.
- Pengujian dijalankan secara otomatis menggunakan skrip [run-tests.mjs](scripts/run-tests.mjs), yang memindai seluruh direktori proyek (kecuali folder yang diabaikan seperti `node_modules`, `dist`, dll.) lalu menjalankan masing-masing test menggunakan runner node dengan `--import tsx` (untuk file TypeScript).
- Seluruh pengujian wajib lolos sebelum kode digabungkan ke branch utama (`main`) atau dideploy ke production. Jalankan tes secara berkala dengan:
  ```bash
  npm run test
  ```

## Deployment workflow
- **Aturan Emas (Golden Rule):** Lakukan deploy database (migrations) terlebih dahulu jika kode bergantung pada skema baru. Deploy Worker (backend API) kedua saat perilaku API berubah. Deploy/merge ke repository untuk rilis Cloudflare Pages (frontend/landing) setelah DB dan Worker dipastikan aman.
- **CI / Gate Otomatis (CI Pipeline):** Setiap *pull request* dan *push* ke branch `main` akan memicu workflow **CI** (`.github/workflows/ci.yml`) yang secara otomatis menjalankan typechecking mobile/backend dan seluruh test suite (`npm run check`) untuk mencegah terjadinya *regression* pada branch utama.
- **Deploy Backend otomatis:** Perubahan backend (pada direktori `backend/` atau berkas `wrangler.jsonc`) hanya akan dideploy ke Cloudflare Workers secara otomatis lewat workflow **Deploy Backend** (`.github/workflows/deploy-backend.yml`) **setelah status CI dipastikan sukses/lolos** (melalui event `workflow_run`). Alur ini juga dapat dipicu secara manual (melalui `workflow_dispatch`).
- **Deploy Backend (Manual/Lokal):**
  Jalankan perintah deploy untuk mempublikasikan API Hono ke Cloudflare Workers secara lokal:
  ```bash
  npm run deploy
  ```
- **Deploy Web Frontend & Landing Page (Cloudflare Pages):**
  Menggunakan integrasi Git Cloudflare Pages yang memicu deploy otomatis setiap kali ada perubahan/merge yang dipush ke branch `main` pada GitHub.
- **Deploy Aplikasi Mobile (Android & iOS):**
  Build bundel aplikasi dilakukan menggunakan EAS Build di direktori `mobile-app/`:
  ```bash
  eas build --platform android
  ```

## Security rules
> [!IMPORTANT]
> Aturan keamanan berikut bersifat mutlak dan harus dipatuhi tanpa pengecualian:
> 
> 1. **Jangan ubah schema Supabase tanpa migration.** Semua perubahan skema database production wajib didokumentasikan dan dijalankan melalui alur migrasi resmi di folder `supabase/migrations/`.
> 2. **Jangan expose service role key ke frontend.** Variabel `SUPABASE_SERVICE_ROLE_KEY` memiliki hak akses super-admin yang mem-bypass seluruh aturan RLS database. Kunci ini hanya boleh disimpan sebagai rahasia backend di Cloudflare Worker dan sama sekali tidak boleh diakses oleh aplikasi mobile-app/frontend.
> 3. **Semua endpoint AI wajib requireUser.** Seluruh API endpoint yang berinteraksi dengan AI (seperti pembuatan resep, analisis siklus, saran mingguan, dan reassurance TWW) wajib memvalidasi token JWT pengguna dan memastikan pengguna telah masuk log (*authenticated*) sebelum memproses permintaan.
> 4. **Semua output AI wajib disclaimer medis.** Respons yang dihasilkan dari sistem AI harus disertai dengan disclaimer medis yang jelas dalam Bahasa Indonesia, menegaskan bahwa informasi tersebut bersifat edukatif dan pendampingan umum, bukan diagnosis medis atau pengganti nasihat dokter.

## Coding conventions for AI agents
AI agent yang bekerja di proyek ini harus mengikuti pedoman berikut secara konsisten:
- **Aturan Bahasa:** Gunakan Bahasa Indonesia yang hangat, sopan, dan jelas untuk seluruh salinan antarmuka (copy UI), pesan error, notifikasi, serta prompts/respons AI. Gunakan Bahasa Inggris untuk identifikasi kode (variable, function, class, file name) yang bersifat teknis umum (misalnya `requireUser`, `AuthContext`, `SyncManager`).
- **Aturan Penamaan (*Naming Conventions*):**
  - Variabel/Fungsi TypeScript: `camelCase` (contoh: `buildCycleGuideSnapshot`)
  - Komponen React & Types/Interfaces: `PascalCase` (contoh: `AiFallbackNotice`)
  - API Routes: kebab-case path segments (contoh: `/api/cycle-guide/generate`)
  - Tabel & Kolom Database: `snake_case` (contoh: `ai_credit_balances`, `generated_for_date`)
  - Migrasi Database: CLI timestamp + descriptive slug (contoh: `20260602174912_phase28_rls_function_grants.sql`)
- **Penanganan Error AI:** Integrasikan komponen UI `AiFallbackNotice` untuk menampilkan pesan fallback lokal yang ramah saat terjadi kegagalan server, rate-limit (429), atau saldo kredit AI tidak mencukupi (402). Gunakan pembagian kebijakan model AI via `resolveOpenRouterModels({ policy: "paid" | "free_included" })` untuk mengendalikan biaya API.
- **Aset Khusus:** Jangan ubah, hapus, atau buat ulang folder `graphify-out/` tanpa persetujuan eksplisit karena folder tersebut digunakan untuk pemetaan struktur navigasi arsitektur. Abaikan folder non-rilis seperti `my-video/` atau file internal seperti `fitur.md`.

## Current roadmap
Daftar prioritas pengembangan jangka pendek dan menengah setelah siklus audit selesai:
1. **Dekomposisi & Refactoring Backend:** Membagi file `backend/index.ts` yang terlalu besar ke dalam struktur modular yang bersih: `routes/`, `middleware/`, dan `services/`.
2. **Squash & Baseline Database:** Merapikan snippets SQL root warisan (`supabase/*.sql`) ke dalam skema migrasi awal yang terpadu untuk penyederhanaan deployment baru.
3. **Adopsi TypeScript Secara Penuh Pada Supabase Client:** Memigrasikan inisialisasi Supabase client di mobile app agar memanfaatkan type hasil `db:types` secara menyeluruh setelah skema lokal dan remote sinkron.
4. **Peningkatan Versi Expo Platform (SDK 56):** Merencanakan migrasi ke Expo SDK 56 secara aman guna menyelesaikan kerentanan keamanan moderate pada dependensi npm mobile tanpa merusak fungsionalitas runtime SDK 54 yang ada.
5. **Pengetatan Unit Test RLS:** Mengembangkan pengujian otomatis yang lebih mendalam untuk aturan Row Level Security (RLS) di database Supabase menggunakan profil test terautentikasi (admin vs non-admin).
