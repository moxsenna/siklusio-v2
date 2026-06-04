import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { AiFallbackNotice } from "../common/AiFallbackNotice";
import { apiGetJson, apiPostJson } from "../../src/lib/api";
import { extractAiFallbackInput, type AiFallbackInput } from "../../src/lib/aiFallback";
import {
  mapApiTodayRecipeGeneration,
  mapApiTodayRecipes,
  type TodayRecipeGeneration,
  type TodayRecipesResult,
} from "../../src/lib/todayRecipes";

interface Props {
  visible: boolean;
  generatedForDate: string;
  currentPhase: string;
  cycleDay: number;
  daysToNextPeriod: number;
  nickname: string;
  onClose: () => void;
  onBalanceChange?: (balance: number | null) => void;
}

export function TodayRecipesModal({
  visible,
  generatedForDate,
  currentPhase,
  cycleDay,
  daysToNextPeriod,
  nickname,
  onClose,
  onBalanceChange,
}: Props) {
  const [generation, setGeneration] = useState<TodayRecipeGeneration | null>(null);
  const [result, setResult] = useState<TodayRecipesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<AiFallbackInput | null>(null);
  const [loadedFromSaved, setLoadedFromSaved] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!visible) {
      setError(null);
      setLoading(false);
      setFetching(false);
      return () => {
        mounted = false;
      };
    }

    setFetching(true);
    setError(null);
    setLoadedFromSaved(false);

    apiGetJson<{ generation: any | null; result: unknown | null }>(
      `/api/recipes/today?date=${generatedForDate}`,
    )
      .then((json) => {
        if (!mounted) return;
        if (json.generation && json.result) {
          setGeneration(mapApiTodayRecipeGeneration(json.generation));
          setResult(mapApiTodayRecipes(json.result));
          setLoadedFromSaved(true);
        } else {
          setGeneration(null);
          setResult(null);
        }
      })
      .catch((err: any) => {
        if (mounted) {
          setError(
            extractAiFallbackInput(err, "Gagal mengambil resep hari ini.", "Resep Hari Ini"),
          );
        }
      })
      .finally(() => {
        if (mounted) {
          setFetching(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [visible, generatedForDate]);

  const generate = async () => {
    setLoading(true);
    setError(null);

    try {
      const json = await apiPostJson<{ generation: any; result: unknown; balance: number | null }>(
        "/api/generate-recipes",
        {
          generatedForDate,
          phase: currentPhase,
          cycleDay,
          daysToNextPeriod,
          nickname,
        },
      );

      setGeneration(mapApiTodayRecipeGeneration(json.generation));
      setResult(mapApiTodayRecipes(json.result));
      setLoadedFromSaved(json.balance === null);

      if (typeof json.balance === "number") {
        onBalanceChange?.(json.balance);
      }
    } catch (err: any) {
      setError(extractAiFallbackInput(err, "Gagal membuat resep hari ini.", "Resep Hari Ini"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View
        style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.45)" }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: "88%",
            padding: 22,
          }}
        >
          <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 20 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1, paddingRight: 16 }}>
                <Text
                  style={{
                    fontSize: 11,
                    color: "#65a30d",
                    fontWeight: "800",
                    textTransform: "uppercase",
                  }}
                >
                  Resep Hari Ini
                </Text>
                <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827", marginTop: 4 }}>
                  2 resep sederhana buat kamu
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
                <FontAwesome name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: "#f7fee7", borderRadius: 14, padding: 12, gap: 4 }}>
              <Text style={{ fontSize: 11, color: "#3f6212", fontWeight: "700" }}>
                Fase {currentPhase} - Hari ke-{cycleDay} - {daysToNextPeriod} hari menuju haid
              </Text>
              <Text style={{ fontSize: 12, color: "#4d7c0f", lineHeight: 18 }}>
                Bahan diprioritaskan yang umum dan mudah ditemukan di pasar Indonesia.
              </Text>
            </View>

            {(fetching || loading) && (
              <View style={{ paddingVertical: 14, alignItems: "center" }}>
                <ActivityIndicator size="small" color="#65a30d" />
              </View>
            )}

            {!result && !fetching && (
              <TouchableOpacity
                onPress={generate}
                disabled={loading}
                activeOpacity={0.85}
                style={{
                  backgroundColor: "#65a30d",
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <FontAwesome name="magic" size={13} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "800" }}>Buat resep - 15 kredit</Text>
              </TouchableOpacity>
            )}

            {error && <AiFallbackNotice {...error} compact accentColor="#65a30d" />}

            {result && (
              <View style={{ gap: 12 }}>
                {loadedFromSaved && (
                  <View
                    style={{
                      backgroundColor: "#f8fafc",
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                      borderRadius: 14,
                      padding: 10,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: "#334155", fontWeight: "700" }}>
                      Resep hari ini sudah tersimpan. Kamu tidak dipotong kredit lagi.
                    </Text>
                  </View>
                )}

                {generation && (
                  <Text style={{ fontSize: 11, color: "#64748b" }}>
                    Tersimpan untuk tanggal {generation.generatedForDate}
                  </Text>
                )}

                <View style={{ backgroundColor: "#f0fdf4", borderRadius: 14, padding: 12 }}>
                  <Text
                    style={{ fontSize: 12, color: "#14532d", fontWeight: "800", lineHeight: 18 }}
                  >
                    {result.phaseBenefit}
                  </Text>
                </View>

                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: "#111827" }}>
                    Daftar belanja kecil
                  </Text>
                  {result.groceries.map((item) => (
                    <View
                      key={item.id}
                      style={{
                        borderWidth: 1,
                        borderColor: "#e5e7eb",
                        borderRadius: 14,
                        padding: 10,
                        flexDirection: "row",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, color: "#111827", fontWeight: "700" }}>
                          {item.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 18 }}>
                          {item.desc}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: "#111827" }}>
                    2 resep untuk hari ini
                  </Text>

                  {result.recipes.map((recipe) => (
                    <View
                      key={recipe.id}
                      style={{
                        borderWidth: 1,
                        borderColor: "#e5e7eb",
                        borderRadius: 18,
                        padding: 14,
                        gap: 8,
                      }}
                    >
                      <Text style={{ fontSize: 15, color: "#111827", fontWeight: "800" }}>
                        {recipe.emoji} {recipe.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#16a34a", fontWeight: "700" }}>
                        {recipe.cookingTime}
                      </Text>
                      <Text style={{ fontSize: 13, color: "#475569", lineHeight: 19 }}>
                        {recipe.description}
                      </Text>

                      {recipe.ingredients.map((item, index) => (
                        <Text
                          key={`${recipe.id}-ingredient-${index}`}
                          style={{ fontSize: 12, color: "#64748b" }}
                        >
                          - {item}
                        </Text>
                      ))}

                      {recipe.steps.map((item, index) => (
                        <Text
                          key={`${recipe.id}-step-${index}`}
                          style={{ fontSize: 12, color: "#64748b", lineHeight: 18 }}
                        >
                          {index + 1}. {item}
                        </Text>
                      ))}

                      <Text style={{ fontSize: 12, color: "#14532d", lineHeight: 18 }}>
                        {recipe.phaseBenefit}
                      </Text>
                    </View>
                  ))}
                </View>

                <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 18 }}>
                  {result.disclaimer}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
