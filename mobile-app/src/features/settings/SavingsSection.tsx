import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface SavingsSectionProps {
  currentSavingInput: string;
  targetSavingInput: string;
  onCurrentSavingChange: (value: string) => void;
  onTargetSavingChange: (value: string) => void;
  onSubmit: () => void;
}

export function SavingsSection({
  currentSavingInput,
  targetSavingInput,
  onCurrentSavingChange,
  onTargetSavingChange,
  onSubmit,
}: SavingsSectionProps) {
  return (
    <>
      <View className="flex-row items-center gap-2 mb-2">
        <FontAwesome name="money" size={18} color="#0d9488" />
        <Text className="text-base font-bold text-on-surface">Persiapan Promil</Text>
      </View>
      <View className="bg-surface rounded-[32px] p-6 shadow-sm border border-outline-variant">
        <View className="flex-row items-center gap-3 mb-4">
          <FontAwesome name="money" size={18} color="#0d9488" />
          <Text className="text-base font-bold text-on-surface">Tabungan Promil</Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              Total Tabungan Terkumpul
            </Text>
            <View className="relative justify-center">
              <Text className="absolute left-4 text-sm font-bold text-on-surface-variant/70">
                Rp
              </Text>
              <TextInput
                value={currentSavingInput}
                onChangeText={onCurrentSavingChange}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#ec489950"
                className="w-full bg-surface-variant border border-outline-variant rounded-xl pl-12 pr-4 py-3 text-sm text-on-surface"
              />
            </View>
          </View>

          <View>
            <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              Target Tabungan
            </Text>
            <View className="relative justify-center">
              <Text className="absolute left-4 text-sm font-bold text-on-surface-variant/70">
                Rp
              </Text>
              <TextInput
                value={targetSavingInput}
                onChangeText={onTargetSavingChange}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#ec489950"
                className="w-full bg-surface-variant border border-outline-variant rounded-xl pl-12 pr-4 py-3 text-sm text-on-surface"
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={onSubmit}
            className="w-full py-3 bg-teal-600 rounded-2xl items-center justify-center shadow-sm mt-2"
          >
            <Text className="text-white font-bold text-sm uppercase tracking-wider">
              Simpan Tabungan
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}