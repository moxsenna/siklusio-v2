import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SiklusioExactLogoTraceLoader } from "./SiklusioExactLogoTraceLoader";

export function SiklusioLoadingScreen() {
  return (
    <View style={styles.screen}>
      <SiklusioExactLogoTraceLoader size={250} />
      <Text style={styles.title}>Siklusio</Text>
      <Text style={styles.subtitle}>Menyiapkan ruang tenang Bunda...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#fdf2f8",
  },
  title: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 20,
    color: "#475569",
    textAlign: "center",
  },
});
