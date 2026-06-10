import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import type { AdminTab } from "./adminTypes";

interface AdminTabsProps {
  activeTab: AdminTab;
  userCount: number;
  modPendingCount: number;
  onTabChange: (tab: AdminTab) => void;
}

export function AdminTabs({
  activeTab,
  userCount,
  modPendingCount,
  onTabChange,
}: AdminTabsProps) {
  const tabs: { id: AdminTab; label: string }[] = [
    { id: "users", label: `👥 Pengguna (${userCount})` },
    { id: "crm", label: "🌸 CRM" },
    { id: "moderation", label: `🚩 Moderasi (${modPendingCount} pending)` },
    { id: "coupons", label: "🎫 Kupon" },
    { id: "affiliates", label: "🤝 Afiliasi" },
    { id: "whatsapp", label: "💬 WhatsApp Auto" },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginTop: 20 }}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 4 }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            style={{
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 20,
              backgroundColor: isActive ? "#ec4899" : "transparent",
              borderWidth: isActive ? 0 : 1,
              borderColor: "#f1e6eb",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "bold",
                color: isActive ? "#fff" : "#64748b",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}