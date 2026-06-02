# PRD: Siklusio

Status: Version 2.0 (Remediated)  
Last updated: 2026-06-02  
Product area: Menstrual cycle tracking, promil support, AI insight, community, security hardening  
Primary market: Indonesia  

---

## 0. Working Assumptions

- PRD ini mendokumentasikan Siklusio versi produk yang sedang berjalan dan telah mengalami penguatan arsitektur menyeluruh (Remediation Phase 1 s/d 21).
- Scope utama mencakup asisten promil MVP lengkap: cycle tracking (nullable HPHT), masa subur, habit logging, AI insight terenkripsi, jembatan rasa suami, Pojok Tenang TWW (dengan dynamic soundscapes & Surat Tenang AI), komunitas anonim (CORS & Column-Level SELECT Hardening), Mayar checkout, dan admin portal.
- Model monetisasi berbasis sekali bayar (**Lifetime Premium**) dengan integrasi terenkripsi Mayar, bebas iklan pihak ketiga untuk menjamin kerahasiaan data paling intim Bunda.
- Data medis diposisikan sebagai pendampingan umum dan edukasi personal promil, disertai disclaimer klinis yang tegas di setiap layer output AI.

---

## 1. Product Summary

Siklusio adalah aplikasi pendamping siklus menstruasi dan program hamil (promil) universal (Expo/Web) untuk pasangan pejuang garis dua di Indonesia. Produk ini dirancang untuk memanusiakan data medis klinis melalui asisten AI yang hangat, penyediaan sarana relaksasi luteal, pelibatan aktif suami secara humoris/romantis, sert forum komunitas pendukung yang dijamin 100% anonim dan privat.

Positioning utama:

> Promil lebih terarah, suami lebih paham, hati lebih tenang.

---

## 2. Problem Statement

Pasangan pejuang garis dua (TTC) mengarungi perjalanan fisik dan psikologis penuh tekanan harian:
*   Ketidakakuratan bacaan masa subur jika siklus melenceng dari standar 28 hari.
*   Log kebiasaan pendukung promil harian (asam folat, hidrasi, olahraga ringan) sering terlupakan secara manual.
*   Cemas berlebih (*symptom spotting*) selama 14 hari menanti haid berikutnya pasca-ovulasi (fase luteal / TWW).
*   Gaya komunikasi "berikhtiar" yang terasa kaku, dingin, atau transaksional dengan suami.
*   Rasa tidak aman saat menceritakan keresahan promil di platform sosial publik karena takut dihakimi lingkungan.
*   Kekhawatiran komersialisasi rahasia intim tubuh oleh agensi iklan atau kebocoran data pribadi (CORS/Log leaks).

---

## 3. Product Thesis

Apabila Siklusio mengintegrasikan deteksi ovulasi dinamis, penugasan kebiasaan sehat harian, pemutar audio relaksasi TWW, peredam cemas melalui Surat Tenang AI privat, formulasi pengingat suami otomatis, dan forum berbagi yang dilindungi proteksi database terenkripsi (Column-Level SELECT Hardening RLS), maka Bunda akan merasa tenang, berdaya, dan terlindungi untuk menjalani setiap fase promil dengan penuh harapan.

---

## 4. Goals

### Business Goals
- Membuat Siklusio menjadi mercusuar aplikasi promil privat yang paling terpercaya bagi komunitas wanita di Indonesia.
- Meningkatkan kelancaran registrasi pembeli premium lewat integrasi instant checkout Mayar dan webhook yang aman.
- Mendukung keberlangsungan finansial server gotong-royong dengan skema kemitraan afiliasi promoter mandiri.

### User Goals
- Memahami status tubuh dan hitungan mundur fase siklus aktif secara real-time pada dashboard dalam 5 detik.
- Mengakses panduan harian AI medikal-empatis tanpa cemas saldo AI dipotong ganda pada hari yang sama.
- Menghilangkan kecemasan TWW lewat interaktivitas bimbingan napas dan Surat Tenang AI yang dipersonalisasi.
- Mengirim pesan pengingat masa subur atau kebutuhan rehat kepada suami via WhatsApp dalam 2 ketukan.
- Berbagi thread & doa di komunitas tanpa khawatir identitas asli bocor ke tetangga sosial.

### Product Goals
- Membatasi entri onboarding yang aman: nama panggilan intim, tanggal lahir valid, dan nullable HPHT tanpa forced defaults.
- Mengaktifkan user baru secara aman setelah sukses checkout via webhook tanpa menyimpan plaintext password.
- Menjamin pemotongan kredit AI transaksional yang adil (hanya berkurang ketika LLM sukses merespon penuh data valid).
- Mengamankan interaksi komunitas lewat rate-limiting DB-level (P0001 triggers) dan auto-hide spam (>= 10 unique reports).
- Singkronisasi data lokal-to-cloud persisten yang andal (*SyncManager* Last-Write-Wins) untuk parameter siklus harian, gejala, dan tabungan kehamilan (*savings tracking*).

---

## 5. Non-Goals

Siklusio tidak akan:
- Memberikan saran tindakan bedah kesuburan, resep dosis hormon spesifik, atau resep obat keras tanpa keahlian Sp.OG.
- Menampilkan iklan banner komersial pihak ketiga bermuatan analitik pelacakan tubuh pengguna.
- Menyimpan sandi auth di database internal di luar auth-engine Supabase.
- Menyebarkan data nomor WhatsApp suami kepada pihak luar atau asisten AI.

---

## 6. Target Users

-   **Persona 1: Bunda Promil Pemula.** Membutuhkan navigasi masa subur yang ramah, bersih dari istilah medis yang terlalu rumit, serta asisten check-in harian yang suportif.
-   **Persona 2: Bunda Pejuang Garis Dua Veteran.** Mengalami ketegangan luteal bulanan tingkat tinggi. Membutuhkan bimbingan pernapasan, *music therapy*, serta ruang validasi emosional di TWW Sanctuary.
-   **Persona 3: Pasangan Harmonis.** Istri yang ingin melibatkan suami secara peka melalui WhatsApp humoris/manis sesuai fase kesuburan agar ikhtiar kehamilan terasa menyenangkan.
-   **Persona 4: Admin Moderator.** Memiliki panel antrian moderasi dinamis terpadu untuk menegakkan etika forum, mereset avatar profil tidak pantas, mengontrol pencairan afiliasi, serta CRUD kupon checkout.

---

## 7. Core User Journeys

### Journey A: New User Activation & Purchase
1.  Bunda membuka landing page promosi dan memasukkan data kontak.
2.  Bunda membayar status **Lifetime Premium** seharga Rp 37.000 (Mayar Gateway).
3.  Sistem backend memproses pembayaran secara idempotent, membuat auth user Supabase dengan status `pending_payment`, mendaftarkannya, dan mengirim asisten SMS/email aktivasi.
4.  Bunda melakukan login awal dan diarahkan ke alur onboarding 8 langkah (nama panggilan, TTL, jumlah anak, nullable HPHT, kontak panggilan suami).
5.  Onboarding menyimpan status database `profiles.onboarding_completed = true`. Dashboard personal menyambut Bunda dengan sapaan hangat.

### Journey B: Daily Promil Routine & Sync
1.  Bunda membuka habits harian. Aplikasi memetakan checklist kebiasaan (asam folat, tidur cukup harian) menggunakan data date key terbaru `useTodayKey` untuk menghindari data stale setelah tengah malam.
2.  Bunda mencentang progres tabungan persiapan kehamilan dan log gejala.
3.  Pembaharuan data lokal Bunda secara instan di-debounce dan disinkronkan ke Supabase oleh `SyncManager.syncSavingsData` dan `syncProfileData` menggunakan perbandingan timestamp modifikasi terbaru (*Last-Write-Wins*).

### Journey C: Fertile Window & Husband Connection
1.  Dashboard menandakan Bunda telah memasuki jendela subur / puncak ovulasi dengan warna Pink feminin berdenyut lembut.
2.  Tombol dinamik mengarahkan Bunda ke panel *Jembatan Rasa*.
3.  Bunda memilih nada pesan WhatsApp yang diinginkan (Romantis, Playful, Lembut, atau Direct).
4.  Aplikasi menyulam nama panggilan suami, menekan tombol kirim, dan meluncurkan draf WhatsApp di HP Bunda hanya dalam **2 ketukan**.

### Journey D: TWW Sanctuary (Dua Minggu Menanti)
1.  Bunda memasuki fase luteal (menanti tanggal testpack). Dashboard merekomendasikan *Pojok Tenang TWW*.
2.  Bunda melatih napas terpadu diafragma 4-7-8 dengan panduan lingkaran bernapas yang memekar-menguncup.
3.  Bunda memilih soundtrack relaksasi (🍃 Alam, 🧘‍♀️ Meditasi, ☕ Lofi, ✨ Tidur) yang didistribusikan via lazy-loading asset getter.
4.  Bunda menuliskan rasa cemas ke jurnal harian dan menekan `"Minta Surat Tenang AI"`.
5.  Asisten AI memotong saldo kredit, menganalisis jurnal emosi secara privat, lalu mengembalikan respons **"Surat Tenang"** terstruktur (`title`, `opening`, `validation`, `grounding`, `affirmation`, `breathingTip`, `closing`) dengan sapaan "kamu".
6.  Teks surat AI muncul sekuensial bergantian menggunakan animasi pudar-naik lembut, diiringi auto-scrolling otomatis di layar mobile.

### Journey E: Anon Community Discussion
1.  Bunda membuka forum komunitas untuk membaca status pejuang garis dua lainnya.
2.  Bunda membuat postingan curhat atau menulis komentar dengan menyalakan toggle **"Kirim Anonim"**.
3.  Database Supabase memblokir query `SELECT` langsung pada kolom `user_id` di database (Column-Level SELECT Hardening) untuk menjamin privasi Bunda 100% aman. Identitas asli Bunda diredam total di interface feed, namun tercatat internal di backend demi moderasi.
4.  Jika ada postingan kasar atau penyebaran obat ilegal, pengguna menekan tombol "Laporkan". Postingan dilaporkan >= 10 kali otomatis ditarik dari feed publik untuk ditinjau diruang Admin.

---

## 8. Functional Requirements

### P0 Requirements (Must-Have Security & Core Core Engines)

| ID | Requirement | Detail / Acceptance Criteria | Status |
| :--- | :--- | :--- | :---: |
| **FR-001** | **Onboarding completion flag** | Menggunakan satu-satunya properti state `profiles.onboarding_completed` (boolean) untuk menandai onboarding selesai di cloud. Menghapus default value palsu pada kolom `last_period_date` HPHT dan menjadikannya nullable agar analisis medis aman terpelihara. | **REMEDIATED** |
| **FR-002** | **Secure Webhook & Auth Register** | Pendaftaran premium via webhook Mayar memproses pembuatan akun auth Supabase pertama kali dengan metadata `access_status = "pending_payment"` dan menyimpan ID user ke `pending_registrations` **tanpa pernah menyimpan sandi password plaintext**. User dikirimkan aktivasi OTP/magic link pasca pembayaran lunas. | **REMEDIATED** |
| **FR-003** | **Server-side Topup Verification** | Endpoint `/api/checkout/topup` memvalidasi paket pembelian kredit AI secara eksklusif dari daftar whitelist katalog di sisi server. Menolak total parameter input harga/kredit manipulatif yang dikirimkan client. | **REMEDIATED** |
| **FR-004** | **JWT Auth-Gated AI endpoints** | Akses ke endpoint AI asisten harian dan `/api/generate-calming-reassurance` wajib dilindungi oleh autentikasi JWT token (`requireUser` middleware). Mencegah kebocoran pemanggilan prompt dan limitasi biaya AI. | **REMEDIATED** |
| **FR-005** | **Idempotent AI Daily Guides** | Mempertahankan caching dan idempotensi endpoint data kesehatan harian `GET /api/cycle-guide/today` yang dijaga constraint basis data `UNIQUE(user_id, generated_for_date, status)` agar kredit pengguna tidak terpotong dobel pada pemanggilan berulang di hari yang sama. | **REMEDIATED** |
| **FR-006** | **Atomic Ledger Transactions** | Pemrosesan grant kredit AI hasil topup pembayaran sukses diproses secara atomic pada Postgres trigger RPC `process_paid_ai_credit_topup` (satu siklus: klaim pending, grant credit, update status) untuk memotong celah race condition. | **REMEDIATED** |
| **FR-007** | **CORS Hardening allowlist** | Mencopot wildcard header CORS API backend. Origin browser dibatasi secara eksklusif ke domain resmi Siklusio, sandbox localhost development dev, dan daftar custom `ALLOWED_ORIGINS` di Worker. | **REMEDIATED** |
| **FR-008** | **Fail-closed Webhook Integrity** | Jika variable rahasia `MAYAR_WEBHOOK_TOKEN` kosong atau tidak terkonfigurasi, server API backend menolaknya secara mutlak (*fail-closed*) dengan melempar kode error 500 demi mencegah bypass autentikasi internal. | **REMEDIATED** |

---

### P1 Requirements (High Priority UX & Features)

| ID | Requirement | Detail / Acceptance Criteria | Status |
| :--- | :--- | :--- | :---: |
| **FR-101** | **SyncManager Offline-Online (LWW)** | Rekonsiliasi sinkronisasi data lokal-to-cloud untuk riwayat aktivitas, gejala, dan tabungan kehamilan. SyncManager membandingkan timestamp updated_at lokal vs server dan mengaplikasikan strategi Last-Write-Wins tanpa menampilkan pop-up konflik data yang mengganggu Bunda. | **REMEDIATED** |
| **FR-102** | **Target Savings Cloud Sync** | Dashboard Tabungan Kehamilan mendukung debounce sinkronisasi data target/progres tabungan ke Supabase. Menjamin nilai `0` tetap dapat ditarik/sinkron tanpa terhalang bias checks. | **REMEDIATED** |
| **FR-103** | **Secure Avatar upload & magic bytes** | Endpoint upload/custom avatar ke Cloudflare R2 memvalidasi data base64 dengan mendeteksi magic bytes (PNG, JPEG, WebP) di sisi server sebelum dikirimkan ke CDN. Menghentikan penyimpanan file berbahaya / non-image. | **REMEDIATED** |
| **FR-104** | **Clean Logging & Redact PII** | Helper backend log `redaction.ts` secara otomatis menyembunyikan log mentah payment gateway, nomor WhatsApp, email user, dan access tokens. Menjamin integritas compliance data kesehatan universal. | **REMEDIATED** |
| **FR-105** | **Dynamic Date Refresh (useTodayKey)** | Memastikan parameter data checklist habits, visualisasi siklus di dashboard, dan panduan harian diperbarui secara otomatis menggunakan unified hook `useTodayKey` saat pergantian hari (midnight) atau ketika aplikasi mendapatkan fokus kembali (*app gained focus*). | **REMEDIATED** |
| **FR-106** | **Community database protection (RLS)** | Kebijakan proteksi RLS yang sangat ketat di database Supabase untuk Komunitas. Query langsung ke kolom sensitif `user_id` diblokir total untuk user biasa. Suara komunitas disajikan aman hanya via RPC function secure `get_community_feed`. | **REMEDIATED** |

---

### P2 Requirements (Medium Priority Future Features)

| ID | Requirement | Detail / Acceptance Criteria | Status |
| :--- | :--- | :--- | :---: |
| **FR-201** | **Native Push Notifications** | Membangun push alert native berbasis expo-notifications untuk memicu pengingat minum vitamin, mencatat kram haid, atau notifikasi cinta promil harian. | **Planned (Post-MVP)** |
| **FR-202** | **Daily Reminders Settings** | Halaman pengaturan preferences harian untuk mengaktifkan notifikasi fase masa subur dan siklus bulanan. | **Planned (Post-MVP)** |
| **FR-203** | **BBT & OPK tracker support** | Perekaman parameter suhu basal tubuh (BBT) dan tes ovulasi strip (OPK) di kalender untuk mendongkrak ketepatan masa subur. | **Planned (Post-MVP)** |

---

## 9. UX and Content Requirements

Kehangatan copywriting dan validasi emosional adalah ruh utama produk ini. AI Generative di backend wajib diatur dengan prompt ketat agar:
1.  **Menggunakan Panggilan Ramah:** Sapaan *"Bunda"* digunakan di area visual dashboard, sedangkan sapaan *"kamu"* (intim/personal) dikhususkan di area pembuat balasan Pojok Tenang Surat Tenang AI.
2.  **Menjunjung Empati Luteal:** Respons batin untuk penderita kecemasan menanti testpack harus bersifat memeluk jiwa, memvalidasi bahwa "perasaan cemasmu itu nyata dan wajar", meredakan kepanikan fisik, tanpa pernah menjamin hasil kehamilan instan yang overclaim.
3.  **Disclaimer Medis:** Tiap output chat AI dan cycle report wajib menyertakan banner disclaimer tepercaya di bagian bawah:
    > *Informasi ini bersifat pendampingan promil harian umum, bukan pengganti diagnosis medis Sp.OG. Jika Bunda mengalami nyeri hebat, riwayat siklus tidak wajar, konsultasikan langsung ke klinik dokter kandungan tepercaya.*

---

## 10. Data Architecture & Privacy Hardening

Arsitektur data dirancang dengan pertahanan privasi tertinggi (*First-Class Health Data Privacy*):
*   `profiles` (onboarding completed, nullable HPHT, tabungan, data sapaan suami).
*   `activity_history` (gejala fisik kram/kelelahan, checklist nutrisi harian).
*   `ai_credit_ledger` (transaksi debit-kredit AI dengan validasi Ledger Server-Side).
*   `community_posts` & `community_comments` (opsi flag anonymous dinamis, protected `user_id` query di Postgres).
*   `community_reports` (rate limit cooldown di level DB: 30s posting, 10s komentar, maksimal 5 post/jam, 20 komentar/jam untuk menangkis bot-spamming).

---

## 11. Security, Safety, and Compliance (Remediated Spec)

Siklusio V2 telah menerapkan standar kepatuhan pengamanan data tingkat industri:
1.  **CORS Origin Allowlist:** Mencegah request lintas asal di luar whitelist terdaftar.
2.  **Server Logs Redaction:** Penyaringan informasi data pribadi sensitif (PII) di server Cloudflare Workers.
3.  **Fail-Closed Webhooks:** Menolak pemrosesan transaksi tagihan ketika signature token Mayar tidak diisi/kosong.
4.  **Auto-Resolve Moderated Database Loop:** Trigger Postgres otomatis menghentikan laporan berulang (*looping*) dari pengguna iseng pada postingan yang sudah tervalidasi aman oleh admin.
5.  **Clean CI Pipeline:** Root `npm run check` secara ketat menjalankan typecheck mobile, typecheck backend, dan keseluruhan internal test suite sebelum deploy ke Pages `siklusio-landing` secara otomatis.

---

## 12. Success Metrics

### Activation & Conversion
- **95%+** Tingkat penyelesaian onboarding dari login awal.
- **85%+** Pengisian HPHT aman (tidak ada fallback tanggal default palsu harian).
- **20%+** Konversi transaksi pembelian Lifetime Premium lewat landing page / checkout.

### Engagement & Sync
- **70%+** DAU/MAU mingguan untuk check-in kebiasaan sehari-hari.
- **99%+** Keberhasilan penyatuan sinkronisasi data lokal-to-cloud oleh SyncManager tanpa memicu eror konflik di user-end.
- **80%+** Penggunaan fitur berbagi Pesan WhatsApp Suami saat jendela subur berdenyut.

### Community Health
- **< 1%** Jumlah kontaminasi spam atau thread negatif berkat DB post cooldown limit.
- **100%** Kerahasiaan user_id pada status Anonim terlindungi dari audit eksternal browser.

---

## 13. Risks and Mitigations

| Risiko | Dampak | Penanggulangan Klinis / Arsitektur | Status |
| :--- | :--- | :--- | :---: |
| Kebocoran password pendaftaran premium | Sangat Tinggi | Meniadakan penyimpanan kolom password di `pending_registrations`. User auth dibuat dinamis di internal Supabase Auth menggunakan token aman metadata `pending_payment`. | **RESOLVED** |
| Manipulasi harga topup AI oleh user nakal | Tinggi | Menghapus penentuan nominal/kredit dari sisi client. Seluruh verifikasi paket diselesaikan di server-side katalog worker. | **RESOLVED** |
| Tagihan tag API OpenRouter membengkak karena boting | Tinggi | Mengunci endpoint `/api/generate-calming-reassurance` dengan kewajiban JWT bearer token + rate limiter in-memory. | **RESOLVED** |
| PII sensitif (WA, email) terekspos di server logs | Sedang | Menerapkan modul redaksi string di generator `redaction.ts`. | **RESOLVED** |

---

*Disahkan dan didokumentasikan untuk menjamin kelancaran, keamanan, dan kehangatan ikhtiar promil seluruh Bunda di Indonesia. 🌸 Siklusio Team.*
