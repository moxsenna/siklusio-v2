import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Clipboard,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { useAffiliate } from "../src/hooks/useAffiliate";
import { formatRelative } from "date-fns";

export default function AffiliatePage() {
  const router = useRouter();
  const {
    affiliate,
    conversions,
    loading,
    error,
    fetchProfile,
    fetchConversions,
    registerAffiliate,
    updateBankInfo,
  } = useAffiliate();

  const [registering, setRegistering] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Registration Form
  const [code, setCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [accNumber, setAccNumber] = useState("");
  const [accHolder, setAccHolder] = useState("");

  // Bank Info Update Form
  const [editBank, setEditBank] = useState(false);
  const [updateBankName, setUpdateBankName] = useState("");
  const [updateAccNumber, setUpdateAccNumber] = useState("");
  const [updateAccHolder, setUpdateAccHolder] = useState("");

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (affiliate) {
      fetchConversions();
      setUpdateBankName(affiliate.bank_name || "");
      setUpdateAccNumber(affiliate.account_number || "");
      setUpdateAccHolder(affiliate.account_holder || "");
    }
  }, [affiliate, fetchConversions]);

  const handleRegister = async () => {
    if (!code) {
      Alert.alert("Eror", "Kode referal tidak boleh kosong.");
      return;
    }
    setRegistering(true);
    try {
      await registerAffiliate({
        code,
        bank_name: bankName,
        account_number: accNumber,
        account_holder: accHolder,
      });
      Alert.alert("Berhasil", "Pendaftaran afiliasi sukses!");
    } catch (err: any) {
      Alert.alert("Gagal", err.message);
    } finally {
      setRegistering(false);
    }
  };

  const handleUpdateBank = async () => {
    setUpdating(true);
    try {
      await updateBankInfo({
        bank_name: updateBankName,
        account_number: updateAccNumber,
        account_holder: updateAccHolder,
      });
      setEditBank(false);
      Alert.alert("Berhasil", "Informasi bank diperbarui.");
    } catch (err: any) {
      Alert.alert("Gagal", err.message);
    } finally {
      setUpdating(false);
    }
  };

  const copyLink = () => {
    if (!affiliate) return;
    const link = `https://siklusio.web.id/checkout.html?ref=${affiliate.code}`;
    // Using simple clipboard since expo-clipboard might not be installed
    if (Platform.OS === "web") {
      navigator.clipboard
        .writeText(link)
        .then(() => window.alert("Link tersalin!"))
        .catch(() => {});
    } else {
      Clipboard.setString(link);
      Alert.alert("Tersalin", "Link pendaftaran berhasil disalin ke clipboard.");
    }
  };

  const formatRupiah = (val: number) => `Rp ${val.toLocaleString("id-ID")}`;

  if (loading && !affiliate) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fcf8fa",
        }}
      >
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fcf8fa" }}>
      <Stack.Screen options={{ title: "Program Afiliasi", headerBackTitle: "Pengaturan" }} />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60, gap: 24 }}>
        {error && (
          <View
            style={{
              backgroundColor: "#fef2f2",
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#fee2e2",
            }}
          >
            <Text style={{ color: "#991b1b", fontWeight: "bold" }}>{error}</Text>
          </View>
        )}

        {/* NOT REGISTERED YET */}
        {!affiliate && !loading && (
          <View style={{ gap: 16 }}>
            <View
              style={{
                backgroundColor: "#fff",
                padding: 24,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: "#fce7f3",
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "#fdf2f8",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <FontAwesome name="gift" size={24} color="#ec4899" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: "bold", color: "#1e1b20", marginBottom: 8 }}>
                Gabung Program Afiliasi 🌸
              </Text>
              <Text style={{ fontSize: 14, color: "#64748b", lineHeight: 22 }}>
                Bantu bunda lain berikhtiar promil dan dapatkan komisi tambahan untuk tabungan
                promil Bunda! Buat kode referal Bunda sendiri sekarang.
              </Text>
            </View>

            <View
              style={{
                backgroundColor: "#fff",
                padding: 24,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                gap: 16,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1e1b20" }}>
                Formulir Pendaftaran
              </Text>

              <View style={{ gap: 8 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "bold",
                    color: "#64748b",
                    textTransform: "uppercase",
                  }}
                >
                  Kode Referal (Unik)
                </Text>
                <TextInput
                  value={code}
                  onChangeText={(t) => setCode(t.toUpperCase().replace(/\s/g, ""))}
                  placeholder="Contoh: BUNDADINA"
                  autoCapitalize="characters"
                  style={{
                    backgroundColor: "#f8fafc",
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 14,
                    fontWeight: "bold",
                  }}
                />
                <Text style={{ fontSize: 11, color: "#94a3b8" }}>
                  *Kode ini juga akan otomatis menjadi kupon diskon 10% untuk teman Bunda.
                </Text>
              </View>

              <View style={{ height: 1, backgroundColor: "#f1f5f9", marginVertical: 8 }} />

              <Text style={{ fontSize: 14, fontWeight: "bold", color: "#1e1b20" }}>
                Info Pencairan Komisi (Opsional)
              </Text>

              <View style={{ gap: 8 }}>
                <TextInput
                  value={bankName}
                  onChangeText={setBankName}
                  placeholder="Nama Bank / E-Wallet (mis. BCA, GoPay)"
                  style={{
                    backgroundColor: "#f8fafc",
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 14,
                  }}
                />
                <TextInput
                  value={accNumber}
                  onChangeText={setAccNumber}
                  placeholder="Nomor Rekening / No. HP"
                  keyboardType="numeric"
                  style={{
                    backgroundColor: "#f8fafc",
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 14,
                  }}
                />
                <TextInput
                  value={accHolder}
                  onChangeText={setAccHolder}
                  placeholder="Nama Pemilik Rekening"
                  style={{
                    backgroundColor: "#f8fafc",
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 14,
                  }}
                />
              </View>

              <TouchableOpacity
                onPress={handleRegister}
                disabled={registering}
                style={{
                  backgroundColor: "#ec4899",
                  padding: 16,
                  borderRadius: 16,
                  alignItems: "center",
                  marginTop: 8,
                }}
              >
                {registering ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 15 }}>
                    Daftar Sekarang
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ALREADY REGISTERED */}
        {affiliate && (
          <View style={{ gap: 24 }}>
            {/* Dashboard Card */}
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 24,
                borderWidth: 1,
                borderColor: "#fce7f3",
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  backgroundColor: "#fdf2f8",
                  padding: 24,
                  alignItems: "center",
                  borderBottomWidth: 1,
                  borderBottomColor: "#fce7f3",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "bold",
                    color: "#db2777",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    marginBottom: 8,
                  }}
                >
                  Kode Referal Bunda
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    backgroundColor: "#fff",
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 16,
                    shadowColor: "#ec4899",
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "900",
                      color: "#1e1b20",
                      fontFamily: "monospace",
                    }}
                  >
                    {affiliate.code}
                  </Text>
                  <TouchableOpacity
                    onPress={copyLink}
                    style={{ backgroundColor: "#fef2f2", padding: 8, borderRadius: 8 }}
                  >
                    <FontAwesome name="copy" size={16} color="#ec4899" />
                  </TouchableOpacity>
                </View>
                <Text
                  style={{ fontSize: 12, color: "#64748b", marginTop: 12, textAlign: "center" }}
                >
                  Bagikan link otomatis:{"\n"}
                  <Text style={{ fontWeight: "bold", color: "#ec4899" }}>
                    siklusio.web.id/checkout.html?ref={affiliate.code}
                  </Text>
                </Text>
              </View>

              <View style={{ padding: 24 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1e1b20" }}>
                    Pencairan Komisi
                  </Text>
                  <TouchableOpacity onPress={() => setEditBank(!editBank)}>
                    <Text style={{ fontSize: 12, fontWeight: "bold", color: "#ec4899" }}>
                      {editBank ? "Batal" : "Ubah Info Bank"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {editBank ? (
                  <View style={{ gap: 12 }}>
                    <TextInput
                      value={updateBankName}
                      onChangeText={setUpdateBankName}
                      placeholder="Nama Bank"
                      style={{
                        backgroundColor: "#f8fafc",
                        borderWidth: 1,
                        borderColor: "#e2e8f0",
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 13,
                      }}
                    />
                    <TextInput
                      value={updateAccNumber}
                      onChangeText={setUpdateAccNumber}
                      placeholder="No Rekening"
                      keyboardType="numeric"
                      style={{
                        backgroundColor: "#f8fafc",
                        borderWidth: 1,
                        borderColor: "#e2e8f0",
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 13,
                      }}
                    />
                    <TextInput
                      value={updateAccHolder}
                      onChangeText={setUpdateAccHolder}
                      placeholder="Nama Pemilik"
                      style={{
                        backgroundColor: "#f8fafc",
                        borderWidth: 1,
                        borderColor: "#e2e8f0",
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 13,
                      }}
                    />
                    <TouchableOpacity
                      onPress={handleUpdateBank}
                      disabled={updating}
                      style={{
                        backgroundColor: "#10b981",
                        padding: 12,
                        borderRadius: 12,
                        alignItems: "center",
                      }}
                    >
                      {updating ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 13 }}>
                          Simpan Perubahan
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: "#f8fafc",
                      padding: 16,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                    }}
                  >
                    {affiliate.bank_name ? (
                      <>
                        <Text style={{ fontSize: 14, fontWeight: "bold", color: "#1e1b20" }}>
                          {affiliate.bank_name} - {affiliate.account_number}
                        </Text>
                        <Text style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                          a.n {affiliate.account_holder}
                        </Text>
                      </>
                    ) : (
                      <Text style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>
                        Informasi bank belum diisi.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* Conversions History */}
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "#1e1b20" }}>
                Riwayat Komisi ({conversions.length})
              </Text>

              {conversions.length === 0 ? (
                <View
                  style={{
                    backgroundColor: "#fff",
                    padding: 24,
                    borderRadius: 16,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#e2e8f0",
                  }}
                >
                  <Text style={{ fontSize: 13, color: "#94a3b8" }}>Belum ada riwayat komisi.</Text>
                </View>
              ) : (
                conversions.map((conv) => (
                  <View
                    key={conv.id}
                    style={{
                      backgroundColor: "#fff",
                      padding: 16,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 14, fontWeight: "bold", color: "#1e1b20" }}>
                        Pembeli: {conv.buyer_name}
                      </Text>
                      <Text style={{ fontSize: 11, color: "#94a3b8" }}>
                        {formatRelative(new Date(conv.created_at), new Date())}
                      </Text>
                      <View
                        style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}
                      >
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: conv.payout_status === "paid" ? "#10b981" : "#f59e0b",
                          }}
                        />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "bold",
                            color: conv.payout_status === "paid" ? "#10b981" : "#f59e0b",
                          }}
                        >
                          {conv.payout_status === "paid" ? "SUDAH DITRANSFER" : "BELUM DITRANSFER"}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 16, fontWeight: "900", color: "#10b981" }}>
                        + {formatRupiah(conv.commission_amount)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
