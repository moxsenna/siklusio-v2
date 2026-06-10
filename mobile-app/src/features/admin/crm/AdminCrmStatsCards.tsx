import React from "react";
import { View, Text } from "react-native";
import type { CrmResponse } from "./adminCrmTypes";
import { formatRupiah } from "./adminCrmUtils";
import { crmStyles as styles } from "./adminCrmStyles";

interface AdminCrmStatsCardsProps {
  stats: CrmResponse["stats"];
  totalCount: number;
}

export function AdminCrmStatsCards({ stats, totalCount }: AdminCrmStatsCardsProps) {
  const cards: Array<[string, string, string]> = [
    ["Total Lead", String(stats.total || totalCount), "#ec4899"],
    ["Pending Bayar", String(stats.pending_payment || 0), "#f59e0b"],
    ["Lunas", String((stats.paid || 0) + (stats.paid_manual || 0)), "#10b981"],
    ["Perlu Follow-up", String(stats.new_lead || 0), "#a855f7"],
    ["Revenue", formatRupiah(stats.revenue || 0), "#06b6d4"],
  ];

  return (
    <>
      <View style={styles.overviewCard}>
        <Text style={styles.overviewTitle}>CRM Dashboard 🌸</Text>
        <Text style={styles.overviewSubtitle}>
          Kelola calon pelanggan, kirim follow-up WhatsApp, dan konfirmasi pembayaran manual secara
          aman.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        {cards.map(([label, value, color]) => (
          <View key={label} style={styles.statCard}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
          </View>
        ))}
      </View>
    </>
  );
}