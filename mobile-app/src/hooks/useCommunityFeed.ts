import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  CommunityFeedItem,
  CommunityComment,
  ReactionType,
  PhaseTag,
  POST_MAX_LENGTH,
  COMMENT_MAX_LENGTH,
} from '../lib/communityTypes';

const PAGE_SIZE = 10;
// Sinkron dengan trigger di community_rate_limit.sql
const POST_COOLDOWN_SEC = 30;
const COMMENT_COOLDOWN_SEC = 10;

/**
 * Translate a Postgres rate-limit exception (raised by the trigger in
 * community_rate_limit.sql) into a user-friendly Indonesian message.
 *
 * Format yang dihasilkan trigger:
 *   "rate_limit:<kind>:<wait_secs?>:<human_message>"
 * Contoh:
 *   "rate_limit:post_cooldown:14:Tunggu 14 detik..."
 *   "rate_limit:post_hourly:Batas 5 postingan per jam..."
 */
function translateError(err: any): Error {
  const raw =
    typeof err === 'string'
      ? err
      : err?.message || err?.error_description || String(err ?? 'Terjadi kesalahan.');

  // Postgres lewat supabase-js menempel "raise exception ... message"
  const m = raw.match(/rate_limit:([a-z_]+):(?:(\d+):)?([^]+)/);
  if (m) {
    return new Error(m[3].trim());
  }
  // Cek pesan generic dari postgres: "violates check constraint"
  if (raw.includes('content_length_check')) {
    return new Error(`Tulisan terlalu panjang (maks ${POST_MAX_LENGTH} karakter).`);
  }
  if (raw.includes('comment_length_check')) {
    return new Error(`Komentar terlalu panjang (maks ${COMMENT_MAX_LENGTH} karakter).`);
  }
  return new Error(raw);
}

interface ReactionRow {
  post_id: string;
  reaction_type: ReactionType;
  user_id: string;
}

export interface PostReactionState {
  // counts per reaction type for the post
  counts: Record<ReactionType, number>;
  // which reaction types the current user has applied
  mine: Set<ReactionType>;
}

export function emptyReactionState(): PostReactionState {
  return {
    counts: { hug: 0, pray: 0, sad: 0, strong: 0, me_too: 0 },
    mine: new Set(),
  };
}

export interface UseCommunityFeed {
  posts: CommunityFeedItem[];
  reactions: Record<string, PostReactionState>;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasMore: boolean;
  /** Cooldown sisa (detik) sampai bisa post baru. 0 = boleh post. */
  postCooldownLeft: number;
  /** Cooldown sisa (detik) sampai bisa comment baru. 0 = boleh komen. */
  commentCooldownLeft: number;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  createPost: (content: string, isAnonymous: boolean, phaseTag: PhaseTag | null) => Promise<void>;
  toggleReaction: (postId: string, reactionType: ReactionType) => Promise<void>;
  reportTarget: (
    targetType: 'post' | 'comment',
    targetId: string,
    reason: string
  ) => Promise<void>;
  fetchComments: (postId: string) => Promise<CommentWithAuthor[]>;
  createComment: (
    postId: string,
    content: string,
    isAnonymous: boolean
  ) => Promise<void>;
  deleteOwnPost: (postId: string) => Promise<void>;
}

export interface CommentWithAuthor extends CommunityComment {
  display_name: string;
  /** URL/preset avatar penulis. NULL kalau anonim atau belum set. */
  avatar_url: string | null;
  is_own: boolean;
}

export function useCommunityFeed(currentUserId: string | null): UseCommunityFeed {
  const [posts, setPosts] = useState<CommunityFeedItem[]>([]);
  const [reactions, setReactions] = useState<Record<string, PostReactionState>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Last-action timestamps untuk client-side cooldown.
  const [lastPostAt, setLastPostAt] = useState<number | null>(null);
  const [lastCommentAt, setLastCommentAt] = useState<number | null>(null);
  // Tick state hanya untuk memaksa re-render setiap detik selama cooldown aktif.
  const [, setNowTick] = useState(0);

  const postCooldownLeft = useMemo(() => {
    if (lastPostAt == null) return 0;
    const elapsed = (Date.now() - lastPostAt) / 1000;
    return Math.max(0, Math.ceil(POST_COOLDOWN_SEC - elapsed));
  }, [lastPostAt, /* re-eval on tick */]);

  const commentCooldownLeft = useMemo(() => {
    if (lastCommentAt == null) return 0;
    const elapsed = (Date.now() - lastCommentAt) / 1000;
    return Math.max(0, Math.ceil(COMMENT_COOLDOWN_SEC - elapsed));
  }, [lastCommentAt, /* re-eval on tick */]);

  // Tick setiap detik kalau ada cooldown aktif (hemat: berhenti otomatis)
  useEffect(() => {
    if (postCooldownLeft <= 0 && commentCooldownLeft <= 0) return;
    const id = setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [postCooldownLeft, commentCooldownLeft]);

  const fetchReactionsFor = useCallback(
    async (postIds: string[]) => {
      if (!supabase || postIds.length === 0 || !currentUserId) return {};
      const { data, error: rxErr } = await supabase
        .from('community_reactions')
        .select('post_id, reaction_type, user_id')
        .in('post_id', postIds);
      if (rxErr) {
        console.warn('[useCommunityFeed] fetch reactions failed:', rxErr.message);
        return {};
      }
      const map: Record<string, PostReactionState> = {};
      postIds.forEach((id) => (map[id] = emptyReactionState()));
      (data as ReactionRow[]).forEach((r) => {
        const state = map[r.post_id];
        if (!state) return;
        state.counts[r.reaction_type] = (state.counts[r.reaction_type] || 0) + 1;
        if (r.user_id === currentUserId) state.mine.add(r.reaction_type);
      });
      return map;
    },
    [currentUserId]
  );

  const fetchPage = useCallback(
    async (before: string | null) => {
      if (!supabase) throw new Error('Supabase belum terkonfigurasi.');
      const { data, error: feedErr } = await supabase.rpc('get_community_feed', {
        page_size: PAGE_SIZE,
        before,
      });
      if (feedErr) throw feedErr;
      const rows = (data || []) as CommunityFeedItem[];
      const rxMap = await fetchReactionsFor(rows.map((p) => p.id));
      return { rows, reactionsMap: rxMap };
    },
    [fetchReactionsFor]
  );

  const refresh = useCallback(async () => {
    if (!supabase) {
      setError('Supabase belum terkonfigurasi.');
      return;
    }
    setRefreshing(true);
    setError(null);
    try {
      const { rows, reactionsMap } = await fetchPage(null);
      setPosts(rows);
      setReactions(reactionsMap);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (e: any) {
      setError(e.message || 'Gagal memuat feed komunitas.');
    } finally {
      setRefreshing(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || refreshing || posts.length === 0) return;
    const oldest = posts[posts.length - 1];
    setLoading(true);
    setError(null);
    try {
      const { rows, reactionsMap } = await fetchPage(oldest.created_at);
      // de-dupe by id (defensive)
      const existingIds = new Set(posts.map((p) => p.id));
      const newRows = rows.filter((r) => !existingIds.has(r.id));
      setPosts((prev) => [...prev, ...newRows]);
      setReactions((prev) => ({ ...prev, ...reactionsMap }));
      setHasMore(rows.length === PAGE_SIZE);
    } catch (e: any) {
      setError(e.message || 'Gagal memuat lebih banyak.');
    } finally {
      setLoading(false);
    }
  }, [posts, hasMore, loading, refreshing, fetchPage]);

  // initial load
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // ---------- mutations ----------

  const createPost = useCallback(
    async (content: string, isAnonymous: boolean, phaseTag: PhaseTag | null) => {
      if (!supabase || !currentUserId) throw new Error('Anda belum login.');
      const trimmed = content.trim();
      if (!trimmed) throw new Error('Tulisan tidak boleh kosong.');
      if (trimmed.length > POST_MAX_LENGTH)
        throw new Error(`Tulisan maksimal ${POST_MAX_LENGTH} karakter.`);

      // Client-side cooldown gate. Server tetap punya gate sendiri.
      if (lastPostAt != null) {
        const elapsed = (Date.now() - lastPostAt) / 1000;
        if (elapsed < POST_COOLDOWN_SEC) {
          throw new Error(
            `Tunggu ${Math.ceil(POST_COOLDOWN_SEC - elapsed)} detik sebelum membuat postingan baru.`
          );
        }
      }

      const { error: insErr } = await supabase.from('community_posts').insert({
        user_id: currentUserId,
        content: trimmed,
        is_anonymous: isAnonymous,
        phase_tag: phaseTag,
      });
      if (insErr) throw translateError(insErr);
      setLastPostAt(Date.now());
      await refresh();
    },
    [currentUserId, lastPostAt, refresh]
  );

  const toggleReaction = useCallback(
    async (postId: string, reactionType: ReactionType) => {
      if (!supabase || !currentUserId) throw new Error('Anda belum login.');
      const current = reactions[postId] ?? emptyReactionState();
      const has = current.mine.has(reactionType);

      // optimistic update
      setReactions((prev) => {
        const old = prev[postId] ?? emptyReactionState();
        const newMine = new Set(old.mine);
        const newCounts = { ...old.counts };
        if (has) {
          newMine.delete(reactionType);
          newCounts[reactionType] = Math.max(0, (newCounts[reactionType] || 0) - 1);
        } else {
          newMine.add(reactionType);
          newCounts[reactionType] = (newCounts[reactionType] || 0) + 1;
        }
        return { ...prev, [postId]: { mine: newMine, counts: newCounts } };
      });

      try {
        if (has) {
          const { error: delErr } = await supabase
            .from('community_reactions')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', currentUserId)
            .eq('reaction_type', reactionType);
          if (delErr) throw delErr;
        } else {
          const { error: insErr } = await supabase.from('community_reactions').insert({
            post_id: postId,
            user_id: currentUserId,
            reaction_type: reactionType,
          });
          if (insErr) throw insErr;
        }
      } catch (e: any) {
        // rollback
        setReactions((prev) => {
          const old = prev[postId] ?? emptyReactionState();
          const newMine = new Set(old.mine);
          const newCounts = { ...old.counts };
          if (has) {
            newMine.add(reactionType);
            newCounts[reactionType] = (newCounts[reactionType] || 0) + 1;
          } else {
            newMine.delete(reactionType);
            newCounts[reactionType] = Math.max(0, (newCounts[reactionType] || 0) - 1);
          }
          return { ...prev, [postId]: { mine: newMine, counts: newCounts } };
        });
        throw e;
      }
    },
    [currentUserId, reactions]
  );

  const reportTarget = useCallback(
    async (
      targetType: 'post' | 'comment',
      targetId: string,
      reason: string
    ) => {
      if (!supabase || !currentUserId) throw new Error('Anda belum login.');
      const { error: rErr } = await supabase.from('community_reports').insert({
        target_type: targetType,
        target_id: targetId,
        reporter_id: currentUserId,
        reason: reason?.trim() || null,
        status: 'pending',
      });
      if (rErr) {
        // PG unique violation: 1 user 1 report per target
        if ((rErr as any).code === '23505') {
          throw new Error('Anda sudah pernah melaporkan konten ini.');
        }
        throw rErr;
      }
    },
    [currentUserId]
  );

  const fetchComments = useCallback(
    async (postId: string): Promise<CommentWithAuthor[]> => {
      if (!supabase) return [];
      const { data: rows, error: cErr } = await supabase.rpc('get_post_comments', {
        p_post_id: postId,
      });
      if (cErr) throw cErr;

      return ((rows || []) as any[]).map<CommentWithAuthor>((c) => {
        return {
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
        };
      });
    },
    [currentUserId]
  );

  const createComment = useCallback(
    async (postId: string, content: string, isAnonymous: boolean) => {
      if (!supabase || !currentUserId) throw new Error('Anda belum login.');
      const trimmed = content.trim();
      if (!trimmed) throw new Error('Komentar tidak boleh kosong.');
      if (trimmed.length > COMMENT_MAX_LENGTH)
        throw new Error(`Komentar maksimal ${COMMENT_MAX_LENGTH} karakter.`);

      if (lastCommentAt != null) {
        const elapsed = (Date.now() - lastCommentAt) / 1000;
        if (elapsed < COMMENT_COOLDOWN_SEC) {
          throw new Error(
            `Tunggu ${Math.ceil(COMMENT_COOLDOWN_SEC - elapsed)} detik sebelum berkomentar lagi.`
          );
        }
      }

      const { error: insErr } = await supabase.from('community_comments').insert({
        post_id: postId,
        user_id: currentUserId,
        content: trimmed,
        is_anonymous: isAnonymous,
      });
      if (insErr) throw translateError(insErr);
      setLastCommentAt(Date.now());

      // bump comment count locally for snappier UX
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p
        )
      );
    },
    [currentUserId, lastCommentAt]
  );

  const deleteOwnPost = useCallback(
    async (postId: string) => {
      if (!supabase || !currentUserId) throw new Error('Anda belum login.');
      const { error: delErr } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', currentUserId);
      if (delErr) throw delErr;
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setReactions((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    },
    [currentUserId]
  );

  return useMemo(
    () => ({
      posts,
      reactions,
      loading,
      refreshing,
      error,
      hasMore,
      postCooldownLeft,
      commentCooldownLeft,
      refresh,
      loadMore,
      createPost,
      toggleReaction,
      reportTarget,
      fetchComments,
      createComment,
      deleteOwnPost,
    }),
    [
      posts,
      reactions,
      loading,
      refreshing,
      error,
      hasMore,
      postCooldownLeft,
      commentCooldownLeft,
      refresh,
      loadMore,
      createPost,
      toggleReaction,
      reportTarget,
      fetchComments,
      createComment,
      deleteOwnPost,
    ]
  );
}
