import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type {
  AdminModerationQueueRow,
  QueueItem,
  ReportRow,
} from "./adminTypes";

export function formatRelative(dateStr: string) {
  try {
    return format(new Date(dateStr), "d MMM yyyy HH:mm", { locale: localeId });
  } catch {
    return dateStr;
  }
}

export function formatCsvDateTime(dateStr?: string | null) {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "yyyy-MM-dd HH:mm");
  } catch {
    return dateStr;
  }
}

export function escapeCsvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function toTargetType(value: string): "post" | "comment" {
  return value === "comment" ? "comment" : "post";
}

export function toReportStatus(value: string | null): ReportRow["status"] {
  if (value === "resolved_hide" || value === "resolved_keep") return value;
  return "pending";
}

export function toReviewStatus(value: string | null): QueueItem["reviewStatus"] {
  if (value === "kept" || value === "removed") return value;
  return null;
}

export function toAvatarKind(value: string | null): QueueItem["authorAvatarKind"] {
  if (value === "preset" || value === "custom") return value;
  return null;
}

export function buildModerationQueue(rows: AdminModerationQueueRow[]): QueueItem[] {
  const grouped = new Map<string, AdminModerationQueueRow[]>();
  rows.forEach((r) => {
    const targetType = toTargetType(r.target_type);
    const key = `${targetType}:${r.target_id}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  });

  const items: QueueItem[] = [];
  grouped.forEach((rs, key) => {
    const first = rs[0];
    if (!first) return;

    const [target_type, target_id] = key.split(":") as ["post" | "comment", string];
    const authorId = first.author_id || "unknown";
    const realLabel = first.author_real_label?.trim() || authorId.split("-")[0] || "Pengguna";
    const displayLabel =
      first.author_label?.trim() || (first.is_anonymous ? "Anonim" : realLabel);

    items.push({
      key,
      target_type,
      target_id,
      content: first.content || "",
      authorId,
      authorLabel: displayLabel,
      authorRealLabel: realLabel,
      authorAvatarUrl: first.author_avatar_url ?? null,
      authorAvatarKind: toAvatarKind(first.author_avatar_kind),
      is_anonymous: Boolean(first.is_anonymous),
      is_hidden: Boolean(first.is_hidden),
      reportCount: first.report_count ?? rs.length,
      reviewStatus: toReviewStatus(first.review_status),
      reviewedAt: first.reviewed_at,
      createdAt: first.target_created_at || first.report_created_at,
      authorEmail: first.author_email,
      reports: rs
        .map<ReportRow>((r) => ({
          id: r.report_id,
          target_type: toTargetType(r.target_type),
          target_id: r.target_id,
          reporter_id: r.reporter_id,
          reason: r.reason,
          status: toReportStatus(r.report_status),
          created_at: r.report_created_at,
          resolved_at: r.resolved_at,
          reporter_name: r.reporter_name,
          reporter_nickname: r.reporter_nickname,
          reporter_email: r.reporter_email,
        }))
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)),
    });
  });

  return items.sort((a, b) => {
    if (b.reportCount !== a.reportCount) return b.reportCount - a.reportCount;
    return +new Date(b.createdAt) - +new Date(a.createdAt);
  });
}