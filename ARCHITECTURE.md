# Siklusio v2 — Application Architecture

## Overview

Siklusio adalah aplikasi pelacak siklus menstruasi & program hamil (promil) untuk wanita Indonesia. Arsitektur monorepo dengan **satu codebase universal** (Expo/React Native) yang berjalan di Android, iOS, dan Web, didukung oleh backend Hono (TypeScript) yang di-deploy ke Cloudflare Workers dan database Supabase (PostgreSQL).

## Directory Structure

```
remix_-siklusio/
├── backend/              # Hono API Server (Cloudflare Workers entry)
│   └── index.ts          # Entry point (OpenRouter AI + Supabase admin + Affiliate endpoints)
├── landing/              # Static Landing & Checkout Page
│   ├── index.html        # Product presentation
│   └── checkout.html     # Lifetime Premium purchase form (Mayar integration)
├── mobile-app/           # SATU-SATUNYA App Code (Universal: Android, iOS, Web)
│   ├── app/              # Expo Router (file-based routing)
│   │   ├── (tabs)/       # Tab navigation (Dashboard, Calendar, Habits, Community)
│   │   ├── _layout.tsx   # Root layout (providers, theme, navigation stack)
│   │   ├── +html.tsx     # Web-only HTML shell (global CSS, phone-frame desktop)
│   │   ├── auth.tsx      # Login / Register
│   │   ├── onboarding.tsx# Onboarding wizard (8 steps)
│   │   └── admin.tsx     # Admin portal (Users + Moderation)
│   ├── components/       # UI Components
│   │   ├── calendar/     # CalendarGrid, AiReportModal
│   │   ├── community/    # PostCard, ComposerModal, CommentsModal, ReportModal
│   │   ├── common/       # AvatarPicker, DatePickerField
│   │   ├── dashboard/    # CycleCard, AffirmationCard, SavingsCard, ActionCard, MessageModal
│   │   └── habits/       # AiRecommendationSection, HistoryView
│   ├── src/              # Business logic & utilities
│   │   ├── context/      # AuthContext, CycleContext (global state)
│   │   ├── hooks/        # useCommunityFeed, useUserAvatar
│   │   └── lib/          # supabase client, cycleUtils, dateUtils, storage, communityTypes, avatars, SyncManager, errorParser
│   ├── assets/           # Fonts, images, avatar presets
│   ├── app.json          # Expo config
│   ├── tailwind.config.js# NativeWind/Tailwind theme (Material Design 3 pink palette)
│   ├── metro.config.js   # Metro bundler + NativeWind CSS
│   └── package.json      # Mobile-app dependencies
├── supabase/             # Database schema & migrations
│   ├── schema.sql        # Core tables (profiles, activity_history)
│   ├── community.sql     # Community feature (posts, comments, reactions, reports, triggers)
│   ├── community_admin.sql   # Admin moderation policies & triggers
│   ├── community_admin_rpc.sql # Admin moderation RPC functions
│   ├── community_comments_rpc.sql # Secure comment interaction RPCs
│   ├── community_avatar.sql  # Avatar columns + feed RPC update + admin reset avatar
│   ├── community_rate_limit.sql # Anti-spam triggers (cooldown + hourly cap)
│   ├── community_privacy_hardening.sql # Column-level SELECT RLS privacy hardening
│   ├── community_verify.sql  # Diagnostic queries to verify schema
│   ├── affiliates.sql    # Affiliate marketer data
│   ├── affiliate_conversions.sql # Conversion records for successful referral purchases
│   ├── affiliate_rpc.sql # Referral and promo code validation RPCs
│   ├── coupons.sql       # Purchase discounts & referral coupons
│   ├── checkout_sessions.sql # Mayar checkout session records
│   ├── pending_registrations.sql # Pre-auth registration cache from webhook
│   ├── crm_profiles.sql  # Customer data synchronized for CRM
│   └── setup_admin.md    # Guide to create admin account
├── wrangler.jsonc        # Cloudflare Workers configuration
├── package.json          # Root: backend dependencies + build scripts
├── tsconfig.json         # Root TypeScript config
├── PRD.md                # Product Requirements Document (v1)
└── .env.example          # Environment variable template
```

Catatan: output Graphify bersifat generated dan diabaikan lewat `.gitignore`; buat ulang hanya saat audit/visualisasi arsitektur diperlukan.

## Tech Stack

| Layer           | Technology                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------- |
| Mobile App      | Expo SDK 54, React Native 0.81, expo-router 6                                                  |
| Styling         | NativeWind 4 (Tailwind CSS 3 for RN), inline styles                                            |
| State           | React Context (CycleContext, AuthContext) + persistent localStorage                            |
| Database        | Supabase (PostgreSQL) with Row Level Security                                                  |
| Auth            | Supabase Auth (email/password)                                                                 |
| Backend API     | Hono framework (TypeScript) on Cloudflare Workers                                              |
| AI              | OpenRouter (free-tier Qwen 3 with paid fallback, recipes, reports, reassurance, habit coach)   |
| Payment Gateway | Mayar (Premium activation & webhook processing)                                                |
| Image Hosting   | Cloudflare R2 (avatar upload, via backend proxy)                                               |
| Deployment      | Cloudflare Pages (web) + Cloudflare Workers (backend API) + Play Store (Android via EAS Build) |

## Key Features

### Core (Cycle Tracking)

- Menstrual cycle prediction (HPHT-based calculation)
- Phase tracking: Menstrual → Folikular → Ovulasi → Luteal
- Daily habits & symptom logging
- Calendar view with fertility window
- AI-powered cycle reports (OpenRouter)
- Savings tracker for pregnancy preparation
- SyncManager: Last-Write-Wins dynamic local-to-cloud profile reconciliation based on modified timestamps to eliminate offline data conflicts.

### AI Habit Coach & Panduan Siklus

- **AI Habit Coach:** Guided 7-day action planning using guided quick-discussion chips with custom text fallback. Generates actionable checklists (focusing on movement, hydration, rest, etc.) mapped directly into the daily habits tracker.
  - _Biaya:_ 50 kredit untuk Rencana Awal (Initial), 60 kredit untuk Perpanjangan Mingguan (Renewal).
- **AI Panduan Siklus:** Menganalisis fase siklus aktif, tingkat keyakinan prediksi, serta log gejala pengguna guna menyajikan panduan harian yang sangat terpersonalisasi.
  - _Biaya:_ 40 kredit per pembuatan panduan.
  - _Idempotensi & Caching:_ Integrasi endpoint fetch-on-mount (`GET /api/cycle-guide/today`) dan key constraint unik database `UNIQUE(user_id, generated_for_date, status)` untuk mencegah duplikasi pemotongan kredit saat modal dibuka ulang pada hari yang sama.

### AI Credit Ledger & Balance System

- **Sistem Ledger Kredit:** Pencatatan transaksi kredit server-side yang aman (`ai_credits` schema) dengan verifikasi saldo transaksional yang ketat. Kredit hanya dipotong secara permanen (`active`) _setelah_ respon terstruktur JSON dari OpenRouter sukses divalidasi dan disimpan, melindungi pengguna dari biaya API yang gagal.
- **Bonus Premium:** Pemberian otomatis bonus awal 500 kredit AI secara idempotent untuk anggota Lifetime Premium melalui pengolah webhook Mayar.

### Community (Fitur Komunitas)

- Feed-style posts (max 500 chars) with cursor pagination
- Per-post anonymous toggle (user_id always stored for moderation)
- 5 fixed emoji reactions: 💖 🙏 😢 💪 🤝
- Threaded comments (max 300 chars) with per-comment anonymous toggle
- Report system (5 preset reasons + custom)
- Auto-hide at ≥10 unique reports (Postgres trigger)
- Auto-Resolve Moderated Reports: database trigger auto-resolves subsequent incoming reports on already reviewed posts/comments to prevent admin dashboard loop recursion.
- Column-Level SELECT Hardening: direct SELECT on post/comment `user_id` is blocked for normal authenticated users to guarantee 100% posting anonymity, forcing access exclusively via `get_community_feed` RPC.
- Admin moderation panel (keep/remove + resolve reports atomically)
- Rate limiting: 30s cooldown + 5 posts/hour, 10s cooldown + 20 comments/hour
- Client-side countdown timer on submit buttons + `errorParser` utility mapping custom trigger-emitted rate limit exceptions (`SQLSTATE P0001`) into warm, localized Indonesian messages.
- Avatar system: preset gallery + custom upload via Cloudflare R2
- Admin can reset inappropriate custom avatars

### Monetization & Affiliate System

- **Mayar Checkout:** Integrasi _payment gateway_ Mayar pada `checkout.html` di landing page untuk memproses aktivasi Premium seumur hidup (Lifetime).
- **Backend Webhook:** Express API mendengarkan _event_ `PAYMENT_SUCCESS` dari Mayar, lalu memicu registrasi pengguna baru di Supabase Auth dan `profiles`.
- **Affiliate/Referral Tracking:**
  - _Last-Click Wins:_ Sistem referral menyimpan kode rujukan dari URL (`?ref=CODE`) ke `localStorage` (via web) atau `AsyncStorage` (di mobile app jika ada _deep linking_).
  - Backend memvalidasi kode promo/afiliasi sebelum me-lempar permintaan tagihan ke Mayar. Diskon otomatis diterapkan pada invoice jika _valid_.
  - _Conversion Tracking:_ Tersimpan pada tabel `affiliate_conversions` setelah pengguna berhasil membayar.

### Branding & UI Layer

- **Desain Universal:** UI dibangun memakai **NativeWind** yang dikustomisasi dengan parameter _brand_ Siklusio (Pink, Violet, Teal).
- **Identitas Visual:** Aturan main penggunaan aset visual (Logo Floral & Heart Cycle, gaya bahasa "Bunda", dan font Outfit/Plus Jakarta Sans) tercatat terpusat di `brand_guideline.md`.
- Komponen webview tambahan mengadopsi integrasi HTML murni yang berjalan mulus dengan ekosistem DOM (via expo-router web shell).

### Admin Portal

- User management dashboard (sortable table, CSV export)
- Community moderation queue (filter: pending/reviewed/all)
- Grouped by target (1 post with N reports = 1 card)
- Actions: Pertahankan / Sembunyikan / Reset Avatar
- Auth-gated: frontend (RequireAdmin) + backend (Bearer token + is_admin check)

## Build & Execution Flow

### Development

```bash
# Backend API server (Cloudflare Wrangler, port 3000)
cd remix_-siklusio
npm run dev          # wrangler dev backend/index.ts --port 3000

# Mobile app (Expo dev server, port 8081)
cd mobile-app
npx expo start       # then press 'w' for web, 'a' for Android
```

### Production Build & Deployment

```bash
# Backend API (Cloudflare Workers)
npm run deploy       # wrangler deploy backend/index.ts

# Mobile (Web)
cd mobile-app
npm run build:web    # npx expo export --platform web && dist/_redirects creation
# Deployed to Cloudflare Pages via GitHub Actions / manual drag-drop

# Mobile (Android)
cd mobile-app
eas build --platform android     # → .aab for Play Store
```

## Database Schema (Supabase)

### Core Tables

- `profiles` — user settings, cycle data, husband info, savings, avatar
- `activity_history` — daily logs (symptoms, tasks, period markers)
- `ai_credit_ledger` — ledger of credit deposits and charges for transactional balance tracking
- `habit_coach_plans` — weekly goals, answers, cycle snapshots, and coach summaries
- `habit_coach_plan_days` — daily focus and generated tasks for each active plan
- `cycle_guides` — daily cycle guide predictions, RLS policies, and unique idempotency constraint

### Community Tables

- `community_posts` — feed content + moderation state + denormalized counters
- `community_comments` — threaded replies
- `community_reactions` — 5 emoji types, unique per (post, user, type)
- `community_reports` — 1 user 1 report per target, status tracking

### Key Postgres Features Used

- Row Level Security (RLS) on all tables
- `SECURITY DEFINER` helper functions (is_admin, admin_moderate_target, handle_new_user)
- Triggers: auto-update timestamps, sync counters, auto-hide on threshold, rate limiting, and auto-resolve reports on reviewed targets
- Column-Level SELECT privileges: blocked access to sensitive columns (e.g., user_id) on anonymous items
- Cursor-based pagination via RPC function (get_community_feed)
- Affiliate system relies on RLS and secure webhook insertions into `affiliate_conversions`.

## Security

- All API endpoints require Supabase JWT (Bearer token)
- Admin endpoints double-check `profiles.is_admin` server-side
- RLS ensures users can only CRUD their own data
- Service role key only used in backend (never exposed to client)
- Rate limiting enforced at DB level (trigger) + client level (UX)
- Env secrets stored in `.env.local` (gitignored), template in `.env.example`

## Environment Variables

| Variable                        | Where Used   | Purpose                                             |
| ------------------------------- | ------------ | --------------------------------------------------- |
| `OPENROUTER_API_KEY`            | Backend      | OpenRouter authentication key                       |
| `OPENROUTER_FREE_MODEL`         | Backend      | Primary free-tier AI model for generation           |
| `OPENROUTER_PAID_MODEL`         | Backend      | Fallback paid-tier AI model for generation          |
| `GEMINI_API_KEY`                | Backend      | Deprecated/Unused (replaced by OpenRouter)          |
| `VITE_SUPABASE_URL`             | Backend      | Supabase project URL                                |
| `SUPABASE_SERVICE_ROLE_KEY`     | Backend only | Bypass RLS for admin ops                            |
| `EXPO_PUBLIC_SUPABASE_URL`      | Mobile app   | Supabase client init                                |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mobile app   | Supabase client init                                |
| `R2_ACCOUNT_ID`                 | Backend only | Cloudflare Account ID for R2                        |
| `R2_ACCESS_KEY_ID`              | Backend only | R2 API Token Access Key                             |
| `R2_SECRET_ACCESS_KEY`          | Backend only | R2 API Token Secret Key                             |
| `R2_BUCKET_NAME`                | Backend only | R2 bucket name (siklusio-avatars)                   |
| `R2_PUBLIC_URL`                 | Backend only | R2 public URL (cdn.siklusio.web.id)                 |
| `MAYAR_API_KEY`                 | Backend only | Token otentikasi API Mayar untuk _checkout invoice_ |
| `MAYAR_WEBHOOK_SECRET`          | Backend only | Rahasia _signature_ Webhook dari Mayar              |
