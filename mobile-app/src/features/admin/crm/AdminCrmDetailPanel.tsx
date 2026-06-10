import React from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { CrmLead, LeadStatus, PaymentStatus } from "./adminCrmTypes";
import {
  AdminCrmLeadStatusDropdown,
  AdminCrmPaymentStatusDropdown,
} from "./AdminCrmStatusDropdown";
import { AdminCrmNotesPanel } from "./AdminCrmNotesPanel";
import { formatDateTime, formatRupiah } from "./adminCrmUtils";
import { crmStyles as styles } from "./adminCrmStyles";

interface AdminCrmDetailPanelProps {
  lead: CrmLead;
  saving: boolean;
  noteText: string;
  overrideReason: string;
  overrideReference: string;
  overrideAmount: string;
  shouldActivate: boolean;
  onNoteTextChange: (value: string) => void;
  onOverrideReasonChange: (value: string) => void;
  onOverrideReferenceChange: (value: string) => void;
  onOverrideAmountChange: (value: string) => void;
  onShouldActivateToggle: () => void;
  onPaymentStatusChange: (lead: CrmLead, newStatus: PaymentStatus) => void | Promise<void>;
  onQuickPaymentStatus: (lead: CrmLead, newStatus: PaymentStatus) => void | Promise<void>;
  onLeadStatusChange: (lead: CrmLead, newStatus: LeadStatus) => void | Promise<void>;
  onMarkContacted: (lead: CrmLead) => void | Promise<void>;
  onCopyWhatsapp: (lead: CrmLead) => void | Promise<void>;
  onApplyManualOverride: () => void | Promise<void>;
  onAddNote: () => void | Promise<void>;
}

export function AdminCrmDetailPanel({
  lead,
  saving,
  noteText,
  overrideReason,
  overrideReference,
  overrideAmount,
  shouldActivate,
  onNoteTextChange,
  onOverrideReasonChange,
  onOverrideReferenceChange,
  onOverrideAmountChange,
  onShouldActivateToggle,
  onPaymentStatusChange,
  onQuickPaymentStatus,
  onLeadStatusChange,
  onMarkContacted,
  onCopyWhatsapp,
  onApplyManualOverride,
  onAddNote,
}: AdminCrmDetailPanelProps) {
  return (
    <View style={styles.detailWrap}>
      <View style={styles.detailInfoCard}>
        <Text style={styles.detailName}>{lead.name || "Tanpa Nama"}</Text>
        <View style={styles.detailInfoGrid}>
          <View style={styles.detailInfoRow}>
            <FontAwesome name="envelope" size={12} color="#94a3b8" />
            <Text style={styles.detailInfoText}>{lead.email || "-"}</Text>
          </View>
          <View style={styles.detailInfoRow}>
            <FontAwesome name="whatsapp" size={14} color="#94a3b8" />
            <Text style={styles.detailInfoText}>{lead.whatsapp || "-"}</Text>
          </View>
          <View style={styles.detailInfoRow}>
            <FontAwesome name="tag" size={12} color="#94a3b8" />
            <Text style={styles.detailInfoText}>Sumber: {lead.source || "checkout"}</Text>
          </View>
          <View style={styles.detailInfoRow}>
            <FontAwesome name="gift" size={12} color="#94a3b8" />
            <Text style={styles.detailInfoText}>Referral: {lead.referral_code || "-"}</Text>
          </View>
          <View style={styles.detailInfoRow}>
            <FontAwesome name="money" size={12} color="#94a3b8" />
            <Text style={styles.detailInfoText}>Nominal: {formatRupiah(lead.amount)}</Text>
          </View>
          <View style={styles.detailInfoRow}>
            <FontAwesome name="calendar" size={12} color="#94a3b8" />
            <Text style={styles.detailInfoText}>Dibuat: {formatDateTime(lead.created_at)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Ubah Status</Text>
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          <View style={{ flex: 1, minWidth: 150 }}>
            <Text style={styles.selectLabel}>Status Pembayaran</Text>
            <AdminCrmPaymentStatusDropdown
              lead={lead}
              onPaymentStatusChange={onPaymentStatusChange}
              onQuickPaymentStatus={onQuickPaymentStatus}
            />
          </View>
          <View style={{ flex: 1, minWidth: 150 }}>
            <Text style={styles.selectLabel}>Status Lead</Text>
            <AdminCrmLeadStatusDropdown lead={lead} onLeadStatusChange={onLeadStatusChange} />
          </View>
        </View>
      </View>

      <View style={styles.detailSection}>
        <Text style={styles.detailSectionTitle}>Aksi Follow-Up</Text>
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <TouchableOpacity style={styles.tealActionBtn} onPress={() => onMarkContacted(lead)}>
            <FontAwesome name="check-circle" size={13} color="#fff" />
            <Text style={styles.actionBtnText}>Tandai Dihubungi</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.greenActionBtn} onPress={() => onCopyWhatsapp(lead)}>
            <FontAwesome name="whatsapp" size={14} color="#fff" />
            <Text style={styles.actionBtnText}>Copy WA Follow-up</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.overrideSection}>
        <Text style={styles.overrideTitle}>Manual Payment Override 🛡️</Text>
        <Text style={styles.overrideSub}>
          Gunakan form ini untuk aktivasi manual. Audit log akan tersimpan.
        </Text>

        <TextInput
          value={overrideReason}
          onChangeText={onOverrideReasonChange}
          placeholder="Alasan wajib (min. 8 karakter)"
          style={styles.formInput}
        />
        <TextInput
          value={overrideReference}
          onChangeText={onOverrideReferenceChange}
          placeholder="Referensi transfer / bukti bayar"
          style={styles.formInput}
        />
        <TextInput
          value={overrideAmount}
          onChangeText={onOverrideAmountChange}
          placeholder="Nominal rupiah (default: 37000)"
          keyboardType="numeric"
          style={styles.formInput}
        />

        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 8 }}
          onPress={onShouldActivateToggle}
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
          disabled={saving}
          style={styles.overrideSubmit}
          onPress={onApplyManualOverride}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.overrideSubmitText}>Konfirmasi Lunas Manual</Text>
          )}
        </TouchableOpacity>
      </View>

      <AdminCrmNotesPanel
        lead={lead}
        noteText={noteText}
        saving={saving}
        onNoteTextChange={onNoteTextChange}
        onAddNote={onAddNote}
      />
    </View>
  );
}