import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

interface TwwActionCardProps {
  onOpenSanctuary: () => void;
}

export function TwwActionCard({ onOpenSanctuary }: TwwActionCardProps) {
  return (
    <View className="w-full pb-8">
      <View className="bg-purple-50 rounded-[32px] p-[24px] shadow-sm border border-purple-200">
        <View className="w-12 h-12 bg-purple-100 rounded-2xl items-center justify-center mb-[16px]">
          <Text className="text-2xl">🧘‍♀️</Text>
        </View>
        <Text className="text-sm font-bold text-purple-900 mb-[4px]">Pojok Tenang TWW</Text>
        <Text className="text-[10px] text-purple-800 opacity-80 leading-relaxed min-h-[40px] font-bold">
          Waktunya menjaga ketenangan pikiran. Sedang cemas atau overthinking menunggu hasil? Yuk
          masuk ke Pojok Tenang.
        </Text>

        <TouchableOpacity
          onPress={onOpenSanctuary}
          className="w-full bg-purple-600 py-[16px] rounded-2xl items-center justify-center mt-[16px] shadow-md active:scale-95"
        >
          <Text className="text-white font-bold uppercase text-[10px] tracking-widest">
            Masuk Pojok Tenang
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
