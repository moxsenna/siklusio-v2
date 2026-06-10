import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface AccountSectionProps {
  onSignOut: () => void;
}

export function AccountSection({ onSignOut }: AccountSectionProps) {
  return (
    <>
      <View className="flex-row items-center gap-2 mb-2">
        <FontAwesome name="user" size={18} color="#ef4444" />
        <Text className="text-base font-bold text-on-surface">Akun</Text>
      </View>
      <TouchableOpacity
        onPress={onSignOut}
        className="w-full mt-4 flex-row items-center justify-center gap-2 py-4 bg-error/10 rounded-2xl border border-error/20"
      >
        <FontAwesome name="sign-out" size={18} color="#ef4444" />
        <Text className="text-error font-bold tracking-widest text-sm uppercase">
          Keluar (Log Out)
        </Text>
      </TouchableOpacity>
    </>
  );
}