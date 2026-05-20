import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useCycle } from '../../src/context/CycleContext';

interface CycleCardProps {
  displayPhase: string;
  actionCardIcon: string;
}

export function CycleCard({ displayPhase, actionCardIcon }: CycleCardProps) {
  const { cycleDay, daysToNextPeriod } = useCycle();

  const borderClass = useMemo(() => {
    if (displayPhase === 'Masa Subur' || displayPhase === 'Ovulasi') {
      return 'border-secondary'; // Teal
    }
    if (displayPhase === 'Menstruasi') {
      return 'border-primary/30'; // Pink border
    }
    return 'border-primary/10'; // Soft default border
  }, [displayPhase]);

  return (
    <View className="w-full bg-surface rounded-[32px] p-[24px] shadow-sm border border-outline-variant items-center justify-center relative overflow-hidden">
      <View className="mb-[32px] mt-[16px] z-10">
        <View className="px-[24px] py-[12px] rounded-3xl shadow-sm flex-row items-center gap-[12px] border border-outline-variant bg-pink-50">
           <Text className="text-2xl">{actionCardIcon}</Text>
           <View className="flex-col justify-center">
             <Text className="text-lg font-bold tracking-wider uppercase text-primary">
               {displayPhase === 'Masa Subur' ? 'Masa Subur' : `Fase ${displayPhase}`}
             </Text>
           </View>
        </View>
      </View>

      <View className={`w-48 h-48 rounded-full border-[12px] ${borderClass} items-center justify-center bg-background shadow-inner z-10`}>
        <Text className="text-3xl font-bold text-on-background">{daysToNextPeriod} Hari</Text>
        <Text className="text-[10px] uppercase opacity-60 text-center leading-tight mt-1 text-on-background">
          Lagi Haid{"\n"}Berikutnya
        </Text>
      </View>
      
      <View className="mt-8 items-center justify-center px-6 py-2 bg-on-surface/5 rounded-full border border-outline-variant/30 opacity-70 z-10">
        <Text className="text-[12px] uppercase tracking-widest text-on-background font-bold">
          Siklus Hari Ke-{cycleDay}
        </Text>
      </View>
    </View>
  );
}
