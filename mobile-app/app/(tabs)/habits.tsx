import React, { useState, useMemo, useTransition } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Alert, Platform } from 'react-native';
import { format, subDays } from 'date-fns';
import { useCycle } from '../../src/context/CycleContext';
import { HeaderProfileButton } from '../../components/common/HeaderProfileButton';
import { analytics } from '../../src/lib/analytics';
import { stampDailyRecord } from '../../src/lib/activityHistorySync';

import { AiRecommendationSection } from '../../components/habits/AiRecommendationSection';
import { HistoryView } from '../../components/habits/HistoryView';

// Error boundary wrapper untuk HistoryView yang crash di native
class HistoryErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ padding: 16, alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
            Grafik histori tidak tersedia di perangkat ini.
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false })}
            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#fce7f3' }}
          >
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#ec4899' }}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function HistoryViewSafe(props: any) {
  return (
    <HistoryErrorBoundary>
      <HistoryView {...props} />
    </HistoryErrorBoundary>
  );
}

export default function HabitsScreen() {
  const { currentPhase, activityHistory, setActivityHistory, userNickname } = useCycle();
  const [, startTransition] = useTransition();
  
  const [viewMode, setViewMode] = useState<'daily' | 'history'>('daily');
  const [historyFilter, setHistoryFilter] = useState<7 | 14 | 30>(7);
  
  const [viewedDateOffset, setViewedDateOffset] = useState(0); // 0 = today, -1 = yesterday
  
  const viewedDate = useMemo(() => {
    return subDays(new Date(), Math.abs(viewedDateOffset));
  }, [viewedDateOffset]);

  const dateString = useMemo(() => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${days[viewedDate.getDay()]}, ${viewedDate.getDate()} ${months[viewedDate.getMonth()]}`;
  }, [viewedDate]);

  const dateKey = format(viewedDate, 'yyyy-MM-dd');
  
  // Dynamic Tasks Based on Phase
  const fallbackTasks = useMemo(() => {
    const baseTasks = [
      { id: 1, text: 'Minum Air (2L)', emoji: '💧', done: false },
      { id: 2, text: 'Asam Folat', emoji: '💊', done: false },
    ];
    
    if (currentPhase === 'Menstrual') {
      baseTasks.push({ id: 3, text: 'Kompres Hangat', emoji: '🌡️', done: false });
      baseTasks.push({ id: 4, text: 'Istirahat Cukup', emoji: '🛌', done: false });
    } else if (currentPhase === 'Ovulasi') {
      baseTasks.push({ id: 3, text: 'Berhubungan Intim', emoji: '💖', done: false });
      baseTasks.push({ id: 4, text: 'Olahraga Ringan', emoji: '🧘‍♀️', done: false });
    } else {
      baseTasks.push({ id: 3, text: 'Nutrisi Susu Promil', emoji: '🥛', done: false });
      baseTasks.push({ id: 4, text: 'Jalan Santai 15 Menit', emoji: '🚶‍♀️', done: false });
    }
    
    return baseTasks;
  }, [currentPhase]);

  const currentDayData = activityHistory[dateKey] || { tasks: fallbackTasks, symptoms: [] };
  const tasks = currentDayData.tasks;
  const symptoms = currentDayData.symptoms || [];

  const updateCurrentDay = (newData: Partial<typeof currentDayData>) => {
    setActivityHistory(prev => ({
      ...prev,
      [dateKey]: stampDailyRecord({
        ...currentDayData,
        ...newData
      })
    }));
  };

  const toggleTask = (id: number) => {
    startTransition(() => {
      const task = tasks.find(t => t.id === id);
      if (task) {
        const nextState = !task.done;
        if (nextState) {
          analytics.logEvent('habit_completed', {
            habit_name: task.text,
            phase: currentPhase
          });
        }
      }
      updateCurrentDay({
        tasks: tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)
      });
    });
  };

  const toggleSymptom = (id: string) => {
    startTransition(() => {
      const isAdding = !symptoms.includes(id);
      if (isAdding) {
        analytics.logEvent('symptom_logged', {
          symptom_id: id,
          phase: currentPhase
        });
      }
      if (symptoms.includes(id)) {
        updateCurrentDay({ symptoms: symptoms.filter(s => s !== id) });
      } else {
        updateCurrentDay({ symptoms: [...symptoms, id] });
      }
    });
  };

  const handlePrevDay = () => {
    if (viewedDateOffset > -60) {
      startTransition(() => {
        setViewedDateOffset(prev => prev - 1);
      });
    }
  };

  const handleNextDay = () => {
    if (viewedDateOffset < 0) {
      startTransition(() => {
        setViewedDateOffset(prev => prev + 1);
      });
    }
  };

  const completed = tasks.filter(t => t.done).length;
  const percent = Math.round((completed / tasks.length) * 100) || 0;

  const getMotivationalMessage = (percent: number) => {
    if (percent === 100) return `Luar biasa, ${userNickname}! Semua target hari ini selesai. Bangga banget! 💕`;
    if (percent >= 50) return `Keren! Separuh jalan terlewati, semangat terus ya! ✨`;
    if (percent > 0) return `Awal yang bagus, ${userNickname}. Yuk, pelan-pelan selesaikan sisanya! 🌟`;
    return `Halo ${userNickname}! Yuk mulai hari ini dengan senyuman dan semangat! 😊`;
  };

  const SYMPTOMS_LIST = [
    { id: 'cramps', emoji: '😣', label: 'Kram Perut' },
    { id: 'headache', emoji: '🤕', label: 'Sakit Kepala' },
    { id: 'fatigue', emoji: '😴', label: 'Kelelahan' },
    { id: 'mood', emoji: '😠', label: 'Mood Swing' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, minHeight: Platform.OS === 'web' ? '100%' : undefined }} className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} style={{ flex: 1 }}>
        {/* Header */}
        <View className="mb-6 pt-4 flex-row justify-between items-end border-b border-primary/20 pb-4">
          <View className="flex-1 pr-3">
            <Text className="text-3xl font-bold text-on-background">Halo, {userNickname}</Text>
            <Text className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mt-1">Gimana kabarmu hari ini?</Text>
          </View>
          <HeaderProfileButton />
        </View>

        {/* Tab Toggle Daily vs History */}
        <View className="flex-row bg-surface-variant p-1 rounded-2xl mb-6 shadow-inner">
          <TouchableOpacity 
            onPress={() => startTransition(() => setViewMode('daily'))}
            className={`flex-1 py-3 rounded-xl items-center ${
              viewMode === 'daily' ? 'bg-surface shadow-sm' : ''
            }`}
          >
            <Text className={`text-sm font-bold ${
              viewMode === 'daily' ? 'text-primary' : 'text-on-surface-variant/70'
            }`}>Harian</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => startTransition(() => setViewMode('history'))}
            className={`flex-1 py-3 rounded-xl items-center ${
              viewMode === 'history' ? 'bg-surface shadow-sm' : ''
            }`}
          >
            <Text className={`text-sm font-bold ${
              viewMode === 'history' ? 'text-primary' : 'text-on-surface-variant/70'
            }`}>📊 Histori</Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'daily' ? (
          <View className="space-y-6">
            {/* Date Switcher */}
            <View className="flex-row justify-between items-center bg-surface px-4 py-3 rounded-2xl border border-outline-variant shadow-sm mb-4">
              <TouchableOpacity 
                onPress={handlePrevDay} 
                disabled={viewedDateOffset <= -60}
                className="p-2 rounded-full"
              >
                <Text className={`text-xl font-bold ${viewedDateOffset <= -60 ? 'opacity-30' : 'text-primary'}`}>←</Text>
              </TouchableOpacity>
              
              <Text className="text-sm font-bold text-on-surface tracking-wide uppercase">
                {viewedDateOffset === 0 ? '✨ Hari Ini ✨' : viewedDateOffset === -1 ? 'Kemarin' : dateString}
              </Text>
              
              <TouchableOpacity 
                onPress={handleNextDay}
                disabled={viewedDateOffset >= 0}
                className="p-2 rounded-full"
              >
                <Text className={`text-xl font-bold ${viewedDateOffset >= 0 ? 'opacity-30' : 'text-primary'}`}>→</Text>
              </TouchableOpacity>
            </View>
            
            {/* Progress Header */}
            <View className="bg-surface rounded-[32px] p-6 shadow-sm border border-outline-variant relative overflow-hidden mb-6">
              <View className="flex-row items-center justify-between z-10">
                <View className="flex-1 pr-4">
                  <Text className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Progres Hari Ini</Text>
                  <Text className="text-2xl font-bold text-on-background mb-2">{completed} dari {tasks.length} Selesai</Text>
                  <Text className="text-sm text-on-surface-variant leading-relaxed font-medium">
                    {getMotivationalMessage(percent)}
                  </Text>
                </View>
                
                <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center">
                  <Text className="text-xl font-bold text-primary">{percent}%</Text>
                </View>
              </View>
            </View>

            {/* Daily Checklist */}
            <View className="bg-surface rounded-[32px] p-6 shadow-sm border border-outline-variant mb-6">
              <Text className="text-sm font-bold tracking-wide text-on-surface mb-6">
                🎯 Target Hari Ini
              </Text>
              
              <View className="gap-3">
                {tasks.map(task => (
                  <TouchableOpacity 
                    key={task.id} 
                    onPress={() => toggleTask(task.id)}
                    className={`flex-row items-center justify-between p-4 rounded-2xl border ${
                      task.done ? 'bg-surface-variant/50 border-outline-variant shadow-sm' : 'bg-surface border-outline-variant hover:border-primary/50'
                    }`}
                  >
                    <View className="flex-row items-center gap-4">
                      <View className={`w-12 h-12 rounded-2xl items-center justify-center bg-surface border border-outline-variant ${task.done ? 'opacity-50' : ''}`}>
                        <Text className="text-2xl">{task.emoji}</Text>
                      </View>
                      <View>
                        <Text className={`text-base font-bold ${task.done ? 'text-on-surface-variant opacity-60 line-through' : 'text-on-surface'}`}>{task.text}</Text>
                        <Text className={`text-xs font-bold uppercase tracking-wider mt-1 ${task.done ? 'text-green-500' : 'text-primary'}`}>{task.done ? 'Selesai ✓' : 'Yuk Bisa!'}</Text>
                      </View>
                    </View>
                    <View className={`w-8 h-8 rounded-full border-2 items-center justify-center ${
                      task.done ? 'border-green-500 bg-green-500' : 'border-outline-variant bg-surface'
                    }`}>
                      {task.done && <Text className="text-white font-bold text-xs">✓</Text>}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Symptoms Tracker */}
            <View className="bg-surface rounded-[32px] p-6 border border-outline-variant mb-6">
               <Text className="text-sm font-bold tracking-wide text-on-surface mb-6">
                 💝 Apa yang kamu rasakan?
               </Text>
               <View className="flex-row flex-wrap gap-3">
                 {SYMPTOMS_LIST.map(symptom => {
                   const isActive = symptoms.includes(symptom.id);
                   return (
                     <TouchableOpacity
                       key={symptom.id}
                       onPress={() => toggleSymptom(symptom.id)}
                       className={`flex-row items-center gap-2 px-4 py-3 rounded-2xl shadow-sm ${
                         isActive 
                           ? 'bg-surface border-primary border-2 text-primary' 
                           : 'bg-surface-variant text-on-surface-variant border-transparent'
                       }`}
                     >
                       <Text className="text-lg">{symptom.emoji}</Text>
                       <Text className="text-sm font-bold text-on-background">{symptom.label}</Text>
                     </TouchableOpacity>
                   );
                 })}
               </View>
            </View>

            {/* AI Recommendation Section */}
            <View className="mt-4">
              <AiRecommendationSection
                currentPhase={currentPhase}
                activityHistory={activityHistory}
                nickname={userNickname}
              />
            </View>
          </View>
        ) : (
          <View className="bg-white rounded-[32px] p-6 shadow-sm border border-outline-variant">
            <HistoryViewSafe 
              historyFilter={historyFilter} 
              setHistoryFilter={setHistoryFilter} 
              activityHistory={activityHistory} 
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
