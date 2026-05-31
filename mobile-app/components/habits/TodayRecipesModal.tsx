import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { format } from 'date-fns';
import { ApiError, apiGetJson, apiPostJson } from '../../src/lib/api';
import {
  mapApiTodayRecipeGeneration,
  type TodayRecipeGeneration,
} from '../../src/lib/todayRecipes';

interface Props {
  visible: boolean;
  currentPhase: string;
  cycleDay: number;
  daysToNextPeriod: number;
  nickname: string;
  onClose: () => void;
  onBalanceChange?: (balance: number) => void;
}

export function TodayRecipesModal({
  visible,
  currentPhase,
  cycleDay,
  daysToNextPeriod,
  nickname,
  onClose,
  onBalanceChange,
}: Props) {
  const [generation, setGeneration] = useState<TodayRecipeGeneration | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateKey = format(new Date(), 'yyyy-MM-dd');

  const loadSavedRecipe = useCallback(async () => {
    setFetching(true);
    setError(null);
    setBalance(null);
    try {
      const json = await apiGetJson<{ generation: any | null; result: unknown | null }>(
        `/api/recipes/today?date=${encodeURIComponent(dateKey)}`
      );
      setGeneration(json.generation ? mapApiTodayRecipeGeneration(json.generation) : null);
    } catch (err: any) {
      setError(err.message || 'Gagal mengambil resep hari ini.');
    } finally {
      setFetching(false);
    }
  }, [dateKey]);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;

    setFetching(true);
    setError(null);
    setBalance(null);
    apiGetJson<{ generation: any | null; result: unknown | null }>(
      `/api/recipes/today?date=${encodeURIComponent(dateKey)}`
    )
      .then((json) => {
        if (!mounted) return;
        setGeneration(json.generation ? mapApiTodayRecipeGeneration(json.generation) : null);
      })
      .catch((err: any) => {
        if (mounted) setError(err.message || 'Gagal mengambil resep hari ini.');
      })
      .finally(() => {
        if (mounted) setFetching(false);
      });

    return () => {
      mounted = false;
    };
  }, [visible, dateKey]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiPostJson<{ generation: any; result: unknown; balance: number | null }>(
        '/api/generate-recipes',
        {
          generatedForDate: dateKey,
          phase: currentPhase,
          cycleDay,
          daysToNextPeriod,
          nickname,
        }
      );
      setGeneration(mapApiTodayRecipeGeneration(json.generation));
      setBalance(json.balance);
      if (typeof json.balance === 'number') {
        onBalanceChange?.(json.balance);
      }
    } catch (err: any) {
      const message =
        err instanceof ApiError && err.status === 402
          ? `Saldo kredit AI belum cukup. Kamu butuh ${Number((err.payload as any)?.required || 15)} kredit.`
          : err.message || 'Gagal membuat resep hari ini.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const result = generation?.result || null;
  const canGenerate = !fetching && !result && !error;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15, 23, 42, 0.45)' }}>
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
                <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '800', textTransform: 'uppercase' }}>
                  Resep Hari Ini
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', marginTop: 4 }}>
                  Menu sederhana untuk fase {currentPhase}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
                <FontAwesome name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20 }}>
              Dua resep cepat, daftar belanja kecil, dan manfaat nutrisi umum untuk fase hari ini.
            </Text>

            {fetching && (
              <View style={{ paddingVertical: 18, alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color="#15803d" />
                <Text style={{ fontSize: 12, color: '#64748b' }}>Mengambil resep tersimpan...</Text>
              </View>
            )}

            {canGenerate && (
              <TouchableOpacity
                onPress={generate}
                disabled={loading}
                activeOpacity={0.85}
                style={{
                  backgroundColor: '#15803d',
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
                  Buat resep - 15 kredit
                </Text>
              </TouchableOpacity>
            )}

            {error && (
              <View style={{ backgroundColor: '#fef2f2', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#fee2e2', gap: 10 }}>
                <Text style={{ color: '#b91c1c', fontSize: 12, fontWeight: '700' }}>{error}</Text>
                <TouchableOpacity
                  onPress={loadSavedRecipe}
                  activeOpacity={0.85}
                  style={{
                    alignSelf: 'flex-start',
                    borderWidth: 1,
                    borderColor: '#fecaca',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: '#b91c1c', fontSize: 12, fontWeight: '800' }}>Coba lagi</Text>
                </TouchableOpacity>
              </View>
            )}

            {result && (
              <View style={{ gap: 14 }}>
                <View style={{ backgroundColor: '#ecfdf5', borderRadius: 16, padding: 14 }}>
                  <Text style={{ fontSize: 13, color: '#14532d', lineHeight: 20 }}>{result.phaseBenefit}</Text>
                </View>

                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 12, color: '#111827', fontWeight: '800' }}>Daftar belanja kecil</Text>
                  {result.groceries.map((item) => (
                    <Text key={item.id} style={{ fontSize: 13, color: '#475569', lineHeight: 19 }}>
                      - {item.name}: {item.desc}
                    </Text>
                  ))}
                </View>

                {result.recipes.map((recipe) => (
                  <View key={recipe.id} style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 18, padding: 14, gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <Text style={{ flex: 1, fontSize: 15, color: '#111827', fontWeight: '800' }}>
                        {recipe.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#15803d', fontWeight: '700' }}>
                        {recipe.cookingTime}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: '#475569', lineHeight: 19 }}>{recipe.description}</Text>
                    <Text style={{ fontSize: 12, color: '#111827', fontWeight: '800' }}>Bahan</Text>
                    {recipe.ingredients.map((item, index) => (
                      <Text key={`${recipe.id}-ingredient-${index}`} style={{ fontSize: 12, color: '#64748b' }}>
                        - {item}
                      </Text>
                    ))}
                    <Text style={{ fontSize: 12, color: '#111827', fontWeight: '800' }}>Langkah</Text>
                    {recipe.steps.map((item, index) => (
                      <Text key={`${recipe.id}-step-${index}`} style={{ fontSize: 12, color: '#64748b', lineHeight: 18 }}>
                        {index + 1}. {item}
                      </Text>
                    ))}
                    <Text style={{ fontSize: 12, color: '#14532d', lineHeight: 18 }}>{recipe.phaseBenefit}</Text>
                  </View>
                ))}

                <Text style={{ fontSize: 11, color: '#94a3b8', lineHeight: 16 }}>{result.disclaimer}</Text>
                <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '700' }}>
                  {balance !== null ? `Sisa kredit AI: ${balance}` : 'Resep hari ini sudah tersimpan.'}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
