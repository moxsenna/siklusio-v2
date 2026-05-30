import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Platform } from 'react-native';
import { CalendarGrid } from '../../components/calendar/CalendarGrid';
import { AiReportModal } from '../../components/calendar/AiReportModal';
import { useCycle } from '../../src/context/CycleContext';
import { format } from 'date-fns';
import { HeaderProfileButton } from '../../components/common/HeaderProfileButton';
import { stampDailyRecord } from '../../src/lib/activityHistorySync';

export default function CalendarScreen() {
  const { getDayInfo, activityHistory, setActivityHistory } = useCycle();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAiReport, setShowAiReport] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const getFormattedSelectedDate = (date: Date) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const togglePeriodForDate = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    setActivityHistory((prev) => {
      const record = prev[dateKey] || { symptoms: [], tasks: [] };
      const newIsPeriod = !record.isPeriod;

      // Default tasks for tracking
      const defaultTasks = [
        { id: 1, text: 'Minum Air (2L)', emoji: '💧', done: false },
        { id: 2, text: 'Asam Folat', emoji: '💊', done: false },
        { id: 3, text: 'Olahraga', emoji: '🧘‍♀️', done: false },
        { id: 4, text: 'Istirahat Cukup', emoji: '🛌', done: false }
      ];

      return {
        ...prev,
        [dateKey]: stampDailyRecord({
          ...record,
          tasks: record.tasks && record.tasks.length > 0 ? record.tasks : defaultTasks,
          isPeriod: newIsPeriod
        })
      };
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, minHeight: Platform.OS === 'web' ? '100%' : undefined }} className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} style={{ flex: 1 }}>
        {/* Header */}
        <View className="flex-row justify-between items-end mb-6 pt-4 border-b border-primary/20 pb-4">
          <View className="flex-1 pr-3">
            <Text className="text-3xl font-bold text-on-background">Kalender</Text>
            <Text className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mt-1">
              Pelacakan Siklus & Ovulasi
            </Text>
          </View>
          <HeaderProfileButton />
        </View>

        {/* Calendar Grid */}
        <CalendarGrid
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          onSelectDate={setSelectedDate}
          selectedDate={selectedDate}
        />

        {/* AI Cycle Analysis Banner Button */}
        <TouchableOpacity 
          onPress={() => setShowAiReport(true)}
          activeOpacity={0.9}
          className="mt-6 bg-primary/10 border border-primary/20 rounded-[32px] p-5 flex-row items-center justify-between shadow-sm active:scale-[0.98]"
        >
          <View className="flex-row items-center gap-4 flex-1 pr-3">
            <View className="w-12 h-12 rounded-2xl bg-primary/20 items-center justify-center">
              <Text className="text-2xl">✨</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
                Asisten AI Cerdas
              </Text>
              <Text className="text-sm font-bold text-on-background mt-0.5">
                Wawasan & Analisis Siklus AI
              </Text>
              <Text className="text-[11px] text-on-surface-variant/80 mt-1 leading-relaxed">
                Dapatkan ramalan masa subur dan tips kesehatan pribadi dari AI Bunda.
              </Text>
            </View>
          </View>
          <View className="w-8 h-8 rounded-full bg-primary/20 items-center justify-center shrink-0">
            <Text className="text-sm text-primary font-bold">➔</Text>
          </View>
        </TouchableOpacity>
        
        {/* Selected Date Details */}
        {selectedDate && (() => {
          const info = getDayInfo(selectedDate);
          const dateKey = format(selectedDate, 'yyyy-MM-dd');
          const isLoggedPeriod = !!activityHistory[dateKey]?.isPeriod;
          const isPeriod = isLoggedPeriod || info.displayPhase === 'Menstruasi';
          
          let phaseDesc = '';
          let phaseColor = 'text-on-surface-variant';
          let emoji = '🌸';

          if (isPeriod) {
            phaseDesc = `Fase: Menstruasi 🩸 (Hari ke-${info.cycleDay}) - Direkomendasikan istirahat & hidrasi`;
            phaseColor = 'text-primary';
            emoji = '🩸';
          } else if (info.displayPhase === 'Masa Subur') {
            phaseDesc = `Fase: Masa Subur 🌱 (Peluang Hamil Tinggi) - Rekomendasi promil aktif`;
            phaseColor = 'text-teal-600 font-bold';
            emoji = '🌱';
          } else if (info.displayPhase === 'Ovulasi') {
            phaseDesc = `Fase: Hari Ovulasi 🎯 (Peluang Hamil Tertinggi!) - Hubungan intim sangat direkomendasikan`;
            phaseColor = 'text-teal-700 font-bold';
            emoji = '🎯';
          } else {
            phaseDesc = `Fase: Masa Tenang/Luteal 🧘‍♀️ (Siklus Hari ke-${info.cycleDay})`;
            phaseColor = 'text-indigo-500 font-bold';
            emoji = '🧘‍♀️';
          }

          return (
            <View className="bg-surface p-6 mt-6 rounded-[32px] border border-outline-variant shadow-sm flex-col gap-4">
              <View className="flex-row items-center gap-4">
                <View className="w-12 h-12 rounded-2xl bg-surface-variant flex items-center justify-center">
                  <Text className="text-2xl">{emoji}</Text>
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
                <Text className="text-base">{isLoggedPeriod ? '🩸' : '➕'}</Text>
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

      {/* AI Analysis Sheet */}
      {showAiReport && (
        <AiReportModal onClose={() => setShowAiReport(false)} />
      )}
    </SafeAreaView>
  );
}
