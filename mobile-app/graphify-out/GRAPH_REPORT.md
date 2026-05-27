# Graph Report - mobile-app  (2026-05-21)

## Corpus Check
- 62 files · ~46,509 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 267 nodes · 397 edges · 21 communities (18 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `976a8878`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]

## God Nodes (most connected - your core abstractions)
1. `useCycle()` - 27 edges
2. `expo` - 15 edges
3. `useAuth()` - 13 edges
4. `Text()` - 6 edges
5. `parseLocalDate()` - 6 edges
6. `scripts` - 5 edges
7. `View()` - 5 edges
8. `useUserAvatar()` - 5 edges
9. `resolveAvatarSource()` - 5 edges
10. `storage` - 5 edges

## Surprising Connections (you probably didn't know these)
- `AuthScreen()` --calls--> `useAuth()`  [EXTRACTED]
  app/auth.tsx → src/context/AuthContext.tsx
- `IndexPage()` --calls--> `useCycle()`  [EXTRACTED]
  app/index.tsx → src/context/CycleContext.tsx
- `OnboardingScreen()` --calls--> `useCycle()`  [EXTRACTED]
  app/onboarding.tsx → src/context/CycleContext.tsx
- `OnboardingScreen()` --calls--> `useAuth()`  [EXTRACTED]
  app/onboarding.tsx → src/context/AuthContext.tsx
- `RootLayoutNav()` --calls--> `useColorScheme()`  [INFERRED]
  app/_layout.tsx → components/useColorScheme.web.ts

## Communities (21 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (28): AiReportModal(), AiReportModalProps, CalendarGrid(), CalendarGridProps, CycleContext, CycleContextType, CycleProvider(), useCycle() (+20 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (31): AdminUser, CommentRow, PostRow, ProfileRow, QueueItem, ReportRow, CommentsModal(), CommentsModalProps (+23 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (15): RootLayoutNav(), styles, styles, styles, ExternalLink(), MonoText(), Text(), TextProps (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (28): backgroundColor, foregroundImage, adaptiveIcon, edgeToEdgeEnabled, predictiveBackGestureEnabled, typedRoutes, expo, android (+20 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (39): dependencies, date-fns, expo, expo-constants, expo-font, expo-image-picker, expo-linking, expo-router (+31 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (22): AuthScreen(), IndexPage(), unstable_settings, AvatarPicker(), AvatarPickerProps, AuthContext, AuthContextType, AuthProvider() (+14 more)

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (10): CustomDropdownProps, DropdownOption, OnboardingScreen(), DatePickerField(), DatePickerFieldProps, formatLong(), MONTHS_ID, NativeWheelDatePicker() (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.29
Nodes (6): compilerOptions, paths, strict, extends, include, @/*

### Community 9 - "Community 9"
Cohesion: 0.40
Nodes (4): editor.codeActionsOnSave, source.fixAll, source.organizeImports, source.sortMembers

### Community 10 - "Community 10"
Cohesion: 0.50
Nodes (3): config, { getDefaultConfig }, { withNativeWind }

## Knowledge Gaps
- **114 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+109 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useCycle()` connect `Community 0` to `Community 5`, `Community 7`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `useAuth()` connect `Community 5` to `Community 1`, `Community 7`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _114 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09408033826638477 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07308970099667775 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10804597701149425 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._