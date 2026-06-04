# Siklusio v2

## Overview
Siklusio v2 adalah aplikasi pendamping siklus menstruasi dan program hamil (promil) yang dirancang khusus untuk perempuan Indonesia. Aplikasi ini membantu pengguna melacak fase siklus tubuhnya (Menstruasi, Folikular, Ovulasi, Luteal), memprediksi masa subur, mencatat kebiasaan harian (*habits*) dan gejala, memfasilitasi keterlibatan suami secara langsung melalui WhatsApp, menyajikan ruang afirmasi dan ketenangan mental pada fase luteal (*TWW Sanctuary*), serta menyajikan *insight* dan rekomendasi kesehatan terpersonalisasi yang didukung oleh AI, serta integrasi checkout premium.

Siklusio diposisikan sebagai pendamping personal yang hangat, informatif, dan privat untuk mendukung perjalanan promil. Siklusio **bukanlah** alat diagnosis medis atau pengganti konsultasi dengan dokter kandungan, bidan, atau tenaga medis profesional.

## Monorepo Structure
Proyek ini diorganisasikan dalam struktur monorepo sebagai berikut:

* **`backend/`**: Folder root untuk API backend.
  * **`backend/src/`**: Source code utama backend Hono. Didekomposisi ke dalam `controllers/`, `routes/`, `middlewares/`, dan `services/`.
  * `backend/index.ts`: Hanya berisi compatibility re-export untuk merujuk ke entrypoint baru.
* **`mobile-app/`**: Aplikasi mobile berbasis Expo.
  * **`mobile-app/app/`**: Folder route untuk Expo Router (route layer).
  * **`mobile-app/src/features/`**: Implementasi komponen dan logika spesifik per fitur (seperti calendar, community, habits, dashboard, admin).
  * **`mobile-app/src/shared/`**: Komponen UI dan utilitas reusable yang digunakan lintas fitur.
  * **`mobile-app/src/theme/`**: Konfigurasi tema dan custom hooks global (seperti `useColorScheme`).
* **`landing/`**: File static HTML/CSS untuk presentasi produk dan form checkout Premium.
* **`supabase/`**: Konfigurasi database PostgreSQL, skema migrasi, dan konfigurasi edge functions.
  * **`supabase/migrations/`**: Kumpulan berkas DDL SQL untuk migrasi database production.
  * **`supabase/types/`**: Berkas type definitions TypeScript hasil regenerasi dari database.
* **`docs/`**: Dokumentasi operasional pengembang (seperti `RUNBOOK.md`, `ARCHITECTURE.md`, dan `DATABASE.md`).

## Architecture
Siklusio v2 dibangun dengan stack teknologi modern sebagai berikut:
* **Cloudflare Workers + Hono**: Server API backend berbasis TypeScript yang cepat dan dideploy ke edge server Cloudflare. Terintegrasi menggunakan penyesuaian di `wrangler.jsonc` yang mengarah langsung ke `backend/src/index.ts`.
* **Expo Mobile App**: Aplikasi universal mobile (iOS, Android, Web) menggunakan Expo SDK 54 dan Expo Router.
* **Supabase Auth, Postgres, & RLS**: Manajemen autentikasi pengguna dan database PostgreSQL yang terlindungi secara ketat menggunakan Row Level Security (RLS) dan granular function grants.
* **Mayar Checkout & Webhook**: Integrasi gateway pembayaran untuk registrasi premium dan topup saldo kredit AI secara aman dan otomatis melalui callback webhook terproteksi.
* **OpenRouter AI**: Pemrosesan kecerdasan buatan untuk analisis siklus (*Cycle Guide*), habit recommendations (*Habit Coach*), dan saran harian dengan fallback models.
* **Meta CAPI / GTM (Google Tag Manager)**: Integrasi pelacakan konversi checkout dan penayangan dataLayer untuk pixel pemasaran.

## Local Development
Ikuti langkah-langkah berikut untuk memulai development server lokal:

1. **Install dependensi root & backend:**
   ```bash
   npm install
   ```
2. **Install dependensi aplikasi mobile:**
   ```bash
   npm --prefix mobile-app install
   ```
3. **Pengecekan tipe dan pengujian otomatis (global):**
   ```bash
   npm run check
   ```
4. **Pengecekan tipe mobile secara terpisah:**
   ```bash
   npm --prefix mobile-app run typecheck
   ```
5. **Menjalankan Expo development server:**
   ```bash
   npm --prefix mobile-app start
   ```
   *(Atau `npm --prefix mobile-app run web` untuk langsung menjalankan di platform web).*
6. **Menjalankan backend API lokal (Wrangler dev):**
   ```bash
   npm run dev
   ```

## Environment Variables
Berikut adalah variabel lingkungan utama yang dikonfigurasi dalam `.env.local` untuk development lokal (nilai rahasia wajib diabaikan):

* **Supabase**:
  * `VITE_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL`: Endpoint URL proyek Supabase.
  * `VITE_SUPABASE_ANON_KEY` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Kunci anonim publik Supabase.
  * `SUPABASE_SERVICE_ROLE_KEY`: Kunci super-admin backend (bypass RLS, **jangan pernah diexpose ke frontend**).
  * `SUPABASE_PROJECT_REF`: ID referensi proyek Supabase lokal/remote.
* **OpenRouter AI**:
  * `OPENROUTER_API_KEY`: API key untuk OpenRouter.
* **Mayar Payment Gateway**:
  * `MAYAR_WEBHOOK_TOKEN`: Token rahasia untuk memvalidasi callback webhook Mayar.
* **CORS & Rate Limiter**:
  * `RATE_LIMIT_FALLBACK_MODE`: Mode pembatasan akses saat DB gagal (`memory` atau `fail_closed`).

## Supabase Workflow
Skema database dikelola melalui migrasi terstruktur:
* Semua file migrasi disimpan di `supabase/migrations/` sebagai *source of truth*.
* Generated TypeScript types tersimpan di `supabase/types/database.types.ts`.
* Untuk melakukan regenerasi type TypeScript berdasarkan database remote:
  1. Pastikan Anda telah mengeset variabel lingkungan lokal `SUPABASE_PROJECT_REF`.
  2. Jalankan perintah:
     ```bash
     npm run db:types
     ```
* **PENTING**: Jangan pernah mengubah file `database.types.ts` secara manual! File ini akan otomatis diperbarui setiap kali skema database berubah.

## Backend Workflow
* Source code utama backend berada di `backend/src/`.
* Entrypoint backend didefinisikan di `backend/src/index.ts`. Berkas `backend/index.ts` di root backend hanya berfungsi sebagai compatibility re-export.
* Konfigurasi Cloudflare Worker dideploy mengikuti pengaturan di `wrangler.jsonc` ke target file `backend/src/index.ts`.
* Lakukan testing dan verifikasi tipe berkala sebelum deployment menggunakan:
  ```bash
  npm run check
  ```

## Mobile Workflow
* Berkas route layer untuk navigasi Expo Router tetap diletakkan di `mobile-app/app/`.
* Implementasi fungsional (komponen, logika, hooks) diletakkan di `mobile-app/src/features/`.
* Komponen reusable dan utilitas global diletakkan di `mobile-app/src/shared/`.
* **PENTING**: Jangan memindahkan berkas rute (`route files`) dari folder `mobile-app/app/` tanpa menyediakan wrapper di sana untuk menjaga struktur navigasi.

## Safety & Security Rules for AI Agents
Seluruh AI agent yang bekerja pada repositori ini wajib menaati aturan keselamatan mutlak berikut:
1. **Jangan expose service role key ke frontend**: `SUPABASE_SERVICE_ROLE_KEY` hanya boleh digunakan dan disimpan di sisi backend Workers.
2. **Semua AI endpoint wajib auth-gated**: Validasi JWT token pengguna dan pastikan request berasal dari user terautentikasi sebelum memanggil OpenRouter AI.
3. **Jangan log PII/payment payload mentah**: Scrubbing semua informasi data sensitif (seperti nomor telepon, email, payload Mayar asli) dari log output.
4. **Jangan ubah migration yang sudah applied**: Buat migrasi baru menggunakan CLI jika memerlukan perubahan skema.
5. **Jangan commit `my-video/` atau `graphify-out/`**: Folder-folder ini adalah output demo atau grafik navigasi internal yang tidak boleh dikomit ke Git.
6. **Jangan melakukan refactor besar tanpa commit kecil**: Bagi tugas besar menjadi commit-commit kecil yang terfokus dan jalankan `npm run check` di setiap tahap.
7. **Jangan ubah copy medis menjadi overclaim**: Pertahankan disclaimer medis yang hangat dan informatif. Jangan menjanjikan kehamilan atau hasil medis instan.
