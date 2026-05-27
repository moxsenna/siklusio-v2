# Siklusio v2 — Application Architecture

## Overview

Siklusio adalah aplikasi pelacak siklus menstruasi & program hamil (promil) untuk wanita Indonesia. Arsitektur monorepo dengan **satu codebase universal** (Expo/React Native) yang berjalan di Android, iOS, dan Web, didukung oleh backend Express.js dan database Supabase (PostgreSQL).

## Directory Structure

```
remix_-siklusio/
├── backend/              # Express.js API Server
│   └── index.ts          # Entry point (Gemini AI + Supabase admin endpoints)
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
│   ├── community_admin.sql   # Admin moderation RPC + policies
│   ├── community_avatar.sql  # Avatar columns + feed RPC update + admin reset avatar
│   ├── community_rate_limit.sql # Anti-spam triggers (cooldown + hourly cap)
│   ├── community_privacy_hardening.sql # Column-level SELECT RLS privacy hardening
│   ├── community_verify.sql  # Diagnostic queries to verify schema
│   └── setup_admin.md    # Guide to create admin account
├── graphify-out/         # Code architecture visualization (auto-generated)
├── package.json          # Root: backend dependencies + build scripts
├── tsconfig.json         # Root TypeScript config
└── .env.example          # Environment variable template
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | Expo SDK 54, React Native 0.81, expo-router 6 |
| Styling | NativeWind 4 (Tailwind CSS 3 for RN), inline styles |
| State | React Context (CycleContext, AuthContext) + persistent localStorage |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Auth | Supabase Auth (email/password) |
| Backend API | Express.js (Node.js) via tsx/esbuild |
| AI | Google Gemini (recipe recommendations, cycle reports) |
| Image Hosting | Cloudflare R2 (avatar upload, via backend proxy) |
| Deployment (planned) | Cloudflare Pages (web) + Play Store (Android via EAS Build) |

## Key Features

### Core (Cycle Tracking)
- Menstrual cycle prediction (HPHT-based calculation)
- Phase tracking: Menstrual → Folikular → Ovulasi → Luteal
- Daily habits & symptom logging
- Calendar view with fertility window
- AI-powered cycle reports (Gemini)
- Savings tracker for pregnancy preparation
- SyncManager: Last-Write-Wins dynamic local-to-cloud profile reconciliation based on modified timestamps to eliminate offline data conflicts.

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

### Admin Portal
- User management dashboard (sortable table, CSV export)
- Community moderation queue (filter: pending/reviewed/all)
- Grouped by target (1 post with N reports = 1 card)
- Actions: Pertahankan / Sembunyikan / Reset Avatar
- Auth-gated: frontend (RequireAdmin) + backend (Bearer token + is_admin check)

## Build & Execution Flow

### Development

```bash
# Backend API server (port 3000)
cd remix_-siklusio
npm run dev          # tsx backend/index.ts (serves the static product landing page at http://localhost:3000/)

# Mobile app (Expo dev server, port 8081)
cd mobile-app
npx expo start       # then press 'w' for web, 'a' for Android
```

### Production Build

```bash
# Backend
npm run build        # esbuild → dist/server.cjs
npm run start        # node dist/server.cjs

# Mobile (Web)
cd mobile-app
npx expo export --platform web   # → dist/ static files for Cloudflare Pages

# Mobile (Android)
cd mobile-app
eas build --platform android     # → .aab for Play Store
```

## Database Schema (Supabase)

### Core Tables
- `profiles` — user settings, cycle data, husband info, savings, avatar
- `activity_history` — daily logs (symptoms, tasks, period markers)

### Community Tables
- `community_posts` — feed content + moderation state + denormalized counters
- `community_comments` — threaded replies
- `community_reactions` — 5 emoji types, unique per (post, user, type)
- `community_reports` — 1 user 1 report per target, status tracking

### Key Postgres Features Used
- Row Level Security (RLS) on all tables
- `SECURITY DEFINER` helper functions (is_admin, admin_moderate_target)
- Triggers: auto-update timestamps, sync counters, auto-hide on threshold, rate limiting, and auto-resolve reports on reviewed targets
- Column-Level SELECT privileges: blocked access to sensitive columns (e.g., user_id) on anonymous items
- Cursor-based pagination via RPC function (get_community_feed)

## Security

- All API endpoints require Supabase JWT (Bearer token)
- Admin endpoints double-check `profiles.is_admin` server-side
- RLS ensures users can only CRUD their own data
- Service role key only used in backend (never exposed to client)
- Rate limiting enforced at DB level (trigger) + client level (UX)
- Env secrets stored in `.env.local` (gitignored), template in `.env.example`

## Environment Variables

| Variable | Where Used | Purpose |
|----------|-----------|---------|
| `GEMINI_API_KEY` | Backend | Google Gemini AI calls |
| `VITE_SUPABASE_URL` | Backend | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend only | Bypass RLS for admin ops |
| `EXPO_PUBLIC_SUPABASE_URL` | Mobile app | Supabase client init |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Mobile app | Supabase client init |
| `R2_ACCOUNT_ID` | Backend only | Cloudflare Account ID for R2 |
| `R2_ACCESS_KEY_ID` | Backend only | R2 API Token Access Key |
| `R2_SECRET_ACCESS_KEY` | Backend only | R2 API Token Secret Key |
| `R2_BUCKET_NAME` | Backend only | R2 bucket name (siklusio-avatars) |
| `R2_PUBLIC_URL` | Backend only | R2 public URL (cdn.siklusio.web.id) |
