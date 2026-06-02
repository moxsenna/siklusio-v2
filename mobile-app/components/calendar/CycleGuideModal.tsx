import React, { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { AiFallbackNotice } from '../common/AiFallbackNotice';
import { apiGetJson, apiPostJson } from '../../src/lib/api';
import { extractAiFallbackInput, type AiFallbackInput } from '../../src/lib/aiFallback';
import type { CycleGuidePreview } from '../../src/lib/cycleGuideSummary';

interface Props {
  visible: boolean;
  preview: CycleGuidePreview;
  payload: Record<string, unknown>;
  onClose: () => void;
  onOpenHabitCoach: () => void;
}

export function CycleGuideModal({ visible, preview, payload, onClose, onOpenHabitCoach }: Props) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AiFallbackInput | null>(null);

  React.useEffect(() => {
    let mounted = true;
    if (visible && payload?.generatedForDate) {
      setLoading(true);
      apiGetJson<any>(`/api/cycle-guide/today?date=${payload.generatedForDate}`)
        .then((json) => {
          if (mounted && json.guide?.result) {
            setResult(json.guide.result);
          }
        })
        .catch((err) => {
          console.warn('[CycleGuideModal] Failed to fetch existing guide:', err);
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    } else if (!visible) {
      // Clear state when modal closes to ensure fresh state next time
      setResult(null);
      setError(null);
    }
    return () => {
      mounted = false;
    };
  }, [visible, payload?.generatedForDate]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiPostJson<any>('/api/cycle-guide/generate', payload);
      setResult(json.result);
    } catch (err: any) {
      setError(extractAiFallbackInput(err, 'Gagal membuat panduan personal.', 'Panduan Siklus'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.45)' }}>
        <View
          style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: '86%',
            padding: 22,
          }}
        >
          <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={{ fontSize: 11, color: '#db2777', fontWeight: '800', textTransform: 'uppercase' }}>
                  Panduan Siklus
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 4 }}>
                  {preview.title}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
                <FontAwesome name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20 }}>
              {preview.summary}
            </Text>

            <View style={{ backgroundColor: '#f8fafc', borderRadius: 16, padding: 14, gap: 6 }}>
              <Text style={{ fontSize: 12, color: '#111827', fontWeight: '800' }}>
                Fokus minggu ini
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 18 }}>
                {preview.suggestedHabitFocus}
              </Text>
            </View>

            {!result && (
              <TouchableOpacity
                onPress={generate}
                disabled={loading}
                activeOpacity={0.85}
                style={{
                  backgroundColor: '#db2777',
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <FontAwesome name="magic" size={13} color="#fff" />}
                <Text style={{ color: '#fff', fontWeight: '800' }}>
                  Buat panduan personal - 40 kredit
                </Text>
              </TouchableOpacity>
            )}

            {error && <AiFallbackNotice {...error} compact accentColor="#db2777" />}

            {result && (
              <View style={{ gap: 12 }}>
                <Text style={{ fontSize: 14, color: '#111827', lineHeight: 21 }}>
                  {result.summary}
                </Text>

                {result.bodySignals?.map((item: string, index: number) => (
                  <View key={`signal-${index}`} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <Text style={{ color: '#db2777', fontWeight: '800' }}>-</Text>
                    <Text style={{ flex: 1, fontSize: 13, color: '#475569', lineHeight: 20 }}>
                      {item}
                    </Text>
                  </View>
                ))}

                {result.importantDates?.map((item: string, index: number) => (
                  <View key={`date-${index}`} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <Text style={{ color: '#db2777', fontWeight: '800' }}>-</Text>
                    <Text style={{ flex: 1, fontSize: 13, color: '#475569', lineHeight: 20 }}>
                      {item}
                    </Text>
                  </View>
                ))}

                <View style={{ backgroundColor: '#fdf2f8', borderRadius: 16, padding: 14 }}>
                  <Text style={{ fontSize: 13, color: '#831843', fontWeight: '800', lineHeight: 19 }}>
                    {result.focusThisWeek}
                  </Text>
                </View>

                <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 18 }}>
                  {result.disclaimer}
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={onOpenHabitCoach}
              activeOpacity={0.85}
              style={{
                borderWidth: 1,
                borderColor: '#db2777',
                borderRadius: 16,
                paddingVertical: 13,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#db2777', fontWeight: '800' }}>
                Sesuaikan habit minggu ini
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
