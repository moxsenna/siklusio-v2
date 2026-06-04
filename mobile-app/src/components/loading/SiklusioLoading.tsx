import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SiklusioExactLogoTraceLoader } from "./SiklusioExactLogoTraceLoader";

type SiklusioLoadingProps = {
  variant?: "fullscreen" | "ai" | "inline" | "modal";
  title?: string;
};

export function SiklusioLoading({ variant = "inline", title }: SiklusioLoadingProps) {
  if (variant === "fullscreen") {
    return (
      <View style={styles.fullscreen}>
        <SiklusioExactLogoTraceLoader size={220} />
        <Text style={styles.fullscreenTitle}>Siklusio</Text>
        <Text style={styles.fullscreenSubtitle}>{title || "Menyiapkan ruang tenang Bunda..."}</Text>
      </View>
    );
  }

  if (variant === "ai") {
    return (
      <View style={styles.aiContainer}>
        <SiklusioExactLogoTraceLoader size={160} />
        <Text style={styles.aiText}>{title || "AI sedang menyusun panduan Bunda..."}</Text>
      </View>
    );
  }

  if (variant === "modal") {
    return (
      <View style={styles.modalContainer}>
        <SiklusioExactLogoTraceLoader size={140} />
        <Text style={styles.modalText}>{title || "Sebentar ya, Bunda..."}</Text>
      </View>
    );
  }

  // Inline variant
  return (
    <View style={styles.inlineContainer}>
      <SiklusioExactLogoTraceLoader size={80} />
      {title && <Text style={styles.inlineText}>{title}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fdf2f8",
    paddingHorizontal: 24,
  },
  fullscreenTitle: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: 0.2,
  },
  fullscreenSubtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 20,
    color: "#475569",
    textAlign: "center",
  },
  aiContainer: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  aiText: {
    marginTop: 12,
    fontSize: 12,
    fontWeight: "700",
    color: "#9333ea",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  modalContainer: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  modalText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#db2777",
    textAlign: "center",
  },
  inlineContainer: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "500",
    color: "#475569",
    textAlign: "center",
  },
});
