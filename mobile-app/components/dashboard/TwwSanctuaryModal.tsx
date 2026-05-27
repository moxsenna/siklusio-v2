import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Animated, Platform, Easing } from 'react-native';
import { useCycle } from '../../src/context/CycleContext';
import { getApiBaseUrl } from '../../src/lib/api';
import { Audio } from 'expo-av';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface TwwSanctuaryModalProps {
  onClose: () => void;
}

export function TwwSanctuaryModal({ onClose }: TwwSanctuaryModalProps) {
  const { userNickname } = useCycle();
  
  const [journal, setJournal] = useState('');
  const [reassurance, setReassurance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Animation and Audio
  const [isBreathing, setIsBreathing] = useState(false);
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const soundRef = useRef<Audio.Sound | null>(null);



  const loadAudio = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/tww_meditation.mp3'),
        { shouldPlay: false, isLooping: true }
      );
      soundRef.current = sound;
    } catch (err) {
      console.warn("Gagal memuat audio relaksasi", err);
    }
  };

  useEffect(() => {
    loadAudio();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const toggleBreathing = async () => {
    if (isBreathing) {
      setIsBreathing(false);
      breatheAnim.stopAnimation();
      breatheAnim.setValue(1);
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
      }
    } else {
      setIsBreathing(true);
      if (soundRef.current) {
        await soundRef.current.playAsync();
      }
      
      Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, {
            toValue: 1.5,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(breatheAnim, {
            toValue: 1.5,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(breatheAnim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          })
        ])
      ).start();
    }
  };

  const submitJournal = async () => {
    if (!journal.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        nickname: userNickname,
        userJournal: journal
      };

      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/generate-calming-reassurance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghubungi AI');
      }
      
      setReassurance(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan menghubungi server lokal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="absolute inset-0 z-50 justify-end">
      {/* Backdrop */}
      <TouchableOpacity 
        activeOpacity={1}
        onPress={onClose}
        className="absolute inset-0 bg-black/60"
      />
      
      {/* Bottom Sheet */}
      <View className="relative bg-[#f8f5ff] rounded-t-[32px] w-full max-w-md mx-auto p-[24px] pb-[40px] border border-purple-100 shadow-lg max-h-[90vh]">
        <View className="flex-row justify-between items-center mb-[24px] border-b border-purple-200 pb-4">
           <Text className="text-sm font-bold uppercase tracking-widest text-purple-700">
             🧘‍♀️ TWW Sanctuary
           </Text>
           <TouchableOpacity 
             onPress={onClose}
             className="w-8 h-8 rounded-full bg-purple-100 items-center justify-center"
           >
             <Text className="text-sm font-bold text-purple-800">✕</Text>
           </TouchableOpacity>
        </View>
        
        <ScrollView className="mb-[12px] h-full" showsVerticalScrollIndicator={false}>
          
          {/* Affirmation Section */}
          <View className="items-center mb-8">
            <Text className="text-purple-900 font-medium text-center text-sm leading-relaxed px-4 italic">
              "Percayakan prosesnya. Tubuhmu sedang melakukan hal yang luar biasa saat ini. Tarik napas yang dalam, lepaskan segala kendali yang di luar kuasamu."
            </Text>
          </View>

          {/* Breathing Exercise */}
          <View className="items-center mb-8">
            <View className="h-40 w-full items-center justify-center relative">
              <Animated.View 
                style={{
                  transform: [{ scale: breatheAnim }],
                  opacity: isBreathing ? 0.3 : 0.1
                }}
                className="absolute w-24 h-24 bg-purple-400 rounded-full"
              />
              <TouchableOpacity 
                onPress={toggleBreathing}
                className="w-24 h-24 bg-purple-600 rounded-full items-center justify-center shadow-md z-10"
              >
                <Text className="text-white font-bold text-xs text-center px-2">
                  {isBreathing ? "Jeda" : "Mulai Napas"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text className="text-purple-800 text-xs font-bold mt-4 uppercase tracking-widest">
              {isBreathing ? "Tarik... Tahan... Hembuskan..." : "Stop Cemas & Tarik Napas Dulu"}
            </Text>
          </View>

          {/* Journal Section */}
          {!reassurance && !loading && (
            <View className="bg-white p-5 rounded-[24px] shadow-sm border border-purple-100">
              <Text className="text-xs font-bold uppercase tracking-widest text-purple-800 mb-3">
                Jurnal Emosi
              </Text>
              <Text className="text-[10px] text-purple-600 mb-3 leading-relaxed">
                Keluarkan semua cemasmu di sini. Tidak apa-apa merasa takut. Tuliskan apa yang mengganggumu hari ini.
              </Text>
              <TextInput
                value={journal}
                onChangeText={setJournal}
                placeholder="Misal: Aku takut banget lihat testpack negatif lagi bulan ini..."
                placeholderTextColor="#c084fc"
                multiline
                numberOfLines={4}
                className="bg-purple-50 rounded-xl p-4 text-purple-900 text-sm border border-purple-200 min-h-[100px] mb-4"
                style={{ textAlignVertical: 'top' }}
              />
              
              {error && (
                <View className="text-xs bg-red-50 p-3 rounded-xl mb-4 border border-red-200">
                  <Text className="text-red-700 text-center text-xs">{error}</Text>
                </View>
              )}

              <TouchableOpacity 
                onPress={submitJournal}
                disabled={!journal.trim()}
                className={`w-full py-4 rounded-xl items-center justify-center shadow-sm ${journal.trim() ? 'bg-purple-600 active:scale-95' : 'bg-purple-300'}`}
              >
                <Text className="text-white font-bold uppercase tracking-wider text-[10px]">
                  Curhat Sekarang
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {loading && (
            <View className="items-center justify-center py-[48px] gap-4">
               <ActivityIndicator size="large" color="#9333ea" />
               <Text className="text-[10px] font-bold uppercase tracking-widest opacity-60 text-purple-900">
                 Mendengarkan curahan hatimu...
               </Text>
            </View>
          )}

          {reassurance && !loading && (
            <View className="gap-6 pb-6">
              <View className="bg-purple-100 rounded-2xl p-6 border border-purple-200">
                <Text className="text-sm font-medium leading-relaxed text-purple-900">
                  {reassurance.reassurance}
                </Text>
              </View>

              <View className="bg-white rounded-2xl p-5 border border-purple-100 items-center flex-row gap-4">
                <View className="w-10 h-10 rounded-full bg-purple-100 items-center justify-center shrink-0">
                  <Text className="text-xl">🌬️</Text>
                </View>
                <Text className="text-sm text-purple-800 flex-1 leading-relaxed font-medium">
                  {reassurance.breathingTip}
                </Text>
              </View>

              <TouchableOpacity 
                onPress={() => {
                  setReassurance(null);
                  setJournal('');
                }}
                className="w-full mt-2 bg-purple-50 py-[16px] rounded-[16px] items-center justify-center border border-purple-200 active:scale-95"
              >
                <Text className="text-purple-700 font-bold uppercase tracking-wider text-[10px]">
                  Tulis Jurnal Baru
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Spacer */}
          <View className="h-20" />
        </ScrollView>
      </View>
    </View>
  );
}
