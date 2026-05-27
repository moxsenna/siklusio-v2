import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useCycle } from '../../src/context/CycleContext';
import { format } from 'date-fns';
import { parseLocalDate } from '../../src/lib/dateUtils';
import { apiPostJson } from '../../src/lib/api';

interface AiReportModalProps {
  onClose: () => void;
}

export function AiReportModal({ onClose }: AiReportModalProps) {
  const { currentPhase, cycleDay, daysToNextPeriod, activityHistory, fertileWindowStart, fertileWindowEnd } = useCycle();
  
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const recentHistoryKeys = Object.keys(activityHistory)
        .sort((a,b) => parseLocalDate(b).getTime() - parseLocalDate(a).getTime())
        .slice(0, 14);
      const recentHistory: any = {};
      recentHistoryKeys.forEach(k => {
        recentHistory[k] = activityHistory[k];
      });

      const payload = {
        phase: currentPhase,
        cycleDay,
        daysToNextPeriod,
        fertilityWindow: {
          start: fertileWindowStart ? format(fertileWindowStart, 'yyyy-MM-dd') : '',
          end: fertileWindowEnd ? format(fertileWindowEnd, 'yyyy-MM-dd') : ''
        },
        cycleData: recentHistory
      };

      const data = await apiPostJson<any>('/api/generate-cycle-report', payload);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan menghubungi server lokal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="absolute inset-0 z-50 justify-end">
      {/* Backdrop */}
      <TouchableOpacity 
        activeOpacity={1}
        onPress={onClose}
        className="absolute inset-0 bg-black/40"
      />
      
      {/* Bottom Sheet */}
      <View className="relative bg-background rounded-t-[32px] w-full max-w-md mx-auto p-[24px] pb-[40px] border border-outline-variant shadow-lg max-h-[85vh]">
        <View className="flex-row justify-between items-center mb-[24px] border-b border-primary/10 pb-4">
           <Text className="text-sm font-bold uppercase tracking-widest text-primary">
             ✨ Analisis Siklus AI
           </Text>
           <TouchableOpacity 
             onPress={onClose}
             className="w-8 h-8 rounded-full bg-surface-variant items-center justify-center"
           >
             <Text className="text-sm font-bold text-on-surface-variant">✕</Text>
           </TouchableOpacity>
        </View>
        
        <ScrollView className="mb-[24px]">
          {!report && !loading && (
            <View className="items-center justify-center py-8 gap-4">
              <View className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-2">
                <Text className="text-3xl">📊</Text>
              </View>
              <Text className="text-xl font-bold text-on-background">Dapatkan Analisis Mendalam</Text>
              <Text className="text-sm text-on-surface-variant text-center opacity-80 max-w-[280px]">
                AI cerdas kami akan menganalisis posisi siklus Anda saat ini dan memberikan wawasan khusus yang dipersonalisasi.
              </Text>
              
              {error && (
                <View className="text-xs bg-red-50 p-3 rounded-xl mt-2 w-full border border-red-200">
                  <Text className="text-red-700 text-center">{error}</Text>
                </View>
              )}

              <TouchableOpacity 
                onPress={generateReport}
                className="w-full mt-6 bg-primary py-[16px] rounded-[16px] items-center justify-center shadow-md active:scale-95"
              >
                <Text className="text-on-primary font-bold uppercase tracking-wider text-xs">
                  ✨ Minta Analisis AI
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {loading && (
            <View className="items-center justify-center py-[48px] gap-4">
               <ActivityIndicator size="large" color="#ec4899" />
               <Text className="text-[10px] font-bold uppercase tracking-widest opacity-60 text-on-background">
                 Menghitung Wawasan...
               </Text>
            </View>
          )}

          {report && !loading && (
            <View className="gap-6 pb-6">
              <View className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
                <Text className="text-sm font-medium leading-relaxed text-on-background">
                  {report.summary}
                </Text>
              </View>

              <View>
                <Text className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                  Apa yang Terjadi di Tubuh Anda?
                </Text>
                {report.bodyInsights?.map((insight: string, idx: number) => (
                  <View key={idx} className="flex-row gap-3 items-start mb-2">
                    <Text className="text-primary mt-0.5">•</Text>
                    <Text className="text-sm text-on-background flex-1 leading-relaxed">{insight}</Text>
                  </View>
                ))}
              </View>

              <View className="bg-surface rounded-2xl p-5 border border-outline-variant">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">
                  Rencana Aksi Anda
                </Text>
                {report.actionPlan?.map((plan: string, idx: number) => (
                  <View key={idx} className="flex-row gap-3 items-start mb-3">
                    <View className="w-5 h-5 rounded-full bg-primary/20 text-primary items-center justify-center shrink-0 mt-0.5">
                      <Text className="text-xs font-bold text-primary">{idx + 1}</Text>
                    </View>
                    <Text className="text-sm text-on-background flex-1 leading-relaxed">{plan}</Text>
                  </View>
                ))}
              </View>

              <View className="items-center pt-2">
                <Text className="italic text-sm text-primary/80 text-center font-bold">
                  "{report.encouragement}"
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}
