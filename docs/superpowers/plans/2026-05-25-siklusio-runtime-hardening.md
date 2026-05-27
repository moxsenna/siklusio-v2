# Siklusio Runtime Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the runtime, security, and configuration bugs found in the audit so the Expo app, backend API, and Supabase community features work reliably in development and production.

**Architecture:** Keep fixes scoped and incremental. Move duplicated API base-url logic into one mobile helper, protect backend AI endpoints with the same Supabase JWT gate used by admin, move sensitive community reads behind safe SQL RPCs, and keep direct table access limited to writes or non-sensitive reads. Avoid broad UI rewrites.

**Tech Stack:** Expo SDK 54, React Native, Expo Router, Express 4, Supabase JS v2, PostgreSQL RLS/RPC, TypeScript.

---

## File Structure

- Modify `backend/index.ts`: add reusable Supabase admin client creation, CORS/API headers, JWT auth helper, and auth gate for AI endpoints.
- Create `mobile-app/src/lib/api.ts`: single source for API base URL and authenticated JSON requests.
- Modify `mobile-app/components/calendar/AiReportModal.tsx`: call `apiPostJson`.
- Modify `mobile-app/components/habits/AiRecommendationSection.tsx`: call `apiPostJson`.
- Modify `mobile-app/app/admin.tsx`: use `getApiBaseUrl` helper for users endpoint and use safe admin moderation RPC for queue data.
- Modify `mobile-app/app/(tabs)/_layout.tsx`: enforce session/onboarding guard for every tab route.
- Modify `mobile-app/src/hooks/useCommunityFeed.ts`: use RPC for feed/comments, fix cooldown ticking, keep writes through table inserts/deletes.
- Modify `mobile-app/app/(tabs)/community.tsx`: route comment reporting through `ReportModal`.
- Modify `mobile-app/components/community/CommentsModal.tsx`: remove `Alert.prompt` usage and expose comment report target to parent.
- Modify `supabase/community_avatar.sql`: replace feed RPC with `SECURITY DEFINER`, explicit auth checks, and safe columns.
- Create `supabase/community_comments_rpc.sql`: add safe `get_post_comments` RPC.
- Create `supabase/community_admin_rpc.sql`: add safe `admin_get_moderation_queue` RPC.
- Modify `supabase/community_privacy_hardening.sql`: keep direct `user_id` hidden and grant only safe columns.
- Modify `supabase/community_verify.sql`: add checks for the safe RPCs.
- Modify `tsconfig.json`: scope root TypeScript check to backend.
- Modify `package.json`: make `clean` Windows-safe and keep root `lint` backend-only.
- Modify `.env.example`: document `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_SUPABASE_URL`, and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

---

### Task 1: Add Mobile API Helper and Authenticated API Calls

**Files:**
- Create: `mobile-app/src/lib/api.ts`
- Modify: `mobile-app/components/calendar/AiReportModal.tsx`
- Modify: `mobile-app/components/habits/AiRecommendationSection.tsx`
- Modify: `mobile-app/app/admin.tsx`

- [x] **Step 1: Create the API helper**

Create `mobile-app/src/lib/api.ts`:

```ts
import Constants from 'expo-constants';
import { supabase } from './supabase';

export function getApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configured && configured.trim().length > 0) {
    return configured.replace(/\/+$/, '');
  }

  const debuggerHost = Constants.expoConfig?.hostUri || '';
  const ip = debuggerHost.split(':')[0];
  if (ip) return `http://${ip}:3000`;

  return 'http://localhost:3000';
}

export async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function apiPostJson<TResponse>(
  path: string,
  body: unknown
): Promise<TResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `Server error (${res.status})`);
  }
  return json as TResponse;
}

export async function apiGetJson<TResponse>(path: string): Promise<TResponse> {
  const token = await getAccessToken();
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `Server error (${res.status})`);
  }
  return json as TResponse;
}
```

- [x] **Step 2: Replace duplicated base URL logic in AI report**

In `mobile-app/components/calendar/AiReportModal.tsx`, remove `Constants` import and local `getApiBaseUrl`. Add:

```ts
import { apiPostJson } from '../../src/lib/api';
```

Replace the fetch block with:

```ts
const data = await apiPostJson<any>('/api/generate-cycle-report', payload);
setReport(data);
```

- [x] **Step 3: Replace duplicated base URL logic in habits insight**

In `mobile-app/components/habits/AiRecommendationSection.tsx`, remove `Constants` import and local `getApiBaseUrl`. Add:

```ts
import { apiPostJson } from '../../src/lib/api';
```

Replace the fetch block with:

```ts
const json = await apiPostJson<AiInsightResult>('/api/generate-habits-insight', {
  weeklyData,
  currentPhase,
  nickname,
});
setResult(json);
```

- [x] **Step 4: Use API helper for admin users**

In `mobile-app/app/admin.tsx`, remove `Constants` import and local `getApiBaseUrl`. Add:

```ts
import { apiGetJson } from '../src/lib/api';
```

Replace the `/api/admin/users` fetch with:

```ts
const data = await apiGetJson<{ users: AdminUser[] }>('/api/admin/users');
setUsers(data.users || []);
```

- [x] **Step 5: Verify mobile typecheck**

Run:

```powershell
npx.cmd tsc --noEmit --pretty false
```

Expected: exit code `0`.

---

### Task 2: Protect Backend AI Endpoints

**Files:**
- Modify: `backend/index.ts`

- [x] **Step 1: Add reusable Supabase admin client and auth helper**

Near the top of `startServer`, after `app.use(express.json());`, add:

```ts
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase config');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const requireUser = async (req: express.Request, res: express.Response) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null;

  if (!token) {
    res.status(401).json({ error: 'Missing access token' });
    return null;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);

  if (userErr || !userData?.user) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return null;
  }

  return { supabaseAdmin, user: userData.user };
};
```

- [x] **Step 2: Gate all AI routes**

At the start of each AI route handler, after checking `GEMINI_API_KEY`, add:

```ts
const auth = await requireUser(req, res);
if (!auth) return;
```

Apply this to:
- `/api/generate-recipes`
- `/api/generate-cycle-report`
- `/api/generate-habits-insight`

- [x] **Step 3: Reuse helper in admin users route**

In `/api/admin/users`, remove duplicated Supabase config/client creation and use:

```ts
const auth = await requireUser(req, res);
if (!auth) return;
const { supabaseAdmin, user } = auth;
```

Then replace `userData.user.id` with `user.id`.

- [x] **Step 4: Verify backend build**

Run:

```powershell
npm.cmd run build
```

Expected: esbuild exits `0` and writes `dist/server.cjs`.

---

### Task 3: Fix Community Read Security with Safe RPCs

**Files:**
- Modify: `supabase/community_avatar.sql`
- Create: `supabase/community_comments_rpc.sql`
- Create: `supabase/community_admin_rpc.sql`
- Modify: `supabase/community_privacy_hardening.sql`
- Modify: `supabase/community_verify.sql`
- Modify: `mobile-app/src/hooks/useCommunityFeed.ts`
- Modify: `mobile-app/app/admin.tsx`

- [x] **Step 1: Replace feed RPC with safe security definer**

In `supabase/community_avatar.sql`, change `get_community_feed` to:

```sql
DROP FUNCTION IF EXISTS public.get_community_feed(INTEGER, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.get_community_feed(
  page_size INTEGER DEFAULT 10,
  before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  display_name TEXT,
  avatar_url TEXT,
  is_anonymous BOOLEAN,
  phase_tag TEXT,
  comment_count INTEGER,
  reaction_count INTEGER,
  created_at TIMESTAMPTZ,
  is_own BOOLEAN,
  is_hidden BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.content,
    CASE
      WHEN p.is_anonymous THEN 'Anonim'
      ELSE COALESCE(NULLIF(prof.nickname, ''), 'Pengguna')
    END AS display_name,
    CASE
      WHEN p.is_anonymous THEN NULL
      ELSE prof.avatar_url
    END AS avatar_url,
    p.is_anonymous,
    p.phase_tag,
    p.comment_count,
    p.reaction_count,
    p.created_at,
    (p.user_id = auth.uid()) AS is_own,
    p.is_hidden
  FROM public.community_posts p
  LEFT JOIN public.profiles prof ON prof.id = p.user_id
  WHERE auth.uid() IS NOT NULL
    AND (p.is_hidden = FALSE OR p.user_id = auth.uid())
    AND (before IS NULL OR p.created_at < before)
  ORDER BY p.created_at DESC
  LIMIT LEAST(GREATEST(page_size, 1), 50);
$$;

REVOKE ALL ON FUNCTION public.get_community_feed(INTEGER, TIMESTAMPTZ) FROM public;
GRANT EXECUTE ON FUNCTION public.get_community_feed(INTEGER, TIMESTAMPTZ) TO authenticated;
```

- [x] **Step 2: Add comments RPC**

Create `supabase/community_comments_rpc.sql`:

```sql
CREATE OR REPLACE FUNCTION public.get_post_comments(
  p_post_id UUID
)
RETURNS TABLE (
  id UUID,
  post_id UUID,
  content TEXT,
  is_anonymous BOOLEAN,
  is_hidden BOOLEAN,
  hidden_reason TEXT,
  report_count INTEGER,
  created_at TIMESTAMPTZ,
  display_name TEXT,
  avatar_url TEXT,
  is_own BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.post_id,
    c.content,
    c.is_anonymous,
    c.is_hidden,
    c.hidden_reason,
    c.report_count,
    c.created_at,
    CASE
      WHEN c.is_anonymous THEN 'Anonim'
      ELSE COALESCE(NULLIF(p.nickname, ''), NULLIF(p.name, ''), 'Pengguna')
    END AS display_name,
    CASE
      WHEN c.is_anonymous THEN NULL
      ELSE p.avatar_url
    END AS avatar_url,
    (c.user_id = auth.uid()) AS is_own
  FROM public.community_comments c
  LEFT JOIN public.profiles p ON p.id = c.user_id
  WHERE auth.uid() IS NOT NULL
    AND c.post_id = p_post_id
    AND (c.is_hidden = FALSE OR c.user_id = auth.uid() OR public.is_admin(auth.uid()))
  ORDER BY c.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_post_comments(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_post_comments(UUID) TO authenticated;
```

- [x] **Step 3: Add admin moderation queue RPC**

Create `supabase/community_admin_rpc.sql`:

```sql
CREATE OR REPLACE FUNCTION public.admin_get_moderation_queue(
  p_filter TEXT DEFAULT 'pending'
)
RETURNS TABLE (
  report_id UUID,
  target_type TEXT,
  target_id UUID,
  reporter_id UUID,
  reason TEXT,
  report_status TEXT,
  report_created_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  content TEXT,
  author_id UUID,
  author_label TEXT,
  author_real_label TEXT,
  author_avatar_url TEXT,
  author_avatar_kind TEXT,
  is_anonymous BOOLEAN,
  is_hidden BOOLEAN,
  report_count INTEGER,
  review_status TEXT,
  reviewed_at TIMESTAMPTZ,
  target_created_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH filtered_reports AS (
    SELECT *
    FROM public.community_reports r
    WHERE auth.uid() IS NOT NULL
      AND public.is_admin(auth.uid())
      AND (
        p_filter = 'all'
        OR (p_filter = 'pending' AND r.status = 'pending')
        OR (p_filter = 'reviewed' AND r.status IN ('resolved_hide', 'resolved_keep'))
      )
    ORDER BY r.created_at DESC
    LIMIT 200
  )
  SELECT
    r.id,
    r.target_type,
    r.target_id,
    r.reporter_id,
    r.reason,
    r.status,
    r.created_at,
    r.resolved_at,
    COALESCE(post_target.content, comment_target.content) AS content,
    COALESCE(post_target.user_id, comment_target.user_id) AS author_id,
    CASE
      WHEN COALESCE(post_target.is_anonymous, comment_target.is_anonymous) THEN 'Anonim'
      ELSE COALESCE(NULLIF(prof.nickname, ''), NULLIF(prof.name, ''), 'Pengguna')
    END AS author_label,
    COALESCE(NULLIF(prof.nickname, ''), NULLIF(prof.name, ''), 'Pengguna') AS author_real_label,
    prof.avatar_url,
    prof.avatar_kind,
    COALESCE(post_target.is_anonymous, comment_target.is_anonymous) AS is_anonymous,
    COALESCE(post_target.is_hidden, comment_target.is_hidden) AS is_hidden,
    COALESCE(post_target.report_count, comment_target.report_count) AS report_count,
    COALESCE(post_target.admin_review_status, comment_target.admin_review_status) AS review_status,
    COALESCE(post_target.admin_reviewed_at, comment_target.admin_reviewed_at) AS reviewed_at,
    COALESCE(post_target.created_at, comment_target.created_at) AS target_created_at
  FROM filtered_reports r
  LEFT JOIN public.community_posts post_target
    ON r.target_type = 'post' AND post_target.id = r.target_id
  LEFT JOIN public.community_comments comment_target
    ON r.target_type = 'comment' AND comment_target.id = r.target_id
  LEFT JOIN public.profiles prof
    ON prof.id = COALESCE(post_target.user_id, comment_target.user_id);
$$;

REVOKE ALL ON FUNCTION public.admin_get_moderation_queue(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_get_moderation_queue(TEXT) TO authenticated;
```

- [x] **Step 4: Update mobile comments fetch**

In `mobile-app/src/hooks/useCommunityFeed.ts`, replace the `community_comments.select('*')` and follow-up profile query inside `fetchComments` with:

```ts
const { data: rows, error: cErr } = await supabase.rpc('get_post_comments', {
  p_post_id: postId,
});
if (cErr) throw cErr;
return ((rows || []) as any[]).map<CommentWithAuthor>((c) => ({
  id: c.id,
  post_id: c.post_id,
  user_id: c.is_own ? currentUserId || '' : '',
  content: c.content,
  is_anonymous: c.is_anonymous,
  is_hidden: c.is_hidden,
  hidden_reason: c.hidden_reason,
  report_count: c.report_count,
  created_at: c.created_at,
  display_name: c.display_name,
  avatar_url: c.avatar_url,
  is_own: c.is_own,
}));
```

- [x] **Step 5: Update admin moderation fetch**

In `mobile-app/app/admin.tsx`, replace direct `community_posts.select('*')`, `community_comments.select('*')`, and profile joins with:

```ts
const { data: rows, error } = await supabase.rpc('admin_get_moderation_queue', {
  p_filter: modFilter,
});
if (error) throw error;
```

Then group `rows` by `${row.target_type}:${row.target_id}` to build `QueueItem[]`, using returned fields instead of `posts`, `comments`, and `profiles` state.

- [ ] **Step 6: Verify SQL in Supabase SQL Editor**

Run these files in order:

```text
supabase/community_avatar.sql
supabase/community_comments_rpc.sql
supabase/community_admin_rpc.sql
supabase/community_privacy_hardening.sql
supabase/community_verify.sql
```

Expected:
- `SELECT * FROM public.get_community_feed(10, NULL);` returns rows or empty set without permission error.
- `SELECT * FROM public.get_post_comments('<post_uuid>');` returns comments without exposing non-own `user_id`.
- `SELECT * FROM public.admin_get_moderation_queue('pending');` returns rows only for an admin user.

Local verification note: `npx.cmd tsc --noEmit --pretty false` passed in `mobile-app`.
Supabase SQL Editor execution still needs a connected Supabase session.

---

### Task 4: Fix Community Cooldown Timer

**Files:**
- Modify: `mobile-app/src/hooks/useCommunityFeed.ts`

- [ ] **Step 1: Replace unused tick state**

Change:

```ts
const [, setNowTick] = useState(0);
```

to:

```ts
const [nowTick, setNowTick] = useState(0);
```

- [ ] **Step 2: Include tick in cooldown dependencies**

Change cooldown memos to:

```ts
const postCooldownLeft = useMemo(() => {
  if (lastPostAt == null) return 0;
  const elapsed = (Date.now() - lastPostAt) / 1000;
  return Math.max(0, Math.ceil(POST_COOLDOWN_SEC - elapsed));
}, [lastPostAt, nowTick]);

const commentCooldownLeft = useMemo(() => {
  if (lastCommentAt == null) return 0;
  const elapsed = (Date.now() - lastCommentAt) / 1000;
  return Math.max(0, Math.ceil(COMMENT_COOLDOWN_SEC - elapsed));
}, [lastCommentAt, nowTick]);
```

- [ ] **Step 3: Verify behavior manually**

Run:

```powershell
npx.cmd expo start --web
```

Expected:
- After creating a post, `ComposerModal` button counts down from about `30s` to enabled.
- After creating a comment, `CommentsModal` send button counts down from about `10s` to enabled.

---

### Task 5: Protect Tab Routes and Fix Logout Flow

**Files:**
- Modify: `mobile-app/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Add auth/onboarding guard imports**

Add:

```ts
import { ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../../src/context/AuthContext';
import { useCycle } from '../../src/context/CycleContext';
```

If `View` is already imported from `react-native`, merge it with `ActivityIndicator`.

- [ ] **Step 2: Add guard inside `TabLayout`**

Inside `TabLayout`, before `return`, add:

```ts
const { session, isLoading } = useAuth();
const { isOnboardingCompleted } = useCycle();
const router = useRouter();

useEffect(() => {
  if (isLoading) return;
  if (!session) {
    router.replace('/auth');
    return;
  }
  if (!isOnboardingCompleted) {
    router.replace('/onboarding');
  }
}, [session, isLoading, isOnboardingCompleted, router]);

if (isLoading || !session || !isOnboardingCompleted) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fdf2f8' }}>
      <ActivityIndicator size="large" color="#ec4899" />
    </View>
  );
}
```

- [ ] **Step 3: Verify logout route**

Run app, log in, open dashboard, then log out from settings.

Expected:
- User returns to `/auth`.
- Browser back or direct `/dashboard` redirects back to `/auth`.
- Direct `/onboarding` still works only after a valid session.

---

### Task 6: Replace Android `Alert.prompt` for Comment Reporting

**Files:**
- Modify: `mobile-app/components/community/CommentsModal.tsx`
- Modify: `mobile-app/app/(tabs)/community.tsx`

- [ ] **Step 1: Change CommentsModal prop**

Replace:

```ts
onReportComment: (commentId: string, reason: string) => Promise<void>;
```

with:

```ts
onReportComment: (commentId: string) => void;
```

- [ ] **Step 2: Replace `handleReport` implementation**

Replace the current `handleReport` function with:

```ts
const handleReport = (commentId: string) => {
  onReportComment(commentId);
};
```

Remove the `window.prompt` and `Alert.prompt` branches from the file.

- [ ] **Step 3: Wire parent to ReportModal**

In `mobile-app/app/(tabs)/community.tsx`, change:

```tsx
onReportComment={(commentId, reason) =>
  feed.reportTarget('comment', commentId, reason)
}
```

to:

```tsx
onReportComment={(commentId) => handleOpenReport(commentId, 'comment')}
```

Expected: comment reports use the same `ReportModal` UI as post reports on web, iOS, and Android.

- [ ] **Step 4: Verify mobile typecheck**

Run:

```powershell
npx.cmd tsc --noEmit --pretty false
```

Expected: exit code `0`.

---

### Task 7: Fix Root Tooling and Environment Template

**Files:**
- Modify: `tsconfig.json`
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Scope root TypeScript to backend**

Replace root `tsconfig.json` with:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "strict": true,
    "allowJs": true,
    "jsx": "react-jsx",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["backend/**/*.ts", "test-api.js"],
  "exclude": ["mobile-app", "dist", "node_modules", "graphify-out", "scratch"]
}
```

- [ ] **Step 2: Make clean script Windows-safe**

In root `package.json`, replace:

```json
"clean": "rm -rf dist"
```

with:

```json
"clean": "node -e \"require('fs').rmSync('dist',{recursive:true,force:true})\""
```

- [ ] **Step 3: Document production API and mobile Supabase env**

In `.env.example`, add:

```env
# Backend API URL used by Expo mobile/web in production.
# For local physical-device testing, this can stay empty and the app will use Expo hostUri.
EXPO_PUBLIC_API_BASE_URL=""

# Supabase client config for Expo mobile/web.
EXPO_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="your-anon-public-key"
```

Keep existing `VITE_SUPABASE_URL` because the backend currently reads it.

- [ ] **Step 4: Verify root lint and build**

Run:

```powershell
npm.cmd run lint
npm.cmd run build
```

Expected: both commands exit `0`.

---

### Task 8: Final Verification Pass

**Files:**
- No code changes unless verification exposes a new root cause.

- [ ] **Step 1: Run backend verification**

Run:

```powershell
npm.cmd run lint
npm.cmd run build
```

Expected: exit code `0` for both.

- [ ] **Step 2: Run mobile verification**

Run from `mobile-app`:

```powershell
npx.cmd tsc --noEmit --pretty false
npx.cmd expo export --platform web --output-dir .expo/audit-export
```

Expected:
- TypeScript exits `0`.
- Expo export exits `0` and lists static routes.

- [ ] **Step 3: Run local smoke test**

Run backend:

```powershell
npm.cmd run dev
```

Run mobile web in another terminal:

```powershell
cd mobile-app
npx.cmd expo start --web
```

Expected:
- Unauthenticated tab route redirects to `/auth`.
- Login redirects through onboarding/dashboard correctly.
- AI report request sends `Authorization: Bearer <token>`.
- Backend rejects AI request without token with HTTP `401`.
- Community feed loads through RPC.
- Comments load through RPC.
- Comment reporting opens `ReportModal`.
- Post/comment cooldown countdown reaches `0`.

- [ ] **Step 4: Review git diff**

Run:

```powershell
git diff --stat
git diff -- backend/index.ts mobile-app/src/lib/api.ts mobile-app/src/hooks/useCommunityFeed.ts
```

Expected: diff is limited to files listed in this plan and does not include unrelated generated output.

---

## Self-Review

- Spec coverage: Covers every audit item that can break runtime behavior: Supabase privacy/RPC, cooldown logic, production API URL, backend auth, route guard/logout, Android comment report, root lint, and env documentation.
- Placeholder scan: No `TBD`, `TODO`, or "implement later" markers are present.
- Type consistency: Mobile helper functions are named `getApiBaseUrl`, `getAccessToken`, `apiPostJson`, and `apiGetJson`; call sites use the same names. SQL RPC names are `get_community_feed`, `get_post_comments`, and `admin_get_moderation_queue`.
- Scope check: The plan is multi-subsystem but each task is independently testable and can be executed in order.
