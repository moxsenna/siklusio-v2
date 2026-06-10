import { Alert, Platform } from "react-native";
import type { CrmLead, CrmResponse, PaymentStatus } from "./adminCrmTypes";
import { kanbanColumns } from "./adminCrmTypes";

export function formatRupiah(value?: number | null) {
  const num = Number(value || 0);
  return `Rp ${num.toLocaleString("id-ID")}`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

export function formatDateTimeCompact(value?: string | null) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${month} ${hours}:${minutes}`;
  } catch {
    return value;
  }
}

export function buildWhatsappFollowUp(lead: CrmLead) {
  const name = lead.name || "Bunda";
  const status = lead.payment_status;

  if (status === "pending_payment") {
    return `Halo ${name}, aku dari Siklusio 🌸\n\nAku lihat pendaftaran Siklusio Bunda sudah sampai tahap checkout, tapi pembayarannya belum selesai. Kalau ada kendala saat pembayaran, Bunda bisa balas pesan ini ya.`;
  }
  if (status === "paid" || status === "paid_manual") {
    return `Halo ${name}, terima kasih sudah bergabung dengan Siklusio 🌸\n\nKalau Bunda butuh bantuan login atau onboarding, boleh balas pesan ini ya.`;
  }
  return `Halo ${name}, aku dari Siklusio 🌸\n\nTerima kasih sudah tertarik dengan Siklusio. Kalau Bunda ingin dibantu memahami fitur promil, masa subur, dan Pojok Tenang, boleh balas pesan ini ya.`;
}

export function confirmAction(title: string, message: string): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: "Batal", onPress: () => resolve(false), style: "cancel" },
      { text: "Lanjutkan", onPress: () => resolve(true) },
    ]);
  });
}

export function groupLeadsByPaymentStatus(leads: CrmLead[]): Record<PaymentStatus, CrmLead[]> {
  return kanbanColumns.reduce<Record<PaymentStatus, CrmLead[]>>(
    (acc, col) => {
      acc[col.key] = leads.filter((l) => l.payment_status === col.key);
      return acc;
    },
    {} as Record<PaymentStatus, CrmLead[]>,
  );
}

export function buildLeadsQueryParams(options: {
  limit: number;
  offset: number;
  debouncedSearch: string;
  paymentFilter: PaymentStatus | "all";
  leadStatusFilter: import("./adminCrmTypes").LeadStatus | "all";
}) {
  const params = new URLSearchParams();
  params.set("limit", String(options.limit));
  params.set("offset", String(options.offset));
  if (options.debouncedSearch.trim()) params.set("search", options.debouncedSearch.trim());
  if (options.paymentFilter !== "all") params.set("payment", options.paymentFilter);
  if (options.leadStatusFilter !== "all") params.set("status", options.leadStatusFilter);
  return params;
}

export const emptyCrmStats = (): CrmResponse["stats"] => ({ total: 0, revenue: 0 });