import type { DeliveryLog, DeliveryStatus, EventFilter, StatusFilter } from "./adminWhatsappTypes";

export function getEventLabel(key: string) {
  return key === "registration_completed" ? "Setelah User Isi Data" : "Setelah Pembayaran Berhasil";
}

export function getLogEventLabel(key: string) {
  return key === "registration_completed" ? "Registrasi" : "Pembayaran";
}

export function getStatusBadgeStyle(status: DeliveryStatus) {
  if (status === "sent") {
    return { bgColor: "#dcfce7", textColor: "#14b8a6", label: "Terkirim" as const };
  }
  if (status === "failed") {
    return { bgColor: "#fee2e2", textColor: "#ec4899", label: "Gagal" as const };
  }
  if (status === "skipped") {
    return { bgColor: "#e2e8f0", textColor: "#64748b", label: "Dilewati" as const };
  }
  if (status === "pending") {
    return { bgColor: "#fef3c7", textColor: "#d97706", label: "Pending" as const };
  }
  return { bgColor: "#f1f5f9", textColor: "#475569", label: status };
}

export function formatLogSnippet(message: string | null | undefined, maxLength = 140) {
  if (!message) return "-";
  if (message.length > maxLength) {
    return message.substring(0, maxLength) + "...";
  }
  return message;
}

export function buildLogsQueryString(statusFilter: StatusFilter, eventFilter: EventFilter) {
  const params: string[] = [];
  if (statusFilter !== "all") params.push(`status=${statusFilter}`);
  if (eventFilter !== "all") params.push(`event=${eventFilter}`);
  return params.length > 0 ? `?${params.join("&")}` : "";
}

export function getSkippedReasonText(metadata: Record<string, unknown> | null) {
  const reason = metadata?.reason;
  if (reason === "setting_disabled") return "Autoresponder dinonaktifkan di pengaturan.";
  if (reason === "setting_not_found") return "Setting autoresponder untuk event ini belum diatur.";
  if (reason === "duplicate_idempotency") return "Pencegahan double-send dipicu (Idempotency cocok).";
  if (!reason) {
    return (typeof reason === "string" ? reason : null) || "Nomor tidak terdaftar atau trigger dicegah.";
  }
  return "";
}

export function formatLogTimestamp(createdAt: string) {
  const date = new Date(createdAt);
  return {
    date: date.toLocaleDateString("id-ID"),
    time: date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
  };
}