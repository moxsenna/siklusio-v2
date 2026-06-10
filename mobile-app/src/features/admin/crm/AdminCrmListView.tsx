import React from "react";
import { View, Text, Platform } from "react-native";
import type { CrmLead } from "./adminCrmTypes";
import {
  AdminCrmLeadCard,
  AdminCrmLeadRowWeb,
} from "./AdminCrmLeadCard";
import {
  AdminCrmLeadStatusDropdown,
  AdminCrmPaymentStatusDropdown,
} from "./AdminCrmStatusDropdown";
import type { LeadStatus, PaymentStatus } from "./adminCrmTypes";
import { crmStyles as styles } from "./adminCrmStyles";

interface AdminCrmListViewProps {
  leads: CrmLead[];
  selectedId: string | null;
  onSelectLead: (leadId: string) => void;
  onPaymentStatusChange: (lead: CrmLead, newStatus: PaymentStatus) => void | Promise<void>;
  onQuickPaymentStatus: (lead: CrmLead, newStatus: PaymentStatus) => void | Promise<void>;
  onLeadStatusChange: (lead: CrmLead, newStatus: LeadStatus) => void | Promise<void>;
}

export function AdminCrmListView({
  leads,
  selectedId,
  onSelectLead,
  onPaymentStatusChange,
  onQuickPaymentStatus,
  onLeadStatusChange,
}: AdminCrmListViewProps) {
  if (leads.length === 0) {
    return <Text style={styles.emptyText}>Tidak ada leads yang cocok.</Text>;
  }

  if (Platform.OS === "web") {
    return (
      <View style={styles.tableBorder}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCol, { flex: 2 }]}>Nama</Text>
          <Text style={[styles.tableHeaderCol, { flex: 2 }]}>Kontak</Text>
          <Text style={[styles.tableHeaderCol, { flex: 2 }]}>Status Bayar</Text>
          <Text style={[styles.tableHeaderCol, { flex: 2 }]}>Lead Status</Text>
          <Text style={[styles.tableHeaderCol, { flex: 1.5, textAlign: "right", paddingRight: 8 }]}>
            Nominal
          </Text>
          <Text style={[styles.tableHeaderCol, { flex: 1.5, textAlign: "right", paddingRight: 8 }]}>
            Dibuat
          </Text>
          <Text style={[styles.tableHeaderCol, { flex: 1, textAlign: "center" }]}>Aksi</Text>
        </View>
        {leads.map((lead) => (
          <AdminCrmLeadRowWeb
            key={lead.id}
            lead={lead}
            onSelect={onSelectLead}
            paymentStatusDropdown={
              <AdminCrmPaymentStatusDropdown
                lead={lead}
                onPaymentStatusChange={onPaymentStatusChange}
                onQuickPaymentStatus={onQuickPaymentStatus}
              />
            }
            leadStatusDropdown={
              <AdminCrmLeadStatusDropdown lead={lead} onLeadStatusChange={onLeadStatusChange} />
            }
          />
        ))}
      </View>
    );
  }

  return (
    <View style={{ gap: 4 }}>
      {leads.map((lead) => (
        <AdminCrmLeadCard
          key={lead.id}
          lead={lead}
          selectedId={selectedId}
          variant="mobile"
          onSelect={onSelectLead}
        />
      ))}
    </View>
  );
}