import React from "react";
import { StyleSheet, Text, View } from "react-native";
import LottieView from "lottie-react-native";

export function SiklusioLottieLoader() {
  return (
    <View style={styles.container}>
      <LottieView
        source={require("../../../assets/animations/siklusio-loader.json")}
        autoPlay
        loop
        style={styles.animation}
        resizeMode="contain"
      />
      <Text style={styles.text}>Menyiapkan ruang tenang Bunda...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  animation: {
    width: 240,
    height: 240,
  },
  text: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
    textAlign: "center",
  },
});
