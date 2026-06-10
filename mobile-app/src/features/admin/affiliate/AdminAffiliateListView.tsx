import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { format } from "date-fns";
import type { Affiliate } from "./adminAffiliateTypes";
import { formatCommissionLabel } from "./adminAffiliateUtils";
import { affiliateStyles as styles } from "./adminAffiliateStyles";

interface AdminAffiliateListViewProps {
  affiliates: Affiliate[];
  loading: boolean;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
}

export function AdminAffiliateListView({
  affiliates,
  loading,
  expandedId,
  onToggleExpand,
  onToggleActive,
  onDelete,
}: AdminAffiliateListViewProps) {
  return (
    <>
      <Text style={styles.listTitle}>Daftar Afiliasi ({affiliates.length})</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#ec4899" />
      ) : (
        <View style={styles.listGap}>
          {affiliates.map((aff) => (
            <View
              key={aff.id}
              style={[styles.affiliateCard, { opacity: aff.is_active ? 1 : 0.6 }]}
            >
              <View
                style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}
              >
                <View style={{ gap: 4, flex: 1 }}>
                  <Text style={styles.affiliateName}>{aff.name}</Text>
                  <Text style={styles.affiliateContact}>
                    {aff.email} • {aff.whatsapp}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeBadgeText}>{aff.code}</Text>
                    </View>
                    <Text style={styles.commissionText}>
                      Komisi: {formatCommissionLabel(aff)}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TouchableOpacity onPress={() => onToggleExpand(aff.id)} style={{ padding: 8 }}>
                    <FontAwesome
                      name={expandedId === aff.id ? "chevron-up" : "chevron-down"}
                      size={14}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => onToggleActive(aff.id, aff.is_active)}
                    style={[
                      styles.toggleBtn,
                      { backgroundColor: aff.is_active ? "#fef2f2" : "#dcfce7" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.toggleBtnText,
                        { color: aff.is_active ? "#b91c1c" : "#15803d" },
                      ]}
                    >
                      {aff.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => onDelete(aff.id)} style={{ padding: 8 }}>
                    <FontAwesome name="trash" size={14} color="#94a3b8" />
                  </TouchableOpacity>
                </View>
              </View>

              {expandedId === aff.id && (
                <View style={styles.expandedSection}>
                  <Text style={styles.expandedLabel}>Informasi Bank</Text>
                  {aff.bank_name ? (
                    <Text style={styles.expandedText}>
                      {aff.bank_name} - {aff.account_number} a.n {aff.account_holder}
                    </Text>
                  ) : (
                    <Text style={styles.expandedMuted}>Belum ada data rekening</Text>
                  )}
                  <Text style={styles.expandedMeta}>
                    Dibuat pada {format(new Date(aff.created_at), "dd MMM yyyy HH:mm")}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </>
  );
}