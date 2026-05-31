import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { HabitCoachPlan } from '../../src/lib/habitCoachTypes';
import { useTheme } from '../../src/context/ThemeContext';

interface Props {
  plan: HabitCoachPlan | null;
  balance: number | null;
  loading?: boolean;
  todayFocus?: string | null;
  todayTaskCount?: number;
  todayDayNumber?: number | null;
  onOpen: () => void;
}

export function HabitCoachCard({
  plan,
  balance,
  loading = false,
  todayFocus = null,
  todayTaskCount = 0,
  todayDayNumber = null,
  onOpen,
}: Props) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const hasPlan = Boolean(plan);
  const creditCost = hasPlan ? 60 : 50;
  const ctaLabel = hasPlan ? 'Buat Ulang' : 'Generate';
  const brandColor = isDark ? '#ec4899' : '#be185d';

  return (
    <View
      className="bg-white dark:bg-[#1c0f24] rounded-[24px] padding-[20px] border border-pink-200 dark:border-[#ec4899]/15 gap-4"
      style={{ padding: 20 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View
          className="w-11 h-11 rounded-[16px] bg-pink-100 dark:bg-purple-950/40 items-center justify-center"
        >
          <FontAwesome name="compass" size={18} color={brandColor} />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text 
            style={{ color: brandColor }} 
            className="text-[11px] font-extrabold uppercase"
          >
            Habit Coach
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text 
              style={{ color: isDark ? '#fdf2f8' : '#111827' }} 
              className="text-lg font-extrabold"
            >
              {hasPlan ? 'Rencana mingguan aktif' : 'Buat rencana 7 hari'}
            </Text>
            {hasPlan && (
              <View
                className="px-2 py-0.5 rounded-full bg-pink-50 dark:bg-purple-950/40 border border-pink-300 dark:border-[#ec4899]/30"
              >
                <Text style={{ color: brandColor }} className="text-[10px] font-extrabold">AKTIF</Text>
              </View>
            )}
          </View>
          <Text 
             numberOfLines={3} 
             style={{ color: isDark ? '#fbcfe8' : '#64748b' }} 
             className="text-xs leading-[18px]"
          >
            {hasPlan
              ? plan?.coachSummary || 'Coach menyiapkan target kecil yang bisa kamu ceklis setiap hari.'
              : 'Diskusi singkat, lalu coach susun habit realistis dari hari ini sampai 7 hari ke depan.'}
          </Text>
        </View>
      </View>

      {hasPlan && (
        <View
          className="bg-pink-50/30 dark:bg-purple-950/20 rounded-[16px] border border-pink-200/50 dark:border-[#ec4899]/10 p-3 gap-1"
          style={{ padding: 12 }}
        >
          <Text 
            style={{ color: isDark ? '#ec4899' : '#64748b' }} 
            className="text-[10px] font-bold uppercase"
          >
            {todayDayNumber ? `Hari ${todayDayNumber} dari 7` : 'Plan aktif'}
          </Text>
          <Text 
            style={{ color: isDark ? '#fdf2f8' : '#0f172a' }} 
            className="text-sm font-bold leading-5 mt-0.5"
          >
            {todayFocus || 'Review plan hari ini'}
          </Text>
          <Text 
            style={{ color: isDark ? '#fbcfe8' : '#64748b' }} 
            className="text-xs leading-[18px] mt-0.5"
          >
            {plan?.weekStart} sampai {plan?.weekEnd} - {todayTaskCount} target kecil hari ini.
          </Text>
        </View>
      )}

      {!hasPlan && (
        <Text style={{ color: isDark ? '#fbcfe8' : '#94a3b8' }} className="text-[11px] mt-[-4px]">
          Belum ada plan aktif untuk hari ini.
        </Text>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: isDark ? '#fdf2f8' : '#64748b' }} className="text-[11px] font-semibold">
            Saldo AI: {balance === null ? '-' : balance} kredit
          </Text>
          <Text style={{ color: isDark ? '#fbcfe8' : '#94a3b8' }} className="text-[11px] mt-0.5">
            {creditCost} kredit - {hasPlan ? 'rebuild 7 hari' : 'plan baru'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onOpen}
          disabled={loading}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: brandColor,
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 11,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <FontAwesome name={hasPlan ? 'refresh' : 'magic'} size={13} color="#fff" />
          )}
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
            {ctaLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
