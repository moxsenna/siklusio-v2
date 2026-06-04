import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { useCycle } from "../src/context/CycleContext";
import { useAuth } from "../src/context/AuthContext";
import { supabase } from "../src/lib/supabase";
import { format } from "date-fns";
import { DatePickerField } from "@/src/shared/components/DatePickerField";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { storage } from "../src/lib/storage";
import { stampDailyRecord } from "../src/lib/activityHistorySync";
import { getAuthenticatedSupabaseClientStatus } from "../src/lib/supabaseAccess";

interface DropdownOption {
  label: string;
  value: string;
}

interface CustomDropdownProps {
  label: string;
  value: string;
  placeholder: string;
  options: DropdownOption[];
  onSelect: (val: string) => void;
}

function CustomDropdown({ label, value, placeholder, options, onSelect }: CustomDropdownProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const displayLabel = useMemo(() => {
    const selected = options.find((o) => o.value === value);
    return selected ? selected.label : placeholder;
  }, [value, options, placeholder]);

  return (
    <View className="w-full">
      <TouchableOpacity
        onPress={() => setModalOpen(true)}
        className="w-full bg-surface-variant border border-outline-variant rounded-2xl px-5 py-4 flex-row justify-between items-center"
      >
        <Text
          className={`text-base font-medium ${value ? "text-on-background" : "text-on-background/40"}`}
        >
          {displayLabel}
        </Text>
        <FontAwesome name="chevron-down" size={14} color="#ec4899" />
      </TouchableOpacity>

      <Modal
        visible={modalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center p-6 bg-black/45">
          <View className="bg-surface rounded-3xl p-6 w-full max-w-[280px] max-h-[60%] shadow-xl border border-outline-variant flex-col">
            <View className="flex-row justify-between items-center border-b border-outline-variant pb-3 mb-4">
              <Text className="text-lg font-bold text-on-surface">Pilih {label}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <FontAwesome name="times" size={18} color="#ec4899" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1">
              <View className="gap-1 pb-4">
                {options.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => {
                        onSelect(opt.value);
                        setModalOpen(false);
                      }}
                      className={`w-full p-4 rounded-xl flex-row justify-between items-center ${
                        isSelected ? "bg-primary/10" : "active:bg-surface-variant/50"
                      }`}
                    >
                      <Text
                        className={`text-base ${isSelected ? "text-primary font-bold" : "text-on-surface"}`}
                      >
                        {opt.label}
                      </Text>
                      {isSelected && <FontAwesome name="check" size={14} color="#ec4899" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function OnboardingScreen() {
  const {
    userNickname,
    setUserNickname,
    userBirthDate,
    setUserBirthDate,
    childrenCount,
    setChildrenCount,
    lastPeriodDate,
    setLastPeriodDate,
    cycleLength,
    setCycleLength,
    periodLength,
    setPeriodLength,
    setActivityHistory,
    husbandName,
    setHusbandName,
    husbandNickname,
    setHusbandNickname,
    husbandNumber,
    setHusbandNumber,
    isOnboardingCompleted,
    setIsOnboardingCompleted,
  } = useCycle();

  const { session } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 8; // Kembali menjadi 8 langkah dengan dropdown di masing-masing langkah kelahiran

  // Birth Date local states
  const [birthDay, setBirthDay] = useState(
    userBirthDate && !isNaN(userBirthDate.getTime()) ? userBirthDate.getDate().toString() : "",
  );
  const [birthMonth, setBirthMonth] = useState(
    userBirthDate && !isNaN(userBirthDate.getTime())
      ? (userBirthDate.getMonth() + 1).toString()
      : "",
  );
  const [birthYear, setBirthYear] = useState(
    userBirthDate && !isNaN(userBirthDate.getTime()) ? userBirthDate.getFullYear().toString() : "",
  );

  // Last Period Date local states (safer alternative to date picker)
  const [periodDay, setPeriodDay] = useState(
    lastPeriodDate && !isNaN(lastPeriodDate.getTime()) ? lastPeriodDate.getDate().toString() : "",
  );
  const [periodMonth, setPeriodMonth] = useState(
    lastPeriodDate && !isNaN(lastPeriodDate.getTime())
      ? (lastPeriodDate.getMonth() + 1).toString()
      : "",
  );
  const [periodYear, setPeriodYear] = useState(
    lastPeriodDate && !isNaN(lastPeriodDate.getTime())
      ? lastPeriodDate.getFullYear().toString()
      : new Date().getFullYear().toString(),
  );

  const [cycleInput, setCycleInput] = useState(cycleLength > 0 ? cycleLength.toString() : "28");
  const [periodInput, setPeriodInput] = useState(periodLength > 0 ? periodLength.toString() : "5");

  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  // Options generator untuk Dropdowns
  const dayOptions = useMemo(() => {
    return Array.from({ length: 31 }, (_, i) => ({
      label: (i + 1).toString(),
      value: (i + 1).toString(),
    }));
  }, []);

  const monthOptions = useMemo(() => {
    return months.map((m, i) => ({
      label: m,
      value: (i + 1).toString(),
    }));
  }, []);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 70 }, (_, i) => {
      const year = currentYear - 10 - i;
      return {
        label: year.toString(),
        value: year.toString(),
      };
    });
  }, []);

  const isNextDisabled = () => {
    switch (step) {
      case 1:
        return !userNickname.trim();
      case 2:
        return !birthDay;
      case 3:
        return !birthMonth;
      case 4:
        return !birthYear;
      case 5:
        return !childrenCount;
      case 6: {
        const d = Number(periodDay);
        const m = Number(periodMonth);
        const y = Number(periodYear);
        const cl = Number(cycleInput);
        const pl = Number(periodInput);
        return (
          !periodDay ||
          !periodMonth ||
          !periodYear ||
          isNaN(d) ||
          isNaN(m) ||
          isNaN(y) ||
          isNaN(cl) ||
          isNaN(pl) ||
          cl <= 0 ||
          pl <= 0
        );
      }
      case 7:
        return !husbandName.trim() || !husbandNickname.trim() || !husbandNumber.trim();
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (isNextDisabled()) return;

    if (step === 4) {
      const year = Number(birthYear);
      const month = Number(birthMonth) - 1;
      const day = Number(birthDay);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        setUserBirthDate(date);
      }
    }

    if (step === 6) {
      const year = Number(periodYear);
      const month = Number(periodMonth) - 1;
      const day = Number(periodDay);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        setLastPeriodDate(date);
        const dateKey = format(date, "yyyy-MM-dd");
        setActivityHistory((prev) => ({
          ...prev,
          [dateKey]: stampDailyRecord({
            ...prev[dateKey],
            symptoms: prev[dateKey]?.symptoms || [],
            tasks: prev[dateKey]?.tasks || [],
            isPeriod: true,
          }),
        }));
      }
      setCycleLength(Number(cycleInput));
      setPeriodLength(Number(periodInput));
      storage.setItem("hs_v3_last_sync_time", String(Date.now()));
    }

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      const status = getAuthenticatedSupabaseClientStatus(supabase, session?.user?.id);
      if (status.ready) {
        try {
          const finalBirthDate = new Date(
            Number(birthYear),
            Number(birthMonth) - 1,
            Number(birthDay),
          );
          const finalLastPeriodDate = new Date(
            Number(periodYear),
            Number(periodMonth) - 1,
            Number(periodDay),
          );

          await status.client
            .from("profiles")
            .update({
              nickname: userNickname,
              birth_date: !isNaN(finalBirthDate.getTime())
                ? format(finalBirthDate, "yyyy-MM-dd")
                : null,
              children_count: childrenCount,
              last_period_date: !isNaN(finalLastPeriodDate.getTime())
                ? format(finalLastPeriodDate, "yyyy-MM-dd")
                : null,
              cycle_length: Number(cycleInput),
              period_length: Number(periodInput),
              husband_name: husbandName,
              husband_nickname: husbandNickname,
              husband_number: husbandNumber,
              onboarding_completed: true,
            })
            .eq("id", status.userId);
        } catch (e) {
          console.error("Failed to sync onboarding data", e);
        }
      }
      setIsOnboardingCompleted(true);
      storage.setItem("hs_v3_last_sync_time", String(Date.now()));
      router.replace("/(tabs)/dashboard");
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
        backgroundColor: "transparent",
      }}
      style={{
        flex: 1,
        backgroundColor: "transparent",
      }}
    >
      <View
        style={{
          width: "100%",
          maxWidth: 448,
          backgroundColor: "#ffffff",
          borderRadius: 32,
          borderWidth: 1,
          borderColor: "#fbcfe8",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 5,
          minHeight: 500,
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between p-6">
          <TouchableOpacity
            onPress={handleBack}
            disabled={step === 1 || step === totalSteps}
            className={`w-10 h-10 items-center justify-center rounded-full bg-surface-variant ${step === 1 || step === totalSteps ? "opacity-0" : "opacity-100"}`}
          >
            <Text className="text-xl font-bold text-primary">←</Text>
          </TouchableOpacity>

          {/* Custom Step Indicator dots */}
          <View className="flex-row gap-1.5 flex-1 justify-center px-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i + 1 === step
                    ? "w-6 bg-primary"
                    : i + 1 < step
                      ? "w-2 bg-primary/60"
                      : "w-2 bg-outline-variant"
                }`}
              />
            ))}
          </View>

          <View className="w-10 h-10" />
        </View>

        {/* Content Area */}
        <View className="flex-1 px-8 py-4 justify-center">
          {step === 1 && (
            <View>
              <View className="w-16 h-16 rounded-2xl bg-amber-100 items-center justify-center mb-6">
                <Text className="text-3xl">✨</Text>
              </View>
              <Text className="text-3xl font-bold mb-3 text-on-background">Kenalan yuk! 👋</Text>
              <Text className="text-on-surface-variant opacity-80 mb-8 leading-relaxed">
                Biar aplikasinya lebih personal dan akrab, boleh kasih tahu kami kamu lebih suka
                dipanggil apa?
              </Text>
              <View>
                <Text className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                  Nama Panggilan
                </Text>
                <TextInput
                  value={userNickname}
                  onChangeText={setUserNickname}
                  placeholder="Cth: Bunda, Kak, Nisa"
                  placeholderTextColor="#ec489950"
                  className="w-full bg-surface-variant border border-outline-variant rounded-2xl px-5 py-4 text-base text-on-background"
                />
              </View>
            </View>
          )}

          {step === 2 && (
            <View>
              <View className="w-16 h-16 rounded-2xl bg-blue-100 items-center justify-center mb-6">
                <Text className="text-3xl">🎂</Text>
              </View>
              <Text className="text-3xl font-bold mb-3 text-on-background">Tanggal Lahir 🎂</Text>
              <Text className="text-on-surface-variant opacity-80 mb-8 leading-relaxed">
                Tanggal berapa kamu lahir?
              </Text>
              <View>
                <Text className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                  Pilih Tanggal
                </Text>
                <CustomDropdown
                  label="Tanggal Lahir"
                  value={birthDay}
                  placeholder="Pilih Tanggal"
                  options={dayOptions}
                  onSelect={setBirthDay}
                />
              </View>
            </View>
          )}

          {step === 3 && (
            <View>
              <View className="w-16 h-16 rounded-2xl bg-blue-100 items-center justify-center mb-6">
                <Text className="text-3xl">📅</Text>
              </View>
              <Text className="text-3xl font-bold mb-3 text-on-background">Bulan Lahir 🎂</Text>
              <Text className="text-on-surface-variant opacity-80 mb-8 leading-relaxed">
                Di bulan apa kamu lahir?
              </Text>
              <View>
                <Text className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                  Pilih Bulan
                </Text>
                <CustomDropdown
                  label="Bulan Lahir"
                  value={birthMonth}
                  placeholder="Pilih Bulan"
                  options={monthOptions}
                  onSelect={setBirthMonth}
                />
              </View>
            </View>
          )}

          {step === 4 && (
            <View>
              <View className="w-16 h-16 rounded-2xl bg-blue-100 items-center justify-center mb-6">
                <Text className="text-3xl">🗓️</Text>
              </View>
              <Text className="text-3xl font-bold mb-3 text-on-background">Tahun Lahir 🎂</Text>
              <Text className="text-on-surface-variant opacity-80 mb-8 leading-relaxed">
                Tahun berapa kamu lahir?
              </Text>
              <View>
                <Text className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                  Pilih Tahun
                </Text>
                <CustomDropdown
                  label="Tahun Lahir"
                  value={birthYear}
                  placeholder="Pilih Tahun"
                  options={yearOptions}
                  onSelect={setBirthYear}
                />
              </View>
            </View>
          )}

          {step === 5 && (
            <View>
              <View className="w-16 h-16 rounded-2xl bg-purple-100 items-center justify-center mb-6">
                <Text className="text-3xl">👶</Text>
              </View>
              <Text className="text-3xl font-bold mb-3 text-on-background">Jumlah Anak 👶</Text>
              <Text className="text-on-surface-variant opacity-80 mb-8 leading-relaxed">
                Informasi ini membantu kami menyesuaikan artikel dan tips kehamilan nantinya.
              </Text>
              <View className="space-y-3">
                {[
                  { value: "belum punya", label: "Belum punya" },
                  { value: "1", label: "1 Anak" },
                  { value: "2", label: "2 Anak" },
                  { value: "3", label: "3 Anak" },
                  { value: "4+", label: "4 Anak atau lebih" },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setChildrenCount(opt.value)}
                    className={`w-full px-5 py-4 rounded-2xl border ${
                      childrenCount === opt.value
                        ? "bg-primary border-primary"
                        : "bg-surface-variant border-outline-variant"
                    } flex-row justify-between items-center mb-2`}
                  >
                    <Text
                      className={
                        childrenCount === opt.value
                          ? "text-white font-bold"
                          : "text-on-background font-medium"
                      }
                    >
                      {opt.label}
                    </Text>
                    {childrenCount === opt.value && <Text className="text-white font-bold">✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 6 && (
            <View>
              <View className="w-16 h-16 rounded-2xl bg-pink-100 items-center justify-center mb-6">
                <Text className="text-3xl">🩸</Text>
              </View>
              <Text className="text-2xl font-bold mb-3 text-on-background">
                Siklus Haid terakhir ✨
              </Text>
              <Text className="text-xs text-on-surface-variant opacity-80 mb-4">
                Pilih tanggal haid terakhir dan durasi siklusmu.
              </Text>
              <View className="space-y-4">
                <View>
                  <Text className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                    Tanggal Haid Terakhir
                  </Text>
                  <DatePickerField
                    value={(() => {
                      const d = Number(periodDay);
                      const m = Number(periodMonth);
                      const y = Number(periodYear);
                      if (!d || !m || !y) return null;
                      const dt = new Date(y, m - 1, d);
                      return isNaN(dt.getTime()) ? null : dt;
                    })()}
                    onChange={(dt) => {
                      setPeriodDay(dt.getDate().toString());
                      setPeriodMonth((dt.getMonth() + 1).toString());
                      setPeriodYear(dt.getFullYear().toString());
                    }}
                    minYear={new Date().getFullYear() - 5}
                    maxYear={new Date().getFullYear()}
                    placeholder="Pilih tanggal haid terakhir"
                  />
                </View>
                <View className="flex-row gap-4 mt-4">
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                      Panjang Siklus (Hari)
                    </Text>
                    <TextInput
                      value={cycleInput}
                      onChangeText={setCycleInput}
                      placeholder="28"
                      keyboardType="number-pad"
                      placeholderTextColor="#ec489950"
                      className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3 text-sm text-on-background"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                      Lama Haid (Hari)
                    </Text>
                    <TextInput
                      value={periodInput}
                      onChangeText={setPeriodInput}
                      placeholder="5"
                      keyboardType="number-pad"
                      placeholderTextColor="#ec489950"
                      className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3 text-sm text-on-background"
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {step === 7 && (
            <View>
              <View className="w-16 h-16 rounded-2xl bg-teal-100 items-center justify-center mb-6">
                <Text className="text-3xl">💑</Text>
              </View>
              <Text className="text-2xl font-bold mb-3 text-on-background">Tim Promil 💑</Text>
              <Text className="text-on-surface-variant opacity-80 mb-6 leading-relaxed">
                Dukungan pasangan penting banget! Masukkan info suami agar mudah terhubung.
              </Text>
              <View className="space-y-3">
                <View>
                  <Text className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                    Nama Suami
                  </Text>
                  <TextInput
                    value={husbandName}
                    onChangeText={setHusbandName}
                    placeholder="Cth: Budi Susanto"
                    placeholderTextColor="#ec489950"
                    className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3 text-sm text-on-background"
                  />
                </View>
                <View className="flex-row gap-4 mt-2">
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                      Panggilan
                    </Text>
                    <TextInput
                      value={husbandNickname}
                      onChangeText={setHusbandNickname}
                      placeholder="Mas, Sayang..."
                      placeholderTextColor="#ec489950"
                      className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3 text-sm text-on-background"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-primary uppercase tracking-wider mb-2">
                      WhatsApp
                    </Text>
                    <TextInput
                      value={husbandNumber}
                      onChangeText={setHusbandNumber}
                      placeholder="62812..."
                      keyboardType="phone-pad"
                      placeholderTextColor="#ec489950"
                      className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3 text-sm text-on-background"
                    />
                  </View>
                </View>
              </View>
            </View>
          )}

          {step === totalSteps && (
            <View className="items-center text-center">
              <View className="w-24 h-24 rounded-full bg-emerald-100 items-center justify-center mb-6">
                <Text className="text-5xl">🎉</Text>
              </View>
              <Text className="text-3xl font-bold mb-4 text-center text-on-background">
                Semua Sudah Siap! 🎉
              </Text>
              <Text className="text-on-surface-variant opacity-80 text-center leading-relaxed">
                Pengaturan berhasil disimpan. Sekarang kita bisa mulai mencatat siklus dan
                merencanakan masa depan bersama.
              </Text>
            </View>
          )}
        </View>

        {/* Footer Button */}
        <View className="p-6 bg-surface border-t border-outline-variant">
          <TouchableOpacity
            onPress={handleNext}
            disabled={isNextDisabled()}
            className={`w-full py-4 rounded-2xl items-center justify-center shadow-md active:scale-95 ${
              isNextDisabled() ? "bg-outline-variant opacity-50" : "bg-primary"
            }`}
          >
            <Text className="text-on-primary font-bold uppercase tracking-wider text-sm">
              {step === totalSteps ? "Mulai Sekarang" : "Lanjut →"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
