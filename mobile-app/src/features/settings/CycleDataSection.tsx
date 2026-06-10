import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface CycleDataSectionProps {
  hphtLabel: string;
  cycleInput: string;
  periodInput: string;
  onOpenDatePicker: () => void;
  onCycleInputChange: (value: string) => void;
  onPeriodInputChange: (value: string) => void;
  onSubmit: () => void;
}

export function CycleDataSection({
  hphtLabel,
  cycleInput,
  periodInput,
  onOpenDatePicker,
  onCycleInputChange,
  onPeriodInputChange,
  onSubmit,
}: CycleDataSectionProps) {
  return (
    <>
      <View className="flex-row items-center gap-2 mb-2">
        <FontAwesome name="calendar" size={18} color="#ec4899" />
        <Text className="text-base font-bold text-on-surface">Data Siklus Bunda</Text>
      </View>
      <View className="bg-surface rounded-[32px] p-6 shadow-sm border border-outline-variant">
        <View className="mb-4">
          <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
            HPHT (Hari Pertama Haid Terakhir)
          </Text>
          <TouchableOpacity
            onPress={onOpenDatePicker}
            className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3 flex-row justify-between items-center"
          >
            <Text className="text-sm text-on-surface font-semibold">{hphtLabel}</Text>
            <FontAwesome name="calendar" size={16} color="#ec4899" />
          </TouchableOpacity>
        </View>

        <View className="flex-row gap-4">
          <View className="flex-1">
            <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              Siklus
            </Text>
            <View className="relative justify-center">
              <TextInput
                value={cycleInput}
                onChangeText={onCycleInputChange}
                keyboardType="number-pad"
                placeholderTextColor="#ec489950"
                className="w-full bg-surface-variant border border-outline-variant rounded-xl pl-4 pr-12 py-3 text-sm text-on-surface"
              />
              <Text className="absolute right-3 text-xs text-on-surface-variant/70 font-bold">
                Hari
              </Text>
            </View>
          </View>

          <View className="flex-1">
            <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              Haid
            </Text>
            <View className="relative justify-center">
              <TextInput
                value={periodInput}
                onChangeText={onPeriodInputChange}
                keyboardType="number-pad"
                placeholderTextColor="#ec489950"
                className="w-full bg-surface-variant border border-outline-variant rounded-xl pl-4 pr-12 py-3 text-sm text-on-surface"
              />
              <Text className="absolute right-3 text-xs text-on-surface-variant/70 font-bold">
                Hari
              </Text>
            </View>
          </View>
        </View>
        <Text className="text-xs text-on-surface-variant mt-1">
          Data ini membantu Siklusio memperkirakan fase tubuh dan masa subur Bunda.
        </Text>

        <TouchableOpacity
          onPress={onSubmit}
          className="w-full py-3 bg-primary rounded-2xl items-center justify-center shadow-sm mt-2"
        >
          <Text className="text-on-primary font-bold text-sm uppercase tracking-wider">
            Simpan Siklus
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}