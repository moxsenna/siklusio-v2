import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
  Animated,
} from "react-native";
import { useCycle } from "@/src/context/CycleContext";
import { useAuth } from "@/src/context/AuthContext";
import { format } from "date-fns";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import { useUserAvatar } from "@/src/hooks/useUserAvatar";
import { storage } from "@/src/lib/storage";
import { stampDailyRecord } from "@/src/lib/activityHistorySync";
import { getAuthenticatedSupabaseClientStatus } from "@/src/lib/supabaseAccess";
import {
  DAILY_REMINDER_HOUR,
  DAILY_REMINDER_MINUTE,
  disableDailyReminder,
  enableDailyReminder,
  readDailyReminderEnabled,
} from "@/src/lib/dailyReminder";
import { expoDailyReminderNotifications } from "@/src/lib/expoDailyReminderNotifications";
import { CycleDataSection } from "@/src/features/settings/CycleDataSection";
import { SavingsSection } from "@/src/features/settings/SavingsSection";
import { ReminderSection } from "@/src/features/settings/ReminderSection";
import { AffiliateSection } from "@/src/features/settings/AffiliateSection";
import { AccountSection } from "@/src/features/settings/AccountSection";
import { ProfilePartnerSection } from "@/src/features/settings/ProfilePartnerSection";
import { HphtDatePickerModal } from "@/src/features/settings/HphtDatePickerModal";
import { CycleOverrideWarningModal } from "@/src/features/settings/CycleOverrideWarningModal";
import { SettingsTabToggle, SettingsViewTab } from "@/src/features/settings/SettingsTabToggle";
import { SettingsToast } from "@/src/features/settings/SettingsToast";

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const { avatarUrl, avatarKind, updateAvatar } = useUserAvatar();

  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeViewTab, setActiveViewTab] = useState<SettingsViewTab>("profile");

  useEffect(() => {
    if (tab === "profile") {
      setActiveViewTab("profile");
    } else if (tab === "cycle") {
      setActiveViewTab("cycle");
    }
  }, [tab]);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);
  const toastOpacity = React.useRef(new Animated.Value(0)).current;
  const toastTranslateY = React.useRef(new Animated.Value(-20)).current;

  const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setToast({ message, type });

    toastOpacity.setValue(0);
    toastTranslateY.setValue(-20);

    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: -20,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToast(null);
      });
    }, 3000);
  };

  const {
    lastPeriodDate,
    setLastPeriodDate,
    cycleLength,
    setCycleLength,
    periodLength,
    setPeriodLength,
    activityHistory,
    setActivityHistory,
    userNickname,
    setUserNickname,
    husbandName,
    setHusbandName,
    husbandNickname,
    setHusbandNickname,
    husbandNumber,
    setHusbandNumber,
    targetSaving,
    setTargetSaving,
    currentSaving,
    setCurrentSaving,
    hasManualLogs,
    currentPhase,
    cycleDay,
    daysToNextPeriod,
    effectiveLastPeriod,
  } = useCycle();

  const [dailyReminder, setDailyReminder] = useState(() => readDailyReminderEnabled(storage));

  const [showOverrideWarning, setShowOverrideWarning] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{
    lastDate?: Date;
    cycle?: number;
    period?: number;
  } | null>(null);

  const formatToLongIndonesianDate = (date: Date | null) => {
    if (!date || isNaN(date.getTime())) return "Pilih Tanggal";
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
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState(
    lastPeriodDate ? lastPeriodDate.getDate() : new Date().getDate(),
  );
  const [selectedMonth, setSelectedMonth] = useState(
    lastPeriodDate ? lastPeriodDate.getMonth() + 1 : new Date().getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState(
    lastPeriodDate ? lastPeriodDate.getFullYear() : new Date().getFullYear(),
  );
  const [cycleInput, setCycleInput] = useState(cycleLength > 0 ? cycleLength.toString() : "28");
  const [periodInput, setPeriodInput] = useState(periodLength > 0 ? periodLength.toString() : "5");

  const [currentSavingInput, setCurrentSavingInput] = useState(
    currentSaving > 0 ? currentSaving.toString() : "",
  );
  const [targetSavingInput, setTargetSavingInput] = useState(
    targetSaving > 0 ? targetSaving.toString() : "",
  );

  useEffect(() => {
    setCurrentSavingInput(currentSaving > 0 ? currentSaving.toString() : "");
  }, [currentSaving]);

  useEffect(() => {
    setTargetSavingInput(targetSaving > 0 ? targetSaving.toString() : "");
  }, [targetSaving]);

  const [errorPhone, setErrorPhone] = useState("");

  useEffect(() => {
    if (husbandNumber && husbandNumber.length > 0) {
      if (!husbandNumber.startsWith("62")) {
        setErrorPhone("Nomor harus diawali dengan 62 (Kode Negara)");
      } else if (husbandNumber.length < 10) {
        setErrorPhone("Nomor terlalu pendek");
      } else {
        setErrorPhone("");
      }
    } else {
      setErrorPhone("");
    }
  }, [husbandNumber]);

  useEffect(() => {
    if (effectiveLastPeriod) {
      setSelectedDay(effectiveLastPeriod.getDate());
      setSelectedMonth(effectiveLastPeriod.getMonth() + 1);
      setSelectedYear(effectiveLastPeriod.getFullYear());
    }
  }, [effectiveLastPeriod]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/auth");
    } catch (err: any) {
      const message = err?.message || "Gagal keluar dari akun. Coba lagi.";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Gagal Keluar", message);
      }
    }
  };

  const confirmSignOut = () => {
    const title = "Keluar";
    const message = "Apakah Anda yakin ingin keluar dari akun ini?";

    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n\n${message}`)) {
        void handleSignOut();
      }
      return;
    }

    Alert.alert(title, message, [
      { text: "Batal", style: "cancel" },
      { text: "Keluar", style: "destructive", onPress: () => void handleSignOut() },
    ]);
  };

  const handleCycleSubmit = () => {
    const cl = Number(cycleInput);
    const pl = Number(periodInput);

    if (isNaN(cl) || isNaN(pl) || cl <= 0 || pl <= 0) {
      Alert.alert("Eror", "Silakan isi panjang siklus dan haid dengan angka yang valid.");
      return;
    }

    const proposedDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
    if (isNaN(proposedDate.getTime())) {
      Alert.alert("Eror", "Tanggal yang Anda masukkan tidak valid.");
      return;
    }

    const changes = {
      lastDate: proposedDate,
      cycle: cl,
      period: pl,
    };

    if (hasManualLogs) {
      setPendingChanges(changes);
      setShowOverrideWarning(true);
    } else {
      applyCycleChanges(changes);
    }
  };

  const applyCycleChanges = (changes: { lastDate: Date; cycle: number; period: number }) => {
    storage.setItem("hs_v3_last_sync_time", String(Date.now()));

    setLastPeriodDate(changes.lastDate);
    setCycleLength(changes.cycle);
    setPeriodLength(changes.period);

    const dateStr = format(changes.lastDate, "yyyy-MM-dd");
    setActivityHistory((prev) => {
      const updated = { ...prev };

      Object.keys(updated).forEach((key) => {
        const d = new Date(key);
        if (d > changes.lastDate && updated[key]) {
          updated[key] = stampDailyRecord({
            ...updated[key],
            isPeriod: false,
          });
        }
      });

      updated[dateStr] = stampDailyRecord({
        ...updated[dateStr],
        symptoms: updated[dateStr]?.symptoms || [],
        tasks: updated[dateStr]?.tasks || [],
        isPeriod: true,
      });

      return updated;
    });

    setShowOverrideWarning(false);
    setPendingChanges(null);
    showToast("Data siklus haid berhasil diperbarui! 📅", "success");
  };

  const handleSavingsSubmit = () => {
    const curVal = Number(currentSavingInput);
    const tarVal = Number(targetSavingInput);

    if (isNaN(curVal) || isNaN(tarVal) || curVal < 0 || tarVal <= 0) {
      Alert.alert("Eror", "Silakan masukkan jumlah tabungan yang valid.");
      return;
    }

    setCurrentSaving(curVal);
    setTargetSaving(tarVal);
    showToast("Pengaturan tabungan berhasil disimpan! 💰", "success");
  };

  const handleProfileSubmit = async () => {
    if (errorPhone) {
      Alert.alert("Eror", "Silakan perbaiki nomor WhatsApp suami sebelum menyimpan.");
      return;
    }

    if (!userNickname.trim()) {
      Alert.alert("Eror", "Nama panggilan Anda tidak boleh kosong.");
      return;
    }

    const status = getAuthenticatedSupabaseClientStatus(supabase, user?.id);
    if (status.ready) {
      try {
        const { error } = await status.client
          .from("profiles")
          .update({
            nickname: userNickname,
            husband_name: husbandName,
            husband_nickname: husbandNickname,
            husband_number: husbandNumber,
          })
          .eq("id", status.userId);

        if (error) {
          console.error("Failed to sync profile data to Supabase:", error);
          showToast("Gagal menyinkronkan data ke server.", "error");
        } else {
          showToast("Profil & Pasangan berhasil disimpan dan disinkronkan! 💖", "success");
        }
      } catch (e: any) {
        console.error("Failed to sync profile data to Supabase:", e);
        showToast("Gagal menyinkronkan data.", "error");
      }
    } else {
      showToast("Profil & Pasangan berhasil disimpan secara lokal! 💖", "success");
    }
  };

  const handleReminderToggle = async () => {
    const newValue = !dailyReminder;

    if (newValue) {
      try {
        const result = await enableDailyReminder({
          adapter: expoDailyReminderNotifications,
          storage,
          userNickname,
          currentPhase,
          cycleDay,
          daysToNextPeriod,
        });

        if (result.status === "scheduled") {
          setDailyReminder(true);
          showToast("Pengingat harian dijadwalkan pukul 08.00.", "success");
          return;
        }

        setDailyReminder(false);
        if (result.status === "unsupported") {
          showToast(
            "Notifikasi harian belum tersedia di web. Aktifkan dari aplikasi mobile.",
            "info",
          );
          return;
        }

        showToast("Izin notifikasi belum diberikan, jadi pengingat tidak dijadwalkan.", "error");
      } catch (err) {
        console.error("Failed to schedule daily reminder:", err);
        setDailyReminder(false);
        showToast("Gagal menjadwalkan pengingat harian. Coba lagi nanti.", "error");
      }

      return;
    }

    try {
      await disableDailyReminder({
        adapter: expoDailyReminderNotifications,
        storage,
      });
      setDailyReminder(false);
      showToast("Pengingat harian dinonaktifkan.", "info");
    } catch (err) {
      console.error("Failed to disable daily reminder:", err);
      setDailyReminder(readDailyReminderEnabled(storage));
      showToast("Gagal menonaktifkan pengingat. Coba lagi nanti.", "error");
    }
  };

  const handleAvatarChange = async (next: Parameters<typeof updateAvatar>[0]) => {
    try {
      await updateAvatar(next);
      showToast("Foto profil Bunda berhasil diubah! ✨", "success");
    } catch (e: any) {
      showToast(e?.message || "Tidak bisa menyimpan avatar.", "error");
    }
  };

  const handleHusbandNumberChange = (val: string) => {
    const digits = val.replace(/[^0-9]/g, "");
    setHusbandNumber(digits);
  };

  const handleOverrideCancel = () => {
    setShowOverrideWarning(false);
    setPendingChanges(null);
  };

  const handleOverrideConfirm = () => {
    if (pendingChanges) {
      applyCycleChanges(
        pendingChanges as { lastDate: Date; cycle: number; period: number },
      );
    }
  };

  const reminderTimeLabel = `${String(DAILY_REMINDER_HOUR).padStart(2, "0")}.${String(DAILY_REMINDER_MINUTE).padStart(2, "0")}`;
  const hphtLabel = formatToLongIndonesianDate(
    new Date(selectedYear, selectedMonth - 1, selectedDay),
  );

  return (
    <SafeAreaView
      style={{ flex: 1, minHeight: Platform.OS === "web" ? "100%" : undefined }}
      className="bg-background"
    >
      {toast && (
        <SettingsToast
          message={toast.message}
          type={toast.type}
          opacity={toastOpacity}
          translateY={toastTranslateY}
        />
      )}

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} style={{ flex: 1 }}>
        <View className="mb-6 pt-4 flex-row justify-between items-end border-b border-primary/20 pb-4">
          <View className="flex-1 pr-2">
            <Text className="text-3xl font-bold text-on-background">Pengaturan</Text>
            <Text className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mt-1">
              Privasi dan Akun
            </Text>
            {user && (
              <Text className="text-[12px] font-mono font-bold mt-1 text-primary break-all">
                {user.email}
              </Text>
            )}
          </View>
        </View>

        <SettingsTabToggle activeTab={activeViewTab} onTabChange={setActiveViewTab} />

        <View className="gap-6">
          {activeViewTab === "cycle" && (
            <>
              <CycleDataSection
                hphtLabel={hphtLabel}
                cycleInput={cycleInput}
                periodInput={periodInput}
                onOpenDatePicker={() => setIsDatePickerVisible(true)}
                onCycleInputChange={setCycleInput}
                onPeriodInputChange={setPeriodInput}
                onSubmit={handleCycleSubmit}
              />
              <SavingsSection
                currentSavingInput={currentSavingInput}
                targetSavingInput={targetSavingInput}
                onCurrentSavingChange={setCurrentSavingInput}
                onTargetSavingChange={setTargetSavingInput}
                onSubmit={handleSavingsSubmit}
              />
              <ReminderSection
                dailyReminder={dailyReminder}
                reminderTimeLabel={reminderTimeLabel}
                onToggle={handleReminderToggle}
              />
              <AffiliateSection />
            </>
          )}

          {activeViewTab === "profile" && (
            <ProfilePartnerSection
              avatarUrl={avatarUrl}
              avatarKind={avatarKind}
              userNickname={userNickname}
              husbandName={husbandName}
              husbandNickname={husbandNickname}
              husbandNumber={husbandNumber}
              errorPhone={errorPhone}
              onAvatarChange={handleAvatarChange}
              onUserNicknameChange={setUserNickname}
              onHusbandNameChange={setHusbandName}
              onHusbandNicknameChange={setHusbandNickname}
              onHusbandNumberChange={handleHusbandNumberChange}
              onSubmit={handleProfileSubmit}
            />
          )}

          <AccountSection onSignOut={confirmSignOut} />
        </View>
      </ScrollView>

      <CycleOverrideWarningModal
        visible={showOverrideWarning}
        onCancel={handleOverrideCancel}
        onConfirm={handleOverrideConfirm}
      />

      <HphtDatePickerModal
        visible={isDatePickerVisible}
        selectedDay={selectedDay}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onClose={() => setIsDatePickerVisible(false)}
        onDayChange={setSelectedDay}
        onMonthChange={setSelectedMonth}
        onYearChange={setSelectedYear}
      />
    </SafeAreaView>
  );
}