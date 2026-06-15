# Siklusio API Reference 🌸

A Menstrual Cycle and Pregnancy Preparation Companion API for Your Application.

Welcome to the Siklusio API documentation! This service is designed to help developers and AI agents integrate state-of-the-art cycle tracking, personalized AI guidance, and wellness features into mobile and web applications. 🚀

---

## 🔒 Kebijakan Autentikasi (Authentication Policy)

Mayoritas endpoint API Siklusio memerlukan token autentikasi. Token pengguna dikirimkan melalui header `Authorization` dengan tipe `Bearer`:

```http
Authorization: Bearer <supabase_jwt_session_token>
```

> [!IMPORTANT]
>
> - **Klien Publik (`anon`)**: Boleh mengakses landing pages, webhook Mayar, dan inisialisasi checkout tanpa menyertakan token.
> - **Pengguna Terdaftar (`authenticated`)**: Memiliki akses ke fitur harian AI, riwayat kredit, dan upload avatar. Wajib menyertakan Supabase JWT Token.
> - **Admin (`is_admin = true`)**: Memiliki akses khusus ke seluruh endpoint `/api/admin/*`.

---

## 🚀 Quick Start Guide

Untuk memanggil API Siklusio, ikuti langkah-langkah di bawah ini.

### 1. Inisialisasi Checkout Registrasi

Sebelum menggunakan fitur berbayar AI, pengguna melakukan checkout melalui Mayar.

#### Node.js

```javascript
const axios = require("axios");

const url = "https://api.siklusio.web.id/api/checkout/register";
const payload = {
  email: "bunda@example.com",
  nickname: "Bunda",
  phone: "08123456789",
};

axios
  .post(url, payload)
  .then((response) => {
    console.log("Checkout URL:", response.data.checkoutUrl);
  })
  .catch((error) => {
    console.error("Error:", error.response ? error.response.data : error.message);
  });
```

#### Python

```python
import requests

url = "https://api.siklusio.web.id/api/checkout/register"
payload = {
    "email": "bunda@example.com",
    "nickname": "Bunda",
    "phone": "08123456789"
}

try:
    response = requests.post(url, json=payload)
    response.raise_for_status()
    print("Checkout URL:", response.json().get("checkoutUrl"))
except requests.exceptions.RequestException as e:
    print("Error:", response.json() if response is not None else e)
```

---

### 2. Membuat Signature Headers untuk Authenticated API

Setelah pengguna masuk dan mendapatkan token JWT dari Supabase, sertakan token tersebut pada header request.

#### Node.js

```javascript
const headers = {
  Authorization: "Bearer <supabase_jwt_session_token>",
  "Content-Type": "application/json",
};
```

#### Python

```python
headers = {
    "Authorization": "Bearer <supabase_jwt_session_token>",
    "Content-Type": "application/json"
}
```

---

### 3. Generate Cycle Guide (Biaya: 40 Kredit)

Gunakan endpoint ini untuk memprediksi siklus dan menerima panduan harian.

#### Node.js

```javascript
const axios = require("axios");

const url = "https://api.siklusio.web.id/api/cycle-guide/generate";
const payload = {
  generatedForDate: "2026-06-16",
  guideLevel: "starter",
  nickname: "Bunda",
  habitSnapshot: {},
};

axios
  .post(url, payload, { headers })
  .then((response) => {
    console.log("Cycle Guide Summary:", response.data.result.summary);
    console.log("Remaining Credits:", response.data.balance);
  })
  .catch((error) => {
    console.error("Error:", error.response ? error.response.data : error.message);
  });
```

#### Python

```python
import requests

url = "https://api.siklusio.web.id/api/cycle-guide/generate"
payload = {
    "generatedForDate": "2026-06-16",
    "guideLevel": "starter",
    "nickname": "Bunda",
    "habitSnapshot": {}
}

try:
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    data = response.json()
    print("Cycle Guide Summary:", data["result"]["summary"])
    print("Remaining Credits:", data["balance"])
except requests.exceptions.RequestException as e:
    print("Error:", response.json() if response is not None else e)
```

---

### 4. Generate Calming Reassurance / Surat Tenang TWW (Biaya: 25 Kredit)

Membantu Bunda mengatasi kecemasan di masa TWW (Two Weeks Wait).

#### Node.js

```javascript
const axios = require("axios");

const url = "https://api.siklusio.web.id/api/generate-calming-reassurance";
const payload = {
  nickname: "Bunda",
  userJournal: "Hari ini rasanya cemas sekali menunggu hasil garis dua...",
  generatedForDate: "2026-06-16",
};

axios
  .post(url, payload, { headers })
  .then((response) => {
    console.log("Surat Tenang AI:", response.data.result.reassurance);
    console.log("New Balance:", response.data.balance);
  })
  .catch((error) => {
    console.error("Error:", error.response ? error.response.data : error.message);
  });
```

#### Python

```python
import requests

url = "https://api.siklusio.web.id/api/generate-calming-reassurance"
payload = {
    "nickname": "Bunda",
    "userJournal": "Hari ini rasanya cemas sekali menunggu hasil garis dua...",
    "generatedForDate": "2026-06-16"
}

try:
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    data = response.json()
    print("Surat Tenang AI:", data["result"]["reassurance"])
    print("New Balance:", data["balance"])
except requests.exceptions.RequestException as e:
    print("Error:", response.json() if response is not None else e)
```

---

### 5. Cek Saldo Kredit AI (Biaya: Gratis)

Melakukan self-monitoring sisa kredit AI pengguna secara berkala.

#### Node.js

```javascript
const axios = require("axios");

const url = "https://api.siklusio.web.id/api/ai/credits";

axios
  .get(url, { headers })
  .then((response) => {
    console.log("Remaining AI Credits:", response.data.balance);
  })
  .catch((error) => {
    console.error("Error:", error.response ? error.response.data : error.message);
  });
```

#### Python

```python
import requests

url = "https://api.siklusio.web.id/api/ai/credits"

try:
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    print("Remaining AI Credits:", response.json().get("balance"))
except requests.exceptions.RequestException as e:
    print("Error:", response.json() if response is not None else e)
```

---

## 🗺️ Pemetaan Endpoint API (API Endpoints Map)

### A. Fitur AI & Kesehatan (AI Features)

#### `POST /api/cycle-guide/generate`

Membuat analisis panduan siklus medis berbasis kecerdasan buatan.

- **Autentikasi**: Wajib (`Bearer token`)
- **Biaya Kredit**: `40 Kredit`
- **Request Body (Zod Validation)**:

| Field              | Type   | Required | Description / Constraints                                        |
| :----------------- | :----- | :------- | :--------------------------------------------------------------- |
| `generatedForDate` | string | **Ya**   | Tanggal target (Format: `YYYY-MM-DD`).                           |
| `guideLevel`       | string | **Ya**   | Tingkat kedalaman panduan (`starter` \| `active` \| `personal`). |
| `nickname`         | string | **Ya**   | Panggilan ramah untuk personalisasi.                             |
| `habitSnapshot`    | object | **Ya**   | Snapshot aktivitas habit hari ini.                               |

- **Sample Response (HTTP 200)**:

```json
{
  "guide": {
    "id": "c6a2e46b-80a5-48b1-a67b-23f2b87fcf99",
    "user_id": "a6f434b6-a475-40b1-81e3-3ce9868945ff",
    "status": "active",
    "created_at": "2026-06-16T00:00:00.000Z"
  },
  "result": {
    "summary": "Hari ini Bunda memasuki masa subur.",
    "bodySignals": ["Suhu basal tubuh sedikit meningkat", "Keputihan encer bening"],
    "importantDates": ["2026-06-18 (Estimasi Ovulasi)"],
    "focusThisWeek": "Fokus pada olahraga ringan dan nutrisi penunjang kesuburan.",
    "habitCoachBridge": "Pastikan mencatat keputihan secara rutin.",
    "disclaimer": "Informasi ini bersifat edukatif dan bukan saran medis."
  },
  "balance": 160
}
```

---

#### `GET /api/cycle-guide/today`

Membaca panduan siklus yang sudah dibuat pada tanggal tertentu.

- **Autentikasi**: Wajib (`Bearer token`)
- **Biaya Kredit**: `Gratis (Read-only)`
- **Request Params**: Query `date=YYYY-MM-DD`
- **Sample Response (HTTP 200)**:

```json
{
  "guide": {
    "id": "c6a2e46b-80a5-48b1-a67b-23f2b87fcf99",
    "result": {
      "summary": "Hari ini Bunda memasuki masa subur.",
      "bodySignals": ["Suhu basal tubuh sedikit meningkat"],
      "importantDates": ["2026-06-18"],
      "focusThisWeek": "Olahraga ringan",
      "habitCoachBridge": "Catat keputihan",
      "disclaimer": "Informasi edukatif"
    }
  }
}
```

---

#### `POST /api/generate-recipes`

Membuat rekomendasi 2 menu makanan sehat berbasis fase siklus tubuh Bunda hari ini.

- **Autentikasi**: Wajib (`Bearer token`)
- **Biaya Kredit**: `15 Kredit`
- **Request Body**:

| Field              | Type   | Required | Description                                 |
| :----------------- | :----- | :------- | :------------------------------------------ |
| `generatedForDate` | string | **Ya**   | Tanggal target (Format: `YYYY-MM-DD`).      |
| `phase`            | string | Tidak    | Keterangan fase siklus saat ini (opsional). |

- **Sample Response (HTTP 200)**:

```json
{
  "generation": {
    "id": "rec_883a992",
    "user_id": "a6f434b6",
    "status": "active"
  },
  "result": {
    "phaseBenefit": "Meningkatkan asupan zat besi selama masa haid.",
    "groceries": ["Ikan Kembung", "Bayam", "Tempe", "Telur"],
    "recipes": [
      {
        "name": "Kembung Bakar Sambal Tomat",
        "ingredients": ["Ikan kembung 2 ekor", "Tomat", "Bawang"],
        "steps": ["Bersihkan ikan.", "Bakar hingga matang.", "Sajikan."]
      }
    ]
  },
  "balance": 145
}
```

---

#### `GET /api/recipes/today`

Membaca menu resep harian yang sudah di-generate pada tanggal tersebut.

- **Autentikasi**: Wajib (`Bearer token`)
- **Biaya Kredit**: `Gratis`
- **Request Params**: Query `date=YYYY-MM-DD`

---

#### `POST /api/habit-coach/generate`

Membuat perencanaan program habit promil yang dipandu oleh AI coach.

- **Autentikasi**: Wajib (`Bearer token`)
- **Biaya Kredit**: `50 Kredit` (atau `60 Kredit` jika mode `renewal`)
- **Request Body**:

| Field              | Type   | Required | Description                                |
| :----------------- | :----- | :------- | :----------------------------------------- |
| `generatedForDate` | string | **Ya**   | Tanggal target (Format: `YYYY-MM-DD`).     |
| `mode`             | string | Tidak    | Mode pembuatan, `standard` atau `renewal`. |

- **Sample Response (HTTP 200)**:

```json
{
  "plan": {
    "id": "plan_9110b",
    "status": "active"
  },
  "result": {
    "coachSummary": "Fokus minggu ini adalah hidrasi optimal dan pola tidur teratur.",
    "days": [{ "day": 1, "task": "Minum air putih minimal 2 Liter" }]
  },
  "balance": 95
}
```

---

#### `GET /api/habit-coach/current`

Membaca rencana habit coach yang sedang aktif saat ini.

- **Autentikasi**: Wajib (`Bearer token`)
- **Biaya Kredit**: `Gratis`

---

#### `POST /api/generate-cycle-report`

Membuat laporan komparasi siklus bulanan berdasarkan catatan harian.

- **Autentikasi**: Wajib (`Bearer token`)
- **Biaya Kredit**: `Gratis (Termasuk Paket Premium)`
- **Sample Response (HTTP 200)**:

```json
{
  "summary": "Siklus Bunda dalam 3 bulan terakhir cukup stabil dengan rata-rata 28 hari.",
  "bodyInsights": ["Gejala kram perut menurun dengan tidur cukup"],
  "actionPlan": ["Kurangi konsumsi kafein berlebih"],
  "encouragement": "Bunda melakukan ikhtiar yang sangat baik!"
}
```

---

#### `POST /api/generate-habits-insight`

Membuat analisis kebiasaan sehat harian Bunda untuk promil yang lebih optimal.

- **Autentikasi**: Wajib (`Bearer token`)
- **Biaya Kredit**: `Gratis (Termasuk Paket Premium)`

---

#### `POST /api/generate-calming-reassurance`

Menghasilkan Surat Tenang AI berdasarkan tulisan jurnal kecemasan Bunda saat masa TWW.

- **Autentikasi**: Wajib (`Bearer token`)
- **Biaya Kredit**: `25 Kredit` (Gratis jika memuat cache Surat Tenang yang dibuat di hari yang sama)
- **Request Body**:

| Field              | Type   | Required | Description                                            |
| :----------------- | :----- | :------- | :----------------------------------------------------- |
| `nickname`         | string | **Ya**   | Nama panggilan Bunda.                                  |
| `userJournal`      | string | **Ya**   | Curahan hati / jurnal rasa cemas yang dirasakan Bunda. |
| `generatedForDate` | string | **Ya**   | Tanggal pembuatan (Format: `YYYY-MM-DD`).              |

- **Sample Response (HTTP 200)**:

```json
{
  "letter": {
    "id": "let_a8837119",
    "status": "active"
  },
  "result": {
    "title": "Surat Tenang Untuk Bunda",
    "opening": "Halo Bunda sayang, tarik napas perlahan...",
    "validation": "Sangat wajar bila masa menanti ini terasa cemas.",
    "grounding": "Rasakan lantai di bawah kakimu, hembuskan napas.",
    "affirmation": "Tubuhku adalah tempat yang aman dan damai.",
    "breathingTip": "Latihan pernapasan 4-7-8 selama 3 siklus.",
    "closing": "Peluk hangat dari Sio.",
    "reassurance": "Bunda sudah melakukan yang terbaik. Istirahatlah dengan tenang."
  },
  "balance": 70
}
```

---

#### `GET /api/tww-sanctuary/today`

Mengambil Surat Tenang yang sudah dibuat hari ini (jika ada).

- **Autentikasi**: Wajib (`Bearer token`)
- **Biaya Kredit**: `Gratis`
- **Request Params**: Query `date=YYYY-MM-DD`

---

### B. Saldo & Transaksi Kredit AI (Credits Ledger)

#### `GET /api/ai/credits`

Mendapatkan sisa saldo kredit AI milik pengguna.

- **Autentikasi**: Wajib (`Bearer token`)
- **Sample Response (HTTP 200)**:

```json
{
  "balance": 145
}
```

---

#### `GET /api/ai/credits/history`

Membaca riwayat pemakaian dan pengisian kredit AI pengguna.

- **Autentikasi**: Wajib (`Bearer token`)
- **Sample Response (HTTP 200)**:

```json
{
  "history": [
    {
      "id": "led_33827110a",
      "amount": -15,
      "feature": "recipes_today",
      "reason": "luteal",
      "created_at": "2026-06-15T10:00:00.000Z"
    }
  ]
}
```

---

### C. Sistem Pembayaran & Webhook (Mayar Checkout Integration)

#### `POST /api/checkout/register`

Inisialisasi pendaftaran akun Premium Lifetime baru.

- **Autentikasi**: Bebas (`anon`)
- **Request Body**:

| Field          | Type   | Required | Description                       |
| :------------- | :----- | :------- | :-------------------------------- |
| `email`        | string | **Ya**   | Email aktif pendaftar.            |
| `nickname`     | string | **Ya**   | Panggilan pengguna.               |
| `phone`        | string | **Ya**   | Nomor telepon aktif WhatsApp.     |
| `couponCode`   | string | Tidak    | Kode kupon diskon (opsional).     |
| `referralCode` | string | Tidak    | Kode afiliasi perujuk (opsional). |

- **Sample Response (HTTP 200)**:

```json
{
  "checkoutUrl": "https://imayar.link/checkout/premium-siklusio-v2",
  "session": {
    "id": "sess_883011a"
  }
}
```

---

#### `POST /api/checkout/topup`

Membuat tautan pembayaran Mayar untuk melakukan isi ulang kredit AI.

- **Autentikasi**: Wajib (`Bearer token`)
- **Request Body**:

| Field       | Type   | Required | Description / Constraints                              |
| :---------- | :----- | :------- | :----------------------------------------------------- |
| `packageId` | string | **Ya**   | Kode paket isi ulang (`credits_100` \| `credits_500`). |

- **Sample Response (HTTP 200)**:

```json
{
  "checkoutUrl": "https://imayar.link/checkout/topup-100",
  "session": {
    "id": "sess_topup_2210a"
  }
}
```

---

#### `POST /api/payment/webhook`

Endpoint callback yang dipanggil otomatis oleh server Mayar saat status transaksi sukses.

- **Autentikasi**: Internal Token (`verifyWebhookToken`)
- **Header Khusus**: `x-mayar-signature` atau bearer token khusus.
- **Deskripsi**: Melakukan aktivasi akun atau pengisian kredit secara instan.
- **Logika Router Multi-App**: Jika flag env `MAYAR_MULTI_APP_ROUTER_ENABLED=true` dan payload terdeteksi berasal dari VibeNovel (`extraData.app=vibenovel`), request akan diforward secara transparan ke URL webhook VibeNovel.

---

### D. Profil & Upload Aset (Avatar Upload)

#### `POST /api/upload-avatar`

Mengunggah berkas foto avatar pengguna ke Cloudflare R2 bucket.

- **Autentikasi**: Wajib (`Bearer token`)
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `avatar`: File gambar biner (Max `2MB`, tipe `.jpg`, `.png`, atau `.webp`).
- **Sample Response (HTTP 200)**:

```json
{
  "avatarUrl": "https://cdn.siklusio.web.id/avatars/user-991023b-avatar.webp"
}
```

---

### E. Administrasi & Moderasi Komunitas (Admin Endpoints)

> [!WARNING]
> Seluruh endpoint admin di bawah ini diproteksi dengan ketat menggunakan middleware `requireAdmin` (`is_admin = true`). Pihak luar tidak diperkenankan mengakses endpoint ini.

#### 1. Manajemen Pengguna & Kupon

- `GET /api/admin/users` — Membaca seluruh daftar pengguna terdaftar.
- `GET /api/admin/coupons` — Membaca kupon promosi.
- `POST /api/admin/coupons` — Membuat kupon baru.
- `PATCH /api/admin/coupons/:id` — Mengubah detail kupon.
- `DELETE /api/admin/coupons/:id` — Menghapus kupon.

#### 2. Program Kemitraan Afiliasi

- `GET /api/admin/affiliates` — Membaca daftar partner afiliasi terdaftar.
- `POST /api/admin/affiliates` — Mendaftarkan partner afiliasi baru.
- `PATCH /api/admin/affiliates/:id` — Mengubah detail afiliasi.
- `DELETE /api/admin/affiliates/:id` — Menonaktifkan afiliasi.
- `GET /api/admin/affiliates/conversions` — Membaca log konversi afiliasi.
- `PATCH /api/admin/affiliates/conversions/:id/payout` — Mencatat pembayaran komisi afiliasi.

#### 3. Autoresponder WhatsApp

- `GET /api/admin/whatsapp/settings` — Membaca template & parameter autoresponder WhatsApp.
- `PATCH /api/admin/whatsapp/settings/:eventKey` — Mengubah template per event.
- `POST /api/admin/whatsapp/preview` — Menguji keluaran template autoresponder dengan data tiruan.
- `POST /api/admin/whatsapp/test` — Mengirim pesan teks uji coba WhatsApp ke nomor tertentu.
- `GET /api/admin/whatsapp/logs` — Melihat status & log pengiriman pesan WhatsApp.

---

## ⚠️ Penanganan Error & Batasan Rate Limit (Error Handling)

Setiap terjadi kegagalan sistem atau request tidak valid, API akan memberikan response HTTP yang sesuai disertai pesan error dalam bahasa Indonesia yang ramah pengguna:

| HTTP Status               | Penyebab Masalah                                           | Format Response JSON                                                         |
| :------------------------ | :--------------------------------------------------------- | :--------------------------------------------------------------------------- |
| **400 Bad Request**       | Skema input Zod tidak sesuai atau parameter tanggal salah. | `{"error": "Format tanggal panduan siklus tidak valid."}`                    |
| **401 Unauthorized**      | Token JWT kosong, salah, atau kedaluwarsa.                 | `{"error": "Missing or invalid session"}`                                    |
| **402 Payment Required**  | Kredit AI pengguna habis untuk memproses request AI.       | `{"error": "Saldo kredit AI tidak cukup.", "balance": 10, "required": 40}`   |
| **409 Conflict**          | Request duplikat (misal: panduan hari ini sudah dibuat).   | `{"error": "Panduan siklus untuk hari ini sudah dibuat.", "guideId": "..."}` |
| **429 Too Many Requests** | Pengguna melebihi batas request harian / menitan.          | `{"error": "Terlalu banyak permintaan. Silakan coba lagi nanti."}`           |
| **500 Server Error**      | Masalah server internal, OpenRouter mati, atau R2 error.   | `{"error": "Gagal memproses analisis AI."}`                                  |
