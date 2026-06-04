import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
  Easing,
  Modal,
} from "react-native";
import { useCycle } from "@/src/context/CycleContext";
import { apiPostJson } from "@/src/lib/api";
import {
  getTwwLetterSections,
  getTwwTitle,
  type TwwLetterSection,
  type TwwSanctuaryResult,
  TWW_MUSIC_MAP,
  type TwwMusicMood,
} from "@/src/lib/twwSanctuaryResult";
import { Audio } from "expo-av";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { AiFallbackNotice } from "@/src/shared/components/AiFallbackNotice";
import { extractAiFallbackInput, type AiFallbackInput } from "@/src/lib/aiFallback";

interface TwwSanctuaryModalProps {
  onClose: () => void;
}

function RevealedTwwSection({
  section,
  isBreathing,
  onToggleBreathing,
}: {
  section: TwwLetterSection;
  isBreathing: boolean;
  onToggleBreathing: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  if (section.variant === "letter") {
    return (
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <Text className="text-[15px] font-semibold leading-7 text-purple-900">{section.body}</Text>
      </Animated.View>
    );
  }

  if (section.variant === "quote") {
    return (
      <Animated.View
        style={{ opacity, transform: [{ translateY }] }}
        className="bg-white/80 rounded-2xl p-4 border border-purple-100"
      >
        <Text className="text-base font-extrabold leading-6 text-purple-900 text-center">
          "{section.body}"
        </Text>
      </Animated.View>
    );
  }

  if (section.variant === "breath") {
    return (
      <Animated.View
        style={{ opacity, transform: [{ translateY }] }}
        className="bg-white rounded-2xl p-5 border border-purple-100 flex-row gap-4 items-start"
      >
        <View className="w-11 h-11 rounded-2xl bg-purple-100 items-center justify-center shrink-0">
          <Text className="text-xl">ðŸŒ¬ï¸</Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-extrabold text-purple-900 mb-1">
            {section.label || "Tarik napas dulu"}
          </Text>
          <Text className="text-[13px] text-purple-800 leading-5 font-medium">{section.body}</Text>
          <TouchableOpacity
            onPress={onToggleBreathing}
            className="mt-3 self-start rounded-full bg-purple-600 px-4 py-2 active:bg-purple-700"
          >
            <Text className="text-white text-[10px] font-bold uppercase tracking-wider">
              {isBreathing ? "Jeda napas" : "Mulai napas"}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  if (section.variant === "closing") {
    return (
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <Text className="text-sm text-purple-800 leading-6 font-semibold text-center px-3">
          {section.body}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={{ opacity, transform: [{ translateY }] }}
      className="bg-white/80 rounded-2xl p-4 border border-purple-100"
    >
      {section.label && (
        <Text className="text-[10px] font-extrabold uppercase tracking-widest text-purple-700 mb-2">
          {section.label}
        </Text>
      )}
      <Text className="text-sm text-purple-900 leading-6 font-medium">{section.body}</Text>
    </Animated.View>
  );
}

export function TwwSanctuaryModal({ onClose }: TwwSanctuaryModalProps) {
  const { userNickname } = useCycle();

  const [journal, setJournal] = useState("");
  const [reassurance, setReassurance] = useState<TwwSanctuaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AiFallbackInput | null>(null);
  const [visibleSectionCount, setVisibleSectionCount] = useState(0);
  const [selectedMood, setSelectedMood] = useState<TwwMusicMood>("deep_meditation");
  const isInitialMount = useRef(true);

  // Animation and Audio
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"tarik" | "tahan" | "hembus" | "idle">("idle");
  const [countdown, setCountdown] = useState(4);
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const revealTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const autoScrollInterruptedRef = useRef(false);
  const letterSections = useMemo(
    () => (reassurance ? getTwwLetterSections(reassurance) : []),
    [reassurance],
  );

  const loadAudio = async (mood: TwwMusicMood, autoPlayAfterLoad = false) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(TWW_MUSIC_MAP[mood].asset, {
        shouldPlay: autoPlayAfterLoad,
        isLooping: true,
        volume: 0.8,
      });
      soundRef.current = sound;
    } catch (err) {
      console.warn("Gagal memuat audio relaksasi untuk mood: " + mood, err);
    }
  };

  useEffect(() => {
    loadAudio(selectedMood, false);
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Load new audio dynamically when selectedMood changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadAudio(selectedMood, isBreathing);
  }, [selectedMood]);

  useEffect(() => {
    revealTimersRef.current.forEach(clearTimeout);
    revealTimersRef.current = [];
    setVisibleSectionCount(0);
    autoScrollInterruptedRef.current = false;

    if (!reassurance || letterSections.length === 0) {
      return;
    }

    letterSections.forEach((_, index) => {
      const revealTimer = setTimeout(
        () => {
          setVisibleSectionCount((count) => Math.max(count, index + 1));

          if (!autoScrollInterruptedRef.current) {
            const scrollTimer = setTimeout(() => {
              scrollRef.current?.scrollToEnd({ animated: true });
            }, 120);
            revealTimersRef.current.push(scrollTimer);
          }
        },
        350 + index * 1100,
      );

      revealTimersRef.current.push(revealTimer);
    });

    return () => {
      revealTimersRef.current.forEach(clearTimeout);
      revealTimersRef.current = [];
    };
  }, [reassurance, letterSections.length]);

  // Drive animation and countdown second-by-second, perfectly synced
  useEffect(() => {
    let intervalId: any;
    let timeoutId: any;

    if (!isBreathing) {
      setBreathPhase("idle");
      breatheAnim.setValue(1);
      return;
    }

    const runCycle = (phase: "tarik" | "tahan" | "hembus") => {
      setBreathPhase(phase);
      let durationSeconds = 4;
      let targetScale = 1.0;

      if (phase === "tarik") {
        durationSeconds = 4;
        targetScale = 1.5;
        Animated.timing(breatheAnim, {
          toValue: targetScale,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
      } else if (phase === "tahan") {
        durationSeconds = 2;
        targetScale = 1.5;
        Animated.timing(breatheAnim, {
          toValue: targetScale,
          duration: 0,
          useNativeDriver: true,
        }).start();
      } else if (phase === "hembus") {
        durationSeconds = 4;
        targetScale = 1.0;
        Animated.timing(breatheAnim, {
          toValue: targetScale,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }).start();
      }

      setCountdown(durationSeconds);

      let secondsPassed = 0;
      intervalId = setInterval(() => {
        secondsPassed++;
        const remaining = durationSeconds - secondsPassed;
        if (remaining >= 0) {
          setCountdown(remaining);
        }
      }, 1000);

      timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        if (phase === "tarik") {
          runCycle("tahan");
        } else if (phase === "tahan") {
          runCycle("hembus");
        } else {
          runCycle("tarik");
        }
      }, durationSeconds * 1000);
    };

    runCycle("tarik");

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [isBreathing]);

  const toggleBreathing = async () => {
    if (isBreathing) {
      setIsBreathing(false);
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
      }
    } else {
      setIsBreathing(true);
      if (soundRef.current) {
        await soundRef.current.playAsync();
      }
    }
  };

  const submitJournal = async () => {
    if (!journal.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        nickname: userNickname,
        userJournal: journal,
      };

      const data = await apiPostJson<TwwSanctuaryResult>(
        "/api/generate-calming-reassurance",
        payload,
      );
      setReassurance(data);
    } catch (err: any) {
      setError(
        extractAiFallbackInput(err, "Terjadi kesalahan menghubungi server lokal", "TWW Sanctuary"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={true} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        {/* Backdrop */}
        <TouchableOpacity activeOpacity={1} onPress={onClose} className="absolute inset-0" />

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

          <ScrollView
            ref={scrollRef}
            className="mb-[12px] h-full"
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={() => {
              autoScrollInterruptedRef.current = true;
            }}
            scrollEventThrottle={16}
          >
            {/* Affirmation Section */}
            <View className="items-center mb-8">
              <Text className="text-purple-900 font-medium text-center text-sm leading-relaxed px-4 italic">
                "Percayakan prosesnya. Tubuhmu sedang melakukan hal yang luar biasa saat ini. Tarik
                napas yang dalam, lepaskan segala kendali yang di luar kuasamu."
              </Text>
            </View>

            {/* Breathing Exercise */}
            <View className="items-center mb-8">
              <View className="h-40 w-full items-center justify-center relative">
                <Animated.View
                  style={{
                    transform: [{ scale: breatheAnim }],
                    opacity: isBreathing ? 0.35 : 0.1,
                  }}
                  className="absolute w-24 h-24 bg-purple-400 rounded-full"
                />
                <TouchableOpacity
                  onPress={toggleBreathing}
                  className="w-24 h-24 bg-purple-600 rounded-full items-center justify-center shadow-md z-10 active:scale-95"
                >
                  {isBreathing ? (
                    <View className="items-center justify-center">
                      <Text className="text-white font-extrabold text-2xl">{countdown}</Text>
                      <Text className="text-white/80 font-bold text-[8px] uppercase tracking-wider mt-0.5">
                        Jeda
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-white font-bold text-[10px] uppercase tracking-wider text-center px-2">
                      Mulai Napas
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {isBreathing ? (
                <View className="items-center mt-4 w-full px-4">
                  {/* Large animated instructions text */}
                  <View className="h-10 items-center justify-center mb-4">
                    {breathPhase === "tarik" && (
                      <Text className="text-purple-900 text-base font-extrabold tracking-wide text-center">
                        🌬️ Tarik Napas Dalam-Dalam...
                      </Text>
                    )}
                    {breathPhase === "tahan" && (
                      <Text className="text-purple-900 text-base font-extrabold tracking-wide text-center">
                        🛑 Tahan Napas... Heningkan Pikiran
                      </Text>
                    )}
                    {breathPhase === "hembus" && (
                      <Text className="text-purple-900 text-base font-extrabold tracking-wide text-center">
                        💨 Hembuskan Perlahan-Lahan...
                      </Text>
                    )}
                  </View>

                  {/* Pills representing the three phases */}
                  <View className="flex-row items-center justify-center w-full gap-2">
                    <View
                      className={`px-3 py-1.5 rounded-full border items-center justify-center ${
                        breathPhase === "tarik"
                          ? "bg-purple-600 border-purple-600 shadow-sm"
                          : "bg-purple-50 border-purple-100 opacity-50"
                      }`}
                    >
                      <Text
                        className={`text-[9px] font-bold uppercase tracking-wider ${
                          breathPhase === "tarik" ? "text-white" : "text-purple-700"
                        }`}
                      >
                        Tarik (4s)
                      </Text>
                    </View>

                    <View
                      className={`px-3 py-1.5 rounded-full border items-center justify-center ${
                        breathPhase === "tahan"
                          ? "bg-purple-600 border-purple-600 shadow-sm"
                          : "bg-purple-50 border-purple-100 opacity-50"
                      }`}
                    >
                      <Text
                        className={`text-[9px] font-bold uppercase tracking-wider ${
                          breathPhase === "tahan" ? "text-white" : "text-purple-700"
                        }`}
                      >
                        Tahan (2s)
                      </Text>
                    </View>

                    <View
                      className={`px-3 py-1.5 rounded-full border items-center justify-center ${
                        breathPhase === "hembus"
                          ? "bg-purple-600 border-purple-600 shadow-sm"
                          : "bg-purple-50 border-purple-100 opacity-50"
                      }`}
                    >
                      <Text
                        className={`text-[9px] font-bold uppercase tracking-wider ${
                          breathPhase === "hembus" ? "text-white" : "text-purple-700"
                        }`}
                      >
                        Hembus (4s)
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="items-center mt-4">
                  <Text className="text-purple-800 text-xs font-bold uppercase tracking-widest text-center px-4 leading-relaxed">
                    🧘‍♀️ Ambil jeda 1 menit saja untuk tenang
                  </Text>
                  <Text className="text-purple-600/70 text-[10px] text-center mt-1">
                    Ketuk tombol di atas untuk memulai bimbingan napas & suara meditasi
                  </Text>
                </View>
              )}

              {/* Mood Ambiance Selector */}
              <View className="mt-6 w-full items-center">
                <Text className="text-[10px] font-extrabold uppercase tracking-widest text-purple-700 mb-3 text-center">
                  🎵 Suasana Musik Relaksasi
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
                  className="w-full flex-row"
                >
                  {(Object.keys(TWW_MUSIC_MAP) as TwwMusicMood[]).map((moodKey) => {
                    const item = TWW_MUSIC_MAP[moodKey];
                    const isSelected = selectedMood === moodKey;
                    return (
                      <TouchableOpacity
                        key={moodKey}
                        onPress={() => setSelectedMood(moodKey)}
                        activeOpacity={0.8}
                        className={`flex-row items-center px-4 py-2.5 rounded-full border ${
                          isSelected
                            ? "bg-purple-600 border-purple-600 shadow-sm"
                            : "bg-purple-50/80 border-purple-100"
                        }`}
                      >
                        <Text className="text-sm mr-1.5">{item.emoji}</Text>
                        <View>
                          <Text
                            className={`text-[10px] font-extrabold uppercase tracking-wider ${
                              isSelected ? "text-white" : "text-purple-800"
                            }`}
                          >
                            {item.label}
                          </Text>
                          <Text
                            className={`text-[8px] font-bold ${
                              isSelected ? "text-purple-200" : "text-purple-600/60"
                            }`}
                          >
                            {item.desc}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>

            {/* Journal Section */}
            {!reassurance && !loading && (
              <View className="bg-white p-5 rounded-[24px] shadow-sm border border-purple-100">
                <Text className="text-xs font-bold uppercase tracking-widest text-purple-800 mb-3">
                  Jurnal Emosi
                </Text>
                <Text className="text-[10px] text-purple-600 mb-3 leading-relaxed">
                  Keluarkan semua cemasmu di sini. Tidak apa-apa merasa takut. Tuliskan apa yang
                  mengganggumu hari ini.
                </Text>
                <TextInput
                  value={journal}
                  onChangeText={setJournal}
                  placeholder="Misal: Aku takut banget lihat testpack negatif lagi bulan ini..."
                  placeholderTextColor="#c084fc"
                  multiline
                  numberOfLines={4}
                  className="bg-purple-50 rounded-xl p-4 text-purple-900 text-sm border border-purple-200 min-h-[100px] mb-4"
                  style={{ textAlignVertical: "top" }}
                />

                {error && (
                  <AiFallbackNotice
                    {...error}
                    compact
                    accentColor="#9333ea"
                    style={{ marginBottom: 16 }}
                  />
                )}

                <TouchableOpacity
                  onPress={submitJournal}
                  disabled={!journal.trim()}
                  className={`w-full py-4 rounded-xl items-center justify-center shadow-sm ${journal.trim() ? "bg-purple-600 active:scale-95" : "bg-purple-300"}`}
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
              <View className="gap-4 pb-6">
                <View className="bg-purple-100 rounded-3xl p-5 border border-purple-200 gap-4">
                  <View>
                    <Text className="text-[10px] font-extrabold uppercase tracking-widest text-purple-700 mb-2">
                      Surat Tenang
                    </Text>
                    <Text className="text-xl font-extrabold leading-7 text-purple-950">
                      {getTwwTitle(reassurance)}
                    </Text>
                  </View>

                  {letterSections
                    .slice(0, visibleSectionCount)
                    .filter(
                      (section) => section.variant !== "breath" && section.variant !== "closing",
                    )
                    .map((section) => (
                      <RevealedTwwSection
                        key={section.key}
                        section={section}
                        isBreathing={isBreathing}
                        onToggleBreathing={() => void toggleBreathing()}
                      />
                    ))}
                </View>

                {letterSections
                  .slice(0, visibleSectionCount)
                  .filter(
                    (section) => section.variant === "breath" || section.variant === "closing",
                  )
                  .map((section) => (
                    <RevealedTwwSection
                      key={section.key}
                      section={section}
                      isBreathing={isBreathing}
                      onToggleBreathing={() => void toggleBreathing()}
                    />
                  ))}

                {visibleSectionCount >= letterSections.length && (
                  <TouchableOpacity
                    onPress={() => {
                      setReassurance(null);
                      setJournal("");
                    }}
                    className="w-full mt-2 bg-purple-50 py-[16px] rounded-[16px] items-center justify-center border border-purple-200 active:scale-95"
                  >
                    <Text className="text-purple-700 font-bold uppercase tracking-wider text-[10px]">
                      Tulis Jurnal Baru
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Bottom spacer inside scrollview */}
            <View className="h-10" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
