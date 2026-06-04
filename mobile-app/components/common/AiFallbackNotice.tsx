import React from "react";
import { Text, TouchableOpacity, View, type ViewStyle } from "react-native";
import { buildAiFallbackCopy, type AiFallbackInput } from "../../src/lib/aiFallback";

interface Props extends AiFallbackInput {
  accentColor?: string;
  compact?: boolean;
  onRetry?: () => void;
  retryLabel?: string;
  selectableMessage?: boolean;
  style?: ViewStyle;
}

const tonePalette = {
  credit: {
    background: "#fffbeb",
    border: "#fde68a",
    title: "#92400e",
    body: "#78350f",
  },
  network: {
    background: "#eff6ff",
    border: "#bfdbfe",
    title: "#1d4ed8",
    body: "#1e3a8a",
  },
  rate_limit: {
    background: "#fff7ed",
    border: "#fed7aa",
    title: "#c2410c",
    body: "#7c2d12",
  },
  server: {
    background: "#fef2f2",
    border: "#fecaca",
    title: "#b91c1c",
    body: "#7f1d1d",
  },
} as const;

export function AiFallbackNotice({
  accentColor,
  compact = false,
  onRetry,
  retryLabel,
  selectableMessage = false,
  style,
  ...input
}: Props) {
  const copy = buildAiFallbackCopy(input);
  const palette = tonePalette[copy.tone];
  const actionColor = accentColor || palette.title;

  return (
    <View
      style={{
        backgroundColor: palette.background,
        borderColor: palette.border,
        borderRadius: compact ? 14 : 18,
        borderWidth: 1,
        gap: compact ? 5 : 7,
        padding: compact ? 11 : 14,
        ...style,
      }}
    >
      <Text style={{ color: palette.title, fontSize: compact ? 12 : 13, fontWeight: "800" }}>
        {copy.title}
      </Text>
      <Text
        selectable={selectableMessage}
        style={{ color: palette.body, fontSize: 12, lineHeight: 18, fontWeight: "600" }}
      >
        {copy.message}
      </Text>
      <Text style={{ color: palette.body, fontSize: 11, lineHeight: 16, opacity: 0.82 }}>
        {copy.helper}
      </Text>
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          activeOpacity={0.82}
          style={{
            alignSelf: "flex-start",
            backgroundColor: actionColor,
            borderRadius: 999,
            marginTop: 3,
            paddingHorizontal: 13,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>
            {retryLabel || copy.retryLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
