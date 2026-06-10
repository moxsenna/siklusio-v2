import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { AutoresponderSetting, EventKey } from "./adminWhatsappTypes";

interface AdminWhatsappEventCardProps {
  setting: AutoresponderSetting;
  isActive: boolean;
  onSelect: (eventKey: EventKey) => void;
}

export function AdminWhatsappEventCard({ setting, isActive, onSelect }: AdminWhatsappEventCardProps) {
  return (
    <TouchableOpacity
      onPress={() => onSelect(setting.event_key)}
      style={{
        flex: 1,
        minWidth: 200,
        backgroundColor: "#fff",
        borderRadius: 20,
        borderWidth: isActive ? 2 : 1,
        borderColor: isActive ? "#ec4899" : "#f1e6eb",
        padding: 16,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 15, fontWeight: "bold", color: "#1e1b20" }}>{setting.title}</Text>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: setting.is_enabled ? "#14b8a6" : "#cbd5e1",
          }}
        />
      </View>

      <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 16 }}>
        {setting.description || "Tidak ada deskripsi."}
      </Text>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 4, alignItems: "center" }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "bold",
            color: setting.is_enabled ? "#14b8a6" : "#64748b",
          }}
        >
          {setting.is_enabled ? "Aktif" : "Nonaktif"}
        </Text>
        <Text style={{ fontSize: 11, color: "#94a3b8" }}>·</Text>
        <Text style={{ fontSize: 11, color: "#64748b" }}>
          Delay: {setting.send_delay_seconds} dtk
        </Text>
      </View>
    </TouchableOpacity>
  );
}