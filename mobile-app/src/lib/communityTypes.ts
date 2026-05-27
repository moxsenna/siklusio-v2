// ============================================================
// Community feature shared types
// Mirror of frontend/src/lib/communityTypes.ts
// ============================================================

export const REACTION_TYPES = ['hug', 'pray', 'sad', 'strong', 'me_too'] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export const REACTION_EMOJI: Record<ReactionType, string> = {
  hug: '💖',
  pray: '🙏',
  sad: '😢',
  strong: '💪',
  me_too: '🤝',
};

export const REACTION_LABEL: Record<ReactionType, string> = {
  hug: 'Peluk',
  pray: 'Doa',
  sad: 'Sedih',
  strong: 'Kuat',
  me_too: 'Aku juga',
};

export type PhaseTag = 'Menstrual' | 'Folikular' | 'Ovulasi' | 'Luteal';

export const POST_MAX_LENGTH = 500;
export const COMMENT_MAX_LENGTH = 300;
export const AUTO_HIDE_REPORT_THRESHOLD = 10;

export interface CommunityPost {
  id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  phase_tag: PhaseTag | null;
  is_hidden: boolean;
  hidden_reason: string | null;
  report_count: number;
  admin_reviewed_at: string | null;
  admin_review_status: 'kept' | 'removed' | null;
  comment_count: number;
  reaction_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommunityFeedItem {
  id: string;
  content: string;
  display_name: string;
  /** URL avatar (preset:<id> atau https://). NULL kalau anonim/tidak set. */
  avatar_url: string | null;
  is_anonymous: boolean;
  phase_tag: PhaseTag | null;
  comment_count: number;
  reaction_count: number;
  created_at: string;
  is_own: boolean;
  is_hidden: boolean;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  is_hidden: boolean;
  hidden_reason: string | null;
  report_count: number;
  created_at: string;
}

export interface CommunityReaction {
  id: string;
  post_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface CommunityReport {
  id: string;
  target_type: 'post' | 'comment';
  target_id: string;
  reporter_id: string;
  reason: string | null;
  status: 'pending' | 'resolved_hide' | 'resolved_keep';
  created_at: string;
  resolved_at: string | null;
  resolver_id: string | null;
}
