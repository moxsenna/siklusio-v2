import React from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { whatsappStyles as styles } from "./adminWhatsappStyles";

interface AdminWhatsappTestSendPanelProps {
  testPhone: string;
  isTesting: boolean;
  onTestPhoneChange: (value: string) => void;
  onSendTest: () => void;
}

export function AdminWhatsappTestSendPanel({
  testPhone,
  isTesting,
  onTestPhoneChange,
  onSendTest,
}: AdminWhatsappTestSendPanelProps) {
  return (
    <View style={styles.testPanel}>
      <Text style={styles.testTitle}>🧪 Uji Coba Pengiriman Langsung</Text>

      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <TextInput
          placeholder="Contoh: 081234567890"
          keyboardType="phone-pad"
          value={testPhone}
          onChangeText={onTestPhoneChange}
          style={styles.testPhoneInput}
        />

        <TouchableOpacity
          onPress={onSendTest}
          disabled={isTesting || !testPhone.trim()}
          style={[
            styles.testSendButton,
            { backgroundColor: testPhone.trim() ? "#9333ea" : "#e2e8f0" },
          ]}
        >
          {isTesting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <FontAwesome name="paper-plane" size={12} color="#fff" />
          )}
          <Text style={styles.testSendButtonText}>Kirim Test WA</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}