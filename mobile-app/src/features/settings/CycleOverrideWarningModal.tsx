import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface CycleOverrideWarningModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function CycleOverrideWarningModal({
  visible,
  onCancel,
  onConfirm,
}: CycleOverrideWarningModalProps) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center p-6 bg-black/45">
        <View className="bg-surface rounded-3xl p-6 w-full max-w-[320px] shadow-xl border border-outline-variant">
          <View className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mb-4 mx-auto">
            <FontAwesome name="exclamation-circle" size={24} color="#ef4444" />
          </View>
          <Text className="text-xl font-bold text-center mb-2 text-on-surface">
            Ubah Data Siklus?
          </Text>
          <Text className="text-sm text-on-surface-variant/80 text-center mb-6 leading-relaxed">
            Mengubah data siklus secara manual akan memengaruhi prediksi menstruasi dan masa subur
            yang sudah dihitung. Apakah kamu yakin?
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onCancel}
              className="flex-1 py-3 rounded-xl items-center justify-center bg-surface-variant border border-outline-variant"
            >
              <Text className="text-on-surface font-bold text-sm">Batal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              className="flex-1 py-3 rounded-xl items-center justify-center bg-primary shadow-sm"
            >
              <Text className="text-on-primary font-bold text-sm">Ya, Ubah</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}