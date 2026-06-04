import React, { useState } from "react";
import { ActivityIndicator, SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";
import { useAuth } from "../src/context/AuthContext";
import { isPaymentPendingUser } from "../src/lib/paymentAccess";
import { getSupabaseClientStatus } from "../src/lib/supabaseAccess";

export default function PaymentPendingScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [message, setMessage] = useState(
    "Akunmu sudah dibuat, tapi akses premium masih menunggu konfirmasi pembayaran Mayar.",
  );

  const refreshPaymentStatus = async () => {
    const status = getSupabaseClientStatus(supabase);
    if (!status.ready) {
      setMessage("Konfigurasi Supabase belum tersedia di aplikasi.");
      return;
    }

    setIsChecking(true);
    try {
      const { data, error } = await status.client.auth.refreshSession();
      if (error) throw error;

      if (!isPaymentPendingUser(data.user)) {
        router.replace("/");
        return;
      }

      setMessage(
        "Pembayaran belum terkonfirmasi. Jika baru saja membayar, tunggu sebentar lalu cek ulang.",
      );
    } catch (error: any) {
      setMessage(error?.message || "Gagal mengecek status pembayaran.");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fdf2f8" }}>
      <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <View
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 28,
            padding: 24,
            borderWidth: 1,
            borderColor: "#fbcfe8",
          }}
        >
          <Text style={{ fontSize: 28, fontWeight: "800", color: "#831843", marginBottom: 12 }}>
            Pembayaran Belum Aktif
          </Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: "#475569", marginBottom: 16 }}>
            {message}
          </Text>
          {user?.email ? (
            <Text style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
              Email akun: {user.email}
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={refreshPaymentStatus}
            disabled={isChecking}
            style={{
              backgroundColor: "#ec4899",
              borderRadius: 18,
              paddingVertical: 14,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            {isChecking ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={{ color: "#ffffff", fontWeight: "800" }}>
                Saya Sudah Bayar, Cek Ulang
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={signOut}
            style={{
              borderColor: "#f9a8d4",
              borderWidth: 1,
              borderRadius: 18,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#be185d", fontWeight: "800" }}>Keluar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
