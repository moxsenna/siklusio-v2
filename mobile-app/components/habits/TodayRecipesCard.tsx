import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useTheme } from '../../src/context/ThemeContext';

interface Props {
  balance: number | null;
  loading?: boolean;
  onOpen: () => void;
}

export function TodayRecipesCard({ balance, loading = false, onOpen }: Props) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const brandColor = isDark ? '#4ade80' : '#15803d';

  return (
    <View
      style={{
        backgroundColor: isDark ? '#1c0f24' : '#ffffff',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(74, 222, 128, 0.15)' : '#bbf7d0',
        gap: 16,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            backgroundColor: isDark ? 'rgba(21, 128, 61, 0.2)' : '#dcfce7',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FontAwesome name="cutlery" size={18} color={brandColor} />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 11, color: brandColor, fontWeight: '800', textTransform: 'uppercase' }}>
            Resep Hari Ini
          </Text>
          <Text style={{ fontSize: 18, color: isDark ? '#fdf2f8' : '#111827', fontWeight: '800' }}>
            2 resep sesuai fase siklus
          </Text>
          <Text numberOfLines={3} style={{ fontSize: 12, color: isDark ? '#fbcfe8' : '#64748b', lineHeight: 18 }}>
            Menu sederhana dengan bahan lokal yang mudah dicari.
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, color: isDark ? '#fdf2f8' : '#64748b', fontWeight: '700' }}>
            Saldo AI: {balance === null ? '-' : balance} kredit
          </Text>
          <Text style={{ fontSize: 11, color: isDark ? '#fbcfe8' : '#94a3b8', marginTop: 2 }}>
            15 kredit saat membuat hasil baru
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
            backgroundColor: isDark ? '#166534' : '#15803d',
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 11,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <FontAwesome name="magic" size={13} color="#fff" />
          )}
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
            Buka
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
