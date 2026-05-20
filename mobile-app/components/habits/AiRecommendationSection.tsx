import React from 'react';
import { View, Text } from 'react-native';

export function AiRecommendationSection({ currentPhase }: any) {
  const getRecommendation = () => {
    switch (currentPhase) {
      case 'Menstrual':
        return "Disarankan mengonsumsi teh jahe atau chamomile untuk meredakan kram. Hindari kafein berlebih hari ini.";
      case 'Ovulasi':
        return "Waktu terbaik untuk mencoba konsepsi! Jangan lupa jaga mood dan asupan protein.";
      case 'Masa Subur':
        return "Peluang hamil sedang meningkat. Tetap aktif dan perhatikan pola tidur.";
      default:
        return "Tetap konsisten dengan rutinitas harianmu. Setiap langkah kecil sangat berharga.";
    }
  };

  return (
    <View className="bg-indigo-50 rounded-[32px] p-6 border border-indigo-100 shadow-sm relative overflow-hidden">
      <View className="z-10">
        <Text className="text-sm font-bold tracking-wide text-indigo-900 mb-2">
          ✨ Insight AI untuk Kamu
        </Text>
        <Text className="text-sm font-medium text-indigo-800 leading-relaxed italic">
          {getRecommendation()}
        </Text>
      </View>
    </View>
  );
}
