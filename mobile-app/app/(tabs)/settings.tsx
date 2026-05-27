import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  Alert, 
  Modal,
  Image,
  Platform
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useCycle } from '../../src/context/CycleContext';
import { useAuth } from '../../src/context/AuthContext';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { AvatarPicker } from '../../components/common/AvatarPicker';
import { useUserAvatar } from '../../src/hooks/useUserAvatar';

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const { avatarUrl, avatarKind, updateAvatar } = useUserAvatar();
  
  const { 
    lastPeriodDate, setLastPeriodDate,
    cycleLength, setCycleLength,
    periodLength, setPeriodLength,
    activityHistory, setActivityHistory,
    userNickname, setUserNickname,
    husbandName, setHusbandName,
    husbandNickname, setHusbandNickname,
    husbandNumber, setHusbandNumber,
    targetSaving, setTargetSaving,
    currentSaving, setCurrentSaving,
    hasManualLogs,
    currentPhase,
    cycleDay,
    daysToNextPeriod,
    effectiveLastPeriod
  } = useCycle();

  // Local state for daily reminders
  const [dailyReminder, setDailyReminder] = useState(true);

  // Warning state for overrides
  const [showOverrideWarning, setShowOverrideWarning] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{
    lastDate?: Date;
    cycle?: number;
    period?: number;
  } | null>(null);

  const formatToLongIndonesianDate = (date: Date | null) => {
    if (!date || isNaN(date.getTime())) return 'Pilih Tanggal';
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Local inputs for cycle settings to avoid premature calculation updates
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState(lastPeriodDate ? lastPeriodDate.getDate() : new Date().getDate());
  const [selectedMonth, setSelectedMonth] = useState(lastPeriodDate ? lastPeriodDate.getMonth() + 1 : new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(lastPeriodDate ? lastPeriodDate.getFullYear() : new Date().getFullYear());
  const [cycleInput, setCycleInput] = useState(cycleLength > 0 ? cycleLength.toString() : '28');
  const [periodInput, setPeriodInput] = useState(periodLength > 0 ? periodLength.toString() : '5');

  // Local inputs for savings
  const [currentSavingInput, setCurrentSavingInput] = useState(currentSaving > 0 ? currentSaving.toString() : '');
  const [targetSavingInput, setTargetSavingInput] = useState(targetSaving > 0 ? targetSaving.toString() : '');

  // Synchronize local states when values change in the shared CycleContext (e.g., via Dashboard modal)
  useEffect(() => {
    setCurrentSavingInput(currentSaving > 0 ? currentSaving.toString() : '');
  }, [currentSaving]);

  useEffect(() => {
    setTargetSavingInput(targetSaving > 0 ? targetSaving.toString() : '');
  }, [targetSaving]);

  // Phone error validation state
  const [errorPhone, setErrorPhone] = useState('');

  useEffect(() => {
    if (husbandNumber && husbandNumber.length > 0) {
      if (!husbandNumber.startsWith('62')) {
        setErrorPhone('Nomor harus diawali dengan 62 (Kode Negara)');
      } else if (husbandNumber.length < 10) {
        setErrorPhone('Nomor terlalu pendek');
      } else {
        setErrorPhone('');
      }
    } else {
      setErrorPhone('');
    }
  }, [husbandNumber]);

  // Sync back local inputs when props load/change (using effectiveLastPeriod to stay in sync with calendar manual logs)
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
      router.replace('/auth');
    } catch (err: any) {
      const message = err?.message || 'Gagal keluar dari akun. Coba lagi.';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Gagal Keluar', message);
      }
    }
  };

  const confirmSignOut = () => {
    const title = 'Keluar';
    const message = 'Apakah Anda yakin ingin keluar dari akun ini?';

    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        void handleSignOut();
      }
      return;
    }

    Alert.alert(title, message, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => void handleSignOut() },
    ]);
  };

  const handleCycleSubmit = () => {
    const cl = Number(cycleInput);
    const pl = Number(periodInput);

    if (isNaN(cl) || isNaN(pl) || cl <= 0 || pl <= 0) {
      Alert.alert('Eror', 'Silakan isi panjang siklus dan haid dengan angka yang valid.');
      return;
    }

    const proposedDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
    if (isNaN(proposedDate.getTime())) {
      Alert.alert('Eror', 'Tanggal yang Anda masukkan tidak valid.');
      return;
    }

    const changes = {
      lastDate: proposedDate,
      cycle: cl,
      period: pl
    };

    if (hasManualLogs) {
      setPendingChanges(changes);
      setShowOverrideWarning(true);
    } else {
      applyCycleChanges(changes);
    }
  };

  const applyCycleChanges = (changes: { lastDate: Date; cycle: number; period: number }) => {
    setLastPeriodDate(changes.lastDate);
    setCycleLength(changes.cycle);
    setPeriodLength(changes.period);

    // Set this date as manually logged period to make it priority
    const dateStr = format(changes.lastDate, 'yyyy-MM-dd');
    setActivityHistory(prev => {
      const updated = { ...prev };
      
      // Hapus status isPeriod untuk semua tanggal setelah HPHT baru
      // agar tidak me-override perhitungan di cycleUtils (yang mengambil latestManual)
      Object.keys(updated).forEach(key => {
        const d = new Date(key);
        if (d > changes.lastDate && updated[key]) {
          updated[key] = {
            ...updated[key],
            isPeriod: false
          };
        }
      });

      updated[dateStr] = {
        ...updated[dateStr],
        symptoms: updated[dateStr]?.symptoms || [],
        tasks: updated[dateStr]?.tasks || [],
        isPeriod: true
      };

      return updated;
    });

    setShowOverrideWarning(false);
    setPendingChanges(null);
    Alert.alert('Sukses', 'Data siklus haid berhasil diperbarui!');
  };

  const handleSavingsSubmit = () => {
    const curVal = Number(currentSavingInput);
    const tarVal = Number(targetSavingInput);

    if (isNaN(curVal) || isNaN(tarVal) || curVal < 0 || tarVal <= 0) {
      Alert.alert('Eror', 'Silakan masukkan jumlah tabungan yang valid.');
      return;
    }

    setCurrentSaving(curVal);
    setTargetSaving(tarVal);
    Alert.alert('Sukses', 'Pengaturan tabungan berhasil disimpan!');
  };

  const handleProfileSubmit = async () => {
    if (errorPhone) {
      Alert.alert('Eror', 'Silakan perbaiki nomor WhatsApp suami sebelum menyimpan.');
      return;
    }
    
    if (!userNickname.trim()) {
      Alert.alert('Eror', 'Nama panggilan Anda tidak boleh kosong.');
      return;
    }

    if (user && supabase) {
      try {
        const { error } = await supabase.from('profiles').update({
          nickname: userNickname,
          husband_name: husbandName,
          husband_nickname: husbandNickname,
          husband_number: husbandNumber
        }).eq('id', user.id);

        if (error) {
          console.error('Failed to sync profile data to Supabase:', error);
          Alert.alert('Eror', 'Gagal menyinkronkan data ke server: ' + error.message);
        } else {
          Alert.alert('Sukses', 'Profil & Pasangan berhasil disimpan dan disinkronkan!');
        }
      } catch (e: any) {
        console.error('Failed to sync profile data to Supabase:', e);
        Alert.alert('Eror', 'Gagal menyinkronkan data: ' + e.message);
      }
    } else {
      Alert.alert('Sukses', 'Profil & Pasangan berhasil disimpan secara lokal!');
    }
  };

  const handleReminderToggle = () => {
    const newValue = !dailyReminder;
    setDailyReminder(newValue);
    if (newValue) {
      let predictionText = '';
      if (currentPhase === 'Menstrual') {
        predictionText = 'Fokus pada istirahat dan penuhi asupan zat besi Anda hari ini.';
      } else if (currentPhase === 'Ovulasi') {
        predictionText = 'Peluang hamil Anda sedang sangat tinggi! Jangan lewatkan masa subur hari ini.';
      } else {
        predictionText = `Haid berikutnya diperkirakan dalam ${daysToNextPeriod} hari. Tetap jaga pola makan dan olahraga rutin ya.`;
      }
      
      Alert.alert(
        'Pengingat Diaktifkan',
        `Contoh notifikasi harian yang akan Anda terima pagi ini:\n\n"Selamat pagi ${userNickname || 'Bunda'}! Hari ini Anda berada di fase ${currentPhase} (Hari ke-${cycleDay}). ${predictionText}"`
      );
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, minHeight: Platform.OS === 'web' ? '100%' : undefined }} className="bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} style={{ flex: 1 }}>
        
        {/* Header */}
        <View className="mb-6 pt-4 flex-row justify-between items-center border-b border-primary/20 pb-4">
          <View className="flex-1 pr-2">
            <Text className="text-3xl font-bold text-on-background">Pengaturan</Text>
            <Text className="text-xs font-mono uppercase tracking-widest text-on-surface-variant opacity-60 mt-1">Privasi dan Akun</Text>
            {user && (
              <Text className="text-[12px] font-mono font-bold mt-1 text-primary break-all">{user.email}</Text>
            )}
          </View>
          <AvatarPicker
            value={avatarUrl}
            kind={avatarKind}
            onChange={async (next) => {
              try {
                await updateAvatar(next);
              } catch (e: any) {
                Alert.alert('Gagal', e?.message || 'Tidak bisa menyimpan avatar.');
              }
            }}
            size={64}
          />
        </View>

        {/* Content Area */}
        <View className="gap-6">
          
          {/* Card 1: Pengaturan Siklus */}
          <View className="bg-surface rounded-[32px] p-6 shadow-sm border border-outline-variant">
            <View className="flex-row items-center gap-3 mb-4">
              <FontAwesome name="calendar" size={18} color="#ec4899" />
              <Text className="text-base font-bold text-on-surface">Pengaturan Siklus</Text>
            </View>

            <View className="gap-4">
              <View>
                <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">HPHT (Hari Pertama Haid Terakhir)</Text>
                <TouchableOpacity
                  onPress={() => setIsDatePickerVisible(true)}
                  className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3 flex-row justify-between items-center"
                >
                  <Text className="text-sm text-on-surface font-semibold">
                    {formatToLongIndonesianDate(new Date(selectedYear, selectedMonth - 1, selectedDay))}
                  </Text>
                  <FontAwesome name="calendar" size={16} color="#ec4899" />
                </TouchableOpacity>
              </View>

              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Siklus</Text>
                  <View className="relative justify-center">
                    <TextInput
                      value={cycleInput}
                      onChangeText={setCycleInput}
                      keyboardType="number-pad"
                      placeholderTextColor="#ec489950"
                      className="w-full bg-surface-variant border border-outline-variant rounded-xl pl-4 pr-12 py-3 text-sm text-on-surface"
                    />
                    <Text className="absolute right-3 text-xs text-on-surface-variant/70 font-bold">Hari</Text>
                  </View>
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Haid</Text>
                  <View className="relative justify-center">
                    <TextInput
                      value={periodInput}
                      onChangeText={setPeriodInput}
                      keyboardType="number-pad"
                      placeholderTextColor="#ec489950"
                      className="w-full bg-surface-variant border border-outline-variant rounded-xl pl-4 pr-12 py-3 text-sm text-on-surface"
                    />
                    <Text className="absolute right-3 text-xs text-on-surface-variant/70 font-bold">Hari</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleCycleSubmit}
                className="w-full py-3 bg-primary rounded-2xl items-center justify-center shadow-sm mt-2"
              >
                <Text className="text-on-primary font-bold text-sm uppercase tracking-wider">Simpan Siklus</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Card 2: Pengaturan Tabungan */}
          <View className="bg-surface rounded-[32px] p-6 shadow-sm border border-outline-variant">
            <View className="flex-row items-center gap-3 mb-4">
              <FontAwesome name="money" size={18} color="#0d9488" />
              <Text className="text-base font-bold text-on-surface">Pengaturan Tabungan</Text>
            </View>

            <View className="gap-4">
              <View>
                <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Total Tabungan Terkumpul</Text>
                <View className="relative justify-center">
                  <Text className="absolute left-4 text-sm font-bold text-on-surface-variant/70">Rp</Text>
                  <TextInput
                    value={currentSavingInput}
                    onChangeText={setCurrentSavingInput}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#ec489950"
                    className="w-full bg-surface-variant border border-outline-variant rounded-xl pl-12 pr-4 py-3 text-sm text-on-surface"
                  />
                </View>
              </View>

              <View>
                <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Target Tabungan</Text>
                <View className="relative justify-center">
                  <Text className="absolute left-4 text-sm font-bold text-on-surface-variant/70">Rp</Text>
                  <TextInput
                    value={targetSavingInput}
                    onChangeText={setTargetSavingInput}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#ec489950"
                    className="w-full bg-surface-variant border border-outline-variant rounded-xl pl-12 pr-4 py-3 text-sm text-on-surface"
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSavingsSubmit}
                className="w-full py-3 bg-teal-600 rounded-2xl items-center justify-center shadow-sm mt-2"
              >
                <Text className="text-white font-bold text-sm uppercase tracking-wider">Simpan Tabungan</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Card 3: Profil & Pasangan */}
          <View className="bg-surface rounded-[32px] p-6 shadow-sm border border-outline-variant">
            <View className="flex-row items-center gap-3 mb-2">
              <FontAwesome name="heart" size={18} color="#ec4899" />
              <Text className="text-base font-bold text-on-surface">Profil & Pasangan</Text>
            </View>
            <Text className="text-[10px] font-mono text-on-surface-variant opacity-60 mb-4">
              Atur nama panggilan Anda dan kontak WhatsApp suami.
            </Text>

            <View className="gap-4">
              <View>
                <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Nama Panggilan Anda</Text>
                <TextInput
                  value={userNickname}
                  onChangeText={setUserNickname}
                  placeholder="Cth: Bunda, Sayang"
                  placeholderTextColor="#ec489950"
                  className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3 text-sm text-on-surface"
                />
              </View>

              <View>
                <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Nama Suami</Text>
                <TextInput
                  value={husbandName}
                  onChangeText={setHusbandName}
                  placeholder="Cth: Budi Susanto"
                  placeholderTextColor="#ec489950"
                  className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3 text-sm text-on-surface"
                />
              </View>

              <View>
                <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Nama Panggilan Suami</Text>
                <TextInput
                  value={husbandNickname}
                  onChangeText={setHusbandNickname}
                  placeholder="Cth: Mas, Sayang, Koko"
                  placeholderTextColor="#ec489950"
                  className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3 text-sm text-on-surface"
                />
              </View>

              <View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nomor WhatsApp Suami</Text>
                  {errorPhone ? (
                    <Text className="text-[10px] text-error font-medium">{errorPhone}</Text>
                  ) : null}
                </View>
                <TextInput
                  value={husbandNumber}
                  onChangeText={(val) => {
                    const digits = val.replace(/[^0-9]/g, '');
                    setHusbandNumber(digits);
                  }}
                  placeholder="Cth: 6281234567890"
                  keyboardType="phone-pad"
                  placeholderTextColor="#ec489950"
                  className={`w-full bg-surface-variant border rounded-xl p-3 text-sm ${errorPhone ? 'border-error text-error' : 'border-outline-variant text-on-surface'}`}
                />
              </View>

              <TouchableOpacity
                onPress={handleProfileSubmit}
                disabled={!!errorPhone}
                className={`w-full py-3 rounded-2xl items-center justify-center shadow-sm mt-2 active:scale-95 ${
                  errorPhone ? 'bg-primary/50' : 'bg-primary'
                }`}
              >
                <Text className="text-on-primary font-bold text-sm uppercase tracking-wider">Simpan Profil & Pasangan</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Card 4: Pengaturan Pengingat */}
          <TouchableOpacity 
            onPress={handleReminderToggle}
            className="bg-surface rounded-[32px] p-6 shadow-sm border border-outline-variant flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-4 flex-1 pr-4">
              <View className={`w-10 h-10 rounded-full items-center justify-center ${dailyReminder ? 'bg-primary/20 text-primary' : 'bg-surface-variant text-on-surface-variant'}`}>
                <FontAwesome name="bell" size={18} color={dailyReminder ? '#ec4899' : '#888'} />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface">Pengingat Harian & Promil</Text>
                <Text className="text-[10px] font-mono opacity-50 mt-1 leading-relaxed">
                  Kirim notifikasi fase siklus, masa ovulasi, dan pengingat nutrisi.
                </Text>
              </View>
            </View>
            
            {/* Custom Toggle Switch */}
            <View className={`w-[44px] h-[24px] rounded-full p-[2px] justify-center ${dailyReminder ? 'bg-primary' : 'bg-surface-variant'}`}>
              <View className={`w-[20px] h-[20px] rounded-full bg-white shadow-sm ${dailyReminder ? 'self-end' : 'self-start'}`} />
            </View>
          </TouchableOpacity>

          {/* Log Out Button */}
          <TouchableOpacity
            onPress={confirmSignOut}
            className="w-full mt-4 flex-row items-center justify-center gap-2 py-4 bg-error/10 rounded-2xl border border-error/20"
          >
            <FontAwesome name="sign-out" size={18} color="#ef4444" />
            <Text className="text-error font-bold tracking-widest text-sm uppercase">Keluar (Log Out)</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Override Warning Modal */}
      <Modal
        visible={showOverrideWarning}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowOverrideWarning(false);
          setPendingChanges(null);
        }}
      >
        <View className="flex-1 items-center justify-center p-6 bg-black/45">
          <View className="bg-surface rounded-3xl p-6 w-full max-w-[320px] shadow-xl border border-outline-variant">
            <View className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mb-4 mx-auto">
              <FontAwesome name="exclamation-circle" size={24} color="#ef4444" />
            </View>
            <Text className="text-xl font-bold text-center mb-2 text-on-surface">Ubah Data Siklus?</Text>
            <Text className="text-sm text-on-surface-variant/80 text-center mb-6 leading-relaxed">
              Mengubah data siklus secara manual akan memengaruhi prediksi menstruasi dan masa subur yang sudah dihitung. Apakah kamu yakin?
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity 
                onPress={() => {
                  setShowOverrideWarning(false);
                  setPendingChanges(null);
                }}
                className="flex-1 py-3 rounded-xl items-center justify-center bg-surface-variant border border-outline-variant"
              >
                <Text className="text-on-surface font-bold text-sm">Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  if (pendingChanges) {
                    applyCycleChanges(pendingChanges as { lastDate: Date; cycle: number; period: number });
                  }
                }}
                className="flex-1 py-3 rounded-xl items-center justify-center bg-primary shadow-sm"
              >
                <Text className="text-on-primary font-bold text-sm">Ya, Ubah</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Date Picker Modal */}
      <Modal
        visible={isDatePickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDatePickerVisible(false)}
      >
        <View className="flex-1 items-center justify-center p-6 bg-black/45">
          <View className="bg-surface rounded-3xl p-6 w-full max-w-[340px] max-h-[80%] shadow-xl border border-outline-variant flex-col">
            <View className="flex-row justify-between items-center border-b border-outline-variant pb-3 mb-4">
              <Text className="text-lg font-bold text-on-surface">Pilih Tanggal HPHT</Text>
              <TouchableOpacity onPress={() => setIsDatePickerVisible(false)}>
                <FontAwesome name="times" size={18} color="#ec4899" />
              </TouchableOpacity>
            </View>

            {/* Three scrollable columns side-by-side */}
            <View className="flex-row flex-1 h-[220px] gap-2 mb-6">
              
              {/* Day Column */}
              <View className="flex-1 bg-surface-variant/40 rounded-2xl overflow-hidden">
                <Text className="text-center text-[10px] font-bold text-primary py-1 border-b border-outline-variant/30">HARI</Text>
                <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                  <View className="p-1">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                      const isSelected = selectedDay === day;
                      return (
                        <TouchableOpacity
                          key={day}
                          onPress={() => setSelectedDay(day)}
                          className={`py-2 rounded-lg items-center ${isSelected ? 'bg-primary' : 'active:bg-surface-variant'}`}
                        >
                          <Text className={`text-sm ${isSelected ? 'text-on-primary font-bold' : 'text-on-surface'}`}>
                            {day}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Month Column */}
              <View className="flex-[1.5] bg-surface-variant/40 rounded-2xl overflow-hidden">
                <Text className="text-center text-[10px] font-bold text-primary py-1 border-b border-outline-variant/30">BULAN</Text>
                <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                  <View className="p-1">
                    {[
                      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                    ].map((month, index) => {
                      const monthVal = index + 1;
                      const isSelected = selectedMonth === monthVal;
                      return (
                        <TouchableOpacity
                          key={monthVal}
                          onPress={() => setSelectedMonth(monthVal)}
                          className={`py-2 rounded-lg items-center ${isSelected ? 'bg-primary' : 'active:bg-surface-variant'}`}
                        >
                          <Text className={`text-xs ${isSelected ? 'text-on-primary font-bold' : 'text-on-surface'}`}>
                            {month}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Year Column */}
              <View className="flex-1 bg-surface-variant/40 rounded-2xl overflow-hidden">
                <Text className="text-center text-[10px] font-bold text-primary py-1 border-b border-outline-variant/30">TAHUN</Text>
                <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                  <View className="p-1">
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 3 + i).map(year => {
                      const isSelected = selectedYear === year;
                      return (
                        <TouchableOpacity
                          key={year}
                          onPress={() => setSelectedYear(year)}
                          className={`py-2 rounded-lg items-center ${isSelected ? 'bg-primary' : 'active:bg-surface-variant'}`}
                        >
                          <Text className={`text-sm ${isSelected ? 'text-on-primary font-bold' : 'text-on-surface'}`}>
                            {year}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

            </View>

            {/* Confirm Button */}
            <TouchableOpacity
              onPress={() => {
                const testDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
                if (testDate.getDate() !== selectedDay) {
                  Alert.alert('Eror', 'Tanggal yang dipilih tidak valid untuk bulan tersebut.');
                  return;
                }
                setIsDatePickerVisible(false);
              }}
              className="w-full py-3.5 bg-primary rounded-2xl items-center justify-center shadow-md active:scale-95"
            >
              <Text className="text-on-primary font-bold text-sm uppercase tracking-wider">Konfirmasi</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
