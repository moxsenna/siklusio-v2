import React, { useMemo } from "react";
import { View, Text, ScrollView } from "react-native";
import type { CrmLead } from "./adminCrmTypes";
import { kanbanColumns } from "./adminCrmTypes";
import { groupLeadsByPaymentStatus } from "./adminCrmUtils";
import { AdminCrmLeadCard } from "./AdminCrmLeadCard";
import { crmStyles as styles } from "./adminCrmStyles";

interface AdminCrmKanbanViewProps {
  leads: CrmLead[];
  selectedId: string | null;
  onSelectLead: (leadId: string) => void;
}

export function AdminCrmKanbanView({ leads, selectedId, onSelectLead }: AdminCrmKanbanViewProps) {
  const kanbanGrouped = useMemo(() => groupLeadsByPaymentStatus(leads), [leads]);

  return (
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
              {list.map((lead) => (
                <AdminCrmLeadCard
                  key={lead.id}
                  lead={lead}
                  selectedId={selectedId}
                  variant="kanban"
                  onSelect={onSelectLead}
                />
              ))}
              {list.length === 0 && <Text style={styles.kanbanEmpty}>Kosong</Text>}
            </ScrollView>
          </View>
        );
      })}
    </ScrollView>
  );
}