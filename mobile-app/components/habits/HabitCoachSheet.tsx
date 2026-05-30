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
    placeholder: 'Contoh: lebih konsisten promil, energi lebih stabil',
  },
  {
    id: 'time',
    question: 'Waktu yang paling realistis',
    placeholder: 'Contoh: pagi 10 menit, malam setelah makan',
  },
  {
    id: 'constraint',
    question: 'Hal yang perlu coach hindari',
    placeholder: 'Contoh: olahraga berat, masakan ribet, jadwal terlalu padat',
  },
];

const renewalQuestions = [
  {
    id: 'last_week',
    question: 'Yang terasa paling membantu',
    placeholder: 'Contoh: minum air lebih mudah, jalan santai enak',
  },
  {
    id: 'barrier',
    question: 'Yang paling sulit dijalankan',
    placeholder: 'Contoh: lupa sore hari, badan cepat lelah',
  },
  {
    id: 'next_focus',
    question: 'Fokus minggu depan',
    placeholder: 'Contoh: tidur lebih rapi, makan protein lebih konsisten',
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
            maxHeight: '88%',
            padding: 22,
          }}
        >
          <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
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

            {questions.map((item) => (
              <View key={item.id} style={{ gap: 7 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155' }}>{item.question}</Text>
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
                  }}
                />
              </View>
            ))}

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
