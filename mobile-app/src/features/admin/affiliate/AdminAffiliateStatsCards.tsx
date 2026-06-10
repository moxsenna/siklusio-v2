import React from "react";
import { View, Text } from "react-native";
import { formatRupiah } from "./adminAffiliateUtils";
import { affiliateStyles as styles } from "./adminAffiliateStyles";

interface AdminAffiliateStatsCardsProps {
  totalRevenue: number;
  pendingCommission: number;
  paidCommission: number;
}

export function AdminAffiliateStatsCards({
  totalRevenue,
  pendingCommission,
  paidCommission,
}: AdminAffiliateStatsCardsProps) {
  const cards = [
    { label: "Total Pendapatan", value: formatRupiah(totalRevenue), color: "#1e1b20" },
    { label: "Komisi Tertunda", value: formatRupiah(pendingCommission), color: "#eab308" },
    { label: "Komisi Dibayar", value: formatRupiah(paidCommission), color: "#10b981" },
  ];

  return (
    <View style={styles.statsRow}>
      {cards.map((card) => (
        <View key={card.label} style={styles.statCard}>
          <Text style={styles.statLabel}>{card.label}</Text>
          <Text style={[styles.statValue, { color: card.color }]}>{card.value}</Text>
        </View>
      ))}
    </View>
  );
}