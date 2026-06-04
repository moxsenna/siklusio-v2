# 🌸 Siklusio v2 — Dokumentasi & Penjelasan Detail Fitur

Siklusio adalah aplikasi universal (Android, iOS, Web) pelacak siklus menstruasi, masa subur, dan program kehamilan (promil) yang dirancang khusus untuk pejuang garis dua di Indonesia. Dibangun dengan memadukan keakuratan data klinis, kehangatan asisten kecerdasan buatan (AI), dukungan komunitas anonim yang aman, serta keterlibatan pasangan yang canggung.

> **Positioning Utama:**  
> _"Promil lebih terarah, suami lebih paham, hati lebih tenang."_

Berikut adalah dokumentasi lengkap seluruh fitur Siklusio v2 beserta penjelasan teknis, alur pengguna (_user journey_), dan arsitektur pendukungnya.

---

## Daftar Isi

1. [Onboarding Personal & Profil Siklus](#1-onboarding-personal--profil-siklus)
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

## 1. Onboarding Personal & Profil Siklus

Alur onboarding dirancang sebagai gerbang awal untuk menyajikan antarmuka yang sangat personal sejak detik pertama pengguna membuka aplikasi.

- **Alur 8 Langkah Terpandu:** Pengguna dipandu mengisi parameter dasar menggunakan kontrol antarmuka yang ramah (seperti dropdown kustom dan kolom tanggal):
  1.  **Kenalan Yuk (Nama Panggilan):** Digunakan untuk sapaan di dashboard dan dalam laporan AI demi membangun kedekatan emosional (gaya bahasa "Bunda" atau "kamu").
  2.  **Tanggal Lahir:** Dropdown kustom pemilihan tanggal lahir (1-31).
  3.  **Bulan Lahir:** Dropdown kustom pemilihan bulan lahir (Januari-Desember).
  4.  **Tahun Lahir:** Dropdown kustom pemilihan tahun lahir (dibatasi 70 tahun terakhir).
  5.  **Jumlah Anak:** Status jumlah anak saat ini (Belum punya, 1, 2, 3, 4+) guna menyesuaikan target edukasi.
  6.  **Siklus Haid Terakhir:** Mengisi tanggal Hari Pertama Haid Terakhir (HPHT), perkiraan panjang siklus rata-rata (default 28 hari), dan lama menstruasi (default 5 hari).
  7.  **Tim Promil (Data Suami):** Nama suami, panggilan akrab (seperti Mas atau Sayang), serta nomor WhatsApp suami untuk fitur berbagi pesan masa subur.
  8.  **Penyelesaian Onboarding:** Menyinkronkan data dari penyimpanan lokal ke Supabase dan membuka Dashboard utama.

---

## 2. Core Cycle Engine (Pelacakan Fase & Ovulasi)

Mesin pelacakan haid dan masa subur yang akurat dan dinamis, menghitung kondisi tubuh pengguna hari demi hari berdasarkan parameter HPHT, rata-rata panjang siklus, dan log haid manual.

- **Siklus 4 Fase Tubuh:**
  1.  **Fase Menstrual (Menstruasi):** Hari ke-1 hingga hari terakhir haid. Fokus pada pemulihan tubuh, nutrisi penambah darah, dan istirahat yang cukup.
  2.  **Fase Folikular:** Fase persiapan sel telur setelah menstruasi berakhir hingga sebelum ovulasi. Tubuh mulai memproduksi estrogen, meningkatkan energi fisik.
  3.  **Fase Ovulasi (Masa Subur / Fertile Window):** Puncak peluang kehamilan (umumnya 5 hari sebelum ovulasi hingga 1 hari setelah ovulasi). Sistem menandai jendela ini dengan warna mencolok agar pengguna tidak melewatkan momentum hubungan badan.
  4.  **Fase Luteal (Dua Minggu Menanti / TWW):** Pasca-ovulasi hingga menstruasi berikutnya. Fase krusial promil di mana progesteron mendominasi dan memicu sensitivitas emosional.
- **Log Haid Manual:** Pengguna dapat menandai atau menghapus catatan haid secara manual pada kalender interaktif untuk menyempurnakan prediksi siklus berikutnya secara real-time.

---

## 3. Dashboard Interaktif & Dynamic Action Cards

Halaman beranda utama yang menyajikan rangkuman kondisi tubuh pengguna dalam hitungan detik. Menggunakan estetika modern dengan harmonisasi gradasi warna _brand_ (Pink, Violet, Teal) dan _micro-animations_.

- **Kartu Siklus (Cycle Card):** Lingkaran visual interaktif yang menunjukkan hari siklus saat ini, nama fase aktif, dan hitungan mundur (_countdown_) menuju menstruasi berikutnya atau masa subur terdekat.
- **Kartu Afirmasi Harian (Affirmation Card):** Kalimat penguat emosional yang diperbarui setiap hari guna menjaga optimisme pejuang garis dua sepanjang perjalanan promil mereka.
- **Tabungan Promil (Savings Tracker):** Widget pelacakan finansial di mana pengguna dapat menetapkan target dana promil (seperti biaya persalinan atau vitamin) dan memantau kemajuan tabungan mereka.
- **Dynamic Action Cards (CTA Adaptif):** Kartu aksi di dashboard secara cerdas berubah menyesuaikan fase siklus aktif pengguna:
  - _Fase Menstruasi:_ CTA mengarah ke pencatatan gejala kram dan pemenuhan nutrisi harian.
  - _Fase Masa Subur:_ CTA langsung memicu modal template pesan WhatsApp untuk mengajak suami berhubungan tanpa canggung.
  - _Fase Luteal (TWW):_ CTA mengarah ke Pojok Tenang TWW (TWW Sanctuary) untuk melatih ketenangan emosional.
  - _Konsistensi Rendah:_ Jika pencatatan checklist harian di bawah target, CTA otomatis beradaptasi mengajak pengguna melengkapi log kebiasaan di tab Habits.

---

## 4. Daily Habits Logging & Symptom Tracking

Fitur untuk membangun konsistensi ikhtiar promil fisik secara praktis, membantu pengguna melacak kemajuan kebiasaan sehat sehari-hari dalam waktu kurang dari 60 detik.

- **Checklist Kebiasaan Dinamis:** Daftar kebiasaan sehat harian yang disesuaikan secara otomatis dengan fase tubuh pengguna (misalnya: asupan asam folat, konsumsi air putih, tidur cukup, olahraga ringan di fase folikular, atau meditasi di fase luteal).
- **Pelacak Gejala (Symptom Tracker):** Pengguna dapat mencatat kondisi fisik dan emosional harian (seperti kram perut, sakit kepala, kelelahan, mood swing, sensitivitas payudara, atau keputihan).
- **Indikator Progres Harian:** Bar persentase progres yang terisi secara dinamis begitu pengguna menyelesaikan setiap tugas kebiasaan, memberikan kepuasan instan (_instant gratification_) yang memicu konsistensi harian.

---

## 5. AI Panduan Siklus (Daily Guide)

Asisten kecerdasan buatan (AI) yang bertindak sebagai pemandu harian personal. AI ini menganalisis fase siklus, tingkat keyakinan prediksi, serta log gejala harian guna menyajikan panduan harian yang sangat terpersonalisasi.

- **Model Cerdas & Hemat Kredit:** Pembuatan satu Panduan Siklus membutuhkan **40 kredit AI**.
- **Sistem Idempotensi & Caching:** Mengintegrasikan endpoint backend `GET /api/cycle-guide/today` dan key constraint unik database `UNIQUE(user_id, generated_for_date, status)`. Hal ini menjamin pengguna tidak akan mengalami pemotongan saldo kredit ganda saat menutup dan membuka kembali modal panduan AI pada hari yang sama.
- **Panduan Terpersonalisasi:** Menghasilkan wawasan medis tepercaya yang dibalut dengan bahasa Indonesia yang hangat dan suportif, terbukti efektif memandu pengguna mengambil langkah kecil terbaik hari ini.

---

## 6. AI Habit Coach & 7-Day Action Plan

Pelatih kebiasaan promil berbasis AI yang merumuskan rencana aksi 7 hari ke depan. Fitur ini dirancang secara interaktif untuk menjaga disiplin promil tanpa membebani mental pengguna.

- **Interaksi Chatbot Terpandu:** Pengguna berkonsultasi dengan AI Habit Coach menggunakan tombol pintasan (_guided quick-discussion chips_) dengan opsi pengetikan teks kustom sebagai cadangan (_fallback_).
- **Pembuatan Checklist Mingguan:** Berdasarkan jawaban evaluasi pengguna dan fase tubuhnya saat ini, AI merumuskan gol mingguan dan tugas harian spesifik yang akan dimasukkan langsung ke dalam tab Habits pengguna selama 7 hari ke depan.
- **Model Pemotongan Kredit Transaksional:**
  - **50 kredit** untuk pembuatan rencana awal (_Initial Plan_).
  - **60 kredit** untuk perpanjangan mingguan (_Renewal Plan_).
  - AI Habit Coach secara proaktif melacak kemajuan minggu sebelumnya untuk memberikan umpan balik korektif yang memotivasi pengguna.

---

## 7. AI Credit Ledger & Transactional Balance

Sistem ledger server-side yang aman untuk menjamin transparansi, keamanan, dan keadilan dalam pemotongan kredit kecerdasan buatan pengguna.

- **Keamanan Ledger Server-Side:** Skema `ai_credits` mencatat setiap aliran transaksi kredit secara ketat. Kredit hanya dipotong secara permanen (_active_) _setelah_ respon JSON terstruktur dari OpenRouter sukses divalidasi dan disimpan di database lokal. Jika API eksternal gagal di tengah jalan, kredit pengguna aman tidak berkurang.
- **Bonus Aktivasi Premium:** Webhook Mayar secara idempotent memberikan bonus selamat datang **500 kredit AI** otomatis bagi pengguna yang baru saja mengaktifkan status Lifetime Premium.
- **Transparansi Saldo:** Menu pengaturan menampilkan riwayat saldo kredit AI secara akurat, lengkap dengan detail waktu, kegunaan fitur, dan sisa saldo.

---

## 8. TWW (Two-Week Wait) Sanctuary / Pojok Tenang

Fase menunggu dua minggu (luteal) pasca-ovulasi hingga periode haid berikutnya sering kali memicu kecemasan hebat bagi pejuang promil (_symptom spotting_). TWW Sanctuary hadir sebagai ruang aman emosional.

- **Latihan Pernapasan (Breathing Exercise):** Fitur pemandu napas interaktif (tarik napas, tahan, embuskan) dengan animasi visual yang menenangkan untuk menurunkan tingkat stres secara instan. Pemandu napas ini bersifat opsional (tidak wajib dipicu oleh AI).
- **Audio Relaksasi & 4 Pilihan "Suasana Hati" (Mood Ambiances):** Pemutar audio terintegrasi yang menyajikan 4 kategori suasana suara relaksasi dinamis yang dapat dipilih oleh pengguna secara instan sesuai kondisi emosionalnya:
  1.  **🍃 Suara Alam** (trek `tww_acoustic_nature.mp3` - melodi aliran sungai dan angin hutan untuk memulihkan cemas/panik).
  2.  **🧘‍♀️ Meditasi** (trek `tww_deep_healing.mp3` - frekuensi meditasi dalam dengan deru ombak laut untuk bimbingan napas).
  3.  **☕ Santai** (trek `tww_lofi_chill.mp3` - alunan lofi piano lembut dan intim pengiring menulis jurnal emosi).
  4.  **✨ Tidur** (trek `tww_cinematic_lullaby.mp3` - instrumen selendang bintang pengantar tidur malam nyenyak).
      Sistem aset dirancang menggunakan metode _lazy-loading getter_ agar tidak memicu eror pemrosesan biner berekstensi `.mp3` pada rangkaian tes unit lokal di sisi server Node.js, namun dimuat dan dijalankan secara optimal pada runtime mobile.
- **Jurnal Emosi Harian:** Pengguna dapat menumpahkan perasaan cemas, harapan, atau kekhawatiran mereka dalam bentuk tulisan privat.
- **AI Calming Reassurance ("Surat Tenang"):** Pengguna mengirimkan isi jurnal emosinya untuk dianalisis oleh AI. AI backend mengembalikan struktur respons yang sangat detail dan granular: `title`, `opening`, `validation`, `grounding`, `affirmation`, `breathingTip`, dan `closing`. AI menggunakan sapaan intim "kamu" (menghindari kata kaku "Anda" atau "Bunda") dan disesuaikan langsung dengan nama panggilan pengguna untuk membangun kedekatan emosional sejati tanpa janji medis palsu.
- **Tampilan Animasi & Auto-Scroll Sekuensial:** Di aplikasi mobile, respons AI disajikan sebagai **"Surat Tenang"** yang muncul bagian demi bagian secara bergantian menggunakan transisi animasi _fade_ dan _slide-up_ yang halus. Layar juga akan melakukan _auto-scroll_ secara perlahan ke bawah untuk memandu mata pengguna, kecuali jika pengguna menyentuh layar atau melakukan _scroll_ secara manual.
- **Reassurance Fallback & Interaksi Napas Dinamis:** Backend menyertakan bidang `reassurance` sebagai cadangan (_fallback_) bagi pengguna dengan versi aplikasi mobile lama. Setelah Surat Tenang muncul, terdapat kartu latihan pernapasan tambahan terintegrasi yang memungkinkan pengguna memulai atau menjeda latihan pernapasan secara dinamis langsung dari layar hasil curhat.

---

## 9. Husband Message Templates (Jembatan Komunikasi Suami)

Mengatasi rasa canggung istri saat harus mengabarkan masa subur kepada suami. Fitur ini mengubah promil dari sekadar "tugas satu pihak" menjadi kerja sama tim yang menyenangkan.

- **Pilihan Nada Pesan (Templates):** Menyediakan beberapa template pesan berbahasa Indonesia dengan gaya bahasa yang bervariasi:
  - _Romantis:_ Pesan manis penuh kehangatan.
  - _Santai/Playful:_ Pesan santai bernada humoris.
  - _Langsung/Direct:_ Pesan informatif yang to-the-point namun tetap sopan.
  - _Lembut/Gentle:_ Pesan menyentuh hati yang mengajak suami beristirahat bersama.
- **Personalisasi Panggilan & Integrasi WhatsApp:** Sistem membaca nama panggilan suami (misal: "Mas", "Sayang") dan nomor teleponnya langsung dari profil pengguna, menyusun teks secara otomatis, lalu membuka aplikasi WhatsApp dengan teks siap kirim hanya dalam **2 ketukan dari dashboard**.

---

## 10. Komunitas Anonim & Column-Level Privacy Hardening

Ruang berbagi keluh kesah promil antar sesama pejuang garis dua di Indonesia yang dijamin 100% aman dan privat tanpa khawatir dihakimi atau bocornya data pribadi.

- **Opsi Kirim Anonim:** Pengguna dapat mengaktifkan opsi kirim sebagai "Anonim" saat membuat kiriman (_posts_) atau komentar.
- **Column-Level SELECT Hardening (PostgreSQL RLS):** Guna menjamin perlindungan privasi mutlak secara teknis, query `SELECT` langsung pada kolom `user_id` di tabel posts dan comments diblokir total untuk pengguna biasa. Identitas pembuat kiriman eksklusif disalurkan hanya melalui fungsi RPC aman `get_community_feed` yang secara otomatis menyembunyikan `user_id` jika opsi anonim diaktifkan. Namun, `user_id` asli tetap terekam di server untuk kepentingan moderasi admin.
- **Fitur Umpan Balik (Feed):** Mendukung unggahan kiriman (maks 500 karakter) dengan pagination berbasis kursor, utas komentar (maks 300 karakter), serta 5 reaksi emoji bermakna mendalam: 💖 (Dukungan), 🙏 (Doa), 😢 (Pelukan hangat), 💪 (Semangat), dan 🤝 (Teman Berjuang).
- **Sistem Keamanan Anti-Spam DB-level:** Menegakkan aturan jeda posting di level basis data:
  - _Kiriman:_ Cooldown 30 detik antar postingan & batas maksimal 5 kiriman per jam.
  - _Komentar:_ Cooldown 10 detik antar komentar & batas maksimal 20 komentar per jam.
  - Pesan eror dari database (`SQLSTATE P0001`) ditranslasikan oleh pustaka `errorParser` client menjadi pesan ramah dalam bahasa Indonesia.
- **Moderasi Konten Otomatis & Reset Avatar:**
  - _Auto-Hide:_ Postingan atau komentar yang dilaporkan oleh 10 pengguna unik yang berbeda secara otomatis disembunyikan dari feed publik.
  - _Galeri Avatar & Custom Cloudflare R2 Upload:_ Pengguna dapat memilih preset avatar lucu atau mengunggah foto kustom melalui backend proxy aman yang terhubung ke Cloudflare R2. Admin memiliki kendali penuh untuk me-reset foto profil kustom yang dinilai tidak pantas secara aman.

---

## 11. Sistem Afiliasi & Mayar Checkout Integration

Model monetisasi premium satu kali bayar (_Lifetime Premium_ seharga Rp 37.000) yang terintegrasi secara mulus dengan sistem pemasaran afiliasi untuk menciptakan siklus pertumbuhan organik.

- **Mayar Checkout Integration:** Landing page (`landing/checkout.html`) menggunakan integrasi API dinamis _payment gateway_ Mayar untuk menerima pembayaran otomatis (E-Wallet, QRIS, Transfer Bank).
- **Pendaftaran Afiliasi Mandiri (Self-Serve Affiliate):** Pengguna Premium dapat mendaftar sebagai mitra afiliasi secara gratis dari tab pengaturan. Mitra membuat kode referal unik (misalnya: `BUNDALINA`) yang otomatis bertindak sebagai kupon diskon 10% untuk pembeli baru. Sebagai gantinya, mitra afiliasi berhak atas komisi penjualan sebesar 20%.
- **Validasi Last-Click Wins:** Halaman checkout melacak kode referal dari URL (`?ref=CODE`) dan menyimpannya di browser. Kode referal divalidasi ke backend secara real-time sebelum tautan tagihan Mayar dibuat.
- **Webhook Web yang Aman & Idempotent:** Webhook mendengarkan event pembayaran sukses dari Mayar, memproses pembuatan akun auth Supabase otomatis, mengkreditkan 500 saldo bonus AI, dan mencatat konversi komisi afiliasi (`affiliate_conversions`) secara aman menggunakan pemeriksaan kecocokan ID transaksi Mayar demi mencegah duplikasi pencatatan komisi.
- **Bypass Kupon 100% (Free Bypass):** Jika pengguna menggunakan kupon promosi bernilai diskon 100%, sistem checkout mendeteksi nominal akhir Rp 0 dan secara otomatis melakukan bypass sistem pembayaran Mayar. Pengguna langsung didaftarkan secara aman dan komisi afiliasi tercatat Rp 0 (kecuali admin mengizinkan komisi nominal khusus pada kupon tersebut).

---

## 12. SyncManager (Last-Write-Wins Offline Sync)

Solusi ketahanan aplikasi universal saat berjalan dalam kondisi konektivitas internet tidak stabil atau offline (seperti di daerah pelosok Indonesia).

- **Penyimpanan Lokal Persisten:** Seluruh kebiasaan harian, profil siklus, tabungan, dan gejala disimpan secara persisten di penyimpanan lokal (_AsyncStorage_ / _localStorage_).
- **Last-Write-Wins Reconciliation:** SyncManager membandingkan stempel waktu modifikasi (_updated_at_ timestamp) antara data lokal dan data di server Supabase:
  - Jika data lokal lebih baru dari server (misal pengguna melakukan perubahan saat offline), data lokal akan diunggah ke cloud saat jaringan pulih.
  - Jika data server lebih baru dari lokal (misal pengguna login dari perangkat lain), data lokal akan diperbarui menyesuaikan data cloud.
- Hal ini mengeliminasi konflik sinkronisasi data offline secara cerdas tanpa memusingkan pengguna dengan modal peringatan yang mengganggu alur navigasi.

---

## 13. Portal Admin & Panel Moderasi

Gerbang kendali administrasi terpusat bagi moderator untuk menjaga ketertiban komunitas, memantau pertumbuhan pengguna, mengelola kupon, dan mendistribusikan pembayaran afiliasi.

- **Moderasi Komunitas Efisien:** Antarmuka antrian laporan yang mengelompokkan kiriman bermasalah berdasarkan targetnya (1 postingan dengan 12 laporan tetap tampil sebagai 1 kartu moderasi terpadu).
- **Pencegahan Rekursi Loop Laporan:** Database trigger khusus secara otomatis menyelesaikan (_auto-resolves_) semua laporan baru yang masuk untuk postingan atau komentar yang telah ditinjau dan dinyatakan aman oleh admin sebelumnya, memangkas beban kerja moderator secara signifikan.
- **Manajemen Kupon Diskon Lengkap (CRUD):** Admin dapat membuat kupon baru, menonaktifkan kupon berjalan, menghapus kupon usang, serta menentukan jenis potongan (nominal atau persentase).
- **Pencairan Komisi Afiliasi (Payout):** Panel khusus bagi admin untuk melihat seluruh transaksi afiliasi yang berhasil, melihat info rekening bank promoter, dan menandai status komisi sebagai "Sudah Ditransfer" lengkap dengan unggahan bukti referensi transfer bank.
- **Keamanan Admin Ketat:** Seluruh akses ke endpoint admin dilindungi oleh validasi JWT Bearer token di sisi client, yang diperkuat dengan pengecekan server-side `profiles.is_admin = true` sebelum mengeksekusi fungsi basis data sensitif.

---

_Didokumentasikan dengan penuh dedikasi oleh Tim Pengembang Siklusio v2. 🌸_
