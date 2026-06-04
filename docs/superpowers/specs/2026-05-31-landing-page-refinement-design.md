# Spesifikasi Desain: Penyempurnaan Landing Page Siklusio v2 🌸

**Tanggal**: 31 Mei 2026  
**Status**: Disetujui  
**Arah Desain**: Opsi A — Premium AI Feature & Conversion Boost

---

## 1. Latar Belakang & Tujuan

Siklusio v2 telah berhasil meluncurkan serangkaian fitur berbasis kecerdasan buatan (AI) yang canggih di sisi backend (migrasi ke OpenRouter multi-model fallback chain) dan mobile app (UI Habit Coach berbasis opsi chip, pelacakan siklus harian cerdas, dan sistem kredit ledger).

Namun, landing page (`landing/index.html`) saat ini belum mencerminkan nilai tambah (value proposition) yang luar biasa dari fitur-fitur baru ini. Dokumen spesifikasi ini menguraikan langkah-langkah desain dan teknis untuk menyempurnakan landing page agar memiliki visual yang menakjubkan (premium WOW aesthetics), interaktif, serta mendorong konversi pembelian Lifetime Premium dengan mempromosikan bonus 500 kredit AI.

---

## 2. Perubahan Desain Sistem Visual (CSS)

Kita akan memodifikasi area `:root` dan elemen-elemen styling utama di [landing/index.html](file:///d:/Coding/remix_-siklusio/landing/index.html) tanpa menggunakan TailwindCSS, mempertahankan fleksibilitas Vanilla CSS premium.

### 2.1 Palet Warna & Gradien Modern

- **Background Utama**: Dari gradien tiga arah biasa, kita perbarui menjadi gradien cair glassmorphism yang menenangkan namun modern:
  ```css
  body {
    background: linear-gradient(135deg, #fdf2f8 0%, #faf5ff 40%, #f0fdfa 70%, #edfaff 100%);
    background-attachment: fixed;
  }
  ```
- **Warna Aksen AI & Premium**: Menambahkan HSL custom tokens untuk Violet-Teal glow effects:
  ```css
  :root {
    /* ... tokens yang sudah ada ... */
    --ai-purple-glow: rgba(168, 85, 247, 0.15);
    --ai-purple-border: rgba(168, 85, 247, 0.3);
    --teal-glow: rgba(20, 184, 166, 0.15);
  }
  ```

### 2.2 Glassmorphism & Hover Micro-animations

Setiap kartu utama (`.feature-card`, `.pain-card`, `.testimonial-card`) akan diperbarui menggunakan gaya Glassmorphism premium:

```css
.feature-card,
.pain-card,
.testimonial-card {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 10px 30px -15px rgba(236, 72, 153, 0.05);
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.feature-card:hover,
.pain-card:hover {
  transform: translateY(-8px);
  background: rgba(255, 255, 255, 0.85);
  border-color: var(--pink-300);
  box-shadow:
    0 25px 50px -12px rgba(236, 72, 153, 0.15),
    0 0 20px 2px rgba(168, 85, 247, 0.08); /* Violet AI glow */
}
```

---

## 3. Komponen & Tata Letak Landing Page

### 3.1 Hero Section: Mockup Handphone Cerdas

Mockup HP di dalam `.hero-mockup` akan dirombak agar secara eksplisit menunjukkan fitur **AI Habit Coach** dan sisa kredit akun:

- **Mockup Header**:
  ```html
  <div class="mock-header">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h3>Bunda Dina ✨</h3>
      <span
        style="font-size:10px; font-weight:700; color:var(--teal-700); background:var(--teal-100); padding:2px 8px; border-radius:999px;"
        >🤖 450 AI Kredit</span
      >
    </div>
    <p>Rabu, 27 Mei</p>
  </div>
  ```
- **Habit Coach Card**: Menyajikan simulasi Habit Coach dengan opsi chip yang mirip dengan mobile app:
  ```html
  <div class="mock-card" style="margin-top: 10px;">
    <p
      style="font-size:10px; color:var(--violet-600); font-weight:800; margin-bottom:6px; letter-spacing:0.5px;"
    >
      🤖 AI HABIT COACH
    </p>
    <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px;">
      <span
        style="font-size:9px; background:var(--pink-100); color:var(--pink-700); padding:3px 6px; border-radius:8px; font-weight:700;"
        >🥗 Nutrisi Promil</span
      >
      <span
        style="font-size:9px; background:rgba(168,85,247,0.1); color:var(--violet-700); padding:3px 6px; border-radius:8px; font-weight:700;"
        >🧘‍♀️ Meditasi</span
      >
      <span
        style="font-size:9px; border:1px dashed var(--pink-300); color:var(--pink-600); padding:2px 5px; border-radius:8px; font-weight:700;"
        >✍️ Kustom...</span
      >
    </div>
    <div
      style="background:var(--pink-50); border-radius:12px; padding:10px; border:1px solid rgba(236,72,153,0.15);"
    >
      <p style="font-size:10px; color:var(--slate-700); line-height:1.45; margin:0;">
        "Bunda Dina, berdasarkan fase folikuler harianmu, hari ini coba konsumsi alpukat & sayur
        bayam serta kurangi kafein agar kesuburan sel telur optimal! 🌸"
      </p>
    </div>
  </div>
  ```

### 3.2 Seksi Baru: Asisten AI Pintar (Ditambahkan ke Fitur)

Kita akan menambahkan/memperbarui kartu fitur utama dalam `.features-grid` untuk menyorot tiga pilar AI baru:

1.  **AI Habit Coach (Asisten Kebiasaan Pribadi)**:
    - _Deskripsi_: Konsultasikan diet, olahraga harian, dan stres dengan AI. Dilengkapi dengan chip menu cepat untuk kemudahan Bunda, dan input kustom fleksibel.
    - _Manfaat_: Langkah promil terarah tanpa kebingungan.
2.  **AI Panduan Siklus & Prediksi Cerdas**:
    - _Deskripsi_: Algoritma medis cerdas yang menganalisis tren 7 hari terakhir Bunda dengan sistem caching cepat untuk kepastian tanggal ovulasi terbaik.
    - _Manfaat_: Kepastian medis 24 jam di ujung jari Bunda.
3.  **Sistem Kredit Transparan & Hemat**:
    - _Deskripsi_: Setiap interaksi AI menggunakan kredit ledger yang tercatat rapi. Tanpa biaya langganan bulanan yang mencekik.
    - _Manfaat_: Penggunaan AI tercanggih dengan harga sangat bersahabat.

### 3.3 Reframe Pricing: Bonus 500 Kredit AI

Pada bagian `.pricing-box`, kita akan menambahkan lencana (badge) yang menonjol untuk mendongkrak konversi pembelian:

- **Pembaruan Lencana Harga**:
  ```html
  <div class="pricing-badge" style="position:relative; overflow:visible;">
    💝 Investasi Kasih Sayang Seumur Hidup: Rp 37.000 (Satu kali bayar, akses selamanya)
    <span
      style="position:absolute; top:-12px; right:-10px; background:linear-gradient(135deg, var(--teal-500), var(--teal-700)); color:#fff; font-size:10px; padding:3px 8px; border-radius:8px; font-weight:800; border:2px solid #fff; box-shadow:0 4px 10px rgba(0,0,0,0.15); animation:pulse 2s infinite;"
    >
      ✨ BONUS 500 KREDIT AI
    </span>
  </div>
  ```
- **Copywriting Tambahan**: Menambahkan satu paragraf penjelasan mengenai bonus kredit AI di bawah lencana harga untuk memberikan penjelasan konkret nilai tambah patungan sekali seumur hidup tersebut.

---

## 4. Rencana Verifikasi (QA)

- **Tampilan Desktop & Mobile**: Menguji respon tata letak mockup dan kartu glassmorphism di layar kecil (lebar < 768px) dan layar lebar (lebar > 1200px).
- **SEO Best Practices**: Memastikan tidak ada duplikasi tag `<h1>`, menggunakan HTML5 semantik (`<header>`, `<section>`, `<article>`, `<footer>`), dan seluruh link/tombol interaktif memiliki ID unik untuk keperluan pelacakan browser.
- **Kompatibilitas Google Tag Manager (GTM)**: Memastikan kode JavaScript pelacakan klik CTA (`click_cta`) tetap berjalan sempurna pada markup tombol yang baru.
