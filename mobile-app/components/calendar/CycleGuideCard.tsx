import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { CycleGuidePreview } from '../../src/lib/cycleGuideSummary';

interface Props {
  preview: CycleGuidePreview;
  onOpen: () => void;
}

export function CycleGuideCard({ preview, onOpen }: Props) {
  return (
    <TouchableOpacity
      onPress={onOpen}
      activeOpacity={0.9}
      style={{
        marginTop: 24,
        backgroundColor: '#fdf2f8',
        borderWidth: 1,
        borderColor: '#fbcfe8',
        borderRadius: 28,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 16,
          backgroundColor: '#fce7f3',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <FontAwesome name="calendar-check-o" size={18} color="#db2777" />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 11, color: '#db2777', fontWeight: '800', textTransform: 'uppercase' }}>
          Panduan Siklus
        </Text>
        <Text style={{ fontSize: 16, color: '#111827', fontWeight: '800' }}>
          {preview.title}
        </Text>
        <Text style={{ fontSize: 12, color: '#475569', lineHeight: 18 }}>
          {preview.summary}
        </Text>
        <Text style={{ fontSize: 11, color: '#db2777', fontWeight: '700' }}>
          Akurasi: {preview.confidenceLabel}
        </Text>
      </View>

      <FontAwesome name="chevron-right" size={13} color="#db2777" />
    </TouchableOpacity>
  );
}
