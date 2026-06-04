import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { POST_MAX_LENGTH, PhaseTag } from "../../src/lib/communityTypes";

interface ComposerModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (content: string, isAnonymous: boolean, phaseTag: PhaseTag | null) => Promise<void>;
  /** Detik cooldown sisa. 0 = boleh post. */
  cooldownLeft?: number;
}

const PHASE_OPTIONS: { value: PhaseTag | null; label: string; emoji: string }[] = [
  { value: null, label: "Tanpa tag", emoji: "✨" },
  { value: "Menstrual", label: "Menstrual", emoji: "🩸" },
  { value: "Folikular", label: "Folikular", emoji: "🌱" },
  { value: "Ovulasi", label: "Ovulasi", emoji: "💖" },
  { value: "Luteal", label: "Luteal", emoji: "🌙" },
];

export function ComposerModal({
  visible,
  onClose,
  onSubmit,
  cooldownLeft = 0,
}: ComposerModalProps) {
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [phaseTag, setPhaseTag] = useState<PhaseTag | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const remaining = POST_MAX_LENGTH - content.length;
  const isOverLimit = remaining < 0;
  const isCoolingDown = cooldownLeft > 0;
  const canSubmit = content.trim().length > 0 && !isOverLimit && !submitting && !isCoolingDown;

  const reset = () => {
    setContent("");
    setIsAnonymous(false);
    setPhaseTag(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    if (content.trim().length > 0) {
      const confirm = (proceed: () => void) => {
        if (Platform.OS === "web") {
          if (window.confirm("Buang draf ini?")) proceed();
        } else {
          Alert.alert("Buang Draf?", "Tulisanmu akan hilang.", [
            { text: "Batal", style: "cancel" },
            { text: "Buang", style: "destructive", onPress: proceed },
          ]);
        }
      };
      confirm(() => {
        reset();
        onClose();
      });
      return;
    }
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(content, isAnonymous, phaseTag);
      reset();
      onClose();
    } catch (e: any) {
      const msg = e?.message || "Gagal mengirim postingan.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Gagal", msg);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: Platform.OS === "web" ? "rgba(20, 20, 20, 0.4)" : "#fcf8fa",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: Platform.OS === "web" ? 520 : undefined,
            height: "100%",
            backgroundColor: "#fcf8fa",
            ...(Platform.OS === "web" && {
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: "rgba(251, 207, 232, 0.6)",
            }),
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingTop: 16,
              paddingHorizontal: 20,
              paddingBottom: 12,
              backgroundColor: "#fff",
              borderBottomWidth: 1,
              borderBottomColor: "#f1e6eb",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity onPress={handleClose} disabled={submitting}>
              <Text style={{ fontSize: 14, color: "#64748b", fontWeight: "bold" }}>Batal</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1e1b20" }}>Tulis Cerita</Text>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 16,
                backgroundColor: canSubmit ? "#ec4899" : "#f1e6eb",
              }}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "bold",
                    color: canSubmit ? "#fff" : "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  {isCoolingDown ? `Tunggu ${cooldownLeft}s` : "Kirim"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}>
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "#f1e6eb",
                padding: 16,
                minHeight: 180,
              }}
            >
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder="Apa yang ingin kamu bagikan? Cerita, dukungan, atau pertanyaan…"
                placeholderTextColor="#94a3b8"
                multiline
                textAlignVertical="top"
                autoFocus
                style={{
                  fontSize: 15,
                  lineHeight: 22,
                  color: "#1e1b20",
                  minHeight: 140,
                }}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  marginTop: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "bold",
                    color: isOverLimit ? "#ef4444" : "#94a3b8",
                  }}
                >
                  {remaining}
                </Text>
              </View>
            </View>

            {/* Anonymous toggle */}
            <TouchableOpacity
              onPress={() => setIsAnonymous((v) => !v)}
              style={{
                backgroundColor: "#fff",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "#f1e6eb",
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: isAnonymous ? "#fce7f3" : "#f8fafc",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FontAwesome
                  name="user-secret"
                  size={16}
                  color={isAnonymous ? "#ec4899" : "#94a3b8"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "bold", color: "#1e1b20" }}>
                  Posting sebagai Anonim
                </Text>
                <Text style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  {isAnonymous
                    ? "Nickname kamu disembunyikan dari pengguna lain."
                    : "Nickname kamu akan terlihat oleh pengguna lain."}
                </Text>
              </View>
              <View
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: isAnonymous ? "#ec4899" : "#e2e8f0",
                  padding: 2,
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: "#fff",
                    alignSelf: isAnonymous ? "flex-end" : "flex-start",
                  }}
                />
              </View>
            </TouchableOpacity>

            {/* Phase tag selector */}
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "#f1e6eb",
                padding: 14,
                gap: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "bold",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Tag Fase (opsional)
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {PHASE_OPTIONS.map((opt) => {
                  const sel = phaseTag === opt.value;
                  return (
                    <TouchableOpacity
                      key={String(opt.value)}
                      onPress={() => setPhaseTag(opt.value)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: 14,
                        backgroundColor: sel ? "#fce7f3" : "#f8fafc",
                        borderWidth: 1,
                        borderColor: sel ? "#ec4899" : "#f1e6eb",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text style={{ fontSize: 13 }}>{opt.emoji}</Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "bold",
                          color: sel ? "#ec4899" : "#64748b",
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
