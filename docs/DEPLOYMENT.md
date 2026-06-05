# Siklusio Deployment Guide

Last updated: 2026-06-05  
Last verified against codebase: 2026-06-05  
Target Audience: Non-coder Founder & AI Coding Agents

---

## 1. Golden Rule of Deployment (Aturan Rilis Emas)

Ketika melakukan perubahan yang melintasi beberapa layer sistem, ikuti urutan rilis berikut demi menghindari crash pada aplikasi aktif:

1. **Database Schema (Pertama)**: Jalankan migrasi database remote terlebih dahulu jika ada kode baru yang bergantung pada skema database yang baru.
2. **Backend API Workers (Kedua)**: Deploy kode server backend setelah database siap menerima parameter baru.
3. **Frontend Mobile & Landing (Ketiga)**: Rilis aplikasi mobile (EAS Build / OTA Update) dan landing page statis setelah API backend siap diakses secara penuh.

---

## 2. Tabel Perintah Build & Deploy (Build & Deploy Commands)

Berikut adalah daftar perintah yang digunakan untuk merilis setiap komponen sistem Siklusio v2:

| Komponen                    | Target Platform               | Perintah Deploy (CLI Command)                              | Lokasi Konfigurasi         |
| --------------------------- | ----------------------------- | ---------------------------------------------------------- | -------------------------- |
| **API Server (Backend)**    | Cloudflare Workers            | `npm run deploy`                                           | `wrangler.jsonc`           |
| **Mobile App (Production)** | Apple App Store & Google Play | `npm --prefix mobile-app run build:production` (EAS Build) | `mobile-app/app.json`      |
| **Mobile App (OTA Update)** | Expo Channel                  | `npx eas update --channel production`                      | `mobile-app/app.json`      |
| **Landing Page (Statis)**   | Cloudflare Pages              | Pemicu Git Commit Push otomatis (Git Integration)          | Cloudflare Pages Dashboard |
| **Database Schema**         | Supabase                      | `npx supabase db push`                                     | `supabase/config.toml`     |

---

## 3. Langkah Demi Langkah Deployment (Step-by-Step Deployment)

### A. Database Migrations (Supabase)

1. Lakukan validasi status migrasi lokal dengan remote:
   ```bash
   npm run db:migrations:list
   ```
2. Jalankan dry-run untuk memastikan tidak ada konflik skema:
   ```bash
   npm run db:push:dry-run
   ```
3. Lakukan deploy migrasi ke remote database:
   ```bash
   npx supabase db push
   ```
4. Perbarui TypeScript types agar sesuai dengan skema database remote yang baru:
   ```bash
   npm run db:types
   ```

### B. API Server Backend (Cloudflare Workers)

1. Jalankan pengujian dan typecheck backend lokal:
   ```bash
   npm run check
   ```
2. Jalankan simulasi bundle (Dry-Run):
   ```bash
   npm run deploy -- --dry-run
   ```
3. Lakukan deploy kode aktif ke Cloudflare Workers:
   ```bash
   npm run deploy
   ```
4. Lakukan verifikasi minimal dengan memanggil endpoint publik (misalnya URL API root):
   ```text
   GET https://api.siklusio.web.id/
   ```

### C. Mobile Application (Expo / EAS)

1. Lakukan kompilasi platform web untuk verifikasi bundler:
   ```bash
   npm --prefix mobile-app run build:web
   ```
2. Jalankan audit kesehatan dependensi Expo:
   ```bash
   cd mobile-app
   npx expo-doctor@latest
   cd ..
   ```
3. Buat bundle rilis menggunakan EAS Build (atau kirim update OTA melalui EAS Update jika perubahan bersifat non-native).

---

## 🛡️ 4. Panduan Rollback (Rollback Protocols)

Jika terjadi masalah fatal saat rilis produksi sedang berlangsung, ikuti instruksi pemulihan berikut:

| Komponen            | Metode Rollback Aman                                                                                                                                                                        | Catatan Penting                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Hono Backend**    | Buka Cloudflare Dashboard > Workers & Pages > Pilih `siklusio-backend` > Tab Deployments > Pilih versi sebelumnya > Klik **Rollback**.                                                      | Sangat cepat (< 5 detik) dan aman dijalankan tanpa perlu melakukan git revert.   |
| **Landing Page**    | Buka Cloudflare Pages Dashboard > Pilih proyek landing > Pilih deployment sukses sebelumnya > Klik **Promote to Production**.                                                               | Menghindari downtime akibat kegagalan integrasi git.                             |
| **Database Schema** | **JANGAN PERNAH** menjalankan perintah manual rollback DDL/drop table di database produksi. Siapkan, uji coba, dan jalankan migrasi baru (_forward-fix migration_) untuk menormalkan skema. | Tindakan drop table manual berisiko tinggi memicu hilangnya data pengguna aktif. |
| **Payment Webhook** | Jika webhook Mayar tidak stabil, matikan sementara rute checkout (`/api/checkout/*`) melalui konfigurasi backend untuk mencegah antrean transaksi menggantung.                              | Menghindari data pembayaran masuk tanpa aktivasi akun yang tepat.                |

---

## 📈 5. Monitoring & Analisis Log

Untuk mengamati log aktivitas backend secara real-time di lingkungan produksi, jalankan perintah berikut:

```bash
npx wrangler tail siklusio-backend
```

Gunakan perintah ini untuk memantau error dari OpenRouter API, callback Mayar, dan status otorisasi JWT.

---

## 📈 6. Integrasi Meta Pixel & Conversions API (CAPI)

Untuk tracking konversi pendaftaran premium secara server-to-server, pastikan variabel berikut dikonfigurasi di Cloudflare Worker secrets:

- `META_PIXEL_ID`: ID Meta Pixel untuk mencatat konversi.
- `META_CAPI_ACCESS_TOKEN`: Token akses Conversions API (CAPI) yang di-generate dari Meta Events Manager.
- `META_GRAPH_API_VERSION`: Versi API Graph Meta yang digunakan (default: `v18.0`, disarankan `v19.0` atau yang terbaru).
- `META_TEST_EVENT_CODE`: Kode event uji coba dari Meta Events Manager (untuk kebutuhan pengujian event CAPI).
- `META_TEST_MODE_SECRET`: Token rahasia internal untuk memvalidasi mode uji coba Meta.

Gunakan perintah wrangler berikut untuk memasukkan secret di Cloudflare:
```bash
npx wrangler secret put META_CAPI_ACCESS_TOKEN
```

---

## 🚫 Peringatan Penting AI Agent (AI Agent Warning)

> [!CAUTION]
> AI Coding Agent **dilarang keras** menjalankan perintah deployment produksi aktif (seperti `npx supabase db push` atau `wrangler deploy`) selama pengerjaan dokumentasi ini. Cukup lakukan validasi lokal menggunakan `npm run check` dan `npm run db:push:dry-run`.
