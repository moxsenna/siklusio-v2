import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface ReminderSectionProps {
  dailyReminder: boolean;
  reminderTimeLabel: string;
  onToggle: () => void;
}

export function ReminderSection({
  dailyReminder,
  reminderTimeLabel,
  onToggle,
}: ReminderSectionProps) {
  return (
    <>
      <View className="flex-row items-center gap-2 mb-2">
        <FontAwesome name="bell" size={18} color="#ec4899" />
        <Text className="text-base font-bold text-on-surface">Pengingat</Text>
      </View>
      {Platform.OS !== "web" && (
        <TouchableOpacity
          onPress={onToggle}
          className="bg-surface rounded-[32px] p-6 shadow-sm border border-outline-variant flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-4 flex-1 pr-4">
            <View
              className={`w-10 h-10 rounded-full items-center justify-center ${dailyReminder ? "bg-primary/20 text-primary" : "bg-surface-variant text-on-surface-variant"}`}
            >
              <FontAwesome name="bell" size={18} color={dailyReminder ? "#ec4899" : "#888"} />
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface">
                Pengingat Harian & Promil
              </Text>
              <Text className="text-[10px] font-mono opacity-50 mt-1 leading-relaxed">
                {dailyReminder
                  ? `Notifikasi lokal terjadwal setiap pukul ${reminderTimeLabel}.`
                  : "Aktifkan untuk menjadwalkan notifikasi lokal harian di aplikasi mobile."}
              </Text>
            </View>
          </View>

          <View
            className={`w-[44px] h-[24px] rounded-full p-[2px] justify-center ${dailyReminder ? "bg-primary" : "bg-surface-variant"}`}
          >
            <View
              className={`w-[20px] h-[20px] rounded-full bg-white shadow-sm ${dailyReminder ? "self-end" : "self-start"}`}
            />
          </View>
        </TouchableOpacity>
      )}
    </>
  );
}