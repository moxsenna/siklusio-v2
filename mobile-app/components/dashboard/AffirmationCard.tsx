import React from 'react';
import { View, Text } from 'react-native';

export function AffirmationCard({ displayPhase }: { displayPhase: string }) {
  const getAffirmationMessage = () => {
    switch(displayPhase) {
      case 'Menstruasi': return "Tubuhmu sedang beristirahat. Berikan kasih sayang dan waktu untuk memulihkan energi.";
      case 'Masa Subur': return "Ini waktu yang tepat untuk produktif dan menjalin koneksi. Energimu sedang berada di puncak!";
      case 'Ovulasi': return "Pancarkan pesonamu. Kamu berada dalam fase paling alami dan indah.";
      default: return "Cintai dirimu setiap harinya. Perjalanan ini milikmu.";
    }
  };

  return (
    <View className="bg-pink-50 dark:bg-purple-950/20 rounded-[24px] p-[20px] shadow-sm border border-pink-100 dark:border-[#ec4899]/20 flex-row gap-[16px]">
      <View className="w-[40px] h-[40px] bg-pink-100 dark:bg-[#1a0f24] rounded-full items-center justify-center">
        <Text className="text-lg">💬</Text>
      </View>
      <View className="flex-1">
        <Text className="text-[10px] font-bold uppercase tracking-widest text-pink-500 dark:text-pink-400 mb-1">Afirmasi Hari Ini</Text>
        <Text className="text-sm font-medium text-gray-800 dark:text-[#fdf2f8] italic pr-2 leading-relaxed">
          "{getAffirmationMessage()}"
        </Text>
      </View>
    </View>
  );
}
