import React from "react";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import { whatsappStyles as styles } from "./adminWhatsappStyles";

interface AdminWhatsappPreviewPanelProps {
  previewText: string;
  warnings: string[];
  loading: boolean;
}

export function AdminWhatsappPreviewPanel({
  previewText,
  warnings,
  loading,
}: AdminWhatsappPreviewPanelProps) {
  return (
    <View style={styles.previewPanel}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>👁️ Preview Pesan (Dummy Data)</Text>
        {loading && <ActivityIndicator size="small" color="#ec4899" />}
      </View>

      {warnings.length > 0 ? (
        <View style={{ paddingVertical: 4 }}>
          {warnings.map((w, idx) => (
            <Text key={idx} style={styles.warningText}>
              ⚠️ {w}
            </Text>
          ))}
        </View>
      ) : (
        <View style={styles.previewBox}>
          <Text
            style={[
              styles.previewText,
              { fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
            ]}
          >
            {previewText}
          </Text>
        </View>
      )}
    </View>
  );
}