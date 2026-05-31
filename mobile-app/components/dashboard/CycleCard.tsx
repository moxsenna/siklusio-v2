import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useCycle } from '../../src/context/CycleContext';
import {
  getCycleConfidenceMessage,
  getPredictionDeltaMessage,
} from '../../src/lib/cycleInsightCopy';

interface CycleCardProps {
  displayPhase: string;
  actionCardIcon: string;
}

export function CycleCard({ displayPhase, actionCardIcon }: CycleCardProps) {
  const {
    cycleDay,
    daysToNextPeriod,
    predictedCycleLength,
    cycleConfidence,
    lastPredictionDeltaDays,
  } = useCycle();

  const borderClass = useMemo(() => {
    if (displayPhase === 'Masa Subur' || displayPhase === 'Ovulasi') {
      return 'border-secondary'; // Teal
    }
    if (displayPhase === 'Menstruasi') {
      return 'border-primary/30'; // Pink border
    }
    return 'border-primary/10'; // Soft default border
  }, [displayPhase]);

  const confidenceMessage = getCycleConfidenceMessage(cycleConfidence);
  const deltaMessage = getPredictionDeltaMessage(lastPredictionDeltaDays);

  return (
    <View className="w-full bg-white dark:bg-[#1c0f24] rounded-[32px] p-[24px] shadow-sm border border-pink-200 dark:border-[#ec4899]/15 items-center justify-center relative overflow-hidden">
      <View className="mb-[32px] mt-[16px] z-10">
        <View className="px-[24px] py-[12px] rounded-3xl shadow-sm flex-row items-center gap-[12px] border border-pink-200 dark:border-[#ec4899]/20 bg-pink-50 dark:bg-purple-950/20">
           <Text className="text-2xl">{actionCardIcon}</Text>
           <View className="flex-col justify-center">
             <Text className="text-lg font-bold tracking-wider uppercase text-primary dark:text-[#ec4899]">
               {displayPhase === 'Masa Subur' ? 'Masa Subur' : `Fase ${displayPhase}`}
             </Text>
           </View>
        </View>
      </View>

      <View className={`w-48 h-48 rounded-full border-[12px] ${borderClass} items-center justify-center bg-background dark:bg-[#120917] shadow-inner z-10`}>
        <Text className="text-3xl font-bold text-on-background dark:text-[#fdf2f8]">{daysToNextPeriod} Hari</Text>
        <Text className="text-[10px] uppercase opacity-60 text-center leading-tight mt-1 text-on-background dark:text-[#fbcfe8]">
          Lagi Haid{"\n"}Berikutnya
        </Text>
      </View>
      
      <View className="mt-8 items-center justify-center px-6 py-2 bg-on-surface/5 dark:bg-[#251830] rounded-full border border-outline-variant/30 dark:border-[#ec4899]/10 opacity-70 z-10">
        <Text className="text-[12px] uppercase tracking-widest text-on-background dark:text-[#fdf2f8] font-bold">
          Siklus Hari Ke-{cycleDay}
        </Text>
      </View>

      <View className="mt-4 items-center justify-center px-5 py-3 bg-pink-100/60 dark:bg-[#251830]/40 rounded-2xl border border-pink-200/40 dark:border-[#ec4899]/15 z-10 w-full max-w-[280px]">
        {cycleConfidence === 'low' ? (
          <View className="items-center">
            <View className="bg-pink-100/50 dark:bg-pink-950/20 px-3 py-1 rounded-full border border-pink-200/30 dark:border-[#ec4899]/20 mb-2">
              <Text className="text-[11px] text-primary dark:text-[#ec4899] font-bold tracking-wider uppercase">
                Siklus Perkiraan: {predictedCycleLength} hari
              </Text>
            </View>
            <Text className="text-[10px] text-on-surface-variant dark:text-[#fbcfe8] text-center leading-relaxed font-medium">
              💡 Catat tanggal haid di Kalender untuk prediksi personal yang lebih akurat.
            </Text>
          </View>
        ) : (
          <View className="items-center">
            <View className="bg-secondary/10 dark:bg-teal-950/30 px-3 py-1 rounded-full border border-secondary/20 dark:border-teal-900/30 mb-2">
              <Text className="text-[11px] text-secondary dark:text-teal-400 font-bold tracking-wider uppercase">
                Panjang Siklus: {predictedCycleLength} hari
              </Text>
            </View>
            <Text className="text-[10px] text-on-surface-variant dark:text-[#fbcfe8] text-center leading-relaxed font-medium">
              ✨ {confidenceMessage}
            </Text>
          </View>
        )}
        {deltaMessage && (
          <Text className="text-[11px] text-on-surface-variant dark:text-[#fbcfe8]/70 text-center leading-relaxed mt-2 border-t border-outline-variant/30 dark:border-[#ec4899]/15 pt-2 w-full">
            {deltaMessage}
          </Text>
        )}
      </View>
    </View>
  );
}
