import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  AvatarKind,
  PRESET_AVATARS,
  resolveAvatarSource,
  uploadAvatarToR2,
  AVATAR_MAX_BYTES,
} from "@/src/lib/avatars";

export interface AvatarPickerProps {
  /** URL/preset string saat ini (yang tersimpan di profil). */
  value: string | null;
  /** 'preset' | 'custom' | null. */
  kind: AvatarKind | null;
  /** Dipanggil saat user memilih avatar baru atau menghapus. */
  onChange: (next: { url: string | null; kind: AvatarKind | null }) => void;
  /** Ukuran preview di UI (default 96). */
  size?: number;
  /** Label yang ditampilkan di atas, opsional. */
  label?: string;
}

/**
 * Komponen pemilih avatar.
 *
 * Tap preview → buka modal:
 *   - Tab "Pilih" → grid preset avatar built-in
 *   - Tab "Upload" → pilih dari gallery → upload ke R2 → kembalikan URL
 *
 * Selalu render preview lingkaran. Default ke siluet user kalau belum ada.
 */
export function AvatarPicker({ value, kind, onChange, size = 96, label }: AvatarPickerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<"preset" | "upload">("preset");
  const [uploading, setUploading] = useState(false);

  const source = resolveAvatarSource(value, kind);

  const showError = (msg: string) => {
    if (Platform.OS === "web") window.alert(msg);
    else Alert.alert("Eror", msg);
  };

  // ------------------ Upload from gallery ------------------
  const pickAndUpload = async () => {
    try {
      // Web: ImagePicker.launchImageLibraryAsync sudah support dengan input file
      // di balik layar. Tidak perlu permission khusus.
      const perm =
        Platform.OS === "web"
          ? { status: "granted" as const }
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        showError("Izin akses galeri diperlukan untuk mengunggah avatar.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];

      // Validasi ukuran
      if (asset.fileSize && asset.fileSize > AVATAR_MAX_BYTES) {
        showError("Ukuran gambar maksimal 5 MB.");
        return;
      }

      let base64 = asset.base64;
      if (!base64 && asset.uri) {
        // Fallback: di web kadang base64 belum ter-isi otomatis
        base64 = await uriToBase64(asset.uri);
      }
      if (!base64) {
        showError("Tidak dapat membaca data gambar.");
        return;
      }

      setUploading(true);
      const url = await uploadAvatarToR2(base64);
      onChange({ url, kind: "custom" });
      setModalOpen(false);
    } catch (e: any) {
      showError(e?.message || "Gagal mengunggah gambar.");
    } finally {
      setUploading(false);
    }
  };

  const handlePickPreset = (presetId: string) => {
    onChange({ url: `preset:${presetId}`, kind: "preset" });
    setModalOpen(false);
  };

  const handleClear = () => {
    onChange({ url: null, kind: null });
    setModalOpen(false);
  };

  return (
    <View>
      {label && (
        <Text
          style={{
            fontSize: 11,
            fontWeight: "bold",
            color: "#ec4899",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          {label}
        </Text>
      )}

      <TouchableOpacity
        onPress={() => setModalOpen(true)}
        accessibilityLabel="Ubah avatar"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#fce7f3",
          borderWidth: 2,
          borderColor: "#fbcfe8",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {source ? (
          <Image source={source} style={{ width: "100%", height: "100%" }} />
        ) : (
          <FontAwesome name="user" size={size * 0.45} color="#ec4899" />
        )}
        <View
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: size * 0.32,
            height: size * 0.32,
            borderRadius: (size * 0.32) / 2,
            backgroundColor: "#ec4899",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: "#fff",
          }}
        >
          <FontAwesome name="pencil" size={size * 0.13} color="#fff" />
        </View>
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !uploading && setModalOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 24,
              width: "100%",
              maxWidth: 420,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <View
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#f1e6eb",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1e1b20" }}>
                Pilih Avatar
              </Text>
              <TouchableOpacity
                onPress={() => !uploading && setModalOpen(false)}
                disabled={uploading}
              >
                <FontAwesome name="times" size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View
              style={{
                flexDirection: "row",
                gap: 6,
                padding: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#f8fafc",
              }}
            >
              {(["preset", "upload"] as const).map((t) => {
                const sel = tab === t;
                const lbl = t === "preset" ? "Pilih dari Galeri Avatar" : "Upload Sendiri";
                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setTab(t)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 12,
                      alignItems: "center",
                      backgroundColor: sel ? "#fce7f3" : "#f8fafc",
                      borderWidth: 1,
                      borderColor: sel ? "#ec4899" : "#f1e6eb",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "bold",
                        color: sel ? "#ec4899" : "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {lbl}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Content */}
            <View style={{ padding: 16, minHeight: 220 }}>
              {tab === "preset" && (
                <ScrollView
                  contentContainerStyle={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "center",
                    gap: 12,
                  }}
                  style={{ maxHeight: 320 }}
                >
                  {PRESET_AVATARS.map((preset) => {
                    const isCurrent = kind === "preset" && value === `preset:${preset.id}`;
                    return (
                      <TouchableOpacity
                        key={preset.id}
                        onPress={() => handlePickPreset(preset.id)}
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 40,
                          overflow: "hidden",
                          borderWidth: isCurrent ? 3 : 1,
                          borderColor: isCurrent ? "#ec4899" : "#f1e6eb",
                        }}
                      >
                        <Image source={preset.source} style={{ width: "100%", height: "100%" }} />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {tab === "upload" && (
                <View style={{ alignItems: "center", gap: 12, paddingVertical: 12 }}>
                  <View
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: 44,
                      backgroundColor: "#fcf8fa",
                      borderWidth: 2,
                      borderStyle: "dashed",
                      borderColor: "#fbcfe8",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FontAwesome name="cloud-upload" size={32} color="#ec4899" />
                  </View>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      textAlign: "center",
                      maxWidth: 280,
                      lineHeight: 18,
                    }}
                  >
                    Pilih foto dari galerimu (maks 5 MB). Foto akan disimpan dengan aman di cloud
                    dan ditampilkan di komunitasmu.
                  </Text>
                  <TouchableOpacity
                    onPress={pickAndUpload}
                    disabled={uploading}
                    style={{
                      marginTop: 4,
                      backgroundColor: uploading ? "#fbcfe8" : "#ec4899",
                      paddingHorizontal: 24,
                      paddingVertical: 12,
                      borderRadius: 18,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <FontAwesome name="image" size={14} color="#fff" />
                    )}
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "bold",
                        color: "#fff",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {uploading ? "Mengunggah..." : "Pilih dari Galeri"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Footer */}
            {value && !uploading && (
              <View
                style={{
                  padding: 12,
                  borderTopWidth: 1,
                  borderTopColor: "#f8fafc",
                }}
              >
                <TouchableOpacity
                  onPress={handleClear}
                  style={{
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor: "#fef2f2",
                    borderWidth: 1,
                    borderColor: "#fee2e2",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "bold",
                      color: "#ef4444",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Hapus Avatar
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ------------------ helpers ------------------

async function uriToBase64(uri: string): Promise<string> {
  // Web FileReader fallback
  if (Platform.OS === "web") {
    const r = await fetch(uri);
    const blob = await r.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const idx = result.indexOf(",");
        resolve(idx >= 0 ? result.slice(idx + 1) : result);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(blob);
    });
  }
  // expo-image-picker biasanya sudah include base64 ketika `base64: true`
  return "";
}
