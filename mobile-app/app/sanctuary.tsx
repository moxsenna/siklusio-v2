import React from "react";
import { View, SafeAreaView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { TwwSanctuaryModal } from "@/src/features/dashboard/TwwSanctuaryModal";

/**
 * /sanctuary route — standalone page for the TWW Sanctuary feature.
 * Wraps the existing TwwSanctuaryModal component, with onClose navigating back.
 */
export default function SanctuaryScreen() {
  const router = useRouter();

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#f8f5ff",
        minHeight: Platform.OS === "web" ? "100%" : undefined,
      }}
    >
      <View style={{ flex: 1 }}>
        <TwwSanctuaryModal onClose={handleClose} />
      </View>
    </SafeAreaView>
  );
}
