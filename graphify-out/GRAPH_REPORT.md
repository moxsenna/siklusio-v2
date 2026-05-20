# Graph Report - remix_-siklusio  (2026-05-20)

## Corpus Check
- 68 files · ~24,749 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 394 nodes · 641 edges · 37 communities (29 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]

## God Nodes (most connected - your core abstractions)
1. `useCycle()` - 54 edges
2. `CycleContext` - 29 edges
3. `useAuth()` - 20 edges
4. `compilerOptions` - 15 edges
5. `expo` - 15 edges
6. `parseLocalDate()` - 15 edges
7. `AiReportModal()` - 9 edges
8. `SyncManager()` - 9 edges
9. `storage` - 8 edges
10. `scripts` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Habits()` --calls--> `useCycle()`  [EXTRACTED]
  frontend/src/pages/Habits.tsx → mobile-app/src/context/CycleContext.tsx
- `startServer()` --calls--> `express`  [INFERRED]
  backend/index.ts → package.json
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  frontend/src/App.tsx → mobile-app/src/context/AuthContext.tsx
- `Auth()` --calls--> `useAuth()`  [EXTRACTED]
  frontend/src/pages/Auth.tsx → mobile-app/src/context/AuthContext.tsx
- `Settings()` --calls--> `useAuth()`  [EXTRACTED]
  frontend/src/pages/Settings.tsx → mobile-app/src/context/AuthContext.tsx

## Communities (37 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (23): unstable_settings, AiReportModal(), AiReportModalProps, CalendarGrid(), CalendarGridProps, CycleContext, CycleContextType, CyclePhase (+15 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (19): AdminUser, AVAILABLE_COLUMNS, AuthScreen(), IndexPage(), CustomDropdownProps, DropdownOption, OnboardingScreen(), SyncManager() (+11 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (45): Backend (Node.js/Express), Frontend (React SPA), Tailwind CSS, Vite, startServer(), frontend/index.html, Gemini API, dependencies (+37 more)

### Community 3 - "Community 3"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+8 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (15): RootLayoutNav(), styles, styles, styles, ExternalLink(), MonoText(), Text(), TextProps (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (20): useCycle(), ActionCard(), ActionCardProps, AffirmationCard(), CycleCard(), CycleCardProps, MessageModal(), MessageModalProps (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (28): backgroundColor, foregroundImage, adaptiveIcon, edgeToEdgeEnabled, predictiveBackGestureEnabled, typedRoutes, expo, android (+20 more)

### Community 7 - "Community 7"
Cohesion: 0.27
Nodes (5): AiRecommendationSection(), HistoryView(), Habits(), SYMPTOMS_LIST, HabitsScreen()

### Community 8 - "Community 8"
Cohesion: 0.40
Nodes (4): description, majorCapabilities, name, requestFramePermissions

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (25): dependencies, date-fns, expo, expo-constants, expo-font, expo-linking, expo-router, expo-splash-screen (+17 more)

### Community 13 - "Community 13"
Cohesion: 0.14
Nodes (13): devDependencies, react-test-renderer, @types/react, typescript, main, name, private, scripts (+5 more)

### Community 14 - "Community 14"
Cohesion: 0.29
Nodes (6): compilerOptions, paths, strict, extends, include, @/*

### Community 15 - "Community 15"
Cohesion: 0.40
Nodes (4): Application Architecture, Build and Execution Flow, Directory Structure, Overview

### Community 16 - "Community 16"
Cohesion: 0.40
Nodes (4): editor.codeActionsOnSave, source.fixAll, source.organizeImports, source.sortMembers

### Community 17 - "Community 17"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

### Community 32 - "Community 32"
Cohesion: 0.14
Nodes (16): CommentRow, Filter, PostRow, ProfileRow, QueueItem, ReportRow, CommunityComment, CommunityFeedItem (+8 more)

### Community 33 - "Community 33"
Cohesion: 0.18
Nodes (10): code:block1 (Email    : admin@siklusio.local), code:sql (-- Pastikan profile-nya ada (trigger handle_new_user biasany), code:sql (SELECT id, name, nickname, is_admin), code:sql (-- Cari user UID berdasarkan email), Kredensial yang dibuat, Langkah 1 — Buat akun di Supabase Dashboard, Langkah 2 — Tandai sebagai admin, Langkah 3 — Login (+2 more)

### Community 34 - "Community 34"
Cohesion: 0.20
Nodes (7): AdminUser, CommentRow, PostRow, ProfileRow, QueueItem, REACTION_EMOJI, ReportRow

## Knowledge Gaps
- **166 isolated node(s):** `name`, `description`, `requestFramePermissions`, `majorCapabilities`, `name` (+161 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `name`, `description`, `requestFramePermissions` to the rest of the system?**
  _166 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11515151515151516 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0915915915915916 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.044326241134751775 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.10804597701149425 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.12660028449502134 - nodes in this community are weakly interconnected._