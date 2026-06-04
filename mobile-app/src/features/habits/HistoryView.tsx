import React, { useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, FlatList } from "react-native";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import { parseLocalDate } from "@/src/lib/dateUtils";

export function HistoryView({ historyFilter, setHistoryFilter, activityHistory }: any) {
  const chartData = useMemo(() => {
    const today = startOfDay(new Date());
    const startDate = subDays(today, historyFilter - 1);
    const days = eachDayOfInterval({ start: startDate, end: today });

    return days.map((date) => {
      const dateKey = format(date, "yyyy-MM-dd");
      const record = activityHistory[dateKey];
      let percent = 0;
      if (record && record.tasks && record.tasks.length > 0) {
        const completed = record.tasks.filter((t: any) => t.done).length;
        percent = Math.round((completed / record.tasks.length) * 100);
      }

      const dayName = format(date, "dd/MM");

      return {
        name: dayName,
        percent,
        isPeriod: record?.isPeriod || false,
      };
    });
  }, [activityHistory, historyFilter]);

  const chartHeight = 150;

  return (
    <View className="space-y-6">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-lg font-bold text-on-background">Tren Konsistensi</Text>

        {/* Selector filter */}
        <View className="flex-row gap-1 bg-surface-variant p-1 rounded-xl">
          {[7, 14, 30].map((val) => (
            <TouchableOpacity
              key={val}
              onPress={() => setHistoryFilter(val)}
              className={`px-3 py-1 rounded-lg ${
                historyFilter === val ? "bg-surface shadow-sm" : ""
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  historyFilter === val ? "text-primary" : "text-on-surface-variant"
                }`}
              >
                {val}H
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Dynamic CSS Bar Chart */}
      <FlatList
        horizontal
        nestedScrollEnabled
        data={chartData}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ paddingHorizontal: 10, paddingVertical: 16 }}
        showsHorizontalScrollIndicator={true}
        renderItem={({ item: day }) => {
          const barHeight = (day.percent / 100) * chartHeight;
          return (
            <View style={{ alignItems: "center", width: 36, marginHorizontal: 4 }}>
              <Text style={{ fontSize: 9, fontWeight: "bold", color: "#ec4899", marginBottom: 4 }}>
                {day.percent}%
              </Text>
              <View
                style={{
                  height: Math.max(barHeight, 6),
                  width: 14,
                  borderTopLeftRadius: 99,
                  borderTopRightRadius: 99,
                  backgroundColor: day.isPeriod ? "#ec4899" : "#fbcfe8",
                }}
              />
              <Text style={{ fontSize: 9, fontWeight: "bold", color: "#64748b", marginTop: 8 }}>
                {day.name}
              </Text>
            </View>
          );
        }}
      />

      <View className="flex-row justify-center gap-4 mt-4">
        <View className="flex-row items-center gap-2">
          <View className="w-3 h-3 rounded-full bg-pink-200" />
          <Text className="text-[10px] uppercase font-bold text-on-surface-variant">Normal</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="w-3 h-3 rounded-full bg-pink-500" />
          <Text className="text-[10px] uppercase font-bold text-on-surface-variant">Haid</Text>
        </View>
      </View>
    </View>
  );
}
