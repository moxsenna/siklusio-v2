import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, View, Text } from "react-native";
import * as Clipboard from "expo-clipboard";
import { apiGetJson, apiPatchJson, apiPostJson } from "@/src/lib/api";
import type {
  CrmLead,
  CrmResponse,
  LeadStatus,
  PaymentOverrideResponse,
  PaymentStatus,
  ViewMode,
} from "./crm/adminCrmTypes";
import { AdminCrmStatsCards } from "./crm/AdminCrmStatsCards";
import { AdminCrmToolbar, AdminCrmPagination } from "./crm/AdminCrmToolbar";
import { AdminCrmListView } from "./crm/AdminCrmListView";
import { AdminCrmKanbanView } from "./crm/AdminCrmKanbanView";
import { AdminCrmDetailPanel } from "./crm/AdminCrmDetailPanel";
import {
  buildLeadsQueryParams,
  buildWhatsappFollowUp,
  confirmAction,
  emptyCrmStats,
} from "./crm/adminCrmUtils";
import { crmStyles as styles } from "./crm/adminCrmStyles";

export default function AdminCrmPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [stats, setStats] = useState<CrmResponse["stats"]>(emptyCrmStats());
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [limit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "all">("all");
  const [leadStatusFilter, setLeadStatusFilter] = useState<LeadStatus | "all">("all");

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [overrideReason, setOverrideReason] = useState("");
  const [overrideReference, setOverrideReference] = useState("");
  const [overrideAmount, setOverrideAmount] = useState("37000");
  const [shouldActivate, setShouldActivate] = useState(true);
  const [noteText, setNoteText] = useState("");

  const selectedLead = useMemo(() => {
    return leads.find((lead) => lead.id === selectedId) || null;
  }, [leads, selectedId]);

  useEffect(() => {
    if (selectedId && leads.length > 0) {
      const exists = leads.some((l) => l.id === selectedId);
      if (!exists) {
        setSelectedId(null);
      }
    }
  }, [leads, selectedId]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setOffset(0);
    }, 450);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setSelectedId(null);
  }, [offset, debouncedSearch, paymentFilter, leadStatusFilter]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildLeadsQueryParams({
        limit,
        offset,
        debouncedSearch,
        paymentFilter,
        leadStatusFilter,
      });

      const data = await apiGetJson<CrmResponse>(`/api/admin/crm/leads?${params.toString()}`);
      setLeads(data.leads || []);
      setTotalCount(data.count || 0);
      setStats(data.stats || emptyCrmStats());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal memuat CRM leads.";
      Alert.alert("Gagal", message);
    } finally {
      setLoading(false);
    }
  }, [limit, offset, debouncedSearch, paymentFilter, leadStatusFilter]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleQuickPaymentStatus = async (lead: CrmLead, newStatus: PaymentStatus) => {
    const oldStatus = lead.payment_status;
    setLeads((prev) =>
      prev.map((item) => (item.id === lead.id ? { ...item, payment_status: newStatus } : item)),
    );

    try {
      await apiPatchJson(`/api/admin/crm/leads/${lead.id}/payment-status`, {
        payment_status: newStatus,
      });
      const silentData = await apiGetJson<CrmResponse>(`/api/admin/crm/leads?limit=1`);
      if (silentData.stats) setStats(silentData.stats);
    } catch (err: unknown) {
      setLeads((prev) =>
        prev.map((item) => (item.id === lead.id ? { ...item, payment_status: oldStatus } : item)),
      );
      const message = err instanceof Error ? err.message : "Gagal memperbarui status pembayaran.";
      Alert.alert("Gagal", message);
    }
  };

  const handleQuickLeadStatus = async (lead: CrmLead, newStatus: LeadStatus) => {
    const oldStatus = lead.lead_status;
    const contactedAt =
      newStatus === "contacted" ? new Date().toISOString() : lead.last_contacted_at;
    setLeads((prev) =>
      prev.map((item) =>
        item.id === lead.id
          ? { ...item, lead_status: newStatus, last_contacted_at: contactedAt }
          : item,
      ),
    );

    try {
      await apiPatchJson(`/api/admin/crm/leads/${lead.id}`, {
        lead_status: newStatus,
      });
    } catch (err: unknown) {
      setLeads((prev) =>
        prev.map((item) =>
          item.id === lead.id
            ? { ...item, lead_status: oldStatus, last_contacted_at: lead.last_contacted_at }
            : item,
        ),
      );
      const message = err instanceof Error ? err.message : "Gagal memperbarui status lead.";
      Alert.alert("Gagal", message);
    }
  };

  const markContacted = async (lead: CrmLead) => {
    const oldLeadStatus = lead.lead_status;
    const now = new Date().toISOString();
    setLeads((prev) =>
      prev.map((item) =>
        item.id === lead.id
          ? { ...item, lead_status: "contacted", last_contacted_at: now }
          : item,
      ),
    );

    try {
      await apiPatchJson(`/api/admin/crm/leads/${lead.id}`, {
        lead_status: "contacted",
      });
    } catch (err: unknown) {
      setLeads((prev) =>
        prev.map((item) =>
          item.id === lead.id
            ? { ...item, lead_status: oldLeadStatus, last_contacted_at: lead.last_contacted_at }
            : item,
        ),
      );
      const message = err instanceof Error ? err.message : "Gagal menandai dihubungi.";
      Alert.alert("Gagal", message);
    }
  };

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan catatan.";
      Alert.alert("Gagal", message);
    } finally {
      setSavingId(null);
    }
  };

  const applyManualOverride = async () => {
    if (!selectedLead) return;
    if (overrideReason.trim().length < 8) {
      Alert.alert("Validasi", "Alasan wajib diisi minimal 8 karakter.");
      return;
    }

    setSavingId(selectedLead.id);
    try {
      const res = await apiPostJson<PaymentOverrideResponse>(
        `/api/admin/crm/leads/${selectedLead.id}/payment-override`,
        {
          new_payment_status: "paid_manual",
          reason: overrideReason.trim(),
          reference: overrideReference.trim() || null,
          amount: Number(overrideAmount || 37000),
          should_activate_user: shouldActivate,
        },
      );

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
          `${details}\n\n⚠️ Peringatan:\n${ar.warnings.join("\n")}`,
        );
      } else {
        Alert.alert("Override Berhasil", details);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal melakukan override pembayaran.";
      Alert.alert("Gagal", message);
    } finally {
      setSavingId(null);
    }
  };

  const handleCopyWa = async (lead: CrmLead) => {
    const text = buildWhatsappFollowUp(lead);
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert("Disalin", "Templat pesan follow-up berhasil disalin ke clipboard.");
    } catch {
      Alert.alert("Gagal Menyalin", text);
    }
  };

  const onPaymentStatusChange = async (lead: CrmLead, newStatus: PaymentStatus) => {
    if (newStatus === "paid_manual") {
      Alert.alert(
        "Ditolak",
        "Status Lunas Manual (paid_manual) hanya dapat diubah melalui formulir Payment Override di Detail.",
      );
      return;
    }

    if (newStatus === "paid") {
      const proceed = await confirmAction(
        "Konfirmasi Perubahan Status",
        "Status paid lewat quick update tidak akan mengaktifkan akun user, memberikan kredit AI, atau mencatat komisi affiliate. Untuk aktivasi penuh, gunakan Payment Override di Detail.\n\nApakah Anda ingin melanjutkan mengubah status ke paid?",
      );
      if (!proceed) return;
    }

    await handleQuickPaymentStatus(lead, newStatus);
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedId(leadId);
    setViewMode("detail");
  };

  const handlePaymentFilterChange = (value: PaymentStatus | "all") => {
    setPaymentFilter(value);
    setOffset(0);
  };

  const handleLeadStatusFilterChange = (value: LeadStatus | "all") => {
    setLeadStatusFilter(value);
    setOffset(0);
  };

  return (
    <View style={styles.container}>
      <AdminCrmStatsCards stats={stats} totalCount={totalCount} />

      <AdminCrmToolbar
        searchQuery={searchQuery}
        viewMode={viewMode}
        paymentFilter={paymentFilter}
        leadStatusFilter={leadStatusFilter}
        onSearchChange={setSearchQuery}
        onRefresh={loadLeads}
        onViewModeChange={setViewMode}
        onPaymentFilterChange={handlePaymentFilterChange}
        onLeadStatusFilterChange={handleLeadStatusFilterChange}
      />

      {loading && <ActivityIndicator color="#ec4899" style={{ marginVertical: 12 }} />}

      {viewMode === "list" && (
        <AdminCrmListView
          leads={leads}
          selectedId={selectedId}
          onSelectLead={handleSelectLead}
          onPaymentStatusChange={onPaymentStatusChange}
          onQuickPaymentStatus={handleQuickPaymentStatus}
          onLeadStatusChange={handleQuickLeadStatus}
        />
      )}

      {viewMode === "kanban" && (
        <AdminCrmKanbanView
          leads={leads}
          selectedId={selectedId}
          onSelectLead={handleSelectLead}
        />
      )}

      {(viewMode === "list" || viewMode === "kanban") && (
        <AdminCrmPagination
          offset={offset}
          limit={limit}
          totalCount={totalCount}
          onPrev={() => setOffset((prev) => Math.max(0, prev - limit))}
          onNext={() => setOffset((prev) => prev + limit)}
        />
      )}

      {viewMode === "detail" && (
        <View style={{ gap: 12 }}>
          {selectedLead ? (
            <AdminCrmDetailPanel
              lead={selectedLead}
              saving={savingId === selectedLead.id}
              noteText={noteText}
              overrideReason={overrideReason}
              overrideReference={overrideReference}
              overrideAmount={overrideAmount}
              shouldActivate={shouldActivate}
              onNoteTextChange={setNoteText}
              onOverrideReasonChange={setOverrideReason}
              onOverrideReferenceChange={setOverrideReference}
              onOverrideAmountChange={setOverrideAmount}
              onShouldActivateToggle={() => setShouldActivate((prev) => !prev)}
              onPaymentStatusChange={onPaymentStatusChange}
              onQuickPaymentStatus={handleQuickPaymentStatus}
              onLeadStatusChange={handleQuickLeadStatus}
              onMarkContacted={markContacted}
              onCopyWhatsapp={handleCopyWa}
              onApplyManualOverride={applyManualOverride}
              onAddNote={addNote}
            />
          ) : (
            <Text style={styles.emptyText}>
              Pilih salah satu lead dari list atau kanban untuk melihat detail.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}