# Siklusio API Reference

Last updated: 2026-06-05  
Target Audience: Non-coder Founder & AI Coding Agents

---

## 1. Ikhtisar (Overview)

Backend API Siklusio v2 dibangun menggunakan kerangka kerja (framework) **Hono** yang dideploy di **Cloudflare Workers**. Seluruh request dan response menggunakan format **JSON**, dengan endpoint dasar dihosting pada URL:

- **Production**: `https://api.siklusio.web.id` (Placeholder)
- **Local Development**: `http://localhost:3000`

### 🔒 Kebijakan Autentikasi (Authentication Policy)

Mayoritas API endpoint memerlukan autentikasi. Token pengguna dikirimkan melalui header `Authorization` dengan tipe `Bearer`:

```text
Authorization: Bearer <supabase_jwt_session_token>
```

- **Klien Publik (`anon`)**: Boleh mengakses landing pages, webhook Mayar, dan inisialisasi checkout.
- **Pengguna Terdaftar (`authenticated`)**: Memiliki akses ke fitur harian AI, riwayat kredit, dan upload avatar.
- **Admin (`is_admin = true`)**: Memiliki akses khusus ke endpoint `/api/admin/*`.

---

## 2. Pemetaan Endpoint API (API Endpoints Map)

### A. Fitur AI & Kesehatan (AI Features)

#### 1. Generate Cycle Guide

- **Path**: `POST /api/cycle-guide/generate`
- **File Rute**: `backend/src/routes/ai.cycleGuide.route.ts`
- **File Controller**: `backend/src/controllers/ai.cycleGuide.controller.ts`
- **Autentikasi**: Wajib (`requireUser`)
- **Skema Validasi Request**: `cycleGuideSchema` (Zod)
  - Payload: `{ generatedForDate: "YYYY-MM-DD", guideLevel: "starter" | "active" | "personal", nickname: string, habitSnapshot: object }`
- **Biaya Kredit AI**: **40 Kredit**
- **Struktur Response (Sukses 200)**:
  ```json
  {
    "guide": { "id": "uuid", "user_id": "uuid", "status": "active", "...": "..." },
    "result": {
      "summary": "...",
      "bodySignals": ["...", "..."],
      "importantDates": ["..."],
      "focusThisWeek": "...",
      "habitCoachBridge": "...",
      "disclaimer": "..."
    },
    "balance": 160
  }
  ```

#### 2. Get Today's Cycle Guide

- **Path**: `GET /api/cycle-guide/today`
- **File Rute**: `backend/src/routes/ai.cycleGuide.route.ts`
- **Autentikasi**: Wajib (`requireUser`)
- **Request Params**: Query `date=YYYY-MM-DD`
- **Biaya Kredit AI**: **Gratis (Read-only)**
- **Struktur Response**: `{ guide: { id: "...", result: { ... } } }` atau `{ guide: null }`

#### 3. Generate Daily Recipes

- **Path**: `POST /api/generate-recipes`
- **File Rute**: `backend/src/routes/ai.recipes.route.ts`
- **File Controller**: `backend/src/controllers/ai.recipes.controller.ts`
- **Autentikasi**: Wajib (`requireUser`)
- **Biaya Kredit AI**: **15 Kredit**
- **Struktur Response**: `{ recipe: { ... }, result: { phaseBenefit: "...", groceries: [...], recipes: [...] }, balance: 145 }`

#### 4. Get Today's Recipes

- **Path**: `GET /api/recipes/today`
- **File Rute**: `backend/src/routes/ai.recipes.route.ts`
- **Autentikasi**: Wajib (`requireUser`)
- **Request Params**: Query `date=YYYY-MM-DD`
- **Biaya Kredit AI**: **Gratis**

#### 5. Generate Habit Plan

- **Path**: `POST /api/habit-coach/generate`
- **File Rute**: `backend/src/routes/ai.habitCoach.route.ts`
- **File Controller**: `backend/src/controllers/ai.habitCoach.controller.ts`
- **Autentikasi**: Wajib (`requireUser`)
- **Biaya Kredit AI**: **50 Kredit** (atau **60 Kredit** jika mode `renewal`)
- **Struktur Response**: `{ plan: { ... }, result: { coachSummary: "...", days: [...] }, balance: 95 }`

#### 6. Get Current Habit Plan

- **Path**: `GET /api/habit-coach/current`
- **File Rute**: `backend/src/routes/ai.habitCoach.route.ts`
- **Autentikasi**: Wajib (`requireUser`)
- **Biaya Kredit AI**: **Gratis**

#### 7. Generate Cycle Report

- **Path**: `POST /api/generate-cycle-report`
- **File Rute**: `backend/src/routes/ai.reassurance.route.ts`
- **File Controller**: `backend/src/controllers/ai.reassurance.controller.ts`
- **Autentikasi**: Wajib (`requireUser`)
- **Biaya Kredit AI**: **Gratis (Termasuk paket langganan dasar)**
- **Struktur Response**: `{ summary: "...", bodyInsights: [...], actionPlan: [...], encouragement: "..." }`

#### 8. Generate Habits Insight

- **Path**: `POST /api/generate-habits-insight`
- **File Rute**: `backend/src/routes/ai.reassurance.route.ts`
- **File Controller**: `backend/src/controllers/ai.reassurance.controller.ts`
- **Autentikasi**: Wajib (`requireUser`)
- **Biaya Kredit AI**: **Gratis (Termasuk paket langganan dasar)**

#### 9. Generate Calming Reassurance (TWW Sanctuary Surat Tenang)

- **Path**: `POST /api/generate-calming-reassurance`
- **File Rute**: `backend/src/routes/ai.reassurance.route.ts`
- **File Controller**: `backend/src/controllers/ai.reassurance.controller.ts`
- **Autentikasi**: Wajib (`requireUser`)
- **Payload**: `{ nickname: string, userJournal: string, generatedForDate: "YYYY-MM-DD" }`
- **Biaya Kredit AI**: **25 Kredit** (Gratis jika memuat cache Surat Tenang yang sudah dibuat pada tanggal yang sama)
- **Struktur Response**: `{ letter: { ... }, result: { title: "...", opening: "...", validation: "...", grounding: "...", affirmation: "...", breathingTip: "...", closing: "...", reassurance: "..." }, balance: 70 }`

#### 10. Get Today's Reassurance Letter

- **Path**: `GET /api/tww-sanctuary/today`
- **File Rute**: `backend/src/routes/ai.reassurance.route.ts`
- **Autentikasi**: Wajib (`requireUser`)
- **Request Params**: Query `date=YYYY-MM-DD`
- **Biaya Kredit AI**: **Gratis**

---

### B. Saldo & Transaksi Kredit AI (Credits Ledger)

#### 1. Get Credits Balance

- **Path**: `GET /api/ai/credits`
- **File Rute**: `backend/src/routes/credits.route.ts`
- **File Controller**: `backend/src/controllers/credits.controller.ts`
- **Autentikasi**: Wajib (`requireUser`)
- **Struktur Response**: `{ balance: 145 }`

#### 2. Get Credits History

- **Path**: `GET /api/ai/credits/history`
- **File Rute**: `backend/src/routes/credits.route.ts`
- **Autentikasi**: Wajib (`requireUser`)
- **Struktur Response**: `{ history: [ { "id": "...", "amount": -15, "feature": "recipes", "created_at": "..." } ] }`

---

### C. Sistem Pembayaran & Webhook (Mayar Checkout Integration)

#### 1. Premium Registration Checkout

- **Path**: `POST /api/checkout/register`
- **File Rute**: `backend/src/routes/checkout.route.ts`
- **File Controller**: `backend/src/controllers/checkout.controller.ts`
- **Autentikasi**: Bebas (`anon`)
- **Payload**: `{ email: string, nickname: string, phone: string, couponCode?: string, referralCode?: string }`
- **Respons**: `{ checkoutUrl: "https://imayar.link/...", session: { ... } }`

#### 2. Credit Topup Checkout

- **Path**: `POST /api/checkout/topup`
- **File Rute**: `backend/src/routes/checkout.route.ts`
- **Autentikasi**: Wajib (`requireUser`)
- **Payload**: `{ packageId: "credits_100" | "credits_500" }`
- **Respons**: `{ checkoutUrl: "https://imayar.link/...", session: { ... } }`

#### 3. Webhook Mayar Handler

- **Path**: `POST /api/payment/webhook`
- **File Rute**: `backend/src/routes/webhook.mayar.route.ts`
- **File Controller**: `backend/src/controllers/webhook.mayar.controller.ts`
- **Autentikasi**: Khusus (`verifyWebhookToken`)
- **Deskripsi**: Dipanggil otomatis oleh server Mayar saat status transaksi pengguna menjadi sukses untuk mengaktifkan akun atau menambahkan kredit AI secara instan.

---

### D. Profil & Upload Aset (Avatar Upload)

#### 1. Upload Custom Avatar

- **Path**: `POST /api/upload-avatar`
- **File Rute**: `backend/src/routes/avatar.route.ts`
- **File Controller**: `backend/src/controllers/avatar.controller.ts`
- **Autentikasi**: Wajib (`requireUser`)
- **Request**: Multipart Form Data (file gambar `avatar`)
- **Batas File**: File harus bertipe gambar, maksimal ukuran 2MB (divalidasi di `backend/src/storage/`). Diunggah langsung ke Cloudflare R2 Bucket.

---

### E. Administrasi & Moderasi Komunitas (Admin Endpoints)

- **Prefix Path**: `/api/admin/*`
- **File Rute**: `backend/src/routes/admin.route.ts`
- **File Controller**: `backend/src/controllers/admin.controller.ts`
- **Autentikasi**: Ketat (`requireAdmin` / `is_admin = true`)
- **Daftar Endpoint**:
  - `GET /api/admin/users` — Membaca semua pengguna terdaftar.
  - `GET /api/admin/coupons` — Membaca daftar kupon promosi.
  - `POST /api/admin/coupons` — Membuat kupon baru.
  - `PATCH /api/admin/coupons/:id` — Mengubah detail kupon.
  - `DELETE /api/admin/coupons/:id` — Menghapus kupon.
  - `GET /api/admin/affiliates` — Membaca daftar partner afiliasi.
  - `POST /api/admin/affiliates` — Mendaftarkan partner afiliasi baru.
  - `PATCH /api/admin/affiliates/:id` — Mengubah detail afiliasi.
  - `DELETE /api/admin/affiliates/:id` — Menonaktifkan afiliasi.
  - `GET /api/admin/affiliates/conversions` — Membaca konversi afiliasi.
  - `PATCH /api/admin/affiliates/conversions/:id/payout` — Mencatat pembayaran komisi afiliasi.

---

## 3. Penanganan Error (Error Handling & Rate Limits)

Setiap terjadi kesalahan di sisi backend (seperti token kedaluwarsa atau server OpenRouter tidak merespon), backend akan mengembalikan status HTTP yang sesuai dengan pesan error bahasa Indonesia yang ramah pengguna:

| HTTP Status               | Penyebab Masalah                                                       | Format Response                                                                |
| ------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **400 Bad Request**       | Format payload tidak sesuai dengan skema Zod atau tanggal tidak valid. | `{ "error": "Format tanggal panduan siklus tidak valid." }`                    |
| **401 Unauthorized**      | JWT Token kosong, kedaluwarsa, atau tidak terdaftar di Supabase.       | `{ "error": "Missing or invalid session" }`                                    |
| **402 Payment Required**  | Saldo kredit AI pengguna habis/kurang untuk memproses request.         | `{ "error": "Saldo kredit AI tidak cukup.", "balance": 10, "required": 40 }`   |
| **409 Conflict**          | Request duplikat (misal: panduan siklus hari ini sudah dibuat).        | `{ "error": "Panduan siklus untuk hari ini sudah dibuat.", "guideId": "..." }` |
| **429 Too Many Requests** | Pengguna melebihi batas rate limit harian/menitan.                     | `{ "error": "Terlalu banyak permintaan. Silakan coba lagi nanti." }`           |
| **500 Server Error**      | Masalah internal server, API OpenRouter mati, atau kegagalan database. | `{ "error": "Gagal memproses analisis AI." }`                                  |
