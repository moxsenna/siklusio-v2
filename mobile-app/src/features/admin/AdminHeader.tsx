import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import type { AdminTab } from "./adminTypes";

interface AdminHeaderProps {
  activeTab: AdminTab;
}

export function AdminHeader({ activeTab }: AdminHeaderProps) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#f1e6eb",
        paddingTop: 48,
        paddingHorizontal: 24,
        paddingBottom: 16,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: "#fce7f3",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FontAwesome name="shield" size={20} color="#ec4899" />
            </View>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "#1e1b20",
                fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
              }}
            >
              Admin Portal
            </Text>
          </View>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "bold",
              letterSpacing: 1.5,
              color: "#94a3b8",
              textTransform: "uppercase",
              marginTop: 6,
            }}
          >
            {activeTab === "users" ? "User Management Dashboard" : "Antrian Moderasi Komunitas"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.replace("/")}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: "#f1f5f9",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <FontAwesome name="arrow-left" size={12} color="#64748b" />
          <Text style={{ fontSize: 12, fontWeight: "bold", color: "#64748b" }}>Kembali</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}