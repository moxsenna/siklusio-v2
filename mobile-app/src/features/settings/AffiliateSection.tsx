import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";

export function AffiliateSection() {
  return (
    <>
      <View className="flex-row items-center gap-2 mb-2">
        <FontAwesome name="gift" size={18} color="#db2777" />
        <Text className="text-base font-bold text-on-surface">Referral</Text>
      </View>
      <TouchableOpacity
        onPress={() => router.push("/affiliate")}
        className="bg-pink-50 rounded-[32px] p-6 shadow-sm border border-pink-100 flex-row items-center justify-between"
      >
        <View className="flex-row items-center gap-4 flex-1 pr-4">
          <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center">
            <FontAwesome name="gift" size={18} color="#db2777" />
          </View>
          <View className="flex-1">
            <Text className="text-[10px] font-mono font-bold uppercase tracking-widest text-pink-900">
              Program Afiliasi 🌸
            </Text>
            <Text className="text-[10px] font-mono text-pink-700 opacity-80 mt-1 leading-relaxed">
              Dapatkan komisi untuk setiap bunda yang bergabung lewat referal Anda.
            </Text>
          </View>
        </View>
        <View className="w-8 h-8 rounded-full bg-pink-100 items-center justify-center">
          <FontAwesome name="chevron-right" size={12} color="#ec4899" />
        </View>
      </TouchableOpacity>
    </>
  );
}