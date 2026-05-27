import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useCycle } from '../../src/context/CycleContext';
import { format } from 'date-fns';

import { CycleCard } from '../../components/dashboard/CycleCard';
import { AffirmationCard } from '../../components/dashboard/AffirmationCard';
import { SavingsCard } from '../../components/dashboard/SavingsCard';
import { ActionCard } from '../../components/dashboard/ActionCard';
import { MessageModal } from '../../components/dashboard/MessageModal';
import { TwwActionCard } from '../../components/dashboard/TwwActionCard';
import { TwwSanctuaryModal } from '../../components/dashboard/TwwSanctuaryModal';
import { HeaderProfileButton } from '../../components/common/HeaderProfileButton';

export default function DashboardScreen() {
  const router = useRouter();
  const { activityHistory, getDayInfo, userNickname } = useCycle();
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  const dateString = useMemo(() => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const d = new Date();
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  }, []);

  const { displayPhase, phase: currentPhase } = useMemo(() => {
    return getDayInfo(new Date());
  }, [getDayInfo]);

  const isFertile = displayPhase === 'Masa Subur';
  const isStrictOvulation = displayPhase === 'Ovulasi';
  
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isTwwModalOpen, setIsTwwModalOpen] = useState(false);

  // Completion metric for today
  const completionPercent = useMemo(() => {
    const todayRecord = activityHistory[todayKey];
    if (todayRecord && todayRecord.tasks && todayRecord.tasks.length > 0) {
      const completed = todayRecord.tasks.filter((t: any) => t.done).length;
      return Math.round((completed / todayRecord.tasks.length) * 100);
    }
    return 0;
  }, [activityHistory, todayKey]);

  // Determine icon for CycleCard from same logic as ActionCard
  const actionCardIcon = useMemo(() => {
     if (completionPercent < 50) return '🔔';
     if (isStrictOvulation) return '💖';
     if (isFertile) return '💕';
     if (currentPhase === 'Menstrual') return '🩸';
     return '✨';
  }, [completionPercent, currentPhase, isFertile, isStrictOvulation]);

  return (
    <SafeAreaView style={{ flex: 1, minHeight: Platform.OS === 'web' ? '100%' : undefined }} className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} style={{ flex: 1 }}>
        {/* Custom Header */}
        <View className="mb-6 pt-4 border-b border-primary/20 pb-4 flex-row justify-between items-end">
          <View className="flex-1 pr-3">
            <Text className="text-3xl font-bold text-on-background">Halo, {userNickname}</Text>
            <Text className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mt-1">
              {dateString}
            </Text>
          </View>
          <HeaderProfileButton />
        </View>

        {/* Affirmation Card between Date Header and Cycle Card Circle */}
        <View className="mb-6">
          <AffirmationCard displayPhase={displayPhase} />
        </View>

        {/* Dashboard Content */}
        <View className="space-y-6">
          <CycleCard displayPhase={displayPhase} actionCardIcon={actionCardIcon} />
          
          <View className="mt-4">
            {currentPhase === 'Luteal' ? (
              <TwwActionCard onOpenSanctuary={() => setIsTwwModalOpen(true)} />
            ) : (
              <ActionCard 
                onOpenMessageModal={() => setIsMessageModalOpen(true)} 
                isFertile={isFertile} 
                isStrictOvulation={isStrictOvulation} 
              />
            )}
          </View>
          
          <View className="mt-4">
            <SavingsCard />
          </View>
        </View>
      </ScrollView>

      {/* Message Template Bottom Sheet */}
      {isMessageModalOpen && (
        <MessageModal onClose={() => setIsMessageModalOpen(false)} />
      )}

      {/* TWW Sanctuary Modal */}
      {isTwwModalOpen && (
        <TwwSanctuaryModal onClose={() => setIsTwwModalOpen(false)} />
      )}
    </SafeAreaView>
  );
}
