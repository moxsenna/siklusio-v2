import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface ReportModalProps {
  visible: boolean;
  targetId: string | null;
  targetType: 'post' | 'comment';
  onClose: () => void;
  onSubmit: (
    targetType: 'post' | 'comment',
    targetId: string,
    reason: string
  ) => Promise<void>;
}

const COMMON_REASONS = [
  'Konten tidak pantas',
  'Spam atau iklan',
  'Misinformasi medis',
  'Menyerang individu',
  'Lainnya',
];

export function ReportModal({
  visible,
  targetId,
  targetType,
  onClose,
  onSubmit,
}: ReportModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelected(null);
      setCustomReason('');
      setSubmitting(false);
    }
  }, [visible]);

  const reason =
    selected === 'Lainnya' ? customReason.trim() : selected ?? '';
  const canSubmit = !!targetId && !!selected && (selected !== 'Lainnya' || customReason.trim().length > 0) && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !targetId) return;
    setSubmitting(true);
    try {
      await onSubmit(targetType, targetId, reason);
      const okMsg = 'Laporan terkirim. Tim moderator akan mereview.';
      if (Platform.OS === 'web') window.alert(okMsg);
      else Alert.alert('Terkirim', okMsg);
      onClose();
    } catch (e: any) {
      const msg = e?.message || 'Gagal mengirim laporan.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Gagal', msg);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.4)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 24,
            padding: 20,
            width: '100%',
            maxWidth: 380,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: '#fef2f2',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FontAwesome name="flag" size={16} color="#ef4444" />
            </View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1e1b20' }}>
              Laporkan {targetType === 'post' ? 'Postingan' : 'Komentar'}
            </Text>
          </View>

          <Text style={{ fontSize: 12, color: '#64748b', lineHeight: 18 }}>
            Pilih alasan pelaporan. Jika 10 orang melaporkan, postingan otomatis
            disembunyikan untuk direview admin.
          </Text>

          <View style={{ gap: 6 }}>
            {COMMON_REASONS.map((r) => {
              const sel = selected === r;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => setSelected(r)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor: sel ? '#fce7f3' : '#f8fafc',
                    borderWidth: 1,
                    borderColor: sel ? '#ec4899' : '#f1e6eb',
                  }}
                >
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 8,
                      borderWidth: 2,
                      borderColor: sel ? '#ec4899' : '#cbd5e1',
                      backgroundColor: sel ? '#ec4899' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {sel && <FontAwesome name="check" size={8} color="#fff" />}
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      color: sel ? '#ec4899' : '#1e1b20',
                      fontWeight: sel ? 'bold' : '500',
                    }}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selected === 'Lainnya' && (
            <TextInput
              value={customReason}
              onChangeText={setCustomReason}
              placeholder="Tulis alasan…"
              placeholderTextColor="#94a3b8"
              multiline
              style={{
                borderWidth: 1,
                borderColor: '#f1e6eb',
                borderRadius: 12,
                padding: 12,
                fontSize: 13,
                color: '#1e1b20',
                minHeight: 60,
                textAlignVertical: 'top',
                backgroundColor: '#f8fafc',
              }}
            />
          )}

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <TouchableOpacity
              onPress={onClose}
              disabled={submitting}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 14,
                backgroundColor: '#f8fafc',
                borderWidth: 1,
                borderColor: '#f1e6eb',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#64748b' }}>
                Batal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 14,
                backgroundColor: canSubmit ? '#ef4444' : '#fecaca',
                alignItems: 'center',
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#fff' }}>
                  Kirim Laporan
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
