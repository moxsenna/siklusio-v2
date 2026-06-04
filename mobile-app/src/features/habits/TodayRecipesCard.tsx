import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface Props {
  currentPhase: string;
  balance: number | null;
  onOpen: () => void;
}

export function TodayRecipesCard({ currentPhase, balance, onOpen }: Props) {
  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: "#d9f99d",
        gap: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            backgroundColor: "#ecfccb",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FontAwesome name="cutlery" size={16} color="#4d7c0f" />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              fontSize: 11,
              color: "#4d7c0f",
              fontWeight: "800",
              textTransform: "uppercase",
            }}
          >
            Resep Hari Ini
          </Text>
          <Text style={{ fontSize: 18, color: "#111827", fontWeight: "800" }}>
            Makan sesuai fase siklus
          </Text>
          <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 18 }}>
            Dapatkan 2 resep simpel + daftar belanja kecil yang cocok dengan fase{" "}
            {currentPhase || "siklusmu"}.
          </Text>
        </View>
      </View>

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
            15 kredit - 2 resep + grocery list
          </Text>
        </View>

        <TouchableOpacity
          onPress={onOpen}
          activeOpacity={0.85}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: "#65a30d",
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 11,
          }}
        >
          <FontAwesome name="magic" size={13} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>Buka</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
