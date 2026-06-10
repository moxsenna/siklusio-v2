export interface AdminUser {
  id: string;
  email?: string;
  last_sign_in_at?: string;
  name?: string;
  nickname?: string;
  whatsapp_number?: string;
  birth_date?: string;
  children_count?: string;
  last_period_date?: string | null;
  husband_name: string;
  husband_nickname?: string;
  husband_number?: string;
  cycle_length: number;
  period_length: number;
  target_saving: number;
  current_saving: number;
  created_at: string;
  updated_at?: string;
  is_admin?: boolean;
  avatar_url?: string | null;
  avatar_kind?: string | null;
}

export interface ReportRow {
  id: string;
  target_type: "post" | "comment";
  target_id: string;
  reporter_id: string;
  reason: string | null;
  status: "pending" | "resolved_hide" | "resolved_keep";
  created_at: string;
  resolved_at: string | null;
  reporter_name?: string | null;
  reporter_nickname?: string | null;
  reporter_email?: string | null;
}

export interface QueueItem {
  key: string;
  target_type: "post" | "comment";
  target_id: string;
  content: string;
  authorId: string;
  authorLabel: string;
  authorRealLabel: string;
  authorAvatarUrl: string | null;
  authorAvatarKind: "preset" | "custom" | null;
  is_anonymous: boolean;
  is_hidden: boolean;
  reportCount: number;
  reviewStatus: "kept" | "removed" | null;
  reviewedAt: string | null;
  createdAt: string;
  reports: ReportRow[];
  authorEmail?: string | null;
}

export interface AdminModerationQueueRow {
  report_id: string;
  target_type: "post" | "comment" | string;
  target_id: string;
  reporter_id: string;
  reason: string | null;
  report_status: string | null;
  report_created_at: string;
  resolved_at: string | null;
  content: string | null;
  author_id: string | null;
  author_label: string | null;
  author_real_label: string | null;
  author_avatar_url: string | null;
  author_avatar_kind: string | null;
  is_anonymous: boolean | null;
  is_hidden: boolean | null;
  report_count: number | null;
  review_status: string | null;
  reviewed_at: string | null;
  target_created_at: string | null;
  reporter_name?: string | null;
  reporter_nickname?: string | null;
  reporter_email?: string | null;
  author_email?: string | null;
}

export interface AdminCoupon {
  id: string;
  code: string;
  discount_type: "nominal" | "percentage";
  discount_value: number;
  is_active: boolean;
  created_at: string;
}

export type AdminTab =
  | "users"
  | "crm"
  | "moderation"
  | "coupons"
  | "affiliates"
  | "whatsapp";

export type ModerationFilter = "pending" | "reviewed" | "all";

export interface NewCouponForm {
  code: string;
  discount_type: "nominal" | "percentage";
  discount_value: string;
}