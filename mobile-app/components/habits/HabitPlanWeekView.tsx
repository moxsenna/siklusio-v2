import React from "react";
import { Text, View } from "react-native";
import type { HabitCoachPlan } from "../../src/lib/habitCoachTypes";

export function HabitPlanWeekView({ plan }: { plan: HabitCoachPlan }) {
  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 28,
        padding: 18,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        gap: 12,
      }}
    >
      <View style={{ gap: 4 }}>
        <Text
          style={{ fontSize: 11, color: "#6d28d9", fontWeight: "800", textTransform: "uppercase" }}
        >
          Rencana 7 Hari
        </Text>
        <Text style={{ fontSize: 13, color: "#64748b", lineHeight: 18 }}>
          {plan.weekStart} sampai {plan.weekEnd}
        </Text>
      </View>

      {plan.days.map((day) => (
        <View
          key={day.dateKey}
          style={{
            borderTopWidth: day.dayIndex === 1 ? 0 : 1,
            borderTopColor: "#e5e7eb",
            paddingTop: day.dayIndex === 1 ? 0 : 12,
            gap: 7,
          }}
        >
          <Text style={{ fontSize: 12, color: "#111827", fontWeight: "800" }}>
            Hari {day.dayIndex}: {day.focus}
          </Text>
          {day.tasks.map((task) => (
            <View key={task.id} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start" }}>
              <Text style={{ width: 18, color: "#6d28d9", fontWeight: "800" }}>-</Text>
              <Text style={{ flex: 1, fontSize: 12, color: "#475569", lineHeight: 18 }}>
                {task.text}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
