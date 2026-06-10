import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

export type SettingsViewTab = "profile" | "cycle";

interface SettingsTabToggleProps {
  activeTab: SettingsViewTab;
  onTabChange: (tab: SettingsViewTab) => void;
}

export function SettingsTabToggle({ activeTab, onTabChange }: SettingsTabToggleProps) {
  return (
    <View className="flex-row bg-surface-variant p-1 rounded-2xl mb-6 shadow-inner">
      <TouchableOpacity
        onPress={() => onTabChange("profile")}
        className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 ${
          activeTab === "profile" ? "bg-surface shadow-sm" : ""
        }`}
      >
        <FontAwesome
          name="user"
          size={14}
          color={activeTab === "profile" ? "#ec4899" : "#94a3b8"}
        />
        <Text
          className={`text-sm font-bold ${
            activeTab === "profile" ? "text-primary" : "text-on-surface-variant/70"
          }`}
        >
          Profil & Pasangan
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onTabChange("cycle")}
        className={`flex-1 py-3 rounded-xl items-center flex-row justify-center gap-2 ${
          activeTab === "cycle" ? "bg-surface shadow-sm" : ""
        }`}
      >
        <FontAwesome
          name="cog"
          size={14}
          color={activeTab === "cycle" ? "#ec4899" : "#94a3b8"}
        />
        <Text
          className={`text-sm font-bold ${
            activeTab === "cycle" ? "text-primary" : "text-on-surface-variant/70"
          }`}
        >
          Siklus & Tabungan
        </Text>
      </TouchableOpacity>
    </View>
  );
}