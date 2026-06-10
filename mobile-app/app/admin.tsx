import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, Alert, Platform } from "react-native";
import { router } from "expo-router";
import { supabase } from "../src/lib/supabase";
import { getSupabaseClientStatus } from "../src/lib/supabaseAccess";
import AdminAffiliatePanel from "@/src/features/admin/AdminAffiliatePanel";
import AdminCrmPanel from "@/src/features/admin/AdminCrmPanel";
import AdminWhatsappAutoresponderPanel from "@/src/features/admin/AdminWhatsappAutoresponderPanel";
import AdminUsersPanel from "@/src/features/admin/AdminUsersPanel";
import AdminCouponsPanel from "@/src/features/admin/AdminCouponsPanel";
import AdminModerationPanel from "@/src/features/admin/AdminModerationPanel";
import { AdminHeader } from "@/src/features/admin/AdminHeader";
import { AdminTabs } from "@/src/features/admin/AdminTabs";
import type { AdminTab } from "@/src/features/admin/adminTypes";

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [userCount, setUserCount] = useState(0);
  const [modPendingCount, setModPendingCount] = useState(0);

  const handleUserCountChange = useCallback((count: number) => {
    setUserCount(count);
  }, []);

  const handlePendingCountChange = useCallback((count: number) => {
    setModPendingCount(count);
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      document.body.classList.add("admin-page-fullwidth");
      return () => {
        document.body.classList.remove("admin-page-fullwidth");
      };
    }
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      const status = getSupabaseClientStatus(supabase);
      if (!status.ready) {
        setIsAdmin(false);
        return;
      }
      try {
        const client = status.client;
        const {
          data: { session },
        } = await client.auth.getSession();
        if (!session) {
          setIsAdmin(false);
          return;
        }
        const { data: profile, error } = await client
          .from("profiles")
          .select("is_admin")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error || !profile?.is_admin) {
          setIsAdmin(false);
        } else {
          setIsAdmin(true);
        }
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    if (isAdmin === false) {
      if (Platform.OS === "web") {
        router.replace("/");
      } else {
        Alert.alert("Akses Ditolak", "Hanya administrator yang dapat mengakses halaman ini.", [
          { text: "OK", onPress: () => router.replace("/") },
        ]);
      }
    }
  }, [isAdmin]);

  if (isAdmin === null) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}
      >
        <ActivityIndicator size="large" color="#ec4899" />
        <Text
          style={{
            marginTop: 16,
            fontSize: 13,
            color: "#64748b",
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: 1.5,
          }}
        >
          Memverifikasi Akses Admin...
        </Text>
      </View>
    );
  }

  if (isAdmin === false) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fcf8fa" }}>
      <View>
        <AdminHeader activeTab={activeTab} />
        <View style={{ paddingHorizontal: 24, paddingBottom: 16, backgroundColor: "#fff" }}>
          <AdminTabs
            activeTab={activeTab}
            userCount={userCount}
            modPendingCount={modPendingCount}
            onTabChange={setActiveTab}
          />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {activeTab === "users" && (
          <AdminUsersPanel isActive={activeTab === "users"} onUserCountChange={handleUserCountChange} />
        )}
        {activeTab === "moderation" && (
          <AdminModerationPanel
            isActive={activeTab === "moderation"}
            onPendingCountChange={handlePendingCountChange}
          />
        )}
        {activeTab === "coupons" && <AdminCouponsPanel isActive={activeTab === "coupons"} />}
        {activeTab === "crm" && <AdminCrmPanel />}
        {activeTab === "affiliates" && <AdminAffiliatePanel />}
        {activeTab === "whatsapp" && <AdminWhatsappAutoresponderPanel />}
      </ScrollView>
    </View>
  );
}