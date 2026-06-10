import React from "react";
import { Alert, AlertButton, Platform, Text, TouchableOpacity } from "react-native";
import type { CrmLead, LeadStatus, PaymentStatus } from "./adminCrmTypes";
import { leadOptions, paymentOptions } from "./adminCrmTypes";
import { confirmAction } from "./adminCrmUtils";
import { crmStyles as styles } from "./adminCrmStyles";

interface AdminCrmPaymentStatusDropdownProps {
  lead: CrmLead;
  onPaymentStatusChange: (lead: CrmLead, newStatus: PaymentStatus) => void | Promise<void>;
  onQuickPaymentStatus: (lead: CrmLead, newStatus: PaymentStatus) => void | Promise<void>;
}

export function AdminCrmPaymentStatusDropdown({
  lead,
  onPaymentStatusChange,
  onQuickPaymentStatus,
}: AdminCrmPaymentStatusDropdownProps) {
  if (Platform.OS === "web") {
    return (
      <select
        value={lead.payment_status}
        onChange={(e) => onPaymentStatusChange(lead, e.target.value as PaymentStatus)}
        style={{
          padding: 4,
          borderRadius: 6,
          backgroundColor: "#fff",
          border: "1px solid #cbd5e1",
          fontSize: "11px",
          fontWeight: 600,
          color: "#334155",
          width: "100%",
        }}
      >
        {lead.payment_status === "paid_manual" && (
          <option value="paid_manual" disabled>
            Lunas Manual (Override)
          </option>
        )}
        {paymentOptions
          .filter((opt) => opt.value !== "paid_manual")
          .map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
      </select>
    );
  }

  return (
    <TouchableOpacity
      style={styles.pillButton}
      onPress={() => {
        const buttons: AlertButton[] = paymentOptions
          .filter((o) => o.value !== "paid_manual")
          .map((o) => ({
            text: o.label,
            onPress: () => {
              if (o.value === "paid") {
                confirmAction(
                  "Konfirmasi Perubahan Status",
                  "Status paid lewat quick update tidak akan mengaktifkan akun user, memberikan kredit AI, atau mencatat komisi affiliate. Untuk aktivasi penuh, gunakan Payment Override di Detail.",
                ).then((proceed) => {
                  if (proceed) onQuickPaymentStatus(lead, "paid");
                });
              } else {
                onQuickPaymentStatus(lead, o.value);
              }
            },
          }));
        Alert.alert(
          "Status Pembayaran Cepat",
          "Pilih status pembayaran:",
          buttons.concat([{ text: "Batal", style: "cancel", onPress: () => {} }]),
        );
      }}
    >
      <Text style={styles.pillButtonText} numberOfLines={1}>
        {paymentOptions.find((o) => o.value === lead.payment_status)?.label || lead.payment_status}
      </Text>
    </TouchableOpacity>
  );
}

interface AdminCrmLeadStatusDropdownProps {
  lead: CrmLead;
  onLeadStatusChange: (lead: CrmLead, newStatus: LeadStatus) => void | Promise<void>;
}

export function AdminCrmLeadStatusDropdown({ lead, onLeadStatusChange }: AdminCrmLeadStatusDropdownProps) {
  if (Platform.OS === "web") {
    return (
      <select
        value={lead.lead_status}
        onChange={(e) => onLeadStatusChange(lead, e.target.value as LeadStatus)}
        style={{
          padding: 4,
          borderRadius: 6,
          backgroundColor: "#fff",
          border: "1px solid #cbd5e1",
          fontSize: "11px",
          fontWeight: 600,
          color: "#334155",
          width: "100%",
        }}
      >
        {leadOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <TouchableOpacity
      style={styles.pillButton}
      onPress={() => {
        const buttons: AlertButton[] = leadOptions.map((o) => ({
          text: o.label,
          onPress: () => {
            onLeadStatusChange(lead, o.value);
          },
        }));
        Alert.alert(
          "Status Lead Cepat",
          "Pilih status lead:",
          buttons.concat([{ text: "Batal", style: "cancel", onPress: () => {} }]),
        );
      }}
    >
      <Text style={styles.pillButtonText} numberOfLines={1}>
        {leadOptions.find((o) => o.value === lead.lead_status)?.label || lead.lead_status}
      </Text>
    </TouchableOpacity>
  );
}