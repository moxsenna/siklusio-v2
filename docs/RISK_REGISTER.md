# Siklusio Project Risk Register

Last updated: 2026-06-05  
Last verified against codebase: 2026-06-05  
Target Audience: Non-coder Founder & AI Coding Agents

---

## 1. Ikhtisar Manajemen Risiko (Risk Management Overview)

Siklusio v2 mengadopsi pendekatan manajemen risiko preventif. Sebagai aplikasi pendamping program hamil (promil) yang menggunakan kecerdasan buatan (AI) dan menyediakan forum komunikasi sosial, kami memetakan risiko ke dalam tiga kategori utama:

1. **Risiko Medis & Regulasi (Clinical & Regulatory Risks)**: Terkait penafsiran salah terhadap saran AI yang menyerupai diagnosis klinis.
2. **Risiko Teknis (Technical Risks)**: Terkait downtime API pihak ketiga, kegagalan sinkronisasi pembayaran, atau kebocoran data sensitif.
3. **Risiko Operasional (Operational Risks)**: Terkait penggelembungan biaya API token AI dan penyalahgunaan forum komunitas anonim.

---

## 2. Matriks Daftar Risiko (Risk Register Matrix)

Berikut adalah daftar risiko teridentifikasi beserta tingkat kemungkinan (probability), tingkat dampak (impact), serta rencana mitigasi dan kontinjensi:

| ID          | Deskripsi Risiko                                                                           | Kategori         | Probabilitas    | Dampak          | Rencana Mitigasi (Prevention)                                                                                                                     | Rencana Kontinjensi (Recovery)                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------ | ---------------- | --------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **RSK-001** | Pengguna menganggap output AI sebagai diagnosis medis klinis (PCOS, kesuburan).            | Medis & Regulasi | Sedang (Medium) | Tinggi (High)   | Menyertakan disclaimer medis wajib di bawah setiap saran AI dan melarang copy yang bersifat diagnosis klinis di prompt AI.                        | Memperbarui prompt AI dengan menyisipkan filter kata kunci terlarang dan merekomendasikan konsultasi Sp.OG.                         |
| **RSK-002** | AI memberikan janji kehamilan palsu ("pasti hamil" atau "jaminan berhasil").               | Medis & Regulasi | Rendah (Low)    | Tinggi (High)   | Validasi ketat prompt sistem (system prompts) OpenRouter di sisi backend untuk hanya fokus pada edukasi kebiasaan harian (_habits_).              | Mengubah model AI ke versi yang lebih patuh aturan instruksi (instruction-following model) jika model utama berhalusinasi.          |
| **RSK-003** | Kebocoran data sensitif pengguna (siklus, catatan kesehatan) ke pihak ketiga.              | Teknis           | Rendah (Low)    | Tinggi (High)   | Mengaktifkan Supabase RLS secara ketat pada seluruh tabel personal dan view publik. Melarang integrasi ad-tech pelacakan iklan.                   | Menonaktifkan sementara token klien bermasalah, mengaudit log RLS Supabase, dan merevisi kebijakan otorisasi.                       |
| **RSK-004** | Webhook pembayaran Mayar gagal disinkronkan (user bayar tapi akun tidak aktif).            | Teknis           | Sedang (Medium) | Tinggi (High)   | Menggunakan data `pending_registrations` untuk mencatat proses registrasi. Melakukan verifikasi token callback tepercaya (`MAYAR_WEBHOOK_TOKEN`). | Menyediakan fitur verifikasi transaksi manual bagi admin di Dashboard CRM untuk mengaktifkan akun secara manual jika webhook mati.  |
| **RSK-005** | Biaya pemakaian OpenRouter AI membengkak melebihi anggaran operasional.                    | Operasional      | Sedang (Medium) | Sedang (Medium) | Membatasi akses request AI per hari menggunakan kuota kredit pengguna dan mengaktifkan cache Surat Tenang harian.                                 | Menurunkan model default ke model gratis (`qwen/...:free`) atau menetapkan limit pengeluaran bulanan di akun OpenRouter.            |
| **RSK-006** | Forum komunitas disalahgunakan untuk menyebarkan spam, judi online, atau ujaran kebencian. | Operasional      | Tinggi (High)   | Sedang (Medium) | Menerapkan rate limit postingan di level database PostgreSQL, tombol Report bagi pengguna, dan sistem auto-hide konten bermasalah.                | Menyediakan dashboard moderasi admin (`admin.controller.ts`) untuk memblokir postingan atau mengatur ulang avatar pengguna.         |
| **RSK-007** | Kegagalan concurrency pada antrean rate limiter (race conditions).                         | Teknis           | Rendah (Low)    | Rendah (Low)    | Menggunakan advisory transaction locks (`pg_advisory_xact_lock`) pada database untuk menjaga akurasi hitungan limit konkuren.                     | Mengalihkan mode limiter ke memori lokal Worker (`RATE_LIMIT_FALLBACK_MODE = "memory"`) jika server database mengalami lag/timeout. |

---

## 3. Protokol Tindakan Darurat (Emergency Response Protocol)

Jika terjadi insiden keamanan data (misalnya kunci service role bocor) atau kegagalan transaksi pembayaran massal, ikuti protokol berikut:

1. **Insiden Kebocoran Kunci (Key Leakage)**: Segera ikuti panduan rotasi kunci di [MAINTENANCE.md](file:///d:/Coding/remix_-siklusio/docs/MAINTENANCE.md#key-rotation) untuk mencabut akses kunci lama dan memperbarui dengan kunci baru di Cloudflare Worker Secrets.
2. **Kegagalan Sistem Pembayaran (Payment Failure)**: Nonaktifkan rute inisialisasi checkout dengan mengalihkan API ke respons error pemeliharaan sementara, untuk mencegah user mentransfer uang pada transaksi yang tidak terdeteksi oleh sistem.
3. **Malfungsi AI (AI Outage)**: Alihkan model aktif di Worker environment variables ke model cadangan (fallback model) tanpa mengubah logika program, lalu lakukan redeploy Worker.
