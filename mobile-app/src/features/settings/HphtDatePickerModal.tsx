import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

interface HphtDatePickerModalProps {
  visible: boolean;
  selectedDay: number;
  selectedMonth: number;
  selectedYear: number;
  onClose: () => void;
  onDayChange: (day: number) => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

const MONTHS = [
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

export function HphtDatePickerModal({
  visible,
  selectedDay,
  selectedMonth,
  selectedYear,
  onClose,
  onDayChange,
  onMonthChange,
  onYearChange,
}: HphtDatePickerModalProps) {
  const handleConfirm = () => {
    const testDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
    if (testDate.getDate() !== selectedDay) {
      Alert.alert("Eror", "Tanggal yang dipilih tidak valid untuk bulan tersebut.");
      return;
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center p-6 bg-black/45">
        <View className="bg-surface rounded-3xl p-6 w-full max-w-[340px] max-h-[80%] shadow-xl border border-outline-variant flex-col">
          <View className="flex-row justify-between items-center border-b border-outline-variant pb-3 mb-4">
            <Text className="text-lg font-bold text-on-surface">Pilih Tanggal HPHT</Text>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome name="times" size={18} color="#ec4899" />
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-1 h-[220px] gap-2 mb-6">
            <View className="flex-1 bg-surface-variant/40 rounded-2xl overflow-hidden">
              <Text className="text-center text-[10px] font-bold text-primary py-1 border-b border-outline-variant/30">
                HARI
              </Text>
              <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                <View className="p-1">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    const isSelected = selectedDay === day;
                    return (
                      <TouchableOpacity
                        key={day}
                        onPress={() => onDayChange(day)}
                        className={`py-2 rounded-lg items-center ${isSelected ? "bg-primary" : "active:bg-surface-variant"}`}
                      >
                        <Text
                          className={`text-sm ${isSelected ? "text-on-primary font-bold" : "text-on-surface"}`}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            <View className="flex-[1.5] bg-surface-variant/40 rounded-2xl overflow-hidden">
              <Text className="text-center text-[10px] font-bold text-primary py-1 border-b border-outline-variant/30">
                BULAN
              </Text>
              <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                <View className="p-1">
                  {MONTHS.map((month, index) => {
                    const monthVal = index + 1;
                    const isSelected = selectedMonth === monthVal;
                    return (
                      <TouchableOpacity
                        key={monthVal}
                        onPress={() => onMonthChange(monthVal)}
                        className={`py-2 rounded-lg items-center ${isSelected ? "bg-primary" : "active:bg-surface-variant"}`}
                      >
                        <Text
                          className={`text-xs ${isSelected ? "text-on-primary font-bold" : "text-on-surface"}`}
                        >
                          {month}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            <View className="flex-1 bg-surface-variant/40 rounded-2xl overflow-hidden">
              <Text className="text-center text-[10px] font-bold text-primary py-1 border-b border-outline-variant/30">
                TAHUN
              </Text>
              <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                <View className="p-1">
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 3 + i).map(
                    (year) => {
                      const isSelected = selectedYear === year;
                      return (
                        <TouchableOpacity
                          key={year}
                          onPress={() => onYearChange(year)}
                          className={`py-2 rounded-lg items-center ${isSelected ? "bg-primary" : "active:bg-surface-variant"}`}
                        >
                          <Text
                            className={`text-sm ${isSelected ? "text-on-primary font-bold" : "text-on-surface"}`}
                          >
                            {year}
                          </Text>
                        </TouchableOpacity>
                      );
                    },
                  )}
                </View>
              </ScrollView>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleConfirm}
            className="w-full py-3.5 bg-primary rounded-2xl items-center justify-center shadow-md active:scale-95"
          >
            <Text className="text-on-primary font-bold text-sm uppercase tracking-wider">
              Konfirmasi
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}