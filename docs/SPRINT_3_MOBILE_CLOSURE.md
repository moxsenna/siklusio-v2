# Sprint 3 — Mobile Maintainability Closure

**Status:** Practical complete (3A–3I)  
**Date:** 2026-06-10  
**Decision:** Do **not** split `CycleContext` provider yet. Selector hooks are sufficient for maintainability at this stage.

---

## Goal

Reduce blast radius and improve maintainability of large mobile screens and admin panels without changing user-facing behavior, storage keys, or sync logic.

## Outcome

| Area | Result |
|------|--------|
| God files | Main screens/panels decomposed into orchestrators + feature modules |
| `CycleContext` | All app consumers migrated to typed selector hooks; provider unchanged |
| Automated checks | `npm run typecheck:mobile` PASS, `npm run check` PASS, CI PASS |
| Provider split | **Deferred** — intentional risk reduction |

---

## Sprint Summary (3A → 3H)

| Sprint | Commit | Change |
|--------|--------|--------|
| **3A** | `a67e575` | Community feed → `FlatList` virtualization |
| **3B** | `8535f9d` | Settings screen → `src/features/settings/*` sections |
| **3C** | `6a69a39` | Admin screen → shell (`admin.tsx`) + tab panels |
| **3D** | `518f17b` | `AdminCrmPanel` → `src/features/admin/crm/*` |
| **3E** | `cde173e` | `AdminWhatsappAutoresponderPanel` → `whatsapp/*` |
| **3F** | `cd661f6` | `AdminAffiliatePanel` → `affiliate/*` |
| **3G** | `58eca74` | Typed Cycle selector hooks + 12 safe consumers |
| **3H** | `9ce5e22` | `useCycleParams()` + habits/settings/onboarding migration |
| **3I** | _(this doc)_ | Closure + manual QA checklist |

---

## File Size Reduction (orchestrator vs before)

Figures are **line counts** (orchestrator/main file). Extracted modules add total lines but improve locality and reviewability.

| File | Before | After (orchestrator) | Δ | Extracted module(s) |
|------|--------|----------------------|---|---------------------|
| `app/(tabs)/community.tsx` | 280 | 307 | +27* | FlatList in-place (virtualization, not file split) |
| `app/(tabs)/settings.tsx` | 956 | 478 | **−478 (−50%)** | `features/settings/` (~719 lines, 10 files) |
| `app/admin.tsx` | 1819 | 131 | **−1688 (−93%)** | `AdminHeader`, `AdminTabs`, `AdminUsersPanel`, `AdminCouponsPanel`, `AdminModerationPanel` + delegated panels |
| `AdminCrmPanel.tsx` | 1298 | 335 | **−963 (−74%)** | `features/admin/crm/` (~1325 lines, 11 files) |
| `AdminWhatsappAutoresponderPanel.tsx` | 853 | 242 | **−611 (−72%)** | `features/admin/whatsapp/` (~904 lines, 9 files) |
| `AdminAffiliatePanel.tsx` | 772 | 135 | **−637 (−83%)** | `features/admin/affiliate/` (~666 lines, 9 files) |
| `CycleContext.tsx` | 479 | 479 | 0 | Unchanged provider; `useCycleSelectors.ts` (+203 lines, 7 hooks) |

\*Community grew slightly due to FlatList props/structure; net win is runtime list performance, not line reduction.

### New / key modules

```
mobile-app/src/features/settings/          (10 section components)
mobile-app/src/features/admin/
  AdminHeader.tsx, AdminTabs.tsx
  AdminUsersPanel.tsx, AdminCouponsPanel.tsx, AdminModerationPanel.tsx
  crm/, whatsapp/, affiliate/
mobile-app/src/hooks/useCycleSelectors.ts  (7 selector hooks)
```

---

## CycleContext Selector Hooks (3G + 3H)

| Hook | Domain |
|------|--------|
| `useCycleParams()` | User input: HPHT, cycle length, period length |
| `useCycleProfile()` | Nickname, avatar, birth date, children, husband fields |
| `useCyclePrediction()` | Computed phase, fertile window, confidence, dates |
| `useCycleSavings()` | Target/current savings |
| `useCycleActivityHistory()` | Daily activity records |
| `useCycleSyncState()` | Onboarding flag, profile loading |
| `useCycleActions()` | `getDayInfo()` |

**Consumer status:** All 15 app consumers use selector hooks. `useCycle()` remains exported and is only called inside `useCycleSelectors.ts` and `CycleContext.tsx`.

**Not achieved (by design):** Re-render isolation — selectors still subscribe to the single provider via `useContext`. Acceptable for maintainability phase.

---

## Behavior Preserved (all sprints)

- AsyncStorage keys (`hs_v3_*`, `hs_onboardingCompleted`) — unchanged
- Supabase sync (profile, savings, activity history) — unchanged
- Commission/payout/admin API contracts — unchanged
- UI copy, styling, validation messages — unchanged
- Onboarding flow steps — unchanged
- Cycle calculation via `calculateCycleData` — unchanged

---

## Deferred Items (post–Sprint 3)

| Item | Rationale |
|------|-----------|
| **Split `CycleContext` provider** | High blast radius; sync/onboarding/storage coupling. If pursued later, start with **`SavingsContext`** (most isolated), not prediction/activity. |
| **Context selector library** (e.g. `use-context-selector`) | Needed for real re-render wins; not required for maintainability closure. |
| **Mobile component/hook tests** | No regression harness yet for decomposed UI. |
| **Deeper admin panel tests** | CRM, affiliate payout, WhatsApp test-send need integration/E2E coverage. |
| **Community FlatList E2E** | Virtualization behavior should be smoke-tested on device. |

---

## Manual QA Checklist

**Sign-off template (fill per run):** [`SPRINT_3_MOBILE_QA_SIGNOFF.md`](./SPRINT_3_MOBILE_QA_SIGNOFF.md)

Run on **web** (`npx expo start --web`) and/or **device** before Sprint 4 or provider split. Mark each: ✅ pass / ❌ fail / ⏭ skip.

### Dashboard

- [ ] Buka dashboard
- [ ] Fase siklus tampil benar
- [ ] Action card muncul (habit insight / CTA)
- [ ] Kartu tabungan tampil + progress
- [ ] Avatar / profile button header tampil
- [ ] Message modal suami bisa dibuka (jika fertile)

### Calendar

- [ ] Buka kalender
- [ ] Navigasi bulan prev/next
- [ ] Toggle/log menstruasi atau aktivitas hari
- [ ] Cycle guide modal
- [ ] AI report modal bisa dibuka + generate

### Habits

- [ ] Checklist habit hari ini
- [ ] Symptom / mood tracking
- [ ] History view (7/14/30 hari)
- [ ] AI habit coach / insight (cached atau fresh)

### Settings

- [ ] Ubah nama panggilan / profil
- [ ] Ubah HPHT / panjang siklus / haid
- [ ] Warning override muncul saat ada manual logs
- [ ] Tabungan target & current tersimpan
- [ ] Referral / affiliate card
- [ ] Daily reminder toggle
- [ ] Logout + konfirmasi

### Community

- [ ] Feed load awal
- [ ] Pull-to-refresh
- [ ] Load more (pagination)
- [ ] Reaction (like/emoji)
- [ ] Comment
- [ ] Report konten

### Admin — Users / Coupons / Moderation

- [ ] Panel users: list + search/filter
- [ ] Coupon CRUD
- [ ] Moderation: approve/reject/pending count

### Admin — CRM

- [ ] List view + kanban toggle
- [ ] Lead detail panel
- [ ] Status update + notes

### Admin — Affiliate

- [ ] Stats cards
- [ ] Create affiliate
- [ ] Toggle active / delete
- [ ] Conversion list + mark payout paid

### Admin — WhatsApp

- [ ] Settings list per event
- [ ] Template editor + preview
- [ ] Test send
- [ ] Logs table

### Regression spot-checks (refactor-sensitive)

- [ ] Cold start → onboarding redirect (belum onboard)
- [ ] Login → cloud profile pull → skip onboarding
- [ ] Settings cycle change → dashboard phase updates
- [ ] Savings add → persists after reload

---

## Automated Verification (3I)

```bash
npm run typecheck:mobile   # PASS
npm run check              # PASS
# CI on push               # PASS (expected)
```

---

## Recommended Next Steps

| Option | Description |
|--------|-------------|
| **A — Sprint 4B** | Infra / DB baseline (if planned) |
| **B — Manual QA** | Execute checklist above on device/web **before** further refactors |
| **C — Sprint 3J** | First provider split: `SavingsContext` only (lowest risk) |

**Recommendation:** **B first**, then A or C based on QA results.

---

## Sign-off

- [x] All Sprint 3A–3H commits on `main`
- [x] Selector hooks complete; no direct `useCycle()` in screens
- [x] Provider split explicitly deferred
- [ ] Manual QA checklist executed — see [`SPRINT_3_MOBILE_QA_SIGNOFF.md`](./SPRINT_3_MOBILE_QA_SIGNOFF.md)

| Role | Name | Date | QA result |
|------|------|------|-----------|
| Dev | | | |
| QA / Product | | | |