import React from "react";
import { View, Text, Animated, Platform } from "react-native";

export type SettingsToastType = "success" | "info" | "error";

interface SettingsToastProps {
  message: string;
  type: SettingsToastType;
  opacity: Animated.Value;
  translateY: Animated.Value;
}

export function SettingsToast({ message, type, opacity, translateY }: SettingsToastProps) {
  return (
    <Animated.View
      style={{
        position: "absolute",
        top: Platform.OS === "ios" ? 60 : 30,
        left: 24,
        right: 24,
        zIndex: 9999,
        opacity,
        transform: [{ translateY }],
      }}
    >
      <View
        className={`flex-row items-center gap-3 p-4 rounded-2xl border shadow-lg ${
          type === "success"
            ? "bg-emerald-50 border-emerald-200"
            : type === "error"
              ? "bg-red-50 border-red-200"
              : "bg-indigo-50 border-indigo-200"
        }`}
      >
        <View
          className={`w-8 h-8 rounded-full items-center justify-center shrink-0 ${
            type === "success"
              ? "bg-emerald-100"
              : type === "error"
                ? "bg-red-100"
                : "bg-indigo-100"
          }`}
        >
          <Text className="text-sm font-bold">
            {type === "success" ? "✨" : type === "error" ? "⚠️" : "ℹ️"}
          </Text>
        </View>
        <Text
          className={`text-xs font-bold flex-1 leading-relaxed ${
            type === "success"
              ? "text-emerald-800"
              : type === "error"
                ? "text-red-800"
                : "text-indigo-800"
          }`}
        >
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}