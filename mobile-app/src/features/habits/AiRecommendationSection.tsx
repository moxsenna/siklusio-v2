import React, { useState } from "react";
import { View, Text, TouchableOpacity, Platform, Alert } from "react-native";
import { SiklusioLottieLoader } from "../../components/loading/SiklusioLottieLoader";
import { format, subDays } from "date-fns";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { AiFallbackNotice } from "@/src/shared/components/AiFallbackNotice";
import { apiPostJson } from "@/src/lib/api";
import {
  buildAiFallbackCopy,
  extractAiFallbackInput,
  type AiFallbackInput,
} from "@/src/lib/aiFallback";

interface WeeklyDayData {
  date: string;
  tasks: { text: string; done: boolean }[];
  symptoms: string[];
}

interface AiInsightResult {
  summary: string;
  symptomAnalysis: string;
  tips: string[];
  motivation: string;
}

interface Props {
  currentPhase: string;
  activityHistory: Record<string, any>;
  nickname: string;
}

export function AiRecommendationSection({ currentPhase, activityHistory, nickname }: Props) {
  const [result, setResult] = useState<AiInsightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AiFallbackInput | null>(null);

  const collectWeeklyData = (): WeeklyDayData[] => {
    const data: WeeklyDayData[] = [];
    for (let i = 0; i < 7; i++) {
      const d = subDays(new Date(), i);
      const key = format(d, "yyyy-MM-dd");
      const record = activityHistory[key];
      data.push({
        date: key,
        tasks: (record?.tasks || []).map((t: any) => ({
          text: t.text || t.emoji || "",
          done: Boolean(t.done),
        })),
        symptoms: record?.symptoms || [],
      });
    }
    return data;
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const weeklyData = collectWeeklyData();
      const json = await apiPostJson<AiInsightResult>("/api/generate-habits-insight", {
        weeklyData,
        currentPhase,
        nickname,
      });
      setResult(json);
    } catch (e: any) {
      const fallback = extractAiFallbackInput(
        e,
        "Gagal menghasilkan insight.",
        "Insight AI Mingguan",
      );
      setError(fallback);
      if (Platform.OS === "web") {
        // silent, shown in UI
      } else {
        Alert.alert("Gagal", buildAiFallbackCopy(fallback).message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Belum pernah generate — tampilkan tombol
  if (!result && !loading && !error) {
    return (
      <TouchableOpacity
        onPress={handleGenerate}
        activeOpacity={0.8}
        style={{
          backgroundColor: "#eef2ff",
          borderRadius: 24,
          padding: 20,
          borderWidth: 1,
          borderColor: "#e0e7ff",
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            backgroundColor: "#c7d2fe",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FontAwesome name="magic" size={20} color="#4f46e5" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "bold",
              color: "#312e81",
              marginBottom: 2,
            }}
          >
            ✨ Minta Insight AI
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: "#6366f1",
              lineHeight: 17,
            }}
          >
            Analisis aktivitas & gejala 7 hari terakhirmu untuk saran personal.
          </Text>
        </View>
        <FontAwesome name="chevron-right" size={14} color="#a5b4fc" />
      </TouchableOpacity>
    );
  }

  // Loading state
  if (loading) {
    return (
      <View
        style={{
          backgroundColor: "#eef2ff",
          borderRadius: 24,
          padding: 24,
          borderWidth: 1,
          borderColor: "#e0e7ff",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <SiklusioLottieLoader text="Menganalisis data 7 hari..." size={150} />
        <Text style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 4 }}>
          AI sedang membaca pola aktivitas dan gejala kamu
        </Text>
      </View>
    );
  }

  // Error state
  if (error && !result) {
    return (
      <AiFallbackNotice
        {...error}
        onRetry={handleGenerate}
        retryLabel="Coba insight lagi"
        accentColor="#6366f1"
        style={{ borderRadius: 24, padding: 20 }}
      />
    );
  }

  // Result state
  return (
    <View
      style={{
        backgroundColor: "#eef2ff",
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: "#e0e7ff",
        gap: 14,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "bold",
            color: "#312e81",
          }}
        >
          ✨ Insight AI Mingguan
        </Text>
        <TouchableOpacity
          onPress={handleGenerate}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 10,
            backgroundColor: "#c7d2fe",
          }}
        >
          <FontAwesome name="refresh" size={10} color="#4f46e5" />
          <Text style={{ fontSize: 10, fontWeight: "bold", color: "#4f46e5" }}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      {result?.summary && (
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "bold",
              color: "#6366f1",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Ringkasan 7 Hari
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: "#1e1b4b",
              lineHeight: 20,
            }}
          >
            {result.summary}
          </Text>
        </View>
      )}

      {/* Symptom Analysis */}
      {result?.symptomAnalysis && result.symptomAnalysis.trim() !== "" && (
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "bold",
              color: "#6366f1",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Analisis Gejala
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: "#1e1b4b",
              lineHeight: 20,
            }}
          >
            {result.symptomAnalysis}
          </Text>
        </View>
      )}

      {/* Tips */}
      {result?.tips && result.tips.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "bold",
              color: "#6366f1",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Saran Minggu Depan
          </Text>
          {result.tips.map((tip, i) => (
            <View
              key={i}
              style={{
                flexDirection: "row",
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: "#c7d2fe",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "bold",
                    color: "#4f46e5",
                  }}
                >
                  {i + 1}
                </Text>
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: "#1e1b4b",
                  lineHeight: 19,
                }}
              >
                {tip}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Motivation */}
      {result?.motivation && (
        <View
          style={{
            backgroundColor: "#c7d2fe",
            borderRadius: 14,
            padding: 12,
            marginTop: 4,
          }}
        >
          <Text
            style={{
              fontSize: 13,
              color: "#312e81",
              fontStyle: "italic",
              lineHeight: 19,
              textAlign: "center",
            }}
          >
            💜 {result.motivation}
          </Text>
        </View>
      )}
    </View>
  );
}
