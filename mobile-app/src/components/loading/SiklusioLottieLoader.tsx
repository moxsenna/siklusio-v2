import React from "react";
import { StyleSheet, Text, View } from "react-native";
import LottieView from "lottie-react-native";

export function SiklusioLottieLoader({
  text = "Menyiapkan ruang tenang Bunda...",
  size = 240,
}: {
  text?: string;
  size?: number;
}) {
  return (
    <View style={styles.container}>
      <LottieView
        source={require("../../../assets/animations/siklusio-loader.json")}
        autoPlay
        loop
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
      {text ? <Text style={styles.text}>{text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "500",
    color: "#475569",
    textAlign: "center",
  },
});
