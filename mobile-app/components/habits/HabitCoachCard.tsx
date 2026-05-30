import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { HabitCoachPlan } from '../../src/lib/habitCoachTypes';

interface Props {
  plan: HabitCoachPlan | null;
  balance: number | null;
  loading?: boolean;
  onOpen: () => void;
}

export function HabitCoachCard({ plan, balance, loading = false, onOpen }: Props) {
  const hasPlan = Boolean(plan);
  const creditCost = hasPlan ? 60 : 50;

  return (
    <View
      style={{
        backgroundColor: '#f8fafc',
        borderRadius: 28,
        padding: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            backgroundColor: '#ede9fe',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FontAwesome name="compass" size={18} color="#6d28d9" />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 11, color: '#6d28d9', fontWeight: '800', textTransform: 'uppercase' }}>
            Habit Coach
          </Text>
          <Text style={{ fontSize: 17, color: '#111827', fontWeight: '800' }}>
            {hasPlan ? 'Rencana 7 hari aktif' : 'Buat rencana 7 hari'}
          </Text>
          <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 18 }}>
            {hasPlan
              ? plan?.coachSummary || 'Coach menyiapkan target kecil yang bisa kamu ceklis setiap hari.'
              : 'Diskusi singkat, lalu coach susun habit yang realistis untuk minggu ini.'}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: '#94a3b8', fontWeight: '700' }}>
            Saldo AI: {balance === null ? '-' : balance} kredit
          </Text>
          <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            {creditCost} kredit
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
            backgroundColor: '#6d28d9',
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
            {hasPlan ? 'Review' : 'Mulai'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
