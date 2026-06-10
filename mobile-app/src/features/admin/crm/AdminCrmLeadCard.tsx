import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { CrmLead } from "./adminCrmTypes";
import { leadOptions, paymentOptions } from "./adminCrmTypes";
import { formatDateTimeCompact, formatRupiah } from "./adminCrmUtils";
import { crmStyles as styles } from "./adminCrmStyles";

interface AdminCrmLeadCardProps {
  lead: CrmLead;
  selectedId: string | null;
  variant: "kanban" | "mobile";
  onSelect: (leadId: string) => void;
}

export function AdminCrmLeadCard({ lead, selectedId, variant, onSelect }: AdminCrmLeadCardProps) {
  if (variant === "mobile") {
    return (
      <TouchableOpacity
        style={[styles.leadRowMobile, selectedId === lead.id && styles.leadRowMobileActive]}
        onPress={() => onSelect(lead.id)}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.rowTextBold} numberOfLines={1}>
              {lead.name || "Tanpa Nama"}
            </Text>
            <Text style={styles.rowTextSmall} numberOfLines={1}>
              {lead.whatsapp || lead.email || "-"} • {formatDateTimeCompact(lead.created_at)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 3 }}>
            <Text style={styles.rowTextBold}>{formatRupiah(lead.amount)}</Text>
            <View style={{ flexDirection: "row", gap: 4 }}>
              <Text style={[styles.badgeTextMini, { backgroundColor: "#fdf2f8", color: "#be185d" }]}>
                {paymentOptions.find((o) => o.value === lead.payment_status)?.label ||
                  lead.payment_status}
              </Text>
              <Text style={[styles.badgeTextMini, { backgroundColor: "#f0fdfa", color: "#0f766e" }]}>
                {leadOptions.find((o) => o.value === lead.lead_status)?.label || lead.lead_status}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.kanbanCard, selectedId === lead.id && styles.kanbanCardActive]}
    >
      <Text style={styles.kanbanCardName} numberOfLines={1}>
        {lead.name || "Tanpa Nama"}
      </Text>
      <Text style={styles.kanbanCardText} numberOfLines={1}>
        {lead.whatsapp || "-"}
      </Text>
      <Text style={styles.kanbanCardTextBold}>{formatRupiah(lead.amount)}</Text>
      <Text style={styles.kanbanCardSmall}>{formatDateTimeCompact(lead.created_at)}</Text>

      <TouchableOpacity style={styles.kanbanCardBtn} onPress={() => onSelect(lead.id)}>
        <Text style={styles.kanbanCardBtnText}>Detail</Text>
      </TouchableOpacity>
    </View>
  );
}

interface AdminCrmLeadRowWebProps {
  lead: CrmLead;
  onSelect: (leadId: string) => void;
  paymentStatusDropdown: React.ReactNode;
  leadStatusDropdown: React.ReactNode;
}

export function AdminCrmLeadRowWeb({
  lead,
  onSelect,
  paymentStatusDropdown,
  leadStatusDropdown,
}: AdminCrmLeadRowWebProps) {
  return (
    <View style={styles.leadRowWeb}>
      <View style={[styles.rowCol, { flex: 2 }]}>
        <Text style={styles.rowTextBold} numberOfLines={1}>
          {lead.name || "Tanpa Nama"}
        </Text>
        <Text style={styles.rowTextSmall} numberOfLines={1}>
          {lead.source || "checkout"}
        </Text>
      </View>

      <View style={[styles.rowCol, { flex: 2 }]}>
        <Text style={styles.rowText} numberOfLines={1}>
          {lead.whatsapp || "-"}
        </Text>
        <Text style={styles.rowTextSmall} numberOfLines={1}>
          {lead.email || "-"}
        </Text>
      </View>

      <View style={[styles.rowCol, { flex: 2 }]}>{paymentStatusDropdown}</View>

      <View style={[styles.rowCol, { flex: 2 }]}>{leadStatusDropdown}</View>

      <View style={[styles.rowCol, { flex: 1.5, alignItems: "flex-end", paddingRight: 8 }]}>
        <Text style={styles.rowTextBold}>{formatRupiah(lead.amount)}</Text>
      </View>

      <View style={[styles.rowCol, { flex: 1.5, alignItems: "flex-end", paddingRight: 8 }]}>
        <Text style={styles.rowTextSmall}>{formatDateTimeCompact(lead.created_at)}</Text>
      </View>

      <View style={[styles.rowCol, { flex: 1, alignItems: "center" }]}>
        <TouchableOpacity style={styles.btnDetailCompact} onPress={() => onSelect(lead.id)}>
          <Text style={styles.btnDetailCompactText}>Detail</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}