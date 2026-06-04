# Siklusio Operations & Maintenance Handbook

Last updated: 2026-06-05  
Last verified against codebase: 2026-06-05  
Target Audience: Non-coder Founder & AI Coding Agents

---

## 1. Pemantauan & Efisiensi Biaya AI (AI Cost & Token Monitoring)

Analisis kecerdasan buatan (AI) di Siklusio ditenagai oleh OpenRouter. Sebagai founder, sangat penting untuk menjaga agar biaya pemakaian API tetap terkontrol dan efisien.

### 💰 Pengendalian Anggaran Kuota AI

- **Sistem Kredit Pengguna**: Klien Siklusio membatasi pemanggilan AI secara langsung menggunakan sistem kuota kredit. Setiap generate Surat Tenang memotong saldo pengguna sebesar **25 Kredit**, sedangkan analisis siklus mingguan memotong **40 Kredit**. Ini mencegah penyalahgunaan token AI oleh pengguna jahat.
- **Model Fallback**: Jika model utama (`openai/gpt-5-nano`) mengalami masalah biaya atau downtime, backend Workers dikonfigurasi untuk beralih otomatis ke model alternatif yang lebih murah (`qwen/qwen3-next-80b-a3b-instruct:free`). Pengaturan ini dikendalikan oleh variabel:
  - `OPENROUTER_FREE_MODEL`
  - `OPENROUTER_PAID_MODEL`
- **Cache Jawaban AI**: Untuk fitur TWW Sanctuary (Surat Tenang), backend akan menyimpan jawaban sukses di database selama tanggal pemanggilan sama (WIB ±1 hari). Jika pengguna meminta kembali Surat Tenang pada hari yang sama, sistem akan menyajikan hasil dari cache tanpa memanggil API OpenRouter ulang (biaya token **0**).
  - Rujukan implementasi cache: [ai.reassurance.controller.ts](file:///d:/Coding/remix_-siklusio/backend/src/controllers/ai.reassurance.controller.ts#L252-L273).

---

## 🛡️ 2. Panduan Moderasi Komunitas (Community Moderation Flow)

Untuk menjaga ketenangan forum komunitas anonim Siklusio v2, admin internal dapat melakukan tindakan moderasi langsung melalui layar admin di aplikasi mobile:

```text
Laporan Pengguna (Reported Post/Comment)
   │
   ├──▶ 1. Masuk ke antrean Moderasi (Moderation Queue)
   │      Terjadi secara otomatis jika postingan dilaporkan > 0 kali.
   │
   ├──▶ 2. Peninjauan Admin (Admin Review Screen)
   │      Admin membuka menu Admin di mobile-app/app/admin.tsx.
   │
   ├──▶ 3. Eksekusi Tindakan (RPC Call)
   │      Admin menekan tombol tindakan yang memanggil database RPC:
   │
   │      ├─▶ SETUJU (Keep Content)
   │      │   Memulihkan postingan dan menurunkan status report.
   │      │
   │      ├─▶ SEMBUNYIKAN (Hide Content)
   │      │   Menonaktifkan postingan secara permanen dari feed publik.
   │      │
   │      └─▶ RESET AVATAR (Reset User Avatar)
   │          Mengganti avatar pengguna bermasalah kembali ke default.
```

### 📋 Fungsi RPC Moderasi Admin

| Nama RPC                         | Input Parameter                            | Efek Database                                                                       |
| -------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------- |
| **`admin_get_moderation_queue`** | `p_limit`, `p_offset`                      | Mengambil postingan dan komentar yang dilaporkan pengguna.                          |
| **`admin_moderate_target`**      | `p_target_type`, `p_target_id`, `p_action` | Menyembunyikan konten (`hide`) atau menandainya sebagai bersih (`keep`).            |
| **`admin_reset_user_avatar`**    | `p_user_id`                                | Mengosongkan URL avatar kustom di profil pengguna dan menggantinya ke jenis bawaan. |

---

## 🔄 3. Pembaruan Dependensi & SDK (Dependency & SDK Upgrades)

Untuk memastikan aplikasi mobile tetap kompatibel dengan OS Android dan iOS versi terbaru, pembaruan paket dan upgrade Expo SDK harus dilakukan secara berkala.

### 📱 Langkah Upgrade Expo SDK (Setiap 6-12 Bulan)

1. **Periksa Versi Outdated**:
   ```bash
   cd mobile-app
   npm outdated
   ```
2. **Jalankan Upgrade Otomatis**: Gunakan perintah bawaan Expo agar versi library pendukung (seperti reanimated, screens, svg) disesuaikan secara otomatis dengan versi SDK baru yang direkomendasikan:
   ```bash
   npx expo install --fix
   ```
3. **Audit Kesehatan Dependensi**:
   ```bash
   npx expo-doctor@latest
   ```
4. **Uji Coba Rilis Lokal**: Jalankan web build lokal untuk memastikan tidak ada pemanggilan fungsi yang usang (_deprecated_):
   ```bash
   npm run build:web
   ```

---

## 🔑 4. Protokol Rotasi Kunci API (API Key Rotation Guide)

Jika terjadi insiden kebocoran kunci rahasia atau penggantian akun payment gateway, lakukan rotasi kunci dengan urutan berikut:

| Nama Kunci             | Lokasi Penyimpanan                              | Dampak Rotasi                                                  | Langkah Rotasi                                                                                   |
| ---------------------- | ----------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **OpenRouter API Key** | Cloudflare Secret (`OPENROUTER_API_KEY`)        | Layanan AI lumpuh sementara jika salah isi.                    | Generate key baru di OpenRouter Dashboard, masukkan ke wrangler secrets, redeploy Worker.        |
| **Mayar API Key**      | Cloudflare Secret (`MAYAR_API_KEY`)             | Pendaftaran akun premium baru dan topup tidak bisa diproses.   | Ganti API Key di Mayar Dashboard, perbarui rahasia di Worker.                                    |
| **Supabase Anon Key**  | `.env.local` & `mobile-app/.env`                | Klien mobile tidak bisa membaca/menulis ke database.           | Reset Anon Key di Dashboard Supabase > API, perbarui variabel lingkungan di mobile dan backend.  |
| **Service Role Key**   | Cloudflare Secret (`SUPABASE_SERVICE_ROLE_KEY`) | Sinkronisasi pembayaran webhook dan mutasi kredit admin gagal. | Reset Service Role Key di Dashboard Supabase, perbarui rahasia di Cloudflare Workers secepatnya. |

---

## 💾 5. Pengelolaan Cache Aplikasi (Cache Management)

- **Cache Lokal Mobile App**: Aplikasi mobile menyimpan data lokal secara sementara menggunakan `@react-native-async-storage/async-storage`. Jika pengguna mengalami masalah data tidak sinkron, sediakan menu "Bersihkan Cache" di layar Settings yang memanggil:
  ```typescript
  import AsyncStorage from "@react-native-async-storage/async-storage";
  await AsyncStorage.clear();
  ```
- **Cache Reassurance**: Untuk membebaskan slot Surat Tenang yang gagal/stuck dalam status `pending_charge` di database, backend Workers akan otomatis mereset baris transaksi tersebut jika usianya sudah melebihi 5 menit saat user mengirimkan request baru. Tindakan manual tidak diperlukan.
  - Rujukan implementasi pemulihan: [ai.reassurance.controller.ts](file:///d:/Coding/remix_-siklusio/backend/src/controllers/ai.reassurance.controller.ts#L275-L298).
