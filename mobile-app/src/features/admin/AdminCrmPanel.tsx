import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AlertButton,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { apiGetJson, apiPatchJson, apiPostJson } from "@/src/lib/api";

type ViewMode = "list" | "kanban" | "detail";
type PaymentStatus =
  | "new"
  | "checkout_started"
  | "pending_payment"
  | "paid"
  | "paid_manual"
  | "failed"
  | "cancelled"
  | "refunded";

type LeadStatus =
  | "new_lead"
  | "contacted"
  | "interested"
  | "checkout_started"
  | "pending_payment"
  | "paid"
  | "onboarded"
  | "no_response"
  | "not_interested";

type CrmLead = {
  id: string;
  user_id: string | null;
  pending_registration_id: string | null;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  source: string;
  referral_code: string | null;
  affiliate_code: string | null;
  lead_status: LeadStatus;
  payment_status: PaymentStatus;
  checkout_url: string | null;
  mayar_payment_id: string | null;
  mayar_transaction_id: string | null;
  manual_payment_reference: string | null;
  amount: number | null;
  currency: string;
  last_contacted_at: string | null;
  next_followup_at: string | null;
  created_at: string;
  updated_at: string;
  notes?: Array<{ id: string; note: string; created_at: string; admin_user_id: string }>;
  payment_overrides?: Array<{
    id: string;
    old_payment_status: PaymentStatus | null;
    new_payment_status: PaymentStatus;
    reason: string;
    reference: string | null;
    amount: number | null;
    created_at: string;
    admin_user_id: string;
  }>;
};

type CrmResponse = {
  leads: CrmLead[];
  count: number;
  limit: number;
  offset: number;
  stats: Record<string, number> & { total: number; revenue: number };
};

const paymentOptions: Array<{ value: PaymentStatus; label: string }> = [
  { value: "new", label: "Baru" },
  { value: "checkout_started", label: "Mulai Checkout" },
  { value: "pending_payment", label: "Menunggu Bayar" },
  { value: "paid", label: "Lunas" },
  { value: "paid_manual", label: "Lunas Manual" },
  { value: "failed", label: "Gagal" },
  { value: "cancelled", label: "Dibatalkan" },
  { value: "refunded", label: "Refund" },
];

const leadOptions: Array<{ value: LeadStatus; label: string }> = [
  { value: "new_lead", label: "Lead Baru" },
  { value: "contacted", label: "Sudah Dihubungi" },
  { value: "interested", label: "Tertarik" },
  { value: "checkout_started", label: "Mulai Checkout" },
  { value: "pending_payment", label: "Menunggu Bayar" },
  { value: "paid", label: "Lunas" },
  { value: "onboarded", label: "Onboarded" },
  { value: "no_response", label: "Tidak Respon" },
  { value: "not_interested", label: "Tidak Tertarik" },
];

const kanbanColumns: Array<{ key: PaymentStatus; title: string; color: string }> = [
  { key: "pending_payment", title: "Menunggu Bayar", color: "#f59e0b" },
  { key: "paid", title: "Lunas (Webhook)", color: "#10b981" },
  { key: "paid_manual", title: "Lunas Manual", color: "#6366f1" },
  { key: "failed", title: "Gagal", color: "#ef4444" },
  { key: "cancelled", title: "Dibatalkan", color: "#64748b" },
];

function formatRupiah(value?: number | null) {
  const num = Number(value || 0);
  return `Rp ${num.toLocaleString("id-ID")}`;
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

export default function AdminCrmPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [stats, setStats] = useState<CrmResponse["stats"]>({ total: 0, revenue: 0 });
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Pagination & Search States
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "all">("all");

  // Selection
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Forms
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideReference, setOverrideReference] = useState("");
  const [overrideAmount, setOverrideAmount] = useState("37000");
  const [shouldActivate, setShouldActivate] = useState(true);
  const [noteText, setNoteText] = useState("");

  const selectedLead = useMemo(() => {
    return leads.find((lead) => lead.id === selectedId) || null;
  }, [leads, selectedId]);

  // Search Debouncer
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setOffset(0); // reset page on search
    }, 450);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load leads from backend
  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (paymentFilter !== "all") params.set("payment", paymentFilter);

      const data = await apiGetJson<CrmResponse>(`/api/admin/crm/leads?${params.toString()}`);
      setLeads(data.leads || []);
      setTotalCount(data.count || 0);
      setStats(data.stats || { total: 0, revenue: 0 });
    } catch (err: any) {
      Alert.alert("Gagal", err.message || "Gagal memuat CRM leads.");
    } finally {
      setLoading(false);
    }
  }, [limit, offset, debouncedSearch, paymentFilter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  // Quick Payment Status Dropdown Update (Optimistic with rollback)
  const handleQuickPaymentStatus = async (lead: CrmLead, newStatus: PaymentStatus) => {
    const oldStatus = lead.payment_status;
    setLeads((prev) =>
      prev.map((item) => (item.id === lead.id ? { ...item, payment_status: newStatus } : item))
    );

    try {
      await apiPatchJson(`/api/admin/crm/leads/${lead.id}/payment-status`, {
        payment_status: newStatus,
      });
      // Fetch stats updates silently
      const silentData = await apiGetJson<CrmResponse>(`/api/admin/crm/leads?limit=1`);
      if (silentData.stats) setStats(silentData.stats);
    } catch (err: any) {
      // Rollback
      setLeads((prev) =>
        prev.map((item) => (item.id === lead.id ? { ...item, payment_status: oldStatus } : item))
      );
      Alert.alert("Gagal", err.message || "Gagal memperbarui status pembayaran.");
    }
  };

  // Quick Lead Status Dropdown Update (Optimistic with rollback)
  const handleQuickLeadStatus = async (lead: CrmLead, newStatus: LeadStatus) => {
    const oldStatus = lead.lead_status;
    setLeads((prev) =>
      prev.map((item) => (item.id === lead.id ? { ...item, lead_status: newStatus } : item))
    );

    try {
      await apiPatchJson(`/api/admin/crm/leads/${lead.id}`, {
        lead_status: newStatus,
      });
    } catch (err: any) {
      // Rollback
      setLeads((prev) =>
        prev.map((item) => (item.id === lead.id ? { ...item, lead_status: oldStatus } : item))
      );
      Alert.alert("Gagal", err.message || "Gagal memperbarui status lead.");
    }
  };

  // Mark Contacted (Optimistic with rollback)
  const markContacted = async (lead: CrmLead) => {
    const oldLeadStatus = lead.lead_status;
    const now = new Date().toISOString();
    setLeads((prev) =>
      prev.map((item) =>
        item.id === lead.id
          ? { ...item, lead_status: "contacted" as LeadStatus, last_contacted_at: now }
          : item
      )
    );

    try {
      await apiPostJson(`/api/admin/crm/leads/${lead.id}/contacted`, {});
    } catch (err: any) {
      // Rollback
      setLeads((prev) =>
        prev.map((item) =>
          item.id === lead.id
            ? { ...item, lead_status: oldLeadStatus, last_contacted_at: lead.last_contacted_at }
            : item
        )
      );
      Alert.alert("Gagal", err.message || "Gagal menandai dihubungi.");
    }
  };

  // Save admin follow-up notes
  const addNote = async () => {
    if (!selectedLead || !noteText.trim()) return;
    setSavingId(selectedLead.id);
    try {
      await apiPostJson(`/api/admin/crm/leads/${selectedLead.id}/notes`, {
        note: noteText.trim(),
      });
      setNoteText("");
      await loadLeads();
      Alert.alert("Sukses", "Catatan berhasil ditambahkan.");
    } catch (err: any) {
      Alert.alert("Gagal", err.message || "Gagal menyimpan catatan.");
    } finally {
      setSavingId(null);
    }
  };

  // Apply Manual Payment Override (Full flow)
  const applyManualOverride = async () => {
    if (!selectedLead) return;
    if (overrideReason.trim().length < 8) {
      Alert.alert("Validasi", "Alasan wajib diisi minimal 8 karakter.");
      return;
    }

    setSavingId(selectedLead.id);
    try {
      const res = await apiPostJson<any>(`/api/admin/crm/leads/${selectedLead.id}/payment-override`, {
        new_payment_status: "paid_manual",
        reason: overrideReason.trim(),
        reference: overrideReference.trim() || null,
        amount: Number(overrideAmount || 37000),
        should_activate_user: shouldActivate,
      });

      setOverrideReason("");
      setOverrideReference("");
      await loadLeads();

      const ar = res.activationResult;
      const details = [
        `Payment override: ${ar.paymentOverrideCreated ? "✅" : "❌"}`,
        `User activated: ${ar.userActivated ? "✅" : "❌"}`,
        `AI credits (500) granted: ${ar.creditsGranted ? "✅" : "❌"}`,
        `Affiliate commission: ${ar.affiliateConversionCreated ? "✅" : "❌"}`,
        `Checkout session updated: ${ar.checkoutSessionUpdated ? "✅" : "❌"}`,
        `Pending registration cleaned: ${ar.pendingRegistrationCleaned ? "✅" : "❌"}`,
      ].join("\n");

      if (ar.warnings && ar.warnings.length > 0) {
        Alert.alert(
          "Override Berhasil dengan Peringatan",
          `${details}\n\n⚠️ Peringatan:\n${ar.warnings.join("\n")}`
        );
      } else {
        Alert.alert("Override Berhasil", details);
      }
    } catch (err: any) {
      Alert.alert("Gagal", err.message || "Gagal melakukan override pembayaran.");
    } finally {
      setSavingId(null);
    }
  };

  // WhatsApp template copier
  const handleCopyWa = async (lead: CrmLead) => {
    const text = buildWhatsappFollowUp(lead);
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert("Disalin", "Templat pesan follow-up berhasil disalin ke clipboard.");
    } catch {
      Alert.alert("Gagal Menyalin", text);
    }
  };

  // Render quick selector component for status (Platform adapted)
  const renderQuickStatusDropdowns = (lead: CrmLead) => {
    if (Platform.OS === "web") {
      return (
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <select
            value={lead.payment_status}
            onChange={(e) => handleQuickPaymentStatus(lead, e.target.value as PaymentStatus)}
            style={{
              padding: 6,
              borderRadius: 8,
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              fontSize: "12px",
              fontWeight: 600,
              color: "#334155",
            }}
          >
            {paymentOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={lead.lead_status}
            onChange={(e) => handleQuickLeadStatus(lead, e.target.value as LeadStatus)}
            style={{
              padding: 6,
              borderRadius: 8,
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              fontSize: "12px",
              fontWeight: 600,
              color: "#334155",
            }}
          >
            {leadOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </View>
      );
    }

    return (
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
        <TouchableOpacity
          style={styles.pillButton}
          onPress={() => {
            const buttons: AlertButton[] = paymentOptions
              .filter((o) => o.value !== "paid_manual") // Must use override form for paid_manual
              .map((o) => ({
                text: o.label,
                onPress: () => { handleQuickPaymentStatus(lead, o.value); },
              }));
            Alert.alert(
              "Status Pembayaran Cepat",
              "Pilih status pembayaran lead ini:",
              buttons.concat([{ text: "Batal", style: "cancel", onPress: () => {} }])
            );
          }}
        >
          <Text style={styles.pillButtonText}>Status Bayar: {lead.payment_status}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pillButton}
          onPress={() => {
            const buttons: AlertButton[] = leadOptions.map((o) => ({
              text: o.label,
              onPress: () => { handleQuickLeadStatus(lead, o.value); },
            }));
            Alert.alert(
              "Status Lead Cepat",
              "Pilih status follow-up lead ini:",
              buttons.concat([{ text: "Batal", style: "cancel", onPress: () => {} }])
            );
          }}
        >
          <Text style={styles.pillButtonText}>Status Lead: {lead.lead_status}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderLeadCard = (lead: CrmLead, compact = false) => (
    <View
      key={lead.id}
      style={[
        styles.leadCard,
        selectedId === lead.id && styles.leadCardActive,
        compact && { marginBottom: 8 },
      ]}
    >
      <TouchableOpacity
        onPress={() => {
          setSelectedId(lead.id);
          if (viewMode !== "detail" && !compact) setViewMode("detail");
        }}
        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.leadName}>{lead.name || "Tanpa Nama"}</Text>
          <Text style={styles.leadMeta}>
            {lead.email || "-"} • {lead.whatsapp || "-"}
          </Text>
          <Text style={styles.leadSmall}>
            Sumber: {lead.source || "checkout"} • {formatDateTime(lead.created_at)}
          </Text>
        </View>
        <FontAwesome name="chevron-right" size={12} color="#cbd5e1" />
      </TouchableOpacity>

      <View style={styles.badgeRow}>
        <Text style={[styles.badge, styles.pinkBadge]}>
          {paymentOptions.find((o) => o.value === lead.payment_status)?.label || lead.payment_status}
        </Text>
        <Text style={[styles.badge, styles.tealBadge]}>
          {leadOptions.find((o) => o.value === lead.lead_status)?.label || lead.lead_status}
        </Text>
        <Text style={[styles.badge, styles.purpleBadge]}>{formatRupiah(lead.amount)}</Text>
      </View>

      {!compact && renderQuickStatusDropdowns(lead)}
    </View>
  );

  // Grouping by status for Kanban Board
  const kanbanGrouped = useMemo(() => {
    return kanbanColumns.reduce<Record<PaymentStatus, CrmLead[]>>((acc, col) => {
      acc[col.key] = leads.filter((l) => l.payment_status === col.key);
      return acc;
    }, {} as any);
  }, [leads]);

  return (
    <View style={styles.container}>
      {/* Overview stats header */}
      <View style={styles.overviewCard}>
        <Text style={styles.overviewTitle}>CRM Dashboard 🌸</Text>
        <Text style={styles.overviewSubtitle}>
          Kelola calon pelanggan, kirim follow-up WhatsApp, dan konfirmasi pembayaran manual secara aman.
        </Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        {[
          ["Total Lead", String(stats.total || totalCount), "#ec4899"],
          ["Pending", String(stats.pending_payment || 0), "#f59e0b"],
          ["Lunas", String((stats.paid || 0) + (stats.paid_manual || 0)), "#10b981"],
          ["Revenue", formatRupiah(stats.revenue || 0), "#06b6d4"],
        ].map(([label, value, color]) => (
          <View key={label} style={styles.statCard}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Toolbar - Search */}
      <View style={styles.toolbar}>
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={14} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari nama, email, WA, referral..."
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={loadLeads}>
          <FontAwesome name="refresh" size={14} color="#ec4899" />
        </TouchableOpacity>
      </View>

      {/* Tab Selectors (List / Kanban / Detail) */}
      <View style={styles.tabsRow}>
        {(["list", "kanban", "detail"] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.tabButton, viewMode === mode && styles.tabButtonActive]}
            onPress={() => setViewMode(mode)}
          >
            <Text
              style={[styles.tabButtonText, viewMode === mode && styles.tabButtonTextActive]}
            >
              {mode === "list" ? "List" : mode === "kanban" ? "Kanban" : "Detail"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Status Filtering Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
        {([{ value: "all", label: "Semua" }, ...paymentOptions] as any).map((opt: any) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.filterPill, paymentFilter === opt.value && styles.filterPillActive]}
            onPress={() => {
              setPaymentFilter(opt.value);
              setOffset(0);
            }}
          >
            <Text
              style={[
                styles.filterPillText,
                paymentFilter === opt.value && styles.filterPillTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && <ActivityIndicator color="#ec4899" style={{ marginVertical: 12 }} />}

      {/* List Mode */}
      {viewMode === "list" && (
        <View style={{ gap: 10 }}>
          {leads.length === 0 ? (
            <Text style={styles.emptyText}>Tidak ada leads yang cocok.</Text>
          ) : (
            leads.map((l) => renderLeadCard(l))
          )}

          {/* Pagination Controls */}
          <View style={styles.paginationRow}>
            <TouchableOpacity
              disabled={offset === 0}
              style={[styles.pageBtn, offset === 0 && { opacity: 0.4 }]}
              onPress={() => setOffset((prev) => Math.max(0, prev - limit))}
            >
              <FontAwesome name="chevron-left" size={12} color="#475569" />
              <Text style={styles.pageBtnText}>Prev</Text>
            </TouchableOpacity>

            <Text style={styles.pageLabel}>
              {Math.min(totalCount, offset + 1)} - {Math.min(totalCount, offset + limit)} dari{" "}
              {totalCount}
            </Text>

            <TouchableOpacity
              disabled={offset + limit >= totalCount}
              style={[styles.pageBtn, offset + limit >= totalCount && { opacity: 0.4 }]}
              onPress={() => setOffset((prev) => prev + limit)}
            >
              <Text style={styles.pageBtnText}>Next</Text>
              <FontAwesome name="chevron-right" size={12} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Kanban Mode */}
      {viewMode === "kanban" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
          {kanbanColumns.map((col) => {
            const list = kanbanGrouped[col.key] || [];
            return (
              <View key={col.key} style={styles.kanbanColumn}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                  <Text style={[styles.kanbanHeader, { color: col.color }]}>{col.title}</Text>
                  <Text style={styles.kanbanCount}>{list.length}</Text>
                </View>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {list.map((l) => renderLeadCard(l, true))}
                  {list.length === 0 && <Text style={styles.kanbanEmpty}>Kosong</Text>}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Detail Mode */}
      {viewMode === "detail" && (
        <View style={{ gap: 12 }}>
          {selectedLead ? (
            <View style={styles.detailWrap}>
              {renderLeadCard(selectedLead, true)}

              {/* Status Selectors */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Ubah Status Cepat</Text>
                {renderQuickStatusDropdowns(selectedLead)}
              </View>

              {/* Action Buttons */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Aksi Follow-Up</Text>
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <TouchableOpacity
                    style={styles.tealActionBtn}
                    onPress={() => markContacted(selectedLead)}
                  >
                    <FontAwesome name="check-circle" size={13} color="#fff" />
                    <Text style={styles.actionBtnText}>Tandai Dihubungi</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.greenActionBtn}
                    onPress={() => handleCopyWa(selectedLead)}
                  >
                    <FontAwesome name="whatsapp" size={14} color="#fff" />
                    <Text style={styles.actionBtnText}>Copy WA Follow-up</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Manual Override Form */}
              <View style={styles.overrideSection}>
                <Text style={styles.overrideTitle}>Manual Payment Override 🛡️</Text>
                <Text style={styles.overrideSub}>
                  Gunakan form ini untuk aktivasi manual. Audit log akan tersimpan.
                </Text>

                <TextInput
                  value={overrideReason}
                  onChangeText={setOverrideReason}
                  placeholder="Alasan wajib (min. 8 karakter)"
                  style={styles.formInput}
                />
                <TextInput
                  value={overrideReference}
                  onChangeText={setOverrideReference}
                  placeholder="Referensi transfer / bukti bayar"
                  style={styles.formInput}
                />
                <TextInput
                  value={overrideAmount}
                  onChangeText={setOverrideAmount}
                  placeholder="Nominal rupiah (default: 37000)"
                  keyboardType="numeric"
                  style={styles.formInput}
                />

                {/* Toggle premium activation */}
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 }}
                  onPress={() => setShouldActivate(!shouldActivate)}
                >
                  <View
                    style={[
                      styles.checkboxBox,
                      shouldActivate && { backgroundColor: "#ea580c", borderColor: "#ea580c" },
                    ]}
                  >
                    {shouldActivate && <FontAwesome name="check" size={10} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Aktifkan premium user auth (idempotent)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={savingId === selectedLead.id}
                  style={styles.overrideSubmit}
                  onPress={applyManualOverride}
                >
                  {savingId === selectedLead.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.overrideSubmitText}>Konfirmasi Lunas Manual</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Notes Timeline */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Catatan Admin ({selectedLead.notes?.length || 0})</Text>
                <TextInput
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="Tambah catatan perkembangan follow-up..."
                  multiline
                  style={[styles.formInput, { minHeight: 60 }]}
                />
                <TouchableOpacity
                  disabled={savingId === selectedLead.id || !noteText.trim()}
                  style={[styles.btnPink, !noteText.trim() && { backgroundColor: "#cbd5e1" }]}
                  onPress={addNote}
                >
                  <Text style={styles.btnPinkText}>Simpan Catatan</Text>
                </TouchableOpacity>

                <View style={{ gap: 8, marginTop: 12 }}>
                  {(selectedLead.notes || []).map((n) => (
                    <View key={n.id} style={styles.noteBox}>
                      <Text style={styles.noteText}>{n.note}</Text>
                      <Text style={styles.noteMeta}>
                        Oleh Admin • {formatDateTime(n.created_at)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>Pilih salah satu lead dari list untuk melihat detail.</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles: Record<string, any> = {
  container: { gap: 14 },
  overviewCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#fbcfe8",
    borderRadius: 20,
    padding: 16,
  },
  overviewTitle: { fontSize: 20, fontWeight: "900", color: "#1e293b" },
  overviewSubtitle: { fontSize: 13, color: "#64748b", marginTop: 4, lineHeight: 18 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: {
    flexGrow: 1,
    minWidth: 130,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#f1e5f9",
    borderRadius: 16,
    padding: 12,
  },
  statLabel: { fontSize: 11, fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" },
  statValue: { fontSize: 20, fontWeight: "900", marginTop: 4 },
  toolbar: { flexDirection: "row", gap: 8, alignItems: "center" },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 13, color: "#334155" },
  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#fbcfe8",
    alignItems: "center",
    justifyContent: "center",
  },
  tabsRow: { flexDirection: "row", gap: 6 },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9d5ff",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  tabButtonActive: { backgroundColor: "#9333ea", borderColor: "#9333ea" },
  tabButtonText: { fontSize: 12, fontWeight: "bold", color: "#64748b", textTransform: "uppercase" },
  tabButtonTextActive: { color: "#fff" },
  filtersRow: { paddingVertical: 4 },
  filterPill: {
    marginRight: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e9d5ff",
    backgroundColor: "#fff",
  },
  filterPillActive: { backgroundColor: "#ec4899", borderColor: "#ec4899" },
  filterPillText: { fontSize: 11, fontWeight: "700", color: "#475569" },
  filterPillTextActive: { color: "#fff" },
  emptyText: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "bold",
    marginVertical: 24,
  },
  leadCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  leadCardActive: { borderColor: "#ec4899" },
  leadName: { fontSize: 15, fontWeight: "800", color: "#1e293b" },
  leadMeta: { fontSize: 12, color: "#64748b", marginTop: 2 },
  leadSmall: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  badge: {
    fontSize: 10,
    fontWeight: "bold",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  pinkBadge: { backgroundColor: "#fdf2f8", color: "#be185d" },
  tealBadge: { backgroundColor: "#f0fdfa", color: "#0f766e" },
  purpleBadge: { backgroundColor: "#faf5ff", color: "#7e22ce" },
  pillButton: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillButtonText: { fontSize: 11, fontWeight: "bold", color: "#475569" },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pageBtnText: { fontSize: 11, fontWeight: "bold", color: "#475569" },
  pageLabel: { fontSize: 11, color: "#64748b", fontWeight: "bold" },
  kanbanColumn: {
    width: 260,
    marginRight: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 10,
    maxHeight: 450,
  },
  kanbanHeader: { fontSize: 13, fontWeight: "800" },
  kanbanCount: { fontSize: 11, fontWeight: "bold", color: "#94a3b8" },
  kanbanEmpty: { textAlign: "center", color: "#cbd5e1", fontSize: 11, paddingVertical: 32 },
  detailWrap: { gap: 14 },
  detailSection: { borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 12 },
  detailSectionTitle: { fontSize: 13, fontWeight: "800", color: "#1e293b", marginBottom: 6 },
  tealActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#14b8a6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  greenActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#22c55e",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionBtnText: { fontSize: 11, fontWeight: "bold", color: "#fff" },
  overrideSection: {
    borderWidth: 1,
    borderColor: "#fed7aa",
    backgroundColor: "#fff7ed",
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  overrideTitle: { fontSize: 13, fontWeight: "900", color: "#ea580c" },
  overrideSub: { fontSize: 11, color: "#c2410c", lineHeight: 16 },
  formInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: "#334155",
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxBoxChecked: {
    backgroundColor: "#ea580c",
    borderColor: "#ea580c",
  },
  checkboxLabel: { fontSize: 11, fontWeight: "bold", color: "#c2410c" },
  overrideSubmit: {
    backgroundColor: "#ea580c",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  overrideSubmitText: { fontSize: 11, fontWeight: "900", color: "#fff" },
  btnPink: {
    backgroundColor: "#ec4899",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
  },
  btnPinkText: { fontSize: 11, fontWeight: "900", color: "#fff" },
  noteBox: { backgroundColor: "#f8fafc", borderRadius: 10, padding: 8, borderWidth: 1, borderColor: "#f1f5f9" },
  noteText: { fontSize: 12, color: "#334155", lineHeight: 16 },
  noteMeta: { fontSize: 9, color: "#94a3b8", marginTop: 4 },
};
