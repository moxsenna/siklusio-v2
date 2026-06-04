# AI Agent Guidelines & Development Rules

Dokumen ini berisi kumpulan aturan wajib bagi seluruh AI Coding Agent yang bekerja pada repositori Siklusio v2. Tujuannya adalah menjaga keamanan data pengguna, konsistensi skema database, kestabilan bundel kode, serta etika copywriting medis.

---

## 🔒 1. Keamanan Data & Rahasia (Data Security & Secrets)

- **Supabase Service Key**: Kunci `SUPABASE_SERVICE_ROLE_KEY` **hanya** boleh digunakan di backend (`backend/src/`). Jangan pernah mengeksposnya ke frontend (`mobile-app/`), log publik, atau menyimpannya dalam berkas repositori.
- **Placeholder Kredensial**: Jangan pernah menyalin API Key, webhook token, atau token rahasia asli dari berkas `.env` atau `.env.local` Anda ke dalam kode repositori atau dokumentasi. Gunakan selalu placeholder generik seperti `your-api-key`.
- **Sensor Data Sensitif (PII Scrubbing)**: Bersihkan dan sensor seluruh informasi data pribadi (PII) seperti nomor telepon WhatsApp, email, dan payload mentah dari log sistem. Gunakan utilitas pembersihan log yang tersedia di `backend/src/logging/`.

---

## 🩺 2. Keselamatan Konten & Medis (Medical & Content Safety)

- **Bukan Alat Medis**: Siklusio adalah pendamping promil yang hangat, bukan pengganti dokter kandungan (Sp.OG). AI tidak diperkenankan menulis tanggapan yang terdengar seperti diagnosis klinis, resep obat/hormon, atau janji kesuburan absolut.
- **Tanpa Janji Kehamilan**: Jangan pernah menuliskan janji hasil atau jaminan kehamilan ("pasti hamil", "100% hamil").
- **Penyajian Disclaimer**: Setiap output AI yang memberikan informasi siklus wajib memiliki penafian medis (medical disclaimer) yang mengarahkan pengguna untuk berkonsultasi dengan dokter bila mengalami kendala klinis.

---

## 📂 3. Batas Struktur & File (Folder Boundaries)

- **Backend Hono**: Kode sumber API server backend berada di `backend/src/`. File `backend/index.ts` hanya bertindak sebagai wrapper kompatibilitas.
- **Mobile App (Expo Router)**:
  - Berkas rute navigasi berada di `mobile-app/app/`. Gunakan berkas di folder ini sebagai wrapper tipis saja.
  - Logika, UI, dan hooks spesifik fitur diletakkan di `mobile-app/src/features/`.
  - Komponen UI reusable global diletakkan di `mobile-app/src/shared/`.
- **Database Migrations**: `supabase/migrations/` adalah satu-satunya jalur rilis schema database produksi.
  - Snippet SQL di folder root `supabase/` (seperti `supabase/*.sql`) hanyalah referensi legacy. Jangan mengimpor atau memperlakukan file ini sebagai migrasi aktif.
  - Generated type definitions di `supabase/types/database.types.ts` tidak boleh diedit manual.

---

## 🛠️ 4. Alur Verifikasi Kode (Code Verification Workflow)

Sebelum Anda melaporkan bahwa sebuah tugas telah selesai, Anda **wajib** menjalankan verifikasi berikut di lingkungan lokal Anda:

1. **Linter & Formatter Check**:
   ```bash
   npm run format:check
   ```
2. **Typecheck & Test Execution**:
   ```bash
   npm run check
   ```
3. **Database Migration Dry-Run**:
   ```bash
   npm run db:push:dry-run
   npm run db:lint
   ```
4. **Verifikasi Jalur File**: Selalu periksa keberadaan dan ketepatan nama file yang Anda buat atau modifikasi di disk sebelum menulis tautannya.

---

## 🚫 5. Tindakan yang Dilarang (Prohibited Actions)

Tanpa persetujuan tertulis atau instruksi eksplisit yang disetujui pengguna, Anda dilarang keras melakukan hal-hal berikut:

- Menjalankan perintah rilis produksi langsung, seperti:
  - `npx supabase db push` (gunakan `npm run db:push:dry-run` sebagai gantinya)
  - `wrangler deploy` (gunakan `npm run deploy -- --dry-run` sebagai gantinya)
  - Rilis EAS build atau EAS update.
- Melakukan refaktorisasi massal (massive refactoring) lintas komponen dalam satu waktu. Lakukan perubahan bertahap dengan commit-commit kecil.
- Memasukkan data placeholder atau mockup kosong (seperti UI lorem ipsum atau gambar tiruan) ke dalam fitur aktif aplikasi. Gunakan aset nyata atau integrasikan data fungsional dari database.
