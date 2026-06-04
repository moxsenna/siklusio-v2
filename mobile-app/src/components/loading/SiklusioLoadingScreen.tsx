import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { SiklusioLottieLoader } from "./SiklusioLottieLoader";

export function SiklusioLoadingScreen() {
  return (
    <View style={styles.container}>
      <SiklusioLottieLoader />
      <Text style={styles.subtitle}>Promil lebih terarah, hati lebih tenang.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fdf2f8",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  subtitle: {
    marginTop: 16,
    fontSize: 14,
    color: "#db2777",
    fontWeight: "600",
    textAlign: "center",
    opacity: 0.8,
  },
});
