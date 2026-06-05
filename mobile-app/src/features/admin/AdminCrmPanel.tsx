import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { FontAwesome } from "@expo/vector-icons";

import { apiGetJson, apiPatchJson, apiPostJson } from "@/src/lib/api";

type CrmLeadStatus =
  | "new_lead"
  | "contacted"
  | "interested"
  | "checkout_started"
  | "pending_payment"
  | "paid"
  | "onboarded"
  | "no_response"
  | "not_interested";

type CrmPaymentStatus =
  | "new"
  | "checkout_started"
  | "pending_payment"
  | "paid"
  | "paid_manual"
  | "failed"
  | "cancelled"
  | "refunded";

interface CrmLead {
  id: string;
  user_id?: string | null;
  pending_registration_id?: string | null;
  name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  source: string;
  referral_code?: string | null;
  affiliate_code?: string | null;
  lead_status: CrmLeadStatus;
  payment_status: CrmPaymentStatus;
  amount?: number | null;
  currency?: string | null;
  mayar_payment_id?: string | null;
  mayar_transaction_id?: string | null;
  manual_payment_reference?: string | null;
  last_contacted_at?: string | null;
  next_followup_at?: string | null;
  created_at: string;
  notes?: Array<{ id: string; note: string; created_at: string }>;
}

interface CrmSummary {
  totalLeads: number;
  pendingPayment: number;
  paid: number;
  needFollowUp: number;
  revenue: number;
}

const paymentStatusLabels: Record<CrmPaymentStatus, string> = {
  new: "Baru",
  checkout_started: "Mulai Checkout",
  pending_payment: "Menunggu Bayar",
  paid: "Lunas",
  paid_manual: "Lunas Manual",
  failed: "Gagal",
  cancelled: "Dibatalkan",
  refunded: "Refund",
};

const leadStatusLabels: Record<CrmLeadStatus, string> = {
  new_lead: "Lead Baru",
  contacted: "Sudah Dihubungi",
  interested: "Tertarik",
  checkout_started: "Mulai Checkout",
  pending_payment: "Menunggu Bayar",
  paid: "Lunas",
  onboarded: "Sudah Onboarding",
  no_response: "Tidak Respon",
  not_interested: "Tidak Tertarik",
};

function formatRupiah(value?: number | null) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
}

function formatDateTime(value?: string | null) {
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

function buildWhatsappFollowUp(lead: CrmLead) {
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

async function copyText(text: string) {
  await Clipboard.setStringAsync(text);
}

export default function AdminCrmPanel() {
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [summary, setSummary] = useState<CrmSummary | null>(null);
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<CrmPaymentStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form states
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideReference, setOverrideReference] = useState("");
  const [overrideAmount, setOverrideAmount] = useState("37000");
  const [shouldActivate, setShouldActivate] = useState(true);
  const [noteText, setNoteText] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (paymentFilter !== "all") params.set("payment", paymentFilter);
    const value = params.toString();
    return value ? `?${value}` : "";
  }, [paymentFilter, search]);

  const fetchCrm = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, leadsRes] = await Promise.all([
        apiGetJson<{ summary: CrmSummary }>("/api/admin/crm/summary"),
        apiGetJson<{ leads: CrmLead[] }>(`/api/admin/crm/leads${queryString}`),
      ]);

      setSummary(summaryRes.summary);
      setLeads(leadsRes.leads || []);
    } catch (error: any) {
      Alert.alert("CRM Error", error.message || "Gagal memuat CRM.");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchCrm();
  }, [fetchCrm]);

  const markLeadStatus = async (lead: CrmLead, status: CrmLeadStatus) => {
    setSavingId(lead.id);
    try {
      await apiPatchJson(`/api/admin/crm/leads/${lead.id}`, {
        lead_status: status,
        last_contacted_at:
          status === "contacted" ? new Date().toISOString() : lead.last_contacted_at,
      });
      await fetchCrm();
      Alert.alert("Sukses", `Lead ditandai sebagai ${leadStatusLabels[status]}.`);
    } catch (error: any) {
      Alert.alert("Gagal update status", error.message || "Coba lagi.");
    } finally {
      setSavingId(null);
    }
  };

  const overridePayment = async (
    lead: CrmLead,
    payment_status: CrmPaymentStatus,
    shouldActivateUser: boolean,
  ) => {
    if (!overrideReason.trim() || overrideReason.trim().length < 8) {
      Alert.alert("Alasan wajib", "Isi alasan minimal 8 karakter.");
      return;
    }

    if (shouldActivateUser && (payment_status === "paid_manual" || payment_status === "paid")) {
      if (!lead.pending_registration_id && !overrideReference.trim()) {
        Alert.alert(
          "Referensi Wajib",
          "Aktivasi tanpa pending registration wajib menyertakan kode referensi/bukti transfer.",
        );
        return;
      }
    }

    const label = paymentStatusLabels[payment_status];

    Alert.alert(
      "Konfirmasi Manual Payment",
      `Ubah status pembayaran ${lead.email || lead.whatsapp || lead.name} menjadi "${label}"?\n\nTindakan ini akan masuk audit log.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Ubah",
          style: "destructive",
          onPress: async () => {
            setSavingId(lead.id);
            try {
              const res = await apiPatchJson<{
                lead: CrmLead;
                override: any;
                activationResult: {
                  paymentOverrideCreated: boolean;
                  userActivated: boolean;
                  creditsGranted: boolean;
                  affiliateConversionCreated: boolean;
                  checkoutSessionUpdated: boolean;
                  pendingRegistrationCleaned: boolean;
                  warnings: string[];
                };
              }>(`/api/admin/crm/leads/${lead.id}/payment-status`, {
                payment_status,
                reason: overrideReason.trim(),
                reference: overrideReference.trim() || null,
                amount: overrideAmount ? Number(overrideAmount) : null,
                should_activate_user: shouldActivateUser,
              });

              setOverrideReason("");
              setOverrideReference("");
              await fetchCrm();

              // Build checklist details
              const ar = res.activationResult;
              const details = [
                `Payment override created: ${ar.paymentOverrideCreated ? "✅" : "❌"}`,
                `User activated: ${ar.userActivated ? "✅" : "❌"}`,
                `AI credits (500) granted: ${ar.creditsGranted ? "✅" : "❌"}`,
                `Affiliate commission created: ${ar.affiliateConversionCreated ? "✅" : "❌"}`,
                `Checkout session updated: ${ar.checkoutSessionUpdated ? "✅" : "❌"}`,
                `Pending registration cleaned: ${ar.pendingRegistrationCleaned ? "✅" : "❌"}`,
              ].join("\n");

              if (ar.warnings && ar.warnings.length > 0) {
                Alert.alert(
                  "Override Berhasil dengan Peringatan",
                  `${details}\n\n⚠️ Peringatan:\n${ar.warnings.join("\n")}`,
                );
              } else {
                Alert.alert("Override Berhasil", details);
              }
            } catch (error: any) {
              Alert.alert("Gagal override payment", error.message || "Coba lagi.");
            } finally {
              setSavingId(null);
            }
          },
        },
      ],
    );
  };

  const addNote = async (lead: CrmLead) => {
    if (!noteText.trim()) return;

    setSavingId(lead.id);
    try {
      await apiPostJson(`/api/admin/crm/leads/${lead.id}/notes`, {
        note: noteText.trim(),
      });
      setNoteText("");
      await fetchCrm();
      Alert.alert("Sukses", "Catatan berhasil ditambahkan.");
    } catch (error: any) {
      Alert.alert("Gagal tambah catatan", error.message || "Coba lagi.");
    } finally {
      setSavingId(null);
    }
  };

  const copyWa = async (lead: CrmLead) => {
    const text = buildWhatsappFollowUp(lead);

    try {
      await copyText(text);
      Alert.alert("Template disalin", "Pesan follow-up WhatsApp sudah disalin ke clipboard.");
    } catch {
      Alert.alert("Template Follow-up", text);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      {/* CRM Card Header */}
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 24,
          padding: 18,
          borderWidth: 1,
          borderColor: "#fbcfe8",
          shadowColor: "#ec4899",
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <FontAwesome name="heart" size={20} color="#ec4899" />
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#1e1b20" }}>CRM Admin 🌸</Text>
        </View>
        <Text style={{ marginTop: 6, color: "#64748b", lineHeight: 20, fontSize: 13 }}>
          Pantau lead, kelola status pembayaran, kirim follow-up WhatsApp, dan verifikasi pembayaran
          manual.
        </Text>
      </View>

      {/* Summary Row */}
      {summary && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {[
            ["Total Lead", String(summary.totalLeads), "#ec4899"],
            ["Pending Bayar", String(summary.pendingPayment), "#f59e0b"],
            ["Lunas", String(summary.paid), "#10b981"],
            ["Perlu Follow-up", String(summary.needFollowUp), "#9333ea"],
            ["Revenue", formatRupiah(summary.revenue), "#06b6d4"],
          ].map(([label, value, color]) => (
            <View
              key={label}
              style={{
                flexGrow: 1,
                minWidth: 130,
                backgroundColor: "#fff",
                borderRadius: 20,
                padding: 14,
                borderWidth: 1,
                borderColor: "#f3e8ff",
                shadowColor: "#000",
                shadowOpacity: 0.02,
                shadowRadius: 5,
                elevation: 1,
              }}
            >
              <Text style={{ color: "#64748b", fontSize: 11, fontWeight: "bold" }}>{label}</Text>
              <Text style={{ color: color, fontSize: 20, fontWeight: "900", marginTop: 4 }}>
                {value}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Search Bar */}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <View
          style={{
            flex: 1,
            minWidth: 200,
            backgroundColor: "#fff",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
          }}
        >
          <FontAwesome name="search" size={14} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari nama, email, WA, referral..."
            style={{
              flex: 1,
              paddingVertical: 10,
              color: "#334155",
            }}
          />
        </View>
        <TouchableOpacity
          onPress={fetchCrm}
          style={{
            backgroundColor: "#ec4899",
            borderRadius: 16,
            paddingHorizontal: 18,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>Cari</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
        {(["all", "pending_payment", "paid", "paid_manual", "failed", "cancelled"] as const).map(
          (status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setPaymentFilter(status)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                marginRight: 8,
                backgroundColor: paymentFilter === status ? "#9333ea" : "#fff",
                borderWidth: 1,
                borderColor: "#e9d5ff",
              }}
            >
              <Text
                style={{
                  color: paymentFilter === status ? "#fff" : "#475569",
                  fontWeight: "700",
                  fontSize: 12,
                }}
              >
                {status === "all" ? "Semua Status" : paymentStatusLabels[status]}
              </Text>
            </TouchableOpacity>
          ),
        )}
      </ScrollView>

      {/* Leads List */}
      {loading ? (
        <ActivityIndicator color="#ec4899" size="large" style={{ marginVertical: 32 }} />
      ) : leads.length === 0 ? (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 32,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#e2e8f0",
          }}
        >
          <FontAwesome name="folder-open-o" size={32} color="#94a3b8" />
          <Text style={{ color: "#64748b", marginTop: 8, fontWeight: "bold", fontSize: 13 }}>
            Tidak ada lead yang cocok dengan filter.
          </Text>
        </View>
      ) : (
        leads.map((lead) => {
          const expanded = expandedId === lead.id;
          const saving = savingId === lead.id;

          return (
            <View
              key={lead.id}
              style={{
                backgroundColor: "#fff",
                borderRadius: 22,
                padding: 16,
                borderWidth: 1,
                borderColor: expanded ? "#fbcfe8" : "#f1f5f9",
                gap: 10,
                shadowColor: "#000",
                shadowOpacity: expanded ? 0.03 : 0.01,
                shadowRadius: 5,
                elevation: 1,
              }}
            >
              <TouchableOpacity
                onPress={() => setExpandedId(expanded ? null : lead.id)}
                style={{ gap: 4 }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#0f172a", flex: 1 }}>
                    {lead.name || lead.email || lead.whatsapp || "Lead Tanpa Nama"}
                  </Text>
                  <FontAwesome
                    name={expanded ? "chevron-up" : "chevron-down"}
                    size={12}
                    color="#94a3b8"
                  />
                </View>
                <Text style={{ color: "#64748b", fontSize: 13 }}>
                  {lead.email || "-"} • {lead.whatsapp || "-"}
                </Text>
                <Text style={{ color: "#94a3b8", fontSize: 11 }}>
                  Sumber: {lead.source} • Dibuat: {formatDateTime(lead.created_at)}
                </Text>
              </TouchableOpacity>

              {/* Status Badges */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                <View
                  style={{
                    backgroundColor: "#fdf2f8",
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: "#be185d", fontWeight: "800", fontSize: 11 }}>
                    {leadStatusLabels[lead.lead_status]}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: "#f0fdfa",
                    borderRadius: 999,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: "#0f766e", fontWeight: "800", fontSize: 11 }}>
                    {paymentStatusLabels[lead.payment_status]}
                  </Text>
                </View>
                {lead.amount ? (
                  <View
                    style={{
                      backgroundColor: "#faf5ff",
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ color: "#7e22ce", fontWeight: "800", fontSize: 11 }}>
                      {formatRupiah(lead.amount)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {expanded && (
                <View
                  style={{
                    gap: 12,
                    marginTop: 8,
                    borderTopWidth: 1,
                    borderTopColor: "#f1f5f9",
                    paddingTop: 12,
                  }}
                >
                  {/* Lead Actions */}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <TouchableOpacity
                      disabled={saving}
                      onPress={() => markLeadStatus(lead, "contacted")}
                      style={{
                        backgroundColor: "#14b8a6",
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        borderRadius: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        opacity: saving ? 0.5 : 1,
                      }}
                    >
                      <FontAwesome name="check-circle" size={13} color="#fff" />
                      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>
                        Tandai Dihubungi
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={saving}
                      onPress={() => copyWa(lead)}
                      style={{
                        backgroundColor: "#22c55e",
                        paddingHorizontal: 12,
                        paddingVertical: 9,
                        borderRadius: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        opacity: saving ? 0.5 : 1,
                      }}
                    >
                      <FontAwesome name="whatsapp" size={14} color="#fff" />
                      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>
                        Copy WA Follow-up
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Manual Payment Override */}
                  <View
                    style={{
                      backgroundColor: "#fff7ed",
                      borderRadius: 18,
                      padding: 14,
                      gap: 8,
                      borderWidth: 1,
                      borderColor: "#fed7aa",
                    }}
                  >
                    <Text style={{ fontWeight: "900", color: "#9a3412", fontSize: 13 }}>
                      Manual Payment Override 🛡️
                    </Text>
                    <Text style={{ color: "#c2410c", fontSize: 11, lineHeight: 16 }}>
                      Tindakan ini akan dicatat ke audit log admin. Harap berhati-hati dan isi bukti
                      transfer jika melakukan aktivasi.
                    </Text>

                    <TextInput
                      value={overrideReason}
                      onChangeText={setOverrideReason}
                      placeholder="Alasan wajib (min. 8 karakter), misal: transfer BCA valid..."
                      multiline
                      style={{
                        backgroundColor: "#fff",
                        borderRadius: 12,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: "#fed7aa",
                        fontSize: 13,
                        color: "#334155",
                        minHeight: 60,
                      }}
                    />
                    <TextInput
                      value={overrideReference}
                      onChangeText={setOverrideReference}
                      placeholder="Referensi/bukti transfer (Wajib jika tidak ada pending reg)"
                      style={{
                        backgroundColor: "#fff",
                        borderRadius: 12,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: "#fed7aa",
                        fontSize: 13,
                        color: "#334155",
                      }}
                    />
                    <TextInput
                      value={overrideAmount}
                      onChangeText={setOverrideAmount}
                      placeholder="Nominal"
                      keyboardType="numeric"
                      style={{
                        backgroundColor: "#fff",
                        borderRadius: 12,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: "#fed7aa",
                        fontSize: 13,
                        color: "#334155",
                      }}
                    />

                    {/* Toggle User Activation */}
                    <TouchableOpacity
                      onPress={() => setShouldActivate(!shouldActivate)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginVertical: 4,
                      }}
                    >
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          borderWidth: 2,
                          borderColor: shouldActivate ? "#e65100" : "#cbd5e1",
                          backgroundColor: shouldActivate ? "#e65100" : "#fff",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {shouldActivate && <FontAwesome name="check" size={11} color="#fff" />}
                      </View>
                      <Text style={{ fontSize: 12, color: "#9a3412", fontWeight: "bold" }}>
                        Aktifkan Akses Premium User (Idempotent)
                      </Text>
                    </TouchableOpacity>

                    {/* Override Action Buttons */}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                      <TouchableOpacity
                        disabled={saving}
                        onPress={() => overridePayment(lead, "paid_manual", shouldActivate)}
                        style={{
                          backgroundColor: "#16a34a",
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderRadius: 12,
                          opacity: saving ? 0.5 : 1,
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>
                          Lunas Manual
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        disabled={saving}
                        onPress={() => overridePayment(lead, "pending_payment", false)}
                        style={{
                          backgroundColor: "#f59e0b",
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderRadius: 12,
                          opacity: saving ? 0.5 : 1,
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>
                          Set Pending
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        disabled={saving}
                        onPress={() => overridePayment(lead, "failed", false)}
                        style={{
                          backgroundColor: "#ef4444",
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderRadius: 12,
                          opacity: saving ? 0.5 : 1,
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>
                          Gagal
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Notes Area */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontWeight: "900", color: "#0f172a", fontSize: 13 }}>
                      Catatan Follow-up Admin
                    </Text>
                    <TextInput
                      value={noteText}
                      onChangeText={setNoteText}
                      placeholder="Tambahkan catatan perkembangan follow-up..."
                      multiline
                      style={{
                        backgroundColor: "#f8fafc",
                        borderRadius: 12,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: "#e2e8f0",
                        fontSize: 13,
                        color: "#334155",
                        minHeight: 50,
                      }}
                    />
                    <TouchableOpacity
                      disabled={saving || !noteText.trim()}
                      onPress={() => addNote(lead)}
                      style={{
                        alignSelf: "flex-start",
                        backgroundColor: noteText.trim() ? "#ec4899" : "#cbd5e1",
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: 12,
                        opacity: saving ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>
                        Simpan Catatan
                      </Text>
                    </TouchableOpacity>

                    {/* Display existing notes */}
                    {(lead.notes || []).slice(0, 3).map((note) => (
                      <View
                        key={note.id}
                        style={{
                          backgroundColor: "#f8fafc",
                          borderRadius: 12,
                          padding: 10,
                          borderWidth: 1,
                          borderColor: "#f1f5f9",
                        }}
                      >
                        <Text style={{ color: "#334155", fontSize: 13 }}>{note.note}</Text>
                        <Text style={{ color: "#94a3b8", fontSize: 10, marginTop: 4 }}>
                          Oleh Admin • {formatDateTime(note.created_at)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}
