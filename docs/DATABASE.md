# Siklusio Database Guide

Last updated: 2026-06-05  
Last verified against codebase: 2026-06-05  
Target Audience: Non-coder Founder & AI Coding Agents

---

## 1. Sumber Kebenaran Tunggal & Nuansa Status Migrasi

Seluruh perubahan skema database pada Siklusio v2 wajib dikelola secara ketat melalui sistem migrasi terstruktur. Jangan pernah melakukan perubahan skema secara manual langsung melalui dashboard Supabase.

### 🛑 Perbedaan Penting: Migrasi Produksi vs SQL Legacy

1. **`supabase/migrations/`** is the canonical source of truth for all production database schema changes. Setiap file di dalamnya dijalankan secara berurutan dan otomatis oleh CLI Supabase saat rilis dilakukan.
2. **`supabase/*.sql` (ROOT SNIPPETS - LEGACY/REFERENSI)**: Berkas SQL yang berada langsung di root folder `supabase/` (seperti `schema.sql`, `community.sql`, `ai_credits.sql`, dll) **bukanlah** skema aktif yang langsung diaplikasikan ke database produksi. File-file ini adalah catatan sejarah pengembangan lama dan hanya digunakan sebagai referensi logika asli sebelum didekomposisi ke migrasi terstruktur. **Jangan pernah mengimpor berkas root SQL langsung ke database produksi.**

---

## 2. Inventori Tabel Database (Table Inventory)

Berikut adalah daftar tabel utama yang ada di dalam database Siklusio beserta peruntukannya:

| Nama Tabel                  | Deskripsi Penggunaan                                                                      | Kebijakan Row Level Security (RLS)                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **`profiles`**              | Informasi profil dasar pengguna (nama panggilan, HPHT, panjang siklus, data suami).       | User hanya bisa membaca dan mengubah baris miliknya sendiri (`auth.uid() = id`).                                                            |
| **`activity_history`**      | Log harian aktivitas (checklist habits) dan gejala (_symptoms_) yang dimasukkan pengguna. | User hanya bisa mengelola data miliknya sendiri (`auth.uid() = user_id`).                                                                   |
| **`ai_credit_balances`**    | Saldo kredit AI saat ini per pengguna.                                                    | RLS aktif. Klien hanya dapat membaca (`SELECT`), mutasi saldo (`INSERT/UPDATE`) hanya bisa dilakukan via RPC tepercaya oleh `service_role`. |
| **`ai_credit_ledger`**      | Buku besar transaksi kredit AI (riwayat masuk/keluar kredit).                             | RLS aktif. Read-only untuk pemilik akun, mutasi dikontrol ketat oleh sistem.                                                                |
| **`ai_credit_topups`**      | Log riwayat pembelian topup kredit AI.                                                    | RLS aktif. Read-only untuk pengguna, ditulis oleh sistem webhook Mayar.                                                                     |
| **`recipe_generations`**    | Rekomendasi nutrisi harian yang dihasilkan oleh AI untuk fase siklus terkait.             | RLS aktif. User hanya bisa melihat hasil miliknya sendiri.                                                                                  |
| **`habit_coach_plans`**     | Rencana kebiasaan harian jangka panjang yang disusun AI untuk promil.                     | RLS aktif. Pemilik rencana saja yang dapat mengakses.                                                                                       |
| **`cycle_guides`**          | Hasil analisis siklus berkala terpersonalisasi yang diajukan ke OpenRouter.               | RLS aktif. Pemilik akun saja yang memiliki hak baca.                                                                                        |
| **`pending_registrations`** | Pendaftaran member premium yang statusnya masih menunggu konfirmasi pembayaran.           | RLS aktif. Dikelola oleh backend webhook pembayaran.                                                                                        |
| **`checkout_sessions`**     | Sesi transaksi pembayaran Mayar.                                                          | RLS aktif. Dibuat saat checkout dimulai dan diverifikasi oleh webhook.                                                                      |
| **`coupons`**               | Voucher potongan harga promosi.                                                           | RLS aktif. Read-only untuk user biasa, write-only untuk admin.                                                                              |
| **`affiliates`**            | Data akun afiliasi untuk pelacakan rujukan (referral).                                    | RLS aktif. Klien biasa tidak bisa mengubah.                                                                                                 |
| **`affiliate_conversions`** | Log transaksi konversi rujukan yang sukses.                                               | RLS aktif. Diproses oleh transaksi sistem.                                                                                                  |
| **`community_posts`**       | Postingan diskusi forum komunitas anonim.                                                 | RLS aktif. User terautentikasi dapat membaca dan membuat postingan. Postingan anonim menyembunyikan `user_id` di tingkat klien.             |
| **`community_comments`**    | Komentar di bawah postingan komunitas.                                                    | RLS aktif. User terautentikasi dapat membuat komentar.                                                                                      |
| **`community_reactions`**   | Reaksi (seperti dukungan emosional) terhadap post.                                        | RLS aktif. Satu user dibatasi maksimal satu reaksi per postingan.                                                                           |
| **`community_reports`**     | Laporan penyalahgunaan postingan/komentar yang melanggar ketentuan.                       | RLS aktif. User dapat membuat laporan, tetapi tidak dapat melihat laporan buatan orang lain.                                                |
| **`crm_profiles`**          | View/Tabel bantuan untuk pengelolaan administrasi dan CRM.                                | Dibatasi secara ketat hanya untuk admin.                                                                                                    |

---

## 3. Hasil List Migrasi (Current Migration State)

Berikut adalah riwayat berkas migrasi database terverifikasi yang telah diaplikasikan:

- `20260531010100_ai_credits.sql`
- `20260531010200_habit_coach.sql`
- `20260531010300_cycle_guides.sql`
- `20260531010401_cycle_guides_unique.sql`
- `20260531010402_recipe_generations.sql`
- `20260531112800_ai_credit_topups.sql`
- `20260601094508_onboarding_completion_flag.sql`
- `20260601100443_pending_registration_auth_user_id.sql`
- `20260601101749_atomic_ai_credit_topup_processing.sql`
- `20260602164929_checkout_affiliate_support_tables.sql`
- `20260602174912_phase28_rls_function_grants.sql`
- `20260604094057_rate_limit_db.sql`
- `20260604100412_rate_limit_row_lock.sql`
- `20260604104737_rate_limit_atomic_lock.sql`

---

## 4. Berkas TypeScript Types yang Dihasilkan (Generated Types)

- Generated type source: [database.types.ts](file:///d:/Coding/remix_-siklusio/supabase/types/database.types.ts)
- Jangan pernah mengedit berkas ini secara manual karena berkas ini di-generate otomatis oleh Supabase CLI.

---

## 5. Inventori Fungsi Database (RPC / Database Functions)

Operasi database yang kompleks dilakukan di sisi database menggunakan PostgreSQL Functions (RPC) demi keamanan dan atomisitas transaksi:

| Nama Fungsi (RPC)                  | Dipanggil Oleh        | Tanggung Jawab & Logika Bisnis                                                                                                          |
| ---------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **`check_rate_limit`**             | Backend Middleware    | Memvalidasi batas request per IP/User menggunakan kunci transaksi pg_advisory_xact_lock untuk menjamin ketepatan penghitungan konkuren. |
| **`process_paid_ai_credit_topup`** | Mayar Webhook Service | Memproses transaksi topup secara atomik, menambah saldo kredit, mencatat histori ke buku besar, dan mematikan idempotensi double-claim. |
| **`get_community_feed`**           | Mobile Client         | Memuat feed komunitas dengan pengurutan terbaru, menyaring postingan yang dilaporkan melebihi batas toleransi secara otomatis.          |
| **`get_post_comments`**            | Mobile Client         | Memuat komentar terkait dari postingan dengan penanganan proteksi privasi akun anonim.                                                  |
| **`admin_get_moderation_queue`**   | Mobile Admin Screen   | Menampilkan daftar konten yang dilaporkan pengguna lain untuk tindakan moderasi.                                                        |
| **`admin_moderate_target`**        | Mobile Admin Screen   | Mempertahankan atau menyembunyikan konten secara permanen di feed komunitas.                                                            |
| **`admin_reset_user_avatar`**      | Mobile Admin Screen   | Mereset gambar avatar kustom pengguna jika dinilai tidak pantas/melanggar aturan visual.                                                |

---

## 6. Panduan Keamanan Skema (Security Guidelines)

### A. Kebijakan Row Level Security (RLS)

Setiap tabel yang dibuat wajib mengaktifkan RLS dengan perintah:

```sql
ALTER TABLE nama_tabel ENABLE ROW LEVEL SECURITY;
```

Kebijakan RLS harus memisahkan hak akses secara spesifik:

- **`anon` (Pengguna Publik Tanpa Sesi)**: Biasanya tidak diberi izin (`ALL` denied) pada tabel pribadi, kecuali akses baca ke landing page coupons jika relevan.
- **`authenticated` (Pengguna Aplikasi Terdaftar)**: Izin manipulasi data terbatas pada `auth.uid() = user_id`.
- **`service_role` (Backend API)**: Bypass RLS otomatis. Digunakan untuk sinkronisasi webhook pembayaran, pemotongan saldo AI, dan administrasi.

### B. Perlindungan SECURITY DEFINER & SECURITY INVOKER

- **`SECURITY DEFINER`**: Fungsi Postgres yang berjalan dengan hak akses penuh pembuat fungsi (biasanya admin). Fungsi jenis ini **wajib** selalu menyetel parameter `search_path` secara eksplisit dan melarang hak eksekusi bagi publik jika hanya ditujukan bagi backend:
  ```sql
  REVOKE EXECUTE ON FUNCTION nama_fungsi FROM public;
  GRANT EXECUTE ON FUNCTION nama_fungsi TO service_role;
  ```
- **Database Views**: Seluruh database view publik yang dibuat pada PostgreSQL 15+ wajib menyertakan parameter `security_invoker = true` agar RLS tabel asal tetap berlaku saat view diakses oleh klien.

---

## 7. Perintah & Siklus Kerja Migrasi (Commands & Workflow)

Saat Anda bekerja pada skema database, ikuti langkah-langkah berikut:

### Alur Kerja Lokal:

1. **Buat file migrasi baru**:
   ```bash
   npx supabase migration new nama_deskriptif_perubahan
   ```
2. **Edit SQL migrasi** di dalam folder `supabase/migrations/`.
3. **Uji integritas migrasi lokal** (Dry Run):
   ```bash
   npm run db:push:dry-run
   ```
4. **Jalankan analisis kualitas skema**:
   ```bash
   npm run db:lint
   ```
5. **Regenerasi Type TypeScript** (Hanya setelah migrasi berhasil didorong ke db remote pengujian):
   ```bash
   npm run db:types
   ```

### 🚫 Aturan Deployment Produksi

**Jangan pernah menjalankan perintah deploy database (`npx supabase db push`) langsung dari terminal AI Agent.** Deployment hanya boleh dilakukan melalui proses build otomatis CI/CD setelah Pull Request disetujui, atau atas instruksi manual langsung oleh pengembang utama.

---

## 8. Rekomendasi Pembersihan Jangka Panjang (Long-Term Cleanup)

1. **Squash Legacy SQL**: Menggabungkan file SQL legacy di folder root `supabase/*.sql` ke dalam sebuah file skema baseline terpadu untuk kejelasan riwayat.
2. **Automated RLS Testing**: Membuat test suite khusus (menggunakan pgTAP or integration test NodeJS) untuk mencoba memecah batasan RLS dengan token uji coba palsu guna meminimalkan risiko kebocoran data.
