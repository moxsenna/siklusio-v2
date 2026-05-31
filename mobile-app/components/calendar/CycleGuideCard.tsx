import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { CycleGuidePreview } from '../../src/lib/cycleGuideSummary';
import { useTheme } from '../../src/context/ThemeContext';

interface Props {
  preview: CycleGuidePreview;
  onOpen: () => void;
}

export function CycleGuideCard({ preview, onOpen }: Props) {
  const { colorScheme } = useTheme();
  const isDark = colorScheme === 'dark';
  const accentColor = isDark ? '#ec4899' : '#db2777';

  return (
    <TouchableOpacity
      onPress={onOpen}
      activeOpacity={0.9}
      className="mt-6 bg-pink-50 dark:bg-[#1c0f24] border border-pink-200 dark:border-[#ec4899]/15 rounded-[28px] p-[18px] flex-row items-center gap-[14px]"
    >
      <View
        className="w-[46px] h-[46px] rounded-[16px] bg-pink-100 dark:bg-purple-950/40 items-center justify-center"
      >
        <FontAwesome name="calendar-check-o" size={18} color={accentColor} />
      </View>

      <View className="flex-1 gap-1">
        <Text 
          style={{ color: accentColor }}
          className="text-[11px] font-extrabold uppercase"
        >
          Panduan Siklus
        </Text>
        <Text 
          style={{ color: isDark ? '#fdf2f8' : '#111827' }} 
          className="text-base font-extrabold"
        >
          {preview.title}
        </Text>
        <Text 
          style={{ color: isDark ? '#fbcfe8' : '#475569' }} 
          className="text-xs leading-[18px]"
        >
          {preview.summary}
        </Text>
        <Text 
          style={{ color: accentColor }} 
          className="text-[11px] font-bold"
        >
          Akurasi: {preview.confidenceLabel}
        </Text>
      </View>

      <FontAwesome name="chevron-right" size={13} color={accentColor} />
    </TouchableOpacity>
  );
}
