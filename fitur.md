# 🌸 Siklusio v2 — Dokumentasi & Penjelasan Detail Fitur (Remediated)

Siklusio adalah aplikasi universal (Expo/Web) pelacak siklus menstruasi, masa subur, dan program kehamilan (promil) yang dirancang khusus untuk pasangan pejuang garis dua di Indonesia. Aplikasi ini memadukan keakuratan parameter klinis medis, kenyamanan relaksasi emosional, asisten kecerdasan buatan (AI) yang personal, forum komunitas anonim aman, serta kolaborasi aktif suami.

> **Positioning Utama:**  
> *"Promil lebih terarah, suami lebih paham, hati lebih tenang."*

Berikut adalah penjelasan teknis detail dari 13 fitur inti Siklusio v2 yang telah diverifikasi dan diperkuat secara arsitektur (Remediated Phase 1 s/d 21).

---

## Daftar Isi
1. [Onboarding Personal & Status Profil](#1-onboarding-personal--status-profil)
2. [Core Cycle Engine (Pelacakan Fase & Ovulasi)](#2-core-cycle-engine-pelacakan-fase--ovulasi)
3. [Dashboard Interaktif & Dynamic Action Cards](#3-dashboard-interaktif--dynamic-action-cards)
4. [Daily Habits Logging & Symptom Tracking](#4-daily-habits-logging--symptom-tracking)
5. [AI Panduan Siklus (Daily Guide)](#5-ai-panduan-siklus-daily-guide)
6. [AI Habit Coach & 7-Day Action Plan](#6-ai-habit-coach--7-day-action-plan)
7. [AI Credit Ledger & Transactional Balance](#7-ai-credit-ledger--transactional-balance)
8. [TWW (Two-Week Wait) Sanctuary / Pojok Tenang](#8-tww-two-week-wait-sanctuary--pojok-tenang)
9. [Husband Message Templates (Jembatan Komunikasi Suami)](#9-husband-message-templates-jembatan-komunikasi-suami)
10. [Komunitas Anonim & Column-Level Privacy Hardening](#10-komunitas-anonim--column-level-privacy-hardening)
11. [Sistem Afiliasi & Mayar Checkout Integration](#11-sistem-afiliasi--mayar-checkout-integration)
12. [SyncManager (Last-Write-Wins Offline Sync)](#12-syncmanager-last-write-wins-offline-sync)
13. [Portal Admin & Panel Moderasi](#13-portal-admin--panel-moderasi)

---

## 1. Onboarding Personal & Status Profil

Sebagai pintu gerbang utama aplikasi, alur onboarding dirancang untuk mengumpulkan data penting guna mempersonalisasi sapaan harian harian Bunda secara akurat dengan tetap menjaga keseragaman medis.

*   **Penyelesaian Onboarding yang Valid:** Aplikasi seluler dan server menggunakan satu-satunya properti state **`profiles.onboarding_completed` (boolean)** sebagai indikator validasi bahwa onboarding cloud telah selesai. Sistem menolak penggunaan tanggal menstruasi default palsu pada kolom `last_period_date`, menjadikannya *nullable* sehingga data klinis medis Bunda tetap akurat dan tidak bias.
*   **Alur 8 Langkah Interaktif:** Bunda dibimbing mengisi parameter personal dengan dropdown kustom yang menawan:
    1.  **Nama Panggilan Bunda:** Digunakan untuk sapaan intim di dashboard dan narasi puitis AI.
    2.  **Tanggal Lahir:** Kustom picker tanggal (1-31).
    3.  **Bulan Lahir:** Menu pilihan bulan (Januari-Desember).
    4.  **Tahun Lahir:** Picker tahun (dibatasi 70 tahun terakhir untuk relevansi usia promil).
    5.  **Jumlah Anak:** Status jumlah momongan saat ini (Mulai dari "Belum Punya").
    6.  **Siklus Haid Terakhir:** Mengisi Hari Pertama Haid Terakhir (HPHT), rata-rata panjang siklus (default 28 hari), dan lama masa menstruasi (default 5 hari).
    7.  **Data Pendamping (Suami):** Menyimpan nama panggilan akrab suami (misal: "Mas", "Sayang") dan nomor telepon WhatsApp suami.
    8.  **Penyelesaian:** Pengiriman payload ke Supabase dan pembukaan dashboard utama.

---

## 2. Core Cycle Engine (Pelacakan Fase & Ovulasi)

Mesin utama pelacak siklus mengevaluasi data tubuh Bunda hari demi hari secara klinis berdasarkan kalkulasi tanggal HPHT, rata-rata panjang siklus, dan masukan entri kalender manual.

*   **Siklus 4 Fase Dinamis:**
    1.  **Fase Menstrual (Menstruasi):** Hari ke-1 hingga hari terakhir haid harian. Berfokus pada istirahat, hidrasi harian, dan nutrisi penambah darah.
    2.  **Fase Folikular:** Masa persiapan pematangan sel telur setelah menstruasi bersih. Fase peningkatan estrogen dan vitalitas fisik Bunda.
    3.  **Fase Ovulasi (Jendela Masa Subur):** Puncak keemasan konsepsi (umumnya H-5 ovulasi hingga H+1). Ditandai dengan visualisasi highlight pink cerah berdenyut agar Bunda tidak melewatkan momentum.
    4.  **Fase Luteal (Dua Minggu Menanti / TWW):** Masa pasca-ovulasi di mana hormon progesteron mendominasi, sering kali memicu kecemasan tinggi (*symptom spotting*).
*   **Interaktivitas Kalender:** Bunda dapat menandai atau menghapus log menstruasi harian secara manual pada kalender grid. Engine siklus akan mengkalkulasi ulang secara real-time prediksi jadwal menstruasi bulan berikutnya di sisi client.

---

## 3. Dashboard Interaktif & Dynamic Action Cards

Beranda utama yang mengharmonisasikan gradasi warna khas brand (Pink, Violet, Teal) dan micro-animations untuk menyajikan status kesuburan Bunda dalam sekali lirik.

*   **Pembaruan Kunci Hari (useTodayKey):** Seluruh visualisasi dashboard, progres habits harian, kalender siklus, dan Action Card diperbarui secara otomatis menggunakan unified hook **`useTodayKey`** saat pergantian hari melewati tengah malam (midnight) atau ketika aplikasi mendapatkan fokus kembali dari *background state*.
*   **Dynamic Action Cards (CTA Adaptif):** Kartu tindakan di bagian atas beranda yang berubah secara pintar mengikuti siklus aktif:
    *   *Fase Menstruasi:* CTA mengarah langsung untuk merekam gejala kram/kelelahan.
    *   *Fase Masa Subur:* CTA memicu modal dialog peluncuran template pesan WhatsApp suami.
    *   *Fase Luteal (TWW):* CTA merekomendasikan Bunda membuka Pojok Tenang TWW.
    *   *Konsistensi Logging Rendah:* Jika pencatatan checklist di bawah target, CTA beradaptasi memandu Bunda melengkapi kebiasaan sehat di tab Habits.
*   **Tabungan Promil (Savings Tracker):** Widget keuangan yang melacak tabungan persiapan persalinan Bunda secara dinamis.

---

## 4. Daily Habits Logging & Symptom Tracking

Sarana praktis bagi Bunda untuk menjaga konsistensi ikhtiar promil fisik (checklist gaya hidup harian) dalam waktu kurang dari 60 detik.

*   **Checklist Kebiasaan Dinamis:** Daftar kebiasaan yang berubah menyesuaikan fase tubuh Bunda (misal: konsumsi asam folat saat menstruasi, olahraga kardio ringan di fase folikular, atau meditasi di fase luteal).
*   **Pelacak Gejala (Symptom Tracker):** Perekaman kondisi fisik harian (kram perut, sakit kepala, keputihan, kelelahan, perubahan mood, sensitivitas payudara).
*   **Indikator Kepuasan Instan:** Visual progress bar yang terisi secara instan saat Bunda menyelesaikan checklist, melatih kedisiplinan ikhtiar promil harian.

---

## 5. AI Panduan Siklus (Daily Guide)

Asisten kecerdasan buatan (LLM) di backend yang bertindak sebagai pemandu harian personal terpercaya Bunda. AI menganalisis fase siklus aktif, gejala fisik harian, dan tren siklus terakhir guna menyusun panduan harian yang dipersonalisasi.

*   **Sistem Idempotensi & Caching:** Untuk mencegah terpotongnya kredit AI secara dobel saat Bunda membuka, menutup, dan membuka kembali modal panduan AI di hari yang sama, server mengimplementasikan endpoint caching `GET /api/cycle-guide/today` yang divalidasi oleh database unique key constraint **`UNIQUE(user_id, generated_for_date, status)`**.
*   **Konsumsi Kredit:** Satu kali pembuatan wawasan harian sukses memotong saldo sebanyak **40 kredit AI**.

---

## 6. AI Habit Coach & 7-Day Action Plan

Pelatih kebiasaan promil berbasis kecerdasan buatan yang merumuskan rencana aksi promil 7 hari ke depan secara interaktif dan menenangkan.

*   **Guided Quick-Discussion Chips:** Bunda berkonsultasi dengan asisten Habit Coach menggunakan tombol opsi pintasan chat siap-pilih (misal: *"Panduan Olahraga Promil"*, *"Pola Jaga Hidrasi"*) dengan tombol input teks fleksibel sebagai cadangan (*fallback*).
*   **Eksport Rencana Aksi:** AI menganalisis status tubuh dan merumuskan tugas target gol mingguan yang akan ditanamkan langsung oleh sistem ke dalam checklist harian Bunda di tab Habits selama 7 hari ke depan.
*   **Model Pemotongan Kredit Transaksional:** 
    *   **50 kredit** untuk perumusan Rencana Awal (*Initial 7-day Plan*).
    *   **60 kredit** untuk perpanjangan mingguan (*Renewal Plan*).
    *   Sistem membandingkan progres habits harian minggu lalu untuk memberikan motivasi perbaikan yang tak menghakimi.

---

## 7. AI Credit Ledger & Transactional Balance

Sistem keuangan kredit server-side yang andal guna menjamin keadilan, keamanan, dan transparansi aliran pemakaian AI Bunda.

*   **Arsitektur Transaksional (Ledger System):** Database schema `ai_credits` mencatat setiap transaksi debet/kredit secara historis. Kredit pengguna **hanya dipotong secara aktif setelah** respons string JSON dari LLM eksternal (OpenRouter API) sukses dimuat, divalidasi strukturnya, dan disimpan di DB lokal. Jika link API gagal di tengah jalan, kredit Bunda aman tidak berkurang.
*   **Katalog Top-up Server-Side:** Endpoint `/api/checkout/topup` memvalidasi paket pembelian kredit AI secara eksklusif dari katalog whitelist yang didefinisikan aman di sisi server, menolak manipulasi parameter harga/kredit dari sisi client.
*   **Bonus Selamat Datang:** Akun premium baru yang lunas otomatis mendapatkan kiriman bonus **500 kredit AI** secara idempotent lewat trigger webhook pembayaran sukses.

---

## 8. TWW (Two-Week Wait) Sanctuary / Pojok Tenang

Dua minggu penantian pasca-ovulasi (TWW) sering kali dipenuhi rasa cemas yang picu stres. TWW Sanctuary hadir sebagai pelindung kesehatan mental Bunda harian.

*   **Pemandu Napas Animasi (Breathing Exercise):** Fitur napas diafragma 4-7-8 yang tersaji dalam animasi lingkaran yang membesar (tarik napas) dan menguncup (embuskan napas) untuk menurunkan cemas secara instan.
*   **4 Pilihan Soundtrack Relaksasi (Mood Ambiances):** Audio player terintegrasi yang menyajikan 4 instrumen penenteram batin, dirancang dengan sistem *lazy-loading getter* agar lulus dari uji tes unit server:
    1.  **🍃 Suara Alam:** trek `tww_acoustic_nature.mp3` — melodi aliran air pegunungan dan desau hutan.
    2.  **🧘‍♀️ Meditasi:** trek `tww_deep_healing.mp3` — frekuensi gelombang laut penyelarasan napas dalam.
    3.  **☕ Santai:** trek `tww_lofi_chill.mp3` — instrumen piano lofi santai pengiring journaling.
    4.  **✨ Tidur:** trek `tww_cinematic_lullaby.mp3` — instrumen selendang bintang penidur nyenyak.
*   **AI Calming Reassurance ("Surat Tenang"):** Bunda menuangkan cemas di jurnal tulisan privat bebas, lalu AI backend menyusun respons responsif terstruktur (`title`, `opening`, `validation`, `grounding`, `affirmation`, `breathingTip`, `closing`) menggunakan sapaan intim "kamu" dan panggilan nama Bunda.
*   **Sekuensial Fade & Auto-Scroll:** Di layar mobile, asisten Surat Tenang AI disajikan bermunculan lembar demi lembar menggunakan animasi transisi *fade & slide-up* sekuensial yang anggun, diiringi gulir layar otomatis (*auto-scroll*) ke bawah untuk kenyamanan membaca mata Bunda selebihnya jika tidak disentuh manual.

---

## 9. Husband Message Templates (Jembatan Komunikasi Suami)

Mengusir rasa canggung istri saat berkomunikasi tentang masa subur atau meminta suami ikut andil dalam promil.

*   **Variasi Nada Pesan (Templates):** Menyediakan template pesan siap pakai berbahasa Indonesia dengan nada:
    *   *Romantis:* Kata-kata mesra penyentuh hati.
    *   *Santai/Playful:* Candaan humoris promil yang mencairkan suasana.
    *   *Langsung/Direct:* Informatif dan lugas tanpa bertele-tele.
    *   *Lembut/Gentle:* Ajakan santai untuk beristirahat bersama.
*   **Tindakan 2 Ketukan:** Sistem secara otomatis memasukkan nama panggilan suami (misal: "Mas") dan membuka WhatsApp secara instan dengan teks sapaan siap-kirim terisi penuh.

---

## 10. Komunitas Anonim & Column-Level Privacy Hardening

Wadah berbakti doa dan berbagi kisah pejuang garis dua di Indonesia secara 100% aman dan privat tanpa takut dihakimi lingkungan sosial.

*   **Column-Level SELECT Hardening (Supabase RLS):** Proteksi keamanan data tingkat tinggi. Database memblokir mutlak kueri `SELECT` langsung pada kolom `user_id` di tabel posts dan comments bagi pengguna biasa. Aliran data komunitas dialokasikan eksklusif hanya melalui RPC secure function `get_community_feed` yang dinamis menyembunyikan identitas asli pembuat jika opsi toggle "Kirim Anonim" dinyalakan.
*   **Spam Prevention DB-Level:** Mengunci batasan rate limit di level basis data: Cooldown posting 30 detik (max 5 post/jam), cooldown komentar 10 detik (max 20 komentar/jam). Trigger eror exception basis data (`SQLSTATE P0001`) ditranslasikan cantik oleh tools `errorParser` client menjadi pesan peringatan ramah bahasa Indonesia.
*   **5 Emoji Reaksi Bermakna:** Memberikan reaksi kualitatif: 💖 (Dukungan), 🙏 (Doa), 😢 (Pelukan hangat), 💪 (Semangat), dan 🤝 (Teman Berjuang).
*   **Auto-Hide & R2 Avatars:** Konten dilaporkan oleh >= 10 user unik otomatis disembunyikan. Bunda dapat memilih galeri avatar preset imut atau upload foto kustom via proxy Cloudflare R2 yang tervalidasi base64 magic bytes (PNG, JPEG, WebP) di level backend.

---

## 11. Sistem Afiliasi & Mayar Checkout Integration

Model pertumbuhan mandiri gotong-royong seharga piring bakso (**Premium Lifetime Rp 37.000 sekali seumur hidup**) untuk menjamin kelangsungan server bebas iklan pihak ketiga.

*   **Pendaftaran Promoter Mandiri:** Pengguna Premium dapat membuat kode referal kustom (misal: `BUNDAJASMINE`) di pengaturan secara instant.
*   **Komisi Promoter Mandiri:** Promoter berhak atas **komisi 40%** tunai dari tiap konversi checkout sukses yang diverifikasi idempotent pada tabel `affiliate_conversions` di database. Fitur diskon pembeli otomatis ditiadakan (0%) untuk memaksimalkan pendapatan promoter Bunda pejuang garis dua.
*   **Secure Webhook & No Plaintext Passwords:** Integrasi API webhook Mayar memproses aktivasi dinamis tanpa menyimpan sandi password plaintext. Sandbox checkout (`landing/checkout.html`) melacak referral otomatis berbasis cookie *Last-Click Wins* (`?ref=CODE`).
*   **Kupon Bypass 100%:** Mendeteksi transaksi nominal akhir Rp 0 (voucher diskon gratis penuh dari admin) untuk melakukan bypass sistem tagihan Mayar, secara instan meregistrasikan user ke Supabase Auth secara aman.

---

## 12. SyncManager (Last-Write-Wins Offline Sync)

Solusi pemeliharaan integritas data terdistribusi Bunda ketika berada di daerah berinternet tidak stabil atau offline harian di Indonesia.

*   **Penyimpanan Lokal Persisten:** Riwayat aktivitas harian, checklist habits, pencatatan gejala, profil onboarding harian, serta tabungan kehamilan disimpan persisten di storage lokal.
*   **Last-Write-Wins Reconciliation:** Begitu jaringan internet tersambung kembali, `SyncManager.syncSavingsData` and `syncProfileData` membandingkan timestamp `updated_at` lokal vs server. Data dengan modifikasi paling baru diaplikasikan sebagai satu-satunya kebenaran cloud, melenyapkan tabrakan konflik data offline secara otomatis.

---

## 13. Portal Admin & Panel Moderasi

Panel kendali administrasi internal yang andal bagi admin moderator untuk menjaga kenyamanan komunitas, CRUD kupon promosi, dan pendistribusikan pembayaran afiliasi.

*   **Moderasi Komunitas Mutakhir:** Laporan kiriman dikelompokkan otomatis berdasarkan target kiriman (1 postingan dengan N laporan berkelompok dalam 1 kartu moderasi terpadu).
*   **Trigger Auto-Resolve Postgres Loop:** Trigger database otomatis menyelesaikan semua laporan baru berulang yang masuk ke sistem untuk sebuah postingan/komentar yang telah dinyatakan aman oleh admin sebelumnya, memangkas siklus kueri berantai antrian moderator.
*   **CRUD Kupon & Pencairan Pembayaran:** Pendataan lengkap diskon promoter afiliasi dan monitoring transfer payout promoter.
*   **RequireAdmin Guard-Gated:** Dilindungi JWT Bearer token client yang diperkuat check backend-level `profiles.is_admin = true` di sisi Cloudflare Workers.

---

*Didokumentasikan dengan rasa cinta dan doa penuh untuk kemudahan perjalanan ikhtiar promil Bunda. 🌸 Siklusio Developer Team.*
