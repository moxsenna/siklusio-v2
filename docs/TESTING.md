# Siklusio Testing & Verification Guide

Last updated: 2026-06-05  
Last verified against codebase: 2026-06-05  
Target Audience: Non-coder Founder & AI Coding Agents

---

## 1. Uji Coba Otomatis (Automated Testing Framework)

Siklusio v2 menggunakan modul bawaan (native) Node.js **`node:test`** dan **`node:assert/strict`** untuk memproses pengujian backend. Pengujian TypeScript dieksekusi secara instan tanpa proses kompilasi manual menggunakan runtime **`tsx`**.

### 📋 Perintah Verifikasi & Testing (Testing CLI Pointers)

| Kegunaan Pengujian                 | Perintah Eksekusi (CLI Command) | Penjelasan Detail                                                                                            |
| ---------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Menjalankan Seluruh Tes**        | `npm test`                      | Menjalankan skrip `scripts/run-tests.mjs` yang memindai semua file `*.test.ts` di monorepo.                  |
| **Verifikasi Tipe & Tes (Global)** | `npm run check`                 | Menjalankan typecheck TypeScript backend, typecheck mobile, dan memicu `npm test` secara berurutan.          |
| **Typecheck Backend**              | `npm run typecheck:backend`     | Menjalankan compiler TypeScript (`tsc --noEmit`) di level backend untuk memastikan tidak ada kesalahan tipe. |
| **Typecheck Mobile**               | `npm run typecheck:mobile`      | Memvalidasi tipe kode TypeScript aplikasi mobile (`mobile-app`).                                             |
| **Pemeriksaan Format Kode**        | `npm run format:check`          | Memvalidasi kepatuhan formatting file markdown dan TypeScript terhadap aturan Prettier.                      |

---

## 2. Struktur File Pengujian (Test File Inventory)

Semua file pengujian aktif diletakkan di dalam folder `backend/` dengan akhiran `.test.ts`.

| File Pengujian                                                                                     | Berkas Kode yang Diuji (Target File)                  | Cakupan Pengujian (Test Coverage)                                                                                 |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **[cors.test.ts](file:///d:/Coding/remix_-siklusio/backend/cors.test.ts)**                         | `backend/src/middlewares/cors.ts`                     | Memverifikasi allowlist CORS dinamis. Memastikan domain terdaftar diperbolehkan, dan domain mencurigakan ditolak. |
| **[securityRoutes.test.ts](file:///d:/Coding/remix_-siklusio/backend/securityRoutes.test.ts)**     | `backend/src/middlewares/auth.ts`                     | Memastikan endpoint sensitif menolak request tanpa token JWT yang valid.                                          |
| **[avatarUpload.test.ts](file:///d:/Coding/remix_-siklusio/backend/avatarUpload.test.ts)**         | `backend/src/controllers/avatar.controller.ts`        | Menguji pengunggahan gambar avatar. Memastikan tipe mime non-gambar dan file berukuran besar ditolak.             |
| **[checkoutRegister.test.ts](file:///d:/Coding/remix_-siklusio/backend/checkoutRegister.test.ts)** | `backend/src/controllers/checkout.controller.ts`      | Memvalidasi alur inisialisasi registrasi premium, validasi kupon, dan integrasi session.                          |
| **[topupCheckout.test.ts](file:///d:/Coding/remix_-siklusio/backend/topupCheckout.test.ts)**       | `backend/src/controllers/checkout.controller.ts`      | Menguji validasi checkout topup kredit AI dan penanganan error parameter yang salah.                              |
| **[topupWebhook.test.ts](file:///d:/Coding/remix_-siklusio/backend/topupWebhook.test.ts)**         | `backend/src/controllers/webhook.mayar.controller.ts` | Memvalidasi pemrosesan topup kredit secara atomik dan keabsahan token webhook Mayar.                              |

---

## 3. Menulis Pengujian Backend Baru (Writing New Tests)

Saat membuat endpoint baru, Anda **wajib** membuat unit test di dalam folder `backend/`. Gunakan pola simulasi request Hono (`app.request`) untuk memanggil API tanpa perlu menjalankan server HTTP secara fisik:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import app from "./index"; // Hono App instance

test("POST /api/fitur-baru menolak request tanpa autentikasi", async () => {
  // Simulasi pemanggilan HTTP request ke endpoint Hono
  const response = await app.request("/api/fitur-baru", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Tanpa header Authorization
    },
    body: JSON.stringify({ key: "value" }),
  });

  // Validasi status code harus 401 Unauthorized
  assert.equal(response.status, 401);

  const body = await response.json();
  assert.equal(body.error, "Missing or invalid session");
});
```

---

## 4. Pengujian Aplikasi Mobile (Mobile Smoke Testing)

Karena aplikasi mobile berjalan menggunakan Expo, pengujian visual/antarmuka dilakukan secara manual menggunakan emulator atau perangkat fisik (Expo Go):

1. **Jalankan Pengecekan Kesehatan Expo**:
   ```bash
   cd mobile-app
   npx expo-doctor@latest
   ```
2. **Kompilasi Uji Coba Klien Web**:
   ```bash
   npm run build:web
   ```
3. **Smoke Test Checklist**:
   - Buka menu Onboarding, isi data, dan pastikan dashboard memuat sapaan nama panggilan yang sesuai.
   - Lakukan centang tugas pada checklist Habits, pastikan progres persentase harian bertambah.
   - Lakukan generate Surat Tenang di TWW Sanctuary, dan verifikasi saldo kredit AI berkurang di halaman menu Credits.
   - Buka Tab Komunitas, buat postingan anonim, pastikan postingan terbit dan identitas Anda disembunyikan.
