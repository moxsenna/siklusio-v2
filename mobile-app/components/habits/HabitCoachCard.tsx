import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { HabitCoachPlan } from "../../src/lib/habitCoachTypes";

interface Props {
  plan: HabitCoachPlan | null;
  balance: number | null;
  loading?: boolean;
  todayFocus?: string | null;
  todayTaskCount?: number;
  todayDayNumber?: number | null;
  onOpen: () => void;
}

export function HabitCoachCard({
  plan,
  balance,
  loading = false,
  todayFocus = null,
  todayTaskCount = 0,
  todayDayNumber = null,
  onOpen,
}: Props) {
  const hasPlan = Boolean(plan);
  const creditCost = hasPlan ? 60 : 50;
  const ctaLabel = hasPlan ? "Buat Ulang" : "Generate";

  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: "#f1d6e8",
        gap: 16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            backgroundColor: "#fce7f3",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FontAwesome name="compass" size={18} color="#be185d" />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              fontSize: 11,
              color: "#be185d",
              fontWeight: "800",
              textTransform: "uppercase",
            }}
          >
            Habit Coach
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={{ fontSize: 18, color: "#111827", fontWeight: "800" }}>
              {hasPlan ? "Rencana mingguan aktif" : "Buat rencana 7 hari"}
            </Text>
            {hasPlan && (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                  backgroundColor: "#fdf2f8",
                  borderWidth: 1,
                  borderColor: "#f9a8d4",
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "800", color: "#be185d" }}>AKTIF</Text>
              </View>
            )}
          </View>
          <Text numberOfLines={3} style={{ fontSize: 12, color: "#64748b", lineHeight: 18 }}>
            {hasPlan
              ? plan?.coachSummary ||
                "Coach menyiapkan target kecil yang bisa kamu ceklis setiap hari."
              : "Diskusi singkat, lalu coach susun habit realistis dari hari ini sampai 7 hari ke depan."}
          </Text>
        </View>
      </View>

      {hasPlan && (
        <View
          style={{
            backgroundColor: "#f8fafc",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            padding: 12,
            gap: 4,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: "#64748b",
              fontWeight: "700",
              textTransform: "uppercase",
            }}
          >
            {todayDayNumber ? `Hari ${todayDayNumber} dari 7` : "Plan aktif"}
          </Text>
          <Text style={{ fontSize: 14, color: "#0f172a", fontWeight: "700", lineHeight: 20 }}>
            {todayFocus || "Review plan hari ini"}
          </Text>
          <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 18 }}>
            {plan?.weekStart} sampai {plan?.weekEnd} - {todayTaskCount} target kecil hari ini.
          </Text>
        </View>
      )}

      {!hasPlan && (
        <Text style={{ fontSize: 11, color: "#94a3b8", marginTop: -4 }}>
          Belum ada plan aktif untuk hari ini.
        </Text>
      )}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: "#64748b", fontWeight: "700" }}>
            Saldo AI: {balance === null ? "-" : balance} kredit
          </Text>
          <Text style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            {creditCost} kredit - {hasPlan ? "rebuild 7 hari" : "plan baru"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onOpen}
          disabled={loading}
          activeOpacity={0.85}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: "#be185d",
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 11,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <FontAwesome name={hasPlan ? "refresh" : "magic"} size={13} color="#fff" />
          )}
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>{ctaLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
