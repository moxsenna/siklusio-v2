# Siklusio Security Handbook

Last updated: 2026-06-05  
Last verified against codebase: 2026-06-05  
Target Audience: Non-coder Founder & AI Coding Agents

---

## 1. Keamanan Autentikasi & Otorisasi (Authentication & Auth Gates)

Setiap request pengguna yang masuk ke API server backend wajib divalidasi keabsahannya. Keamanan ini dikelola oleh dua middleware utama:

| Middleware         | Lokasi File                                                                      | Tanggung Jawab (Responsibility)                                                                                                                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`requireUser`**  | [auth.ts](file:///d:/Coding/remix_-siklusio/backend/src/middlewares/auth.ts#L5)  | Membaca header `Authorization: Bearer <token>`, memvalidasi token JWT pengguna menggunakan auth Supabase remote (`supabaseAdmin.auth.getUser(token)`). Mengembalikan data user atau menolak akses dengan HTTP 401 jika tidak valid. |
| **`requireAdmin`** | [auth.ts](file:///d:/Coding/remix_-siklusio/backend/src/middlewares/auth.ts#L28) | Menjalankan `requireUser` pertama kali, kemudian memvalidasi apakah kolom `is_admin` di tabel `profiles` bernilai `true` untuk user terkait. Mengembalikan session admin atau menolak dengan HTTP 401/403.                          |

- **Aturan AI Agent**: Seluruh endpoint backend yang mengakses data personal (Habits, Calendar, Credits) atau memproses AI berbayar wajib di-gate di dalam controller menggunakan middleware ini.

---

## 2. Keamanan Database & RLS (Database & Row Level Security)

Siklusio menggunakan PostgreSQL Row Level Security (RLS) di Supabase untuk memastikan pengguna tidak dapat mengintip atau mengubah data pengguna lain.

- **Bypass RLS**: Akses data langsung dari aplikasi mobile (`mobile-app/`) menggunakan kunci `anon` publik **selalu** terikat oleh aturan RLS di database. Kunci super-admin `SUPABASE_SERVICE_ROLE_KEY` hanya digunakan oleh backend Workers untuk mem-bypass RLS demi kelancaran integrasi sistem (seperti webhook pembayaran).
- **Security Invoker**: Seluruh database views (PostgreSQL Views) wajib dibuat dengan opsi `security_invoker = true` (pada PostgreSQL 15+) guna menjamin aturan RLS tabel dasar tetap berlaku bagi klien.
- _Untuk detail skema kebijakan RLS, silakan rujuk dokumen utama:_ [DATABASE.md](file:///d:/Coding/remix_-siklusio/docs/DATABASE.md).

---

## 3. Keamanan Webhook Pembayaran (Webhook Protection)

Callback webhook dari Mayar (`POST /api/payment/webhook`) adalah jalur sensitif karena memicu pembuatan akun premium dan pengisian saldo kredit AI.

- **Validasi Token**: Webhook diverifikasi dengan membaca header `x-callback-token` (atau `X-Callback-Token`) dan mencocokkannya dengan nilai rahasia `MAYAR_WEBHOOK_TOKEN` yang disimpan secara aman di environment bindings Cloudflare Worker.
- **Idempotensi**: Sistem memverifikasi ID Transaksi (`mayar_transaction_id`) terhadap tabel `ai_credit_topups` dan `affiliate_conversions` sebelum memproses. Transaksi yang sudah terbayar tidak akan diproses ulang untuk menghindari eksploitasi pengisian kredit berulang (double-grant).
- _Rujukan berkas implementasi:_ [webhook.mayar.controller.ts](file:///d:/Coding/remix_-siklusio/backend/src/controllers/webhook.mayar.controller.ts#L11-L23).

---

## 4. Perlindungan Data Pribadi (PII & Webhook Redaction)

Guna menghindari kebocoran data pribadi (PII) pengguna di platform log Cloudflare, Siklusio menggunakan utilitas pembersihan log dinamis:

- **Pembersih Log Otomatis**: Fungsi `logInfo`, `logWarn`, dan `logError` di [redaction.ts](file:///d:/Coding/remix_-siklusio/backend/src/logging/redaction.ts) memindai argumen log secara rekursif dan menyensor data sensitif (seperti Authorization headers, Token JWT, alamat Email, Nomor Telepon WhatsApp, nama bank, dan nomor rekening) menggunakan regex sebelum mencetak ke console stdout.
- **Aturan AI Agent**: Gunakan selalu fungsi log terenkapsulasi ini saat menulis log di backend:
  ```typescript
  import { logInfo, logError } from "../logging/redaction";
  // JANGAN gunakan console.log langsung untuk data request/response
  ```

---

## 5. Keamanan Penyimpanan File & API Keys (R2 & ImgBB Keys)

- **Upload Avatar**: Proses upload avatar kustom oleh pengguna divalidasi ukurannya (maksimal 2MB) dan jenis binernya di sisi backend Hono sebelum diunggah ke Cloudflare R2 bucket menggunakan library `@aws-sdk/client-s3` (terletak di [avatar.controller.ts](file:///d:/Coding/remix_-siklusio/backend/src/controllers/avatar.controller.ts)).
- **Klien ImgBB API Key**: Variabel `EXPO_PUBLIC_IMGBB_API_KEY` digunakan pada aplikasi mobile untuk upload kustom secara direct. Batasan hak akses key ini disetel pada dashboard ImgBB agar hanya bisa melakukan upload gambar saja tanpa izin modifikasi file.

---

## 🩺 6. Medical & AI Output Safety (Keselamatan Konten Medis)

Siklusio diposisikan sebagai pendamping promil yang hangat, suportif, dan aman bagi perempuan Indonesia. **Siklusio bukan alat medis, bukan dokter virtual, dan bukan alat penjamin fertilitas.**

AI Coding Agent dan pengembang wajib memastikan kepatuhan penuh terhadap aturan keselamatan konten berikut:

| Aturan Keselamatan                       | Instruksi Teknis Pengembang                                                                                                                                                                                    | Contoh Penerapan Copy                                                                                                                                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Jangan Mendiagnosis Medis**            | AI tidak boleh mengeluarkan pernyataan diagnosis (misal: memvonis PCOS, endometriosis, atau infertilitas). Jika gejala tidak wajar terdeteksi, arahkan selalu untuk berkonsultasi ke dokter kandungan (Sp.OG). | _“Siklus haid yang tidak teratur bisa dipengaruhi banyak hal seperti kelelahan atau hormon. Untuk memastikan kondisi tubuhmu, sangat disarankan berkonsultasi dengan dokter kandungan (Sp.OG) kesayanganmu ya.”_ |
| **Jangan Menjanjikan Kehamilan**         | Hindari menjanjikan kehamilan atau menjamin keberhasilan promil ("pasti hamil dengan tips ini", "garansi hamil bulan depan").                                                                                  | _“Ikhtiar promil harian ini adalah langkah kecil yang baik untuk menyiapkan tubuhmu. Mari tetap konsisten menjaga kebiasaan sehat hari ini, ya.”_                                                                |
| **Wajib Menampilkan Disclaimer**         | Setiap response AI untuk analisis siklus, saran nutrisi, dan habit coaching wajib menyertakan disclaimer medis di bagian bawah.                                                                                | _“Informasi ini bersifat edukatif dan pendampingan umum, bukan diagnosis medis. Konsultasikan dengan dokter kandungan jika kamu mengalami nyeri berat atau kendala siklus lainnya.”_                             |
| **Bahasa yang Hangat & Tidak Overclaim** | Gunakan gaya bahasa Indonesia yang empati, menenangkan, menggunakan panggilan "kamu" atau sapaan personal nickname. Hindari istilah klinis yang terkesan mendiagnosis atau menghakimi.                         | _“Halo [Nickname], hari ini tubuhmu sedang bersiap untuk fase ovulasi. Tetap jaga hidrasi dan istirahat yang cukup ya, kamu sudah melakukan yang terbaik hari ini.”_                                             |
