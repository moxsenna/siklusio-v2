# Siklusio v2

Siklusio v2 adalah aplikasi pendamping siklus menstruasi dan program hamil (promil) yang dirancang khusus untuk perempuan Indonesia. Aplikasi ini membantu pengguna melacak fase siklus tubuhnya, mencatat kebiasaan harian (_habits_) dan gejala, menyinkronkan data dengan pasangan via WhatsApp, menyediakan ruang ketenangan mental (_TWW Sanctuary_), serta memberikan saran harian personal berbasis kecerdasan buatan (AI).

> [!NOTE]
> Dokumen ini dirancang sebagai **peta navigasi utama** repositori. Penjelasan teknis dan operasional yang mendalam telah dipisahkan ke dalam direktori `/docs/` untuk menjaga keterbacaan dan menghindari instruksi yang kedaluwarsa.

---

## 🗺️ Peta Navigasi Dokumentasi (Documentation Map)

### 📌 Konfigurasi & Aturan Root (Root Configurations)

- [AGENT_RULES.md](file:///d:/Coding/remix_-siklusio/AGENT_RULES.md) — Panduan keselamatan dan aturan wajib bagi AI coding agents yang berkontribusi di repositori ini.
- [.env.example](file:///d:/Coding/remix_-siklusio/.env.example) — Panduan variabel lingkungan untuk replikasi dan konfigurasi lokal.

### 📁 Buku Panduan Teknis (Technical Handbooks - `/docs/`)

- [ARCHITECTURE.md](file:///d:/Coding/remix_-siklusio/docs/ARCHITECTURE.md) — Arsitektur monorepo, batas modularitas backend Hono, struktur frontend Expo, serta diagram alur data.
- [DATABASE.md](file:///d:/Coding/remix_-siklusio/docs/DATABASE.md) — Skema database, inventori tabel, kebijakan Row Level Security (RLS), fungsi RPC, dan aturan migrasi Supabase.
- [API.md](file:///d:/Coding/remix_-siklusio/docs/API.md) — Pemetaan detail endpoint backend Hono, skema Zod, parameter input/output, rate limits, dan biaya kredit AI.
- [PAYMENT_FLOW_ARCHITECTURE.md](file:///d:/Coding/remix_-siklusio/docs/PAYMENT_FLOW_ARCHITECTURE.md) — Arsitektur payment flow pasca Sprint 2G: coordinator, service matrix, idempotency, guardrails, dan test matrix (wajib dibaca sebelum mengubah webhook/activation).
- [SECURITY.md](file:///d:/Coding/remix_-siklusio/docs/SECURITY.md) — Kebijakan keamanan data, manajemen token, mitigasi kebocoran PII, dan protokol keselamatan medis/konten AI.
- [DEPLOYMENT.md](file:///d:/Coding/remix_-siklusio/docs/DEPLOYMENT.md) — Panduan rilis dan deployment Cloudflare Workers (backend), Expo EAS (mobile app), Cloudflare Pages (landing), dan migrasi database.
- [TESTING.md](file:///d:/Coding/remix_-siklusio/docs/TESTING.md) — Rangkaian pengujian native `node:test`, petunjuk penulisan tes backend/mobile, dan verifikasi tipe.
- [MAINTENANCE.md](file:///d:/Coding/remix_-siklusio/docs/MAINTENANCE.md) — Operasional rutin, manajemen kuota OpenRouter, moderasi konten komunitas, rotasi API key, dan pembaruan dependensi.
- [RISK_REGISTER.md](file:///d:/Coding/remix_-siklusio/docs/RISK_REGISTER.md) — Daftar risiko teknis, hukum/medis, dan operasional beserta langkah mitigasinya.

### 📚 Dokumentasi Pendukung Lainnya (Legacy & Feature Specs)

- [FEATURE_MATRIX.md](file:///d:/Coding/remix_-siklusio/docs/FEATURE_MATRIX.md) — Matriks pemetaan fitur detail per modul (dashboard, habits, calendar, community, admin).
- [AVATAR_POLICY.md](file:///d:/Coding/remix_-siklusio/docs/AVATAR_POLICY.md) — Prosedur penanganan dan moderasi file gambar avatar pengguna.
- [CODEBASE_HANDOFF.md](file:///d:/Coding/remix_-siklusio/docs/CODEBASE_HANDOFF.md) — Panduan handoff serah-terima repositori setelah refaktorisasi modular.
- [RUNBOOK.md](file:///d:/Coding/remix_-siklusio/docs/RUNBOOK.md) — Panduan langkah demi langkah untuk verifikasi harian pengembang lokal.

---

## ⚡ Langkah Awal Cepat (Quick Start)

### 1. Persiapan Awal

Pastikan Anda memiliki Node.js, CLI Supabase, dan Wrangler terinstal di komputer.
Copy `.env.example` menjadi `.env.local` di root, dan isi variabel lingkungan dengan nilai placeholder Anda sendiri.

### 2. Instalasi Dependensi

```bash
# Instal dependensi global & backend
npm install

# Instal dependensi aplikasi mobile
npm --prefix mobile-app install
```

### 3. Jalankan Mode Pengembangan (Local Dev)

```bash
# Jalankan backend API (Wrangler dev)
npm run dev

# Jalankan Expo development server (Mobile)
npm --prefix mobile-app start
```

---

## 🛡️ Aturan Emas Keselamatan (Golden Safety Rules)

1. **Supabase Service Key**: Kunci `SUPABASE_SERVICE_ROLE_KEY` wajib dirahasiakan dan hanya boleh dipanggil di sisi backend (Cloudflare Workers).
2. **Tanpa Overclaim Medis**: Semua saran AI harus terbungkus dengan penafian (disclaimer) medis yang jelas. Jangan menjanjikan kehamilan atau mendiagnosis penyakit.
3. **No Direct Production Push**: Untuk verifikasi harian, gunakan `npm run check` dan `npm run db:push:dry-run`. Jangan jalankan deployment langsung tanpa otorisasi formal.
