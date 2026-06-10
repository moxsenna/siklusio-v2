import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { apiGetJson, apiPostJson, apiPatchJson, apiDeleteJson } from "@/src/lib/api";
import type { AdminCoupon, NewCouponForm } from "./adminTypes";
import { formatRelative } from "./adminUtils";

interface AdminCouponsPanelProps {
  isActive: boolean;
}

export default function AdminCouponsPanel({ isActive }: AdminCouponsPanelProps) {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponsError, setCouponsError] = useState<string | null>(null);
  const [newCoupon, setNewCoupon] = useState<NewCouponForm>({
    code: "",
    discount_type: "nominal",
    discount_value: "",
  });
  const [isSubmittingCoupon, setIsSubmittingCoupon] = useState(false);

  const fetchCoupons = async () => {
    setCouponsLoading(true);
    setCouponsError(null);
    try {
      const data = await apiGetJson<{ coupons: AdminCoupon[] }>("/api/admin/coupons");
      setCoupons(data.coupons || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal memuat daftar kupon.";
      setCouponsError(message);
    } finally {
      setCouponsLoading(false);
    }
  };

  useEffect(() => {
    if (isActive) {
      fetchCoupons();
    }
  }, [isActive]);

  const handleCreateCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discount_value) return;
    setIsSubmittingCoupon(true);
    try {
      await apiPostJson("/api/admin/coupons", {
        code: newCoupon.code,
        discount_type: newCoupon.discount_type,
        discount_value: Number(newCoupon.discount_value),
      });
      setNewCoupon({ code: "", discount_type: "nominal", discount_value: "" });
      fetchCoupons();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal membuat kupon.";
      Alert.alert("Gagal", message);
    } finally {
      setIsSubmittingCoupon(false);
    }
  };

  const handleToggleCoupon = async (id: string, currentStatus: boolean) => {
    try {
      await apiPatchJson(`/api/admin/coupons/${id}`, { is_active: !currentStatus });
      fetchCoupons();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal mengubah status kupon.";
      Alert.alert("Gagal", message);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    Alert.alert("Hapus Kupon", "Yakin ingin menghapus kode kupon ini secara permanen?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await apiDeleteJson(`/api/admin/coupons/${id}`);
            fetchCoupons();
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Gagal menghapus kupon.";
            Alert.alert("Gagal", message);
          }
        },
      },
    ]);
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1e1b20" }}>
          🎫 Manajemen Kupon Diskon
        </Text>
        <TouchableOpacity
          onPress={fetchCoupons}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#f1e6eb",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FontAwesome name="refresh" size={14} color="#ec4899" />
        </TouchableOpacity>
      </View>

      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 24,
          borderWidth: 1,
          borderColor: "#f1e6eb",
          padding: 20,
          gap: 12,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "bold", color: "#1e1b20" }}>Buat Kupon Baru</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <TextInput
            placeholder="KODE KUPON (contoh: PROMO2024)"
            autoCapitalize="characters"
            value={newCoupon.code}
            onChangeText={(val) =>
              setNewCoupon((prev) => ({
                ...prev,
                code: val.toUpperCase().replace(/\s/g, ""),
              }))
            }
            style={{
              flex: 1,
              minWidth: 200,
              height: 44,
              borderRadius: 12,
              backgroundColor: "#f8fafc",
              paddingHorizontal: 16,
              fontSize: 13,
              color: "#1e1b20",
              fontWeight: "bold",
            }}
          />

          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#f8fafc",
              borderRadius: 12,
              overflow: "hidden",
              height: 44,
            }}
          >
            <TouchableOpacity
              onPress={() => setNewCoupon((prev) => ({ ...prev, discount_type: "nominal" }))}
              style={{
                paddingHorizontal: 16,
                justifyContent: "center",
                backgroundColor: newCoupon.discount_type === "nominal" ? "#ec4899" : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "bold",
                  color: newCoupon.discount_type === "nominal" ? "#fff" : "#64748b",
                }}
              >
                Nominal (Rp)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setNewCoupon((prev) => ({ ...prev, discount_type: "percentage" }))}
              style={{
                paddingHorizontal: 16,
                justifyContent: "center",
                backgroundColor:
                  newCoupon.discount_type === "percentage" ? "#ec4899" : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "bold",
                  color: newCoupon.discount_type === "percentage" ? "#fff" : "#64748b",
                }}
              >
                Persen (%)
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            placeholder={
              newCoupon.discount_type === "nominal"
                ? "Nominal Diskon (Rp)"
                : "Persentase Diskon (0-100)"
            }
            keyboardType="numeric"
            value={newCoupon.discount_value}
            onChangeText={(val) =>
              setNewCoupon((prev) => ({
                ...prev,
                discount_value: val.replace(/[^0-9]/g, ""),
              }))
            }
            style={{
              flex: 1,
              minWidth: 150,
              height: 44,
              borderRadius: 12,
              backgroundColor: "#f8fafc",
              paddingHorizontal: 16,
              fontSize: 13,
              color: "#1e1b20",
            }}
          />
        </View>

        {newCoupon.discount_type === "percentage" && newCoupon.discount_value === "100" && (
          <Text style={{ fontSize: 12, color: "#10b981", fontWeight: "bold", marginTop: -4 }}>
            ✨ Kupon Gratis 100%! Pendaftar otomatis bypass Mayar dan langsung berhasil.
          </Text>
        )}

        <TouchableOpacity
          onPress={handleCreateCoupon}
          disabled={isSubmittingCoupon || !newCoupon.code || !newCoupon.discount_value}
          style={{
            height: 44,
            borderRadius: 12,
            backgroundColor: !newCoupon.code || !newCoupon.discount_value ? "#e2e8f0" : "#ec4899",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "bold",
              color: !newCoupon.code || !newCoupon.discount_value ? "#94a3b8" : "#fff",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {isSubmittingCoupon ? "Menyimpan..." : "Simpan Kupon"}
          </Text>
        </TouchableOpacity>
      </View>

      {couponsError && (
        <View
          style={{
            backgroundColor: "#fef2f2",
            borderColor: "#fee2e2",
            borderWidth: 1,
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 18 }}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: "#991b1b" }}>
              Gagal Mengambil Data Kupon
            </Text>
            <Text style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>{couponsError}</Text>
          </View>
        </View>
      )}

      {couponsLoading ? (
        <ActivityIndicator size="large" color="#ec4899" style={{ marginVertical: 40 }} />
      ) : coupons.length === 0 ? (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 24,
            borderWidth: 1,
            borderColor: "#f1e6eb",
            padding: 32,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 14, color: "#94a3b8", fontWeight: "bold" }}>
            Belum ada kupon yang dibuat.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {coupons.map((coupon) => (
            <View
              key={coupon.id}
              style={{
                backgroundColor: "#fff",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "#f1e6eb",
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                opacity: coupon.is_active ? 1 : 0.6,
              }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: "#1e1b20",
                    fontFamily: "monospace",
                  }}
                >
                  {coupon.code}
                </Text>
                <Text style={{ fontSize: 13, color: "#ec4899", fontWeight: "bold" }}>
                  {coupon.discount_type === "nominal"
                    ? `Potongan Rp ${coupon.discount_value.toLocaleString("id-ID")}`
                    : `Diskon ${coupon.discount_value}%`}
                  {coupon.discount_type === "percentage" && coupon.discount_value == 100
                    ? " (KUPON GRATIS 100%)"
                    : ""}
                </Text>
                <Text style={{ fontSize: 11, color: "#94a3b8" }}>
                  Dibuat pada {formatRelative(coupon.created_at)}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TouchableOpacity
                  onPress={() => handleToggleCoupon(coupon.id, coupon.is_active)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    backgroundColor: coupon.is_active ? "#fef2f2" : "#dcfce7",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "bold",
                      color: coupon.is_active ? "#b91c1c" : "#15803d",
                    }}
                  >
                    {coupon.is_active ? "Nonaktifkan" : "Aktifkan"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteCoupon(coupon.id)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "#f1f5f9",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FontAwesome name="trash" size={14} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}