import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SiklusioLottieLoader } from "../../components/loading/SiklusioLottieLoader";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { AiFallbackNotice } from "@/src/shared/components/AiFallbackNotice";
import type { CoachQuestionAnswer, HabitCoachMode } from "@/src/lib/habitCoachTypes";

interface ReplacementWarning {
  activeUntil?: string | null;
  message?: string | null;
}

interface Props {
  visible: boolean;
  mode: HabitCoachMode;
  loading: boolean;
  error: string | null;
  balance: number | null;
  replacementWarning?: ReplacementWarning | null;
  onClose: () => void;
  onGenerate: (answers: CoachQuestionAnswer[]) => void;
}

interface CoachStep {
  id: string;
  question: string;
  helper: string;
  placeholder: string;
  options: string[];
}

const customOption = "Isi sendiri...";

const coachSteps: CoachStep[] = [
  {
    id: "goal",
    question: "Apa fokus utama 7 hari ini?",
    helper: "Pilih tujuan yang paling terasa penting sekarang.",
    placeholder: "Tulis fokus lain yang ingin coach prioritaskan...",
    options: [
      "Energi lebih stabil",
      "Promil lebih konsisten",
      "Pikiran lebih tenang",
      "Tidur lebih rapi",
      "Nutrisi lebih teratur",
      customOption,
    ],
  },
  {
    id: "condition",
    question: "Kondisi apa yang paling perlu ditemani?",
    helper: "Coach akan menyesuaikan intensitas plan dari jawaban ini.",
    placeholder: "Tulis kondisi lain yang sedang kamu rasakan...",
    options: [
      "Badan cepat lelah",
      "Mood naik turun",
      "Cemas menunggu hasil",
      "Nyeri/tidak nyaman",
      "Jadwal padat",
      customOption,
    ],
  },
  {
    id: "constraint",
    question: "Hal apa yang perlu dihindari?",
    helper: "Batasan membantu plan tetap realistis dan tidak memberatkan.",
    placeholder: "Tulis batasan lain agar coach bisa menyesuaikan...",
    options: [
      "Olahraga berat",
      "Makanan ribet/mahal",
      "Aktivitas malam",
      "Task terlalu banyak",
      "Tidak ada batasan",
      customOption,
    ],
  },
  {
    id: "time",
    question: "Waktu paling nyaman untuk habit?",
    helper: "Pilih slot yang paling mungkin kamu jalankan.",
    placeholder: "Tulis waktu lain yang lebih cocok...",
    options: ["Pagi", "Siang", "Sore", "Malam sebelum tidur", "Fleksibel", customOption],
  },
];

export function HabitCoachSheet({
  visible,
  mode,
  loading,
  error,
  balance,
  replacementWarning = null,
  onClose,
  onGenerate,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showCustomInput, setShowCustomInput] = useState<Record<string, boolean>>({});
  const [stepIndex, setStepIndex] = useState(0);

  const creditCost = mode === "renewal" ? 60 : 50;
  const isReviewStep = stepIndex >= coachSteps.length;
  const activeStep = coachSteps[Math.min(stepIndex, coachSteps.length - 1)];
  const answeredCount = coachSteps.filter(
    (item) => (answers[item.id] || "").trim().length >= 3,
  ).length;
  const canContinue = (answers[activeStep.id] || "").trim().length >= 3;
  const canSubmit = answeredCount === coachSteps.length;

  useEffect(() => {
    if (!visible) {
      setStepIndex(0);
      setAnswers({});
      setShowCustomInput({});
    }
  }, [visible]);

  const reviewAnswers = useMemo(
    () =>
      coachSteps.map((item) => ({
        ...item,
        answer: (answers[item.id] || "").trim(),
      })),
    [answers],
  );

  const submit = () => {
    onGenerate(
      reviewAnswers.map((item) => ({
        id: item.id,
        question: item.question,
        answer: item.answer,
      })),
    );
  };

  const selectOption = (step: CoachStep, option: string) => {
    if (option === customOption) {
      setShowCustomInput((prev) => ({ ...prev, [step.id]: true }));
      setAnswers((prev) => ({ ...prev, [step.id]: prev[step.id] || "" }));
      return;
    }

    setShowCustomInput((prev) => ({ ...prev, [step.id]: false }));
    setAnswers((prev) => ({ ...prev, [step.id]: option }));
  };

  const renderProgress = () => (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {coachSteps.map((item, index) => (
          <View
            key={item.id}
            style={{
              flex: 1,
              height: 5,
              borderRadius: 999,
              backgroundColor:
                index <= Math.min(stepIndex, coachSteps.length - 1) ? "#be185d" : "#f3e8ff",
            }}
          />
        ))}
      </View>
      <Text style={{ fontSize: 11, color: "#64748b", fontWeight: "700" }}>
        {isReviewStep ? "Review jawaban" : `Langkah ${stepIndex + 1} dari ${coachSteps.length}`}
      </Text>
    </View>
  );

  const renderStep = () => {
    const selected = answers[activeStep.id] || "";
    const isCustom = showCustomInput[activeStep.id];

    return (
      <View style={{ gap: 14 }}>
        <View style={{ gap: 5 }}>
          <Text style={{ fontSize: 20, color: "#111827", fontWeight: "800" }}>
            {activeStep.question}
          </Text>
          <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 18 }}>
            {activeStep.helper}
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          {activeStep.options.map((option) => {
            const optionSelected =
              option === customOption ? isCustom : selected === option && !isCustom;

            return (
              <TouchableOpacity
                key={option}
                onPress={() => selectOption(activeStep, option)}
                activeOpacity={0.78}
                style={{
                  borderWidth: 1,
                  borderColor: optionSelected ? "#be185d" : "#e5e7eb",
                  backgroundColor: optionSelected ? "#fdf2f8" : "#ffffff",
                  borderRadius: 16,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor: optionSelected ? "#be185d" : "#cbd5e1",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {optionSelected && (
                    <View
                      style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: "#be185d" }}
                    />
                  )}
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: "#334155",
                    fontWeight: "700",
                    lineHeight: 18,
                  }}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isCustom && (
          <TextInput
            value={selected}
            onChangeText={(value) => setAnswers((prev) => ({ ...prev, [activeStep.id]: value }))}
            placeholder={activeStep.placeholder}
            placeholderTextColor="#94a3b8"
            multiline
            style={{
              minHeight: 88,
              borderWidth: 1,
              borderColor: "#e2e8f0",
              borderRadius: 16,
              padding: 12,
              color: "#111827",
              fontSize: 13,
              textAlignVertical: "top",
              backgroundColor: "#fff",
            }}
          />
        )}
      </View>
    );
  };

  const renderReview = () => (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 5 }}>
        <Text style={{ fontSize: 20, color: "#111827", fontWeight: "800" }}>
          Review sebelum generate
        </Text>
        <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 18 }}>
          Coach akan menyusun plan 7 hari mulai hari ini berdasarkan jawaban ini.
        </Text>
      </View>

      {reviewAnswers.map((item) => (
        <View
          key={item.id}
          style={{
            borderWidth: 1,
            borderColor: "#e5e7eb",
            borderRadius: 16,
            padding: 12,
            gap: 4,
            backgroundColor: "#f8fafc",
          }}
        >
          <Text
            style={{
              fontSize: 10,
              color: "#64748b",
              fontWeight: "800",
              textTransform: "uppercase",
            }}
          >
            {item.question}
          </Text>
          <Text style={{ fontSize: 13, color: "#111827", fontWeight: "700", lineHeight: 18 }}>
            {item.answer}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.45)" }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            maxHeight: "92%",
            padding: 20,
          }}
        >
          <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 22 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: "#be185d",
                    fontWeight: "800",
                    textTransform: "uppercase",
                  }}
                >
                  Habit Coach
                </Text>
                <Text style={{ fontSize: 13, color: "#64748b", fontWeight: "700", marginTop: 3 }}>
                  {mode === "renewal" ? "Buat ulang plan 7 hari" : "Generate plan 7 hari"}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} disabled={loading} style={{ padding: 8 }}>
                <FontAwesome name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {renderProgress()}

            <View
              style={{
                borderRadius: 16,
                backgroundColor: "#f8fafc",
                borderWidth: 1,
                borderColor: "#e2e8f0",
                padding: 12,
                gap: 3,
              }}
            >
              <Text style={{ fontSize: 12, color: "#334155", fontWeight: "800" }}>
                Saldo {balance === null ? "-" : balance} kredit
              </Text>
              <Text style={{ fontSize: 11, color: "#64748b", lineHeight: 16 }}>
                Plan ini memakai {creditCost} kredit setelah berhasil tersimpan.
              </Text>
            </View>

            {replacementWarning && (
              <View
                style={{
                  backgroundColor: "#fffbeb",
                  borderRadius: 16,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: "#fde68a",
                  gap: 5,
                }}
              >
                <Text style={{ color: "#92400e", fontSize: 12, fontWeight: "800" }}>
                  Plan aktif akan dibuat ulang
                </Text>
                <Text style={{ color: "#92400e", fontSize: 12, lineHeight: 18 }}>
                  {replacementWarning.message ||
                    `Kamu masih punya plan sampai ${replacementWarning.activeUntil || "-"}. Lanjutkan untuk membangun ulang plan mulai hari ini sampai 7 hari ke depan.`}
                </Text>
              </View>
            )}

            {loading ? (
              <View style={{ paddingVertical: 32, alignItems: "center" }}>
                <SiklusioLottieLoader text="Menyusun plan 7 hari terbaikmu..." size={160} />
              </View>
            ) : isReviewStep ? (
              renderReview()
            ) : (
              renderStep()
            )}

            {error && (
              <AiFallbackNotice
                featureName="Habit Coach"
                message={error}
                compact
                selectableMessage
                accentColor="#be185d"
              />
            )}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 2 }}>
              <TouchableOpacity
                onPress={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
                disabled={stepIndex === 0 || loading}
                activeOpacity={0.8}
                style={{
                  width: 96,
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: stepIndex === 0 ? "#f1f5f9" : "#f8fafc",
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                }}
              >
                <Text style={{ color: stepIndex === 0 ? "#cbd5e1" : "#475569", fontWeight: "800" }}>
                  Kembali
                </Text>
              </TouchableOpacity>

              {isReviewStep ? (
                <TouchableOpacity
                  onPress={submit}
                  disabled={!canSubmit || loading}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    backgroundColor: canSubmit ? "#be185d" : "#cbd5e1",
                    borderRadius: 16,
                    paddingVertical: 14,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  {!loading && <FontAwesome name="magic" size={13} color="#fff" />}
                  <Text style={{ color: "#fff", fontWeight: "800" }}>
                    {loading ? "Menyusun plan..." : `Gunakan ${creditCost} kredit`}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setStepIndex((prev) => Math.min(prev + 1, coachSteps.length))}
                  disabled={!canContinue || loading}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    backgroundColor: canContinue ? "#be185d" : "#cbd5e1",
                    borderRadius: 16,
                    paddingVertical: 14,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "800" }}>Lanjut</Text>
                  <FontAwesome name="chevron-right" size={12} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
