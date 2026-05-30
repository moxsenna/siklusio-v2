import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { CoachQuestionAnswer, HabitCoachMode } from '../../src/lib/habitCoachTypes';

interface Props {
  visible: boolean;
  mode: HabitCoachMode;
  loading: boolean;
  error: string | null;
  balance: number | null;
  onClose: () => void;
  onGenerate: (answers: CoachQuestionAnswer[]) => void;
}

const initialQuestions = [
  {
    id: 'goal',
    question: 'Target utama minggu ini',
    placeholder: 'Ketik target kustom Anda...',
    options: [
      'Lebih konsisten promil',
      'Energi lebih stabil & tidak lelah',
      'Kurangi stres & pikiran rileks',
      'Olahraga rutin & nutrisi seimbang',
      'Isi sendiri...',
    ],
  },
  {
    id: 'time',
    question: 'Waktu yang paling realistis',
    placeholder: 'Ketik waktu kustom Anda...',
    options: [
      'Pagi hari (10-15 menit)',
      'Sore hari setelah beraktivitas',
      'Malam hari sebelum tidur',
      'Kapan saja di sela waktu luang',
      'Isi sendiri...',
    ],
  },
  {
    id: 'constraint',
    question: 'Hal yang perlu coach hindari',
    placeholder: 'Ketik batasan kustom Anda...',
    options: [
      'Olahraga berat/terlalu lelah',
      'Resep masakan ribet/mahal',
      'Jadwal aktivitas terlalu padat',
      'Tidak ada batasan khusus',
      'Isi sendiri...',
    ],
  },
];

const renewalQuestions = [
  {
    id: 'last_week',
    question: 'Yang terasa paling membantu',
    placeholder: 'Ketik ulasan kustom Anda...',
    options: [
      'Minum air lebih mudah & teratur',
      'Jalan santai terasa sangat menyegarkan',
      'Tidur lebih rapi & berkualitas',
      'Nutrisi promil lebih konsisten',
      'Isi sendiri...',
    ],
  },
  {
    id: 'barrier',
    question: 'Yang paling sulit dijalankan',
    placeholder: 'Ketik kendala kustom Anda...',
    options: [
      'Sering lupa di sore/malam hari',
      'Badan cepat lelah & kurang motivasi',
      'Jadwal harian mendadak terlalu sibuk',
      'Semua berjalan lancar tanpa hambatan',
      'Isi sendiri...',
    ],
  },
  {
    id: 'next_focus',
    question: 'Fokus minggu depan',
    placeholder: 'Ketik fokus kustom Anda...',
    options: [
      'Pola & kualitas tidur lebih rapi',
      'Konsumsi protein & nutrisi seimbang',
      'Olahraga ringan lebih teratur',
      'Mengurangi kafein & gula berlebih',
      'Isi sendiri...',
    ],
  },
];

export function HabitCoachSheet({
  visible,
  mode,
  loading,
  error,
  balance,
  onClose,
  onGenerate,
}: Props) {
  const questions = useMemo(() => (mode === 'renewal' ? renewalQuestions : initialQuestions), [mode]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showCustomInput, setShowCustomInput] = useState<Record<string, boolean>>({});
  
  const creditCost = mode === 'renewal' ? 60 : 50;
  const canSubmit = questions.every((item) => (answers[item.id] || '').trim().length >= 3);

  const submit = () => {
    onGenerate(
      questions.map((item) => ({
        id: item.id,
        question: item.question,
        answer: (answers[item.id] || '').trim(),
      }))
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
      >
        <View
          style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: '90%',
            padding: 22,
          }}
        >
          <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text style={{ fontSize: 11, color: '#6d28d9', fontWeight: '800', textTransform: 'uppercase' }}>
                  Habit Coach
                </Text>
                <Text style={{ fontSize: 20, color: '#111827', fontWeight: '800', marginTop: 4 }}>
                  {mode === 'renewal' ? 'Review minggu lalu' : 'Diskusi singkat'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
                <FontAwesome name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 18 }}>
              Saldo {balance === null ? '-' : balance} kredit. Plan ini memakai {creditCost} kredit setelah berhasil tersimpan.
            </Text>

            {questions.map((item) => {
              const selectedOption = item.options.find((opt) => answers[item.id] === opt && opt !== 'Isi sendiri...');
              const isCustom = showCustomInput[item.id] || (!selectedOption && answers[item.id] !== undefined && answers[item.id] !== '');

              return (
                <View key={item.id} style={{ gap: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#334155' }}>
                    {item.question}
                  </Text>
                  
                  {/* Options Chips Selection */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 2 }}>
                    {item.options.map((opt) => {
                      const isSelected = (opt === 'Isi sendiri...' && isCustom) || (answers[item.id] === opt && !isCustom);
                      
                      return (
                        <TouchableOpacity
                          key={opt}
                          onPress={() => {
                            if (opt === 'Isi sendiri...') {
                              setShowCustomInput((prev) => ({ ...prev, [item.id]: true }));
                              setAnswers((prev) => ({
                                ...prev,
                                [item.id]: answers[item.id] === selectedOption ? '' : prev[item.id] || '',
                              }));
                            } else {
                              setShowCustomInput((prev) => ({ ...prev, [item.id]: false }));
                              setAnswers((prev) => ({ ...prev, [item.id]: opt }));
                            }
                          }}
                          activeOpacity={0.7}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: isSelected ? '#6d28d9' : '#e2e8f0',
                            backgroundColor: isSelected ? '#f5f3ff' : '#f8fafc',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: isSelected ? '700' : '500',
                              color: isSelected ? '#6d28d9' : '#475569',
                            }}
                          >
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Render Custom TextInput if 'Isi sendiri...' is selected or typed custom */}
                  {isCustom && (
                    <TextInput
                      value={answers[item.id] || ''}
                      onChangeText={(value) => setAnswers((prev) => ({ ...prev, [item.id]: value }))}
                      placeholder={item.placeholder}
                      placeholderTextColor="#94a3b8"
                      multiline
                      style={{
                        minHeight: 74,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        borderRadius: 16,
                        padding: 12,
                        color: '#111827',
                        fontSize: 13,
                        textAlignVertical: 'top',
                        backgroundColor: '#fff',
                      }}
                    />
                  )}
                </View>
              );
            })}

            {error && (
              <View style={{ backgroundColor: '#fef2f2', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#fee2e2' }}>
                <Text style={{ color: '#b91c1c', fontSize: 12, fontWeight: '700' }}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={submit}
              disabled={!canSubmit || loading}
              activeOpacity={0.85}
              style={{
                backgroundColor: canSubmit ? '#6d28d9' : '#cbd5e1',
                borderRadius: 16,
                paddingVertical: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                marginTop: 8,
              }}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <FontAwesome name="check" size={13} color="#fff" />}
              <Text style={{ color: '#fff', fontWeight: '800' }}>
                Gunakan {creditCost} kredit
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
