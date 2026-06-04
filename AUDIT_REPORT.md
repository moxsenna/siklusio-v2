# 🔍 Laporan Audit Kode Siklusio v2

**Tanggal Audit:** 1 Juni 2026
**Auditor:** Kiro AI
**Scope:** Seluruh codebase — backend, mobile-app, supabase, landing, dan file root

---

## 📋 Ringkasan Eksekutif

Siklusio adalah aplikasi pelacak siklus menstruasi & promil berbasis Expo/React Native universal (Android, iOS, Web) dengan backend Hono di Cloudflare Workers dan database Supabase. Secara keseluruhan, arsitektur sudah **solid dan terstruktur dengan baik**. Dokumentasi (ARCHITECTURE.md, fitur.md) sangat lengkap. Namun ditemukan sejumlah bug, kode sampah, dan area yang perlu perhatian untuk pengembangan jangka panjang.

---

## 🐛 BAGIAN 1: BUG & MASALAH FUNGSIONAL

### 1.1 `backend/index.ts` — `GEMINI_API_KEY` Terdaftar tapi Tidak Dipakai

**File:** `backend/index.ts` (interface `Env`)
**Masalah:** `GEMINI_API_KEY` ada di interface `Env` dan di `.env.example`, tapi tidak pernah digunakan di kode backend. ARCHITECTURE.md sendiri sudah mencatat ini sebagai "Deprecated/Unused".
**Dampak:** Membingungkan developer baru yang membaca kode.
**Saran:** Hapus dari interface `Env` dan dari `.env.example`.

### 1.2 `backend/index.ts` — `MAYAR_WEBHOOK_TOKEN` vs `MAYAR_WEBHOOK_SECRET`

**File:** `backend/index.ts` (interface `Env`)
**Masalah:** Interface `Env` mendefinisikan `MAYAR_WEBHOOK_TOKEN` (opsional), tapi ARCHITECTURE.md dan `.env.example` menyebut `MAYAR_WEBHOOK_SECRET`. Nama tidak konsisten.
**Dampak:** Jika webhook validation menggunakan nama yang salah, verifikasi signature Mayar bisa gagal diam-diam.
**Saran:** Pilih satu nama (`MAYAR_WEBHOOK_SECRET`) dan konsistensikan di semua tempat.

### 1.3 `backend/index.ts` — `/api/generate-calming-reassurance` Tidak Memerlukan Auth

**File:** `backend/index.ts`, endpoint `POST /api/generate-calming-reassurance`
**Masalah:** Endpoint ini memanggil OpenRouter AI tapi **tidak memanggil `requireUser()`**. Siapapun bisa memanggil endpoint ini tanpa token, menghabiskan kuota API key.
**Dampak:** Potensi penyalahgunaan API key OpenRouter.
**Saran:** Tambahkan `requireUser()` check di awal handler, sama seperti endpoint AI lainnya.

### 1.4 `backend/index.ts` — `/api/checkout/topup` Menggunakan Tabel `ai_credit_topups` yang Tidak Ada di Schema

**File:** `backend/index.ts`, endpoint `POST /api/checkout/topup`
**Masalah:** Endpoint ini melakukan `INSERT` ke tabel `ai_credit_topups`, tapi tabel ini **tidak ada di file SQL manapun** di folder `supabase/`. Tidak ada migration untuk tabel ini.
**Dampak:** Endpoint topup akan selalu gagal di production dengan error "relation does not exist".
**Saran:** Buat file `supabase/ai_credit_topups.sql` dengan definisi tabel, RLS, dan index yang sesuai.

### 1.5 `mobile-app/app/modal.tsx` — Modal Tidak Berguna (Placeholder Expo)

**File:** `mobile-app/app/modal.tsx`
**Masalah:** File ini adalah **template bawaan Expo** yang belum pernah diisi konten nyata. Isinya hanya teks "Modal" dan `EditScreenInfo` (komponen debug Expo). Tapi route `/modal` terdaftar di `_layout.tsx` dan ada di `dist/`.
**Dampak:** Jika ada kode yang menavigasi ke `/modal`, user akan melihat halaman kosong tidak berguna.
**Saran:** Isi dengan konten nyata atau hapus route ini dari `_layout.tsx`.

### 1.6 `mobile-app/src/lib/analytics.ts` — Firebase Analytics Tidak Terinstall

**File:** `mobile-app/src/lib/analytics.ts`
**Masalah:** Kode mencoba `require('@react-native-firebase/analytics')` tapi package ini **tidak ada di `package.json`** mobile-app. Selalu masuk ke fallback mode.
**Dampak:** Analytics Firebase tidak pernah berjalan di native (Android/iOS). Hanya GTM dataLayer yang berjalan di web.
**Saran:** Jika Firebase Analytics tidak direncanakan, hapus kode Firebase dari `analytics.ts` dan bersihkan. Jika direncanakan, tambahkan ke dependencies.

### 1.7 `mobile-app/src/lib/SyncManager.ts` — Race Condition pada Sync Pertama

**File:** `mobile-app/src/context/CycleContext.tsx`, `src/lib/SyncManager.ts`
**Masalah:** `CycleContext` memiliki dua `useEffect` yang berjalan bersamaan saat user login: satu untuk sync profil (HPHT, cycle length) dan satu untuk sync activity history. Keduanya bisa saling menimpa state jika cloud mengembalikan data berbeda secara bersamaan.
**Dampak:** Potensi data siklus ter-reset atau activity history hilang sementara saat pertama login.
**Saran:** Serialisasi kedua sync — jalankan activity sync setelah profile sync selesai, atau gunakan `Promise.all` dengan merge yang lebih hati-hati.

### 1.8 `supabase/schema.sql` — `profiles.last_period_date` NOT NULL dengan DEFAULT CURRENT_DATE

**File:** `supabase/schema.sql`
**Masalah:** Kolom `last_period_date` di tabel `profiles` didefinisikan `NOT NULL DEFAULT CURRENT_DATE`. Ini berarti user baru yang dibuat via webhook Mayar (sebelum onboarding) akan mendapat tanggal hari ini sebagai HPHT default — yang salah secara medis.
**Dampak:** User yang belum onboarding akan melihat data siklus yang tidak akurat.
**Saran:** Ubah ke `last_period_date DATE` (nullable) dan handle null di aplikasi.

### 1.9 `mobile-app/src/lib/storage.ts` — `setItem` Tidak Menunggu AsyncStorage

**File:** `mobile-app/src/lib/storage.ts`
**Masalah:** `storage.setItem()` menulis ke AsyncStorage secara fire-and-forget (`.catch()` saja, tanpa `await`). Jika aplikasi ditutup paksa sesaat setelah `setItem`, data bisa hilang karena AsyncStorage belum selesai menulis.
**Dampak:** Potensi kehilangan data pada perangkat Android yang lambat atau saat force-close.
**Saran:** Ini adalah trade-off yang disengaja untuk performa sinkron. Dokumentasikan dengan jelas di komentar kode bahwa ini adalah "best-effort write".

### 1.10 `mobile-app/src/context/CycleContext.tsx` — `generateMockHistory` Selalu Mengembalikan `{}`

**File:** `mobile-app/src/context/CycleContext.tsx`
**Masalah:** Fungsi `generateMockHistory()` didefinisikan tapi hanya mengembalikan `{}`. Namanya menyiratkan ada mock data untuk testing, tapi tidak ada isinya.
**Dampak:** Membingungkan — nama fungsi tidak mencerminkan perilakunya.
**Saran:** Ganti dengan `const EMPTY_HISTORY: Record<string, DailyRecord> = {}` sebagai konstanta, atau hapus fungsi dan langsung gunakan `{}`.

---

## 🗑️ BAGIAN 2: KODE SAMPAH & FILE TIDAK TERPAKAI

### 2.1 File Root — Sisa Debugging & Recovery

File-file berikut adalah **sisa proses debugging/recovery** yang tidak boleh ada di repository production:

| File                                      | Keterangan                                                                             |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| `restore.cjs`                             | Script recovery `backend/index.ts` dari log AI IDE. Hardcode path `C:/Users/bimap/...` |
| `restore2.cjs`                            | Versi kedua script recovery yang sama                                                  |
| `test-api.js`                             | Script test manual endpoint `/api/generate-cycle-report`                               |
| `backend/index_restored.ts`               | File kosong, sisa proses restore                                                       |
| `dist/server.cjs` + `dist/server.cjs.map` | Build artifact yang seharusnya di `.gitignore`                                         |

**Saran:** Hapus semua file di atas. Tambahkan `dist/` ke `.gitignore` root jika belum ada.

### 2.2 `mobile-app/components/` — Komponen Template Expo yang Tidak Dipakai

File-file berikut adalah **template bawaan `create-expo-app`** yang tidak digunakan di aplikasi nyata:

| File                                           | Keterangan                                                   |
| ---------------------------------------------- | ------------------------------------------------------------ |
| `components/EditScreenInfo.tsx`                | Hanya dipakai di `modal.tsx` (yang juga tidak berguna)       |
| `components/StyledText.tsx`                    | `MonoText` tidak dipakai di mana pun selain `EditScreenInfo` |
| `components/Themed.tsx`                        | `Text` dan `View` dari sini hanya dipakai di `modal.tsx`     |
| `components/ExternalLink.tsx`                  | Hanya dipakai di `EditScreenInfo.tsx`                        |
| `components/useClientOnlyValue.ts` + `.web.ts` | Tidak diimpor di mana pun                                    |
| `components/useColorScheme.ts` + `.web.ts`     | Dipakai di `(tabs)/_layout.tsx` — **KEEP**                   |
| `components/__tests__/StyledText-test.js`      | Test untuk komponen yang tidak terpakai                      |

**Saran:** Hapus semua kecuali `useColorScheme.*`.

### 2.3 `scratch/` — Folder Penuh Script Debugging

Folder `scratch/` berisi **25+ script debugging, test, dan utility** yang dipakai selama development. Tidak ada yang dibutuhkan di production:

```
scratch/add_credits.js, check-icon-size.js, check-moderation.js,
check-profiles.js, check-users.js, clean-db.js, convert-logo.js,
copy-icons.js, create_table.cjs, dump-dom.js, fix-timestamps.js,
replace-selectors.js, resize-icons.js, setup-gtm-container.js,
test_metadata_unique.cjs, test_metadata.cjs, test_post.cjs,
test_post.js, test-checklist.js, verify_credits.js, verify-icons.js,
view-comments.js, view-posts.js, auth_page_debug.png
```

**Saran:** Pindahkan ke branch terpisah atau hapus. Jika ingin disimpan, buat folder `tools/` dengan README yang menjelaskan fungsi masing-masing script.

### 2.4 `graphify-out/` — Output Tool Analisis Arsitektur

Folder `graphify-out/` berisi output dari tool visualisasi dependency graph. Ini adalah **generated files** yang tidak boleh di-commit:

- `graphify-out/graph.json`, `manifest.json`, `GRAPH_REPORT.md`
- `graphify-out/SIKLUSIO_IMPLEMENTATION_PLAN.md`, `SIKLUSIO_QA_ARCH_REPORT.md`, dll.
- `mobile-app/graphify-out/` — duplikat untuk mobile-app

**Saran:** Tambahkan `graphify-out/` ke `.gitignore`.

### 2.5 `mobile-app/dist/` — Build Artifact di Repository

Folder `mobile-app/dist/` berisi hasil build web Expo yang sudah di-commit ke repository. Ini seharusnya di-generate saat deployment, bukan disimpan di git.

**Saran:** Tambahkan `mobile-app/dist/` ke `.gitignore`. Gunakan CI/CD (GitHub Actions sudah ada di `.github/workflows/`) untuk build otomatis.

### 2.6 `mobile-app/.expo/audit-export/` — Export Audit di Repository

Folder `mobile-app/.expo/audit-export/` berisi HTML export dari aplikasi. Ini adalah artifact development.

**Saran:** Tambahkan `mobile-app/.expo/` ke `.gitignore` (biasanya sudah ada, tapi perlu dicek).

### 2.7 `landing/tips-suami.html` — Halaman Tidak Terhubung

**File:** `landing/tips-suami.html`
**Masalah:** File ini ada tapi tidak ada link ke halaman ini dari `index.html` atau `checkout.html`.
**Saran:** Verifikasi apakah halaman ini masih relevan. Jika tidak, hapus.

### 2.8 `supabase/community_verify.sql` — File Diagnostic, Bukan Migration

**File:** `supabase/community_verify.sql`
**Masalah:** File ini berisi query `SELECT` untuk verifikasi schema, bukan DDL. Tidak cocok disimpan bersama migration files.
**Saran:** Pindahkan ke folder `supabase/diagnostics/` atau hapus setelah verifikasi selesai.

### 2.9 `supabase/activity_history_sync_hardening.sql` — Nama File Tidak Konsisten

**File:** `supabase/activity_history_sync_hardening.sql`
**Masalah:** Semua file SQL lain menggunakan nama fitur (misal `community.sql`, `affiliates.sql`), tapi file ini menggunakan nama yang mendeskripsikan aksi ("hardening"). Tidak konsisten dengan konvensi penamaan.
**Saran:** Rename ke `activity_history.sql` atau pindahkan kontennya ke `schema.sql`.

---

## ⚠️ BAGIAN 3: FITUR YANG TIDAK BERFUNGSI / BELUM LENGKAP

### 3.1 Fitur Topup Kredit AI — Backend Ada, Tabel DB Tidak Ada

**Status:** ❌ Tidak Berfungsi
**Detail:** Endpoint `POST /api/checkout/topup` sudah diimplementasi di backend, tapi tabel `ai_credit_topups` tidak ada di schema Supabase. Webhook handler untuk `TOPUP_SUCCESS` dari Mayar juga tidak terlihat di `backend/index.ts`.
**Yang Dibutuhkan:**

1. Buat tabel `ai_credit_topups` di Supabase
2. Tambahkan webhook handler untuk event topup dari Mayar
3. Tambahkan UI di settings untuk memilih paket topup

### 3.2 `mobile-app/app/affiliate.tsx` — Route Ada, Tidak Terdaftar di Tab

**Status:** ⚠️ Parsial
**Detail:** File `app/affiliate.tsx` ada dan ada komponen `AdminAffiliatePanel.tsx`, tapi route `/affiliate` tidak terdaftar di `(tabs)/_layout.tsx` dan tidak ada navigasi ke halaman ini dari UI utama.
**Saran:** Verifikasi apakah halaman affiliate untuk user biasa (bukan admin) sudah selesai. Jika belum, tambahkan ke settings atau buat entry point yang jelas.

### 3.3 `mobile-app/src/lib/analytics.ts` — GTM/Firebase Tidak Terkonfigurasi Penuh

**Status:** ⚠️ Parsial
**Detail:** Analytics manager sudah dibuat dengan baik, tapi:

- Firebase tidak terinstall (lihat bug 1.6)
- GTM Container ID tidak dikonfigurasi di `+html.tsx` (perlu dicek)
- `analytics.setUser()` tidak pernah dipanggil setelah login di `AuthContext`

**Saran:** Panggil `analytics.setUser(user.id, { subscription_status: ... })` di `AuthContext` setelah session berhasil.

### 3.4 `mobile-app/assets/sounds/tww_meditation.mp3` — File Audio Ekstra Tidak Terdokumentasi

**Status:** ⚠️ Tidak Jelas
**Detail:** Ada 5 file audio di `assets/sounds/` tapi ARCHITECTURE.md dan `fitur.md` hanya menyebut 4 kategori suasana. File `tww_meditation.mp3` adalah file kelima yang tidak terdokumentasi.
**Saran:** Verifikasi apakah file ini dipakai di kode atau bisa dihapus.

### 3.5 `mobile-app/src/lib/cycleInsightCopy.ts` — Tidak Terlihat Dipakai di UI

**Status:** ⚠️ Perlu Verifikasi
**Detail:** File `cycleInsightCopy.ts` ada dengan test-nya (`cycleInsightCopy.test.ts`), tapi tidak terlihat diimpor di komponen manapun dari hasil eksplorasi.
**Saran:** Cari penggunaan dengan grep. Jika tidak dipakai, hapus atau dokumentasikan rencana penggunaannya.

---

## 🔒 BAGIAN 4: MASALAH KEAMANAN

### 4.1 CORS Terlalu Permisif di Backend

**File:** `backend/index.ts`
**Masalah:** `app.use("*", cors())` mengizinkan semua origin tanpa pembatasan.
**Dampak:** Endpoint backend bisa dipanggil dari domain manapun.
**Saran:** Batasi ke origin yang diizinkan:

```typescript
app.use(
  "*",
  cors({
    origin: ["https://app.siklusio.web.id", "http://localhost:8081"],
  }),
);
```

### 4.2 `supabase` Client Bisa `null` — Tidak Selalu Dicek

**File:** `mobile-app/src/lib/supabase.ts`, berbagai komponen
**Masalah:** `supabase` diekspor sebagai `SupabaseClient | null`. Beberapa komponen menggunakan `supabase!` (non-null assertion) atau tidak mengecek null sebelum memanggil method.
**Dampak:** Runtime crash jika env vars tidak terkonfigurasi.
**Saran:** Buat helper `getSupabaseOrThrow()` yang throw error yang jelas, atau pastikan app tidak bisa berjalan tanpa env vars yang valid.

### 4.3 `restore.cjs` dan `restore2.cjs` — Path Hardcode User Lokal

**File:** `restore.cjs`, `restore2.cjs`
**Masalah:** Kedua file ini mengandung path absolut `C:/Users/bimap/...` yang merupakan path lokal developer. Jika file ini dijalankan oleh developer lain, akan error.
**Dampak:** Tidak ada dampak keamanan langsung, tapi mengekspos informasi path lokal developer.
**Saran:** Hapus kedua file ini (sudah disebut di bagian 2.1).

---

## 🏗️ BAGIAN 5: MASALAH ARSITEKTUR & KUALITAS KODE

### 5.1 `backend/index.ts` — File Terlalu Besar (2000+ Baris)

**Masalah:** Seluruh backend ada dalam satu file `index.ts` dengan 2000+ baris. Ini mencakup: route handlers, helper functions, business logic, dan type definitions.
**Dampak:** Sulit dibaca, sulit di-maintain, sulit di-test secara unit.
**Saran untuk Refactor:**

```
backend/
├── index.ts          # Entry point, hanya registrasi routes
├── routes/
│   ├── ai.ts         # /api/generate-*, /api/ai/*
│   ├── habitCoach.ts # /api/habit-coach/*
│   ├── cycleGuide.ts # /api/cycle-guide/*
│   ├── recipes.ts    # /api/recipes/*
│   ├── checkout.ts   # /api/checkout/*
│   ├── affiliate.ts  # /api/affiliate/*
│   ├── admin.ts      # /api/admin/*
│   └── webhook.ts    # /api/webhook/*
├── middleware/
│   ├── auth.ts       # requireUser, requireAdmin
│   └── cors.ts
└── ai/               # (sudah ada, bagus)
```

### 5.2 `mobile-app/src/context/CycleContext.tsx` — Context Terlalu Besar

**Masalah:** `CycleContext` mengelola 15+ state variables, 4 `useEffect` untuk sync, dan semua logika persistensi. File ini ~300 baris dan terus bertambah.
**Dampak:** Setiap perubahan state apapun (bahkan `husbandNickname`) memicu re-render semua consumer context.
**Saran:** Pisahkan menjadi:

- `ProfileContext` — data profil user (nickname, husband, savings, dll.)
- `CycleContext` — hanya data siklus (lastPeriodDate, cycleLength, calculations)
- `ActivityContext` — activityHistory

### 5.3 Penggunaan `any` Berlebihan di Backend

**File:** `backend/index.ts`
**Masalah:** Helper `requireUser`, `requireAdmin`, dan `getSupabaseAdmin` menggunakan `c: any` sebagai parameter. Ini menghilangkan type safety Hono.
**Saran:** Gunakan type yang benar dari Hono:

```typescript
import type { Context } from 'hono';
const requireUser = async (c: Context<{ Bindings: Env }>) => { ... }
```

### 5.4 Duplikasi Logic `buildCycleGuideSnapshot` di Backend dan Frontend

**Masalah:** Ada `backend/ai/cycleGuideSummary.ts` dan `mobile-app/src/lib/cycleGuideSummary.ts` — dua file dengan nama sama dan kemungkinan logic serupa.
**Dampak:** Jika ada perubahan logic, harus diupdate di dua tempat.
**Saran:** Evaluasi apakah bisa di-share via package atau setidaknya pastikan keduanya terdokumentasi dengan jelas perbedaannya.

### 5.5 `mobile-app/constants/Colors.ts` — Tidak Sinkron dengan Brand

**File:** `mobile-app/constants/Colors.ts`
**Masalah:** File ini adalah template Expo default dengan warna `tint: '#2f95dc'` (biru). Sementara brand Siklusio menggunakan pink (`#ec4899`). Warna brand sebenarnya didefinisikan inline di komponen atau di `tailwind.config.js`.
**Dampak:** `Colors.ts` tidak mencerminkan brand yang sebenarnya, membingungkan developer baru.
**Saran:** Update `Colors.ts` dengan warna brand Siklusio yang benar.

### 5.6 Tidak Ada Error Boundary di Level Komponen

**Masalah:** `_layout.tsx` mengekspor `ErrorBoundary` dari `expo-router`, tapi tidak ada error boundary di level komponen individual (terutama komponen AI yang bisa gagal).
**Saran:** Bungkus komponen AI (TwwSanctuaryModal, CycleGuideModal, HabitCoachSheet) dengan error boundary lokal agar kegagalan AI tidak crash seluruh app.

---

## ✅ BAGIAN 6: HAL-HAL YANG SUDAH BAGUS

Sebelum saran pengembangan, penting untuk mencatat apa yang sudah dikerjakan dengan baik:

- **Dokumentasi sangat lengkap** — ARCHITECTURE.md, fitur.md, brand_guideline.md, PRD.md semuanya ada dan detail
- **Sistem kredit AI transaksional** — Pattern `pending_charge` → `active` setelah validasi AI response adalah desain yang aman dan benar
- **RLS Supabase konsisten** — Semua tabel menggunakan Row Level Security
- **Column-level privacy hardening** untuk komunitas anonim — desain yang thoughtful
- **SyncManager Last-Write-Wins** — implementasi offline sync yang solid
- **errorParser** — translasi error DB ke bahasa Indonesia yang ramah user
- **Rate limiting di DB level** — lebih reliable daripada di application level
- **`usePersistentState` hook** di CycleContext — abstraksi yang bersih untuk state + storage
- **Idempotency di webhook Mayar** — mencegah double-charge dengan benar
- **Test files ada** untuk lib kritis (`cycleUtils.test.ts`, `habitCoachFlow.test.ts`, dll.)
- **`backend/ai/`** sudah dipisah dengan baik ke modul-modul kecil

---

## 🚀 BAGIAN 7: SARAN PENGEMBANGAN JANGKA PANJANG

### 7.1 Prioritas Tinggi (Lakukan Sebelum Fitur Baru)

**A. Bersihkan Repository**

```
Hapus: restore.cjs, restore2.cjs, test-api.js, backend/index_restored.ts
Hapus: scratch/ (atau pindah ke branch dev-tools)
Hapus: graphify-out/ (tambahkan ke .gitignore)
Hapus: mobile-app/dist/ (tambahkan ke .gitignore)
Hapus: komponen template Expo yang tidak terpakai
```

**B. Fix Bug Kritis**

1. Tambahkan auth check ke `/api/generate-calming-reassurance`
2. Buat tabel `ai_credit_topups` di Supabase
3. Konsistensikan nama `MAYAR_WEBHOOK_SECRET` vs `MAYAR_WEBHOOK_TOKEN`
4. Hapus `GEMINI_API_KEY` dari interface dan env example

**C. Update `.gitignore`**

```gitignore
# Tambahkan ke .gitignore root
dist/
graphify-out/
restore*.cjs
test-api.js

# Tambahkan ke mobile-app/.gitignore
dist/
.expo/audit-export/
```

### 7.2 Prioritas Menengah (Sprint Berikutnya)

**A. Refactor Backend Routes**
Pecah `backend/index.ts` menjadi file-file route terpisah (lihat 5.1). Ini akan membuat onboarding developer baru jauh lebih mudah.

**B. Pisahkan CycleContext**
Pisahkan menjadi `ProfileContext` + `CycleContext` + `ActivityContext` untuk performa dan maintainability yang lebih baik.

**C. Lengkapi Fitur Topup Kredit**
Buat migration SQL, webhook handler, dan UI untuk topup kredit AI.

**D. Perbaiki Colors.ts**
Update dengan warna brand Siklusio yang benar agar konsisten.

### 7.3 Prioritas Rendah (Backlog)

**A. Tambahkan ESLint + Prettier**
Tidak ada konfigurasi linting yang terlihat. Tambahkan ESLint dengan rules TypeScript untuk mencegah penggunaan `any` berlebihan.

**B. Tambahkan Type Safety di Backend**
Ganti `c: any` dengan type Hono yang benar di semua helper functions.

**C. Dokumentasikan `scratch/` Scripts**
Jika script-script di `scratch/` masih berguna untuk maintenance, pindahkan ke `tools/` dengan README yang menjelaskan cara penggunaan masing-masing.

**D. Pertimbangkan Monorepo Tooling**
Saat ini ada dua `package.json` (root dan mobile-app) dengan dependencies yang terpisah. Pertimbangkan menggunakan npm workspaces atau Turborepo untuk mengelola shared code (seperti types dan utilities) antara backend dan mobile-app.

**E. Setup CI/CD yang Lebih Lengkap**
`.github/workflows/` sudah ada. Pastikan pipeline mencakup:

- TypeScript type check (`tsc --noEmit`)
- Run unit tests (`jest`)
- Build check sebelum merge ke main

---

## 📊 BAGIAN 8: RINGKASAN TEMUAN

### Tabel Bug & Masalah

| #    | Masalah                                        | Severity | File               | Status     |
| ---- | ---------------------------------------------- | -------- | ------------------ | ---------- |
| 1.1  | `GEMINI_API_KEY` tidak terpakai                | Low      | `backend/index.ts` | Cleanup    |
| 1.2  | Nama webhook secret tidak konsisten            | Medium   | `backend/index.ts` | Fix        |
| 1.3  | `/api/generate-calming-reassurance` tanpa auth | **High** | `backend/index.ts` | Fix Segera |
| 1.4  | Tabel `ai_credit_topups` tidak ada di DB       | **High** | `backend/index.ts` | Fix Segera |
| 1.5  | `modal.tsx` adalah placeholder Expo            | Low      | `app/modal.tsx`    | Cleanup    |
| 1.6  | Firebase Analytics tidak terinstall            | Medium   | `analytics.ts`     | Fix/Remove |
| 1.7  | Race condition sync pertama                    | Medium   | `CycleContext.tsx` | Fix        |
| 1.8  | `last_period_date` NOT NULL di schema          | Medium   | `schema.sql`       | Fix        |
| 1.9  | AsyncStorage write fire-and-forget             | Low      | `storage.ts`       | Document   |
| 1.10 | `generateMockHistory` nama menyesatkan         | Low      | `CycleContext.tsx` | Cleanup    |

### Tabel File Sampah

| File/Folder                               | Jenis              | Aksi              |
| ----------------------------------------- | ------------------ | ----------------- |
| `restore.cjs`, `restore2.cjs`             | Debug script       | Hapus             |
| `test-api.js`                             | Test manual        | Hapus             |
| `backend/index_restored.ts`               | File kosong        | Hapus             |
| `dist/` (root)                            | Build artifact     | Hapus + gitignore |
| `scratch/` (25+ files)                    | Debug scripts      | Hapus/Pindah      |
| `graphify-out/`                           | Generated output   | Hapus + gitignore |
| `mobile-app/dist/`                        | Build artifact     | Hapus + gitignore |
| `mobile-app/.expo/audit-export/`          | Dev artifact       | Gitignore         |
| `components/EditScreenInfo.tsx`           | Template Expo      | Hapus             |
| `components/StyledText.tsx`               | Template Expo      | Hapus             |
| `components/Themed.tsx`                   | Template Expo      | Hapus             |
| `components/ExternalLink.tsx`             | Template Expo      | Hapus             |
| `components/useClientOnlyValue.*`         | Template Expo      | Hapus             |
| `components/__tests__/StyledText-test.js` | Test tidak relevan | Hapus             |
| `supabase/community_verify.sql`           | Diagnostic query   | Pindah/Hapus      |

### Fitur Tidak Berfungsi

| Fitur                  | Status         | Yang Dibutuhkan                       |
| ---------------------- | -------------- | ------------------------------------- |
| Topup Kredit AI        | ❌ Broken      | Tabel DB + webhook handler            |
| Halaman Affiliate User | ⚠️ Parsial     | Entry point di UI                     |
| Firebase Analytics     | ❌ Tidak aktif | Install package atau hapus kode       |
| GTM Analytics          | ⚠️ Parsial     | Verifikasi konfigurasi di `+html.tsx` |

---

## 🗺️ PANDUAN UNTUK DEVELOPER BARU

Jika kamu adalah developer yang akan melanjutkan project ini, berikut urutan yang disarankan untuk memahami codebase:

1. **Baca dulu:** `ARCHITECTURE.md` → `fitur.md` → `PRD.md`
2. **Pahami database:** Baca semua file di `supabase/` mulai dari `schema.sql`
3. **Pahami backend:** `backend/index.ts` (entry point) → `backend/ai/` (modul AI)
4. **Pahami mobile app:**
   - `mobile-app/app/_layout.tsx` — root layout & providers
   - `mobile-app/src/context/` — global state (AuthContext, CycleContext)
   - `mobile-app/src/lib/` — utilities & business logic
   - `mobile-app/app/(tabs)/` — halaman utama
   - `mobile-app/components/` — komponen UI per fitur
5. **Setup lokal:** Salin `.env.example` ke `.env.local` dan isi semua variabel

### Konvensi Penamaan yang Digunakan

| Konteks          | Konvensi           | Contoh                                  |
| ---------------- | ------------------ | --------------------------------------- |
| Storage keys     | `hs_v3_*` prefix   | `hs_v3_lastPeriodDate`                  |
| Supabase tables  | snake_case         | `activity_history`, `habit_coach_plans` |
| React components | PascalCase         | `CycleCard`, `TwwSanctuaryModal`        |
| Hooks            | `use` prefix       | `useCommunityFeed`, `useUserAvatar`     |
| API endpoints    | `/api/kebab-case`  | `/api/cycle-guide/today`                |
| SQL files        | `feature_name.sql` | `community.sql`, `affiliates.sql`       |

---

_Laporan ini dibuat secara otomatis berdasarkan analisis statis kode. Beberapa temuan mungkin memerlukan verifikasi manual lebih lanjut._
_Dibuat oleh: Kiro AI — 1 Juni 2026_
