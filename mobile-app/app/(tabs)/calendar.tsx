import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { CalendarGrid } from '../../components/calendar/CalendarGrid';
import { CycleGuideCard } from '../../components/calendar/CycleGuideCard';
import { CycleGuideModal } from '../../components/calendar/CycleGuideModal';
import { HeaderProfileButton } from '../../components/common/HeaderProfileButton';
import { useCycle } from '../../src/context/CycleContext';
import { stampDailyRecord } from '../../src/lib/activityHistorySync';
import { buildCycleGuidePreview } from '../../src/lib/cycleGuideSummary';

export default function CalendarScreen() {
  const router = useRouter();
  const {
    getDayInfo,
    activityHistory,
    setActivityHistory,
    currentPhase,
    cycleDay,
    daysToNextPeriod,
    fertileWindowStart,
    fertileWindowEnd,
    ovulationDate,
    nextPeriodDate,
    cycleConfidence,
    periodConfidence,
    hasManualLogs,
    lastPredictionDeltaDays,
    userNickname,
  } = useCycle();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCycleGuide, setShowCycleGuide] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const cycleGuidePreview = buildCycleGuidePreview({
    currentPhase,
    cycleDay,
    daysToNextPeriod,
    cycleConfidence,
    periodConfidence,
    hasManualLogs,
    activityHistory,
    activeHabitPlanSummary: null,
  });

  const cycleGuidePayload = {
    generatedForDate: format(new Date(), 'yyyy-MM-dd'),
    guideLevel: cycleGuidePreview.level,
    currentPhase,
    cycleDay,
    daysToNextPeriod,
    fertileWindow: {
      start: fertileWindowStart ? format(fertileWindowStart, 'yyyy-MM-dd') : '',
      end: fertileWindowEnd ? format(fertileWindowEnd, 'yyyy-MM-dd') : '',
    },
    ovulationDate: ovulationDate ? format(ovulationDate, 'yyyy-MM-dd') : '',
    nextPeriodDate: nextPeriodDate ? format(nextPeriodDate, 'yyyy-MM-dd') : '',
    cycleConfidence,
    periodConfidence,
    lastPredictionDeltaDays,
    habitSnapshot: {},
    nickname: userNickname,
  };

  const getFormattedSelectedDate = (date: Date) => {
    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const togglePeriodForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    setActivityHistory((prev) => {
      const record = prev[dateKey] || { symptoms: [], tasks: [] };
      const newIsPeriod = !record.isPeriod;
      const defaultTasks = [
        { id: 1, text: 'Minum Air (2L)', emoji: 'water', done: false },
        { id: 2, text: 'Asam Folat', emoji: 'pill', done: false },
        { id: 3, text: 'Olahraga', emoji: 'move', done: false },
        { id: 4, text: 'Istirahat Cukup', emoji: 'rest', done: false },
      ];

      return {
        ...prev,
        [dateKey]: stampDailyRecord({
          ...record,
          tasks: record.tasks && record.tasks.length > 0 ? record.tasks : defaultTasks,
          isPeriod: newIsPeriod,
        }),
      };
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, minHeight: Platform.OS === 'web' ? '100%' : undefined }} className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} style={{ flex: 1 }}>
        <View className="flex-row justify-between items-end mb-6 pt-4 border-b border-primary/20 pb-4">
          <View className="flex-1 pr-3">
            <Text className="text-3xl font-bold text-on-background">Kalender</Text>
            <Text className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mt-1">
              Pelacakan Siklus & Ovulasi
            </Text>
          </View>
          <HeaderProfileButton />
        </View>

        <CalendarGrid
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          onSelectDate={setSelectedDate}
          selectedDate={selectedDate}
        />

        <CycleGuideCard
          preview={cycleGuidePreview}
          onOpen={() => setShowCycleGuide(true)}
        />

        {selectedDate && (() => {
          const info = getDayInfo(selectedDate);
          const dateKey = format(selectedDate, 'yyyy-MM-dd');
          const isLoggedPeriod = !!activityHistory[dateKey]?.isPeriod;
          const isPeriod = isLoggedPeriod || info.displayPhase === 'Menstruasi';

          let phaseDesc = '';
          let phaseColor = 'text-on-surface-variant';
          let phaseLabel = 'Siklus';

          if (isPeriod) {
            phaseDesc = `Fase: Menstruasi (Hari ke-${info.cycleDay}) - Direkomendasikan istirahat dan hidrasi`;
            phaseColor = 'text-primary';
            phaseLabel = 'Haid';
          } else if (info.displayPhase === 'Masa Subur') {
            phaseDesc = 'Fase: Masa Subur (Peluang hamil tinggi) - Rekomendasi promil aktif';
            phaseColor = 'text-teal-600 font-bold';
            phaseLabel = 'Subur';
          } else if (info.displayPhase === 'Ovulasi') {
            phaseDesc = 'Fase: Hari Ovulasi (Peluang hamil tertinggi) - Promil aktif sangat relevan';
            phaseColor = 'text-teal-700 font-bold';
            phaseLabel = 'Ovulasi';
          } else {
            phaseDesc = `Fase: Luteal atau masa tenang (Siklus hari ke-${info.cycleDay})`;
            phaseColor = 'text-indigo-500 font-bold';
            phaseLabel = 'Luteal';
          }

          return (
            <View className="bg-surface p-6 mt-6 rounded-[32px] border border-outline-variant shadow-sm flex-col gap-4">
              <View className="flex-row items-center gap-4">
                <View className="w-12 h-12 rounded-2xl bg-surface-variant items-center justify-center">
                  <Text className="text-xs font-bold text-primary">{phaseLabel}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] uppercase tracking-widest opacity-60 font-bold text-on-surface">
                    {getFormattedSelectedDate(selectedDate)}
                  </Text>
                  <Text className={`text-sm mt-0.5 leading-normal ${phaseColor}`}>{phaseDesc}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => togglePeriodForDate(selectedDate)}
                className={`w-full py-3.5 rounded-2xl items-center justify-center border flex-row gap-2 active:scale-[0.98] ${
                  isLoggedPeriod
                    ? 'bg-primary border-primary shadow-sm shadow-primary/20'
                    : 'bg-transparent border-primary/45'
                }`}
              >
                <Text className={`text-[10px] uppercase font-bold tracking-wider ${
                  isLoggedPeriod ? 'text-on-primary' : 'text-primary'
                }`}>
                  {isLoggedPeriod ? 'Haid Tercatat (Ketuk untuk Hapus)' : 'Tandai Sedang Menstruasi'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })()}
      </ScrollView>

      <CycleGuideModal
        visible={showCycleGuide}
        preview={cycleGuidePreview}
        payload={cycleGuidePayload}
        onClose={() => setShowCycleGuide(false)}
        onOpenHabitCoach={() => {
          setShowCycleGuide(false);
          router.push('/(tabs)/habits' as any);
        }}
      />
    </SafeAreaView>
  );
}
