import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useCycle } from '../../src/context/CycleContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export function SavingsCard() {
  const { currentSaving, setCurrentSaving, targetSaving } = useCycle();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  
  const formatRupiah = (val: number) => {
    return 'Rp ' + val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };
  
  const progress = targetSaving > 0 ? Math.min((currentSaving / targetSaving) * 100, 100) : 0;

  const handleQuickAdd = (value: number) => {
    const current = Number(amountInput.replace(/[^0-9]/g, '')) || 0;
    setAmountInput((current + value).toString());
  };

  const handleSave = () => {
    const parsedAmount = Number(amountInput.replace(/[^0-9]/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Info', 'Silakan masukkan nominal tabungan yang valid.');
      return;
    }

    setCurrentSaving(currentSaving + parsedAmount);
    setAmountInput('');
    setIsModalVisible(false);
    Alert.alert('Sukses 🎉', `Berhasil menambahkan ${formatRupiah(parsedAmount)} ke dalam tabungan Anda!`);
  };

  return (
    <View className="bg-white dark:bg-[#1c0f24] p-[24px] rounded-[32px] border border-pink-200 dark:border-[#ec4899]/15 shadow-sm">
      <View className="flex-row justify-between items-center mb-[20px]">
        <View className="flex-row items-center gap-[12px]">
          <View className="w-[40px] h-[40px] rounded-full bg-teal-50 dark:bg-teal-950/40 items-center justify-center">
            <Text className="text-lg">👛</Text>
          </View>
          <Text className="text-lg font-bold text-fuchsia-800 dark:text-[#fdf2f8]">Tabungan</Text>
        </View>
        <View className="bg-teal-50 dark:bg-teal-950/50 px-3 py-1 rounded-full border border-teal-100 dark:border-teal-900/30">
          <Text className="text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">
            {progress.toFixed(0)}% Tercapai
          </Text>
        </View>
      </View>
      
      <View className="space-y-[12px]">
        <View className="mb-2">
          <Text className="text-[10px] uppercase tracking-widest text-pink-900 dark:text-[#fbcfe8]/70 mb-1 font-bold">Terkumpul</Text>
          <Text className="text-2xl font-bold text-teal-600 dark:text-teal-400">{formatRupiah(currentSaving)}</Text>
        </View>
        
        <View className="mt-2">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xs font-semibold text-pink-900 dark:text-[#fbcfe8]/60">Kemajuan</Text>
            <Text className="text-xs font-semibold text-pink-900 dark:text-[#fbcfe8]/60">
               Target: <Text className="font-bold text-fuchsia-800 dark:text-[#fdf2f8]">{formatRupiah(targetSaving)}</Text>
            </Text>
          </View>
          
          <View className="w-full bg-pink-100 dark:bg-purple-950/60 rounded-full h-3 overflow-hidden">
            <View 
              className="bg-teal-500 h-3 rounded-full" 
              style={{ width: `${progress}%` }}
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setIsModalVisible(true)}
          className="w-full mt-4 py-3 bg-teal-50 dark:bg-purple-950/40 border border-teal-200 dark:border-[#ec4899]/15 rounded-2xl flex-row items-center justify-center gap-2 active:scale-95"
        >
          <FontAwesome name="plus" size={12} color="#0f766e" />
          <Text className="text-teal-700 dark:text-teal-400 font-bold text-xs uppercase tracking-wider">Tambah Tabungan</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Tambah Tabungan */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setIsModalVisible(false);
          setAmountInput('');
        }}
      >
        <View className="flex-1 items-center justify-center p-6 bg-black/45">
          <View className="bg-surface dark:bg-[#1a0f24] rounded-3xl p-6 w-full max-w-[320px] shadow-2xl border border-outline-variant dark:border-[#ec4899]/20">
            <View className="w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center mb-4 mx-auto">
              <Text className="text-xl">👛</Text>
            </View>
            <Text className="text-xl font-bold text-center mb-1 text-on-surface dark:text-[#fdf2f8]">Tambah Tabungan</Text>
            <Text className="text-xs text-on-surface-variant/80 dark:text-[#fbcfe8]/80 text-center mb-4 leading-relaxed">
              Catat tambahan tabungan terkumpul Anda di bawah ini:
            </Text>

            {/* Input Nominal */}
            <View className="relative justify-center mb-4">
              <Text className="absolute left-4 text-base font-bold text-teal-700 dark:text-teal-400">Rp</Text>
              <TextInput
                value={amountInput}
                onChangeText={setAmountInput}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#0f766e40"
                className="w-full bg-surface-variant dark:bg-purple-950/40 border border-outline-variant dark:border-[#ec4899]/20 rounded-xl pl-12 pr-4 py-3 text-base font-bold text-teal-700 dark:text-teal-400"
              />
            </View>

            {/* Quick Add Chips */}
            <View className="flex-row flex-wrap gap-2 justify-center mb-6">
              {[10000, 50000, 100000, 500000].map(val => (
                <TouchableOpacity
                  key={val}
                  onPress={() => handleQuickAdd(val)}
                  className="px-3 py-2 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/30 rounded-xl active:scale-95"
                >
                  <Text className="text-teal-700 dark:text-teal-400 font-bold text-xs">
                    + {val >= 1000 ? (val / 1000) + 'k' : val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  setIsModalVisible(false);
                  setAmountInput('');
                }}
                className="flex-1 py-3 bg-surface-variant dark:bg-purple-950/40 border border-outline-variant dark:border-[#ec4899]/20 rounded-2xl items-center"
              >
                <Text className="text-on-surface dark:text-[#fdf2f8] font-bold text-xs uppercase tracking-wider">Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                className="flex-1 py-3 bg-teal-600 rounded-2xl items-center justify-center shadow-sm"
              >
                <Text className="text-white font-bold text-xs uppercase tracking-wider">Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
