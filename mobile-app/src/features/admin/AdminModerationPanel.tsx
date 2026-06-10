import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { supabase } from "@/src/lib/supabase";
import { getSupabaseClientStatus } from "@/src/lib/supabaseAccess";
import type { AdminModerationQueueRow, ModerationFilter, QueueItem } from "./adminTypes";
import { buildModerationQueue, formatRelative } from "./adminUtils";

interface AdminModerationPanelProps {
  isActive: boolean;
  onPendingCountChange: (count: number) => void;
}

export default function AdminModerationPanel({
  isActive,
  onPendingCountChange,
}: AdminModerationPanelProps) {
  const [modFilter, setModFilter] = useState<ModerationFilter>("pending");
  const [modLoading, setModLoading] = useState(false);
  const [modError, setModError] = useState<string | null>(null);
  const [moderationRows, setModerationRows] = useState<AdminModerationQueueRow[]>([]);
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [expandedQueueKey, setExpandedQueueKey] = useState<string | null>(null);

  const fetchModeration = useCallback(async () => {
    const status = getSupabaseClientStatus(supabase);
    if (!status.ready) {
      setModError("Supabase client tidak terkonfigurasi.");
      return;
    }
    setModLoading(true);
    setModError(null);
    try {
      const { data: rows, error } = await status.client.rpc("admin_get_moderation_queue", {
        p_filter: modFilter,
      });
      if (error) throw error;
      setModerationRows((rows || []) as AdminModerationQueueRow[]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal memuat data moderasi.";
      setModError(message);
    } finally {
      setModLoading(false);
    }
  }, [modFilter]);

  useEffect(() => {
    if (isActive) {
      fetchModeration();
    }
  }, [isActive, fetchModeration]);

  const moderationQueue: QueueItem[] = useMemo(
    () => buildModerationQueue(moderationRows),
    [moderationRows],
  );

  useEffect(() => {
    onPendingCountChange(moderationQueue.filter((q) => !q.reviewedAt).length);
  }, [moderationQueue, onPendingCountChange]);

  const handleModerateAction = async (item: QueueItem, action: "keep" | "remove") => {
    const status = getSupabaseClientStatus(supabase);
    if (!status.ready) {
      setModError("Supabase client tidak terkonfigurasi.");
      return;
    }

    const actionText = action === "remove" ? "menyembunyikan" : "mempertahankan";
    const performAction = async () => {
      setActingKey(item.key);
      setModError(null);
      try {
        const { error: rpcErr } = await status.client.rpc("admin_moderate_target", {
          p_target_type: item.target_type,
          p_target_id: item.target_id,
          p_action: action,
        });
        if (rpcErr) throw rpcErr;
        await fetchModeration();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Gagal mengeksekusi moderasi.";
        setModError(message);
      } finally {
        setActingKey(null);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Konfirmasi untuk ${actionText} postingan/komentar ini?`)) {
        performAction();
      }
    } else {
      Alert.alert(
        "Konfirmasi Moderasi",
        `Apakah Anda yakin ingin ${actionText} postingan/komentar ini?`,
        [
          { text: "Batal", style: "cancel" },
          { text: "Ya, Lakukan", style: "destructive", onPress: performAction },
        ],
      );
    }
  };

  const handleResetAvatar = async (item: QueueItem) => {
    const status = getSupabaseClientStatus(supabase);
    if (!status.ready) {
      setModError("Supabase client tidak terkonfigurasi.");
      return;
    }

    const performReset = async () => {
      setActingKey(`avatar:${item.key}`);
      setModError(null);
      try {
        const { error: rpcErr } = await status.client.rpc("admin_reset_user_avatar", {
          p_user_id: item.authorId,
        });
        if (rpcErr) throw rpcErr;
        await fetchModeration();
        const okMsg = "Avatar pengguna telah direset.";
        if (Platform.OS === "web") window.alert(okMsg);
        else Alert.alert("Berhasil", okMsg);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Gagal mereset avatar pengguna.";
        setModError(message);
      } finally {
        setActingKey(null);
      }
    };

    const msg =
      `Reset avatar untuk pengguna "${item.authorRealLabel}"?\n\n` +
      `Avatar akan dihapus dan pengguna harus memilih ulang. Gunakan ini ` +
      `kalau avatar yang diunggah melanggar aturan komunitas.`;

    if (Platform.OS === "web") {
      if (window.confirm(msg)) performReset();
    } else {
      Alert.alert("Reset Avatar Pengguna", msg, [
        { text: "Batal", style: "cancel" },
        { text: "Ya, Reset", style: "destructive", onPress: performReset },
      ]);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            gap: 4,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#f1e6eb",
            borderRadius: 20,
            padding: 4,
            flex: 1,
            minWidth: 260,
          }}
        >
          {(["pending", "reviewed", "all"] as const).map((f) => {
            const isSel = modFilter === f;
            const lbl = f === "pending" ? "Menunggu" : f === "reviewed" ? "Direview" : "Semua";
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setModFilter(f)}
                style={{
                  flex: 1,
                  paddingVertical: 6,
                  borderRadius: 16,
                  backgroundColor: isSel ? "#ec4899" : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "bold",
                    color: isSel ? "#fff" : "#64748b",
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

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text
            style={{
              fontSize: 11,
              color: "#64748b",
              fontWeight: "bold",
              textTransform: "uppercase",
            }}
          >
            {moderationQueue.length} Item
          </Text>
          <TouchableOpacity
            onPress={fetchModeration}
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
      </View>

      {modError && (
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
              Gagal Mengambil Laporan
            </Text>
            <Text style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>{modError}</Text>
          </View>
        </View>
      )}

      {modLoading ? (
        <View style={{ paddingVertical: 48, alignItems: "center" }}>
          <ActivityIndicator size="large" color="#ec4899" />
        </View>
      ) : moderationQueue.length === 0 ? (
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 24,
            borderWidth: 1,
            borderColor: "#f1e6eb",
            padding: 32,
            alignItems: "center",
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 32 }}>🚩</Text>
          <Text
            style={{
              fontSize: 14,
              color: "#94a3b8",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            {modFilter === "pending"
              ? "Tidak ada laporan yang menunggu moderasi!"
              : "Antrian kosong."}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {moderationQueue.map((item) => {
            const isActing = actingKey === item.key;
            const isExpandedReports = expandedQueueKey === item.key;

            return (
              <View
                key={item.key}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: "#f1e6eb",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.02,
                  shadowRadius: 8,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    backgroundColor: "#faf5f8",
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: "#f1e6eb",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "bold",
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                      color: item.target_type === "post" ? "#ec4899" : "#3b82f6",
                      backgroundColor: item.target_type === "post" ? "#fce7f3" : "#dbeafe",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.target_type === "post" ? "Postingan" : "Komentar"}
                  </Text>

                  <Text style={{ fontSize: 11, fontWeight: "bold", color: "#dc2626" }}>
                    🚩 {item.reportCount} Laporan
                  </Text>

                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "bold",
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 8,
                      color: item.is_hidden ? "#d97706" : "#15803d",
                      backgroundColor: item.is_hidden ? "#fef3c7" : "#dcfce7",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.is_hidden ? "🚫 Tersembunyi" : "👁️ Tampil"}
                  </Text>

                  <Text style={{ fontSize: 10, color: "#94a3b8", marginLeft: "auto" }}>
                    {formatRelative(item.createdAt)}
                  </Text>
                </View>

                <View style={{ padding: 16, gap: 8 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "bold", color: "#1e1b20" }}>
                      {item.authorLabel}
                    </Text>
                    {item.authorRealLabel !== "Pengguna" &&
                      item.authorRealLabel !== item.authorLabel && (
                        <Text style={{ fontSize: 11, color: "#64748b", fontStyle: "italic" }}>
                          (Asli: {item.authorRealLabel})
                        </Text>
                      )}
                    {item.authorEmail && (
                      <Text style={{ fontSize: 11, color: "#ec4899", fontWeight: "500" }}>
                        · {item.authorEmail}
                      </Text>
                    )}
                    <Text style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>
                      · ID: {item.authorId.split("-")[0]}
                    </Text>
                  </View>

                  <Text
                    style={{
                      fontSize: 13,
                      color: item.content ? "#334155" : "#ef4444",
                      lineHeight: 18,
                      fontStyle: item.content ? "normal" : "italic",
                      fontWeight: item.content ? "normal" : "bold",
                    }}
                  >
                    {item.content || "[Konten tidak ditemukan / sudah dihapus oleh pengguna]"}
                  </Text>
                </View>

                <View style={{ borderTopWidth: 1, borderTopColor: "#f8fafc" }}>
                  <TouchableOpacity
                    onPress={() => setExpandedQueueKey(isExpandedReports ? null : item.key)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "bold",
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      💬 Alasan Laporan ({item.reports.length})
                    </Text>
                    <FontAwesome
                      name={isExpandedReports ? "chevron-up" : "chevron-down"}
                      size={12}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>

                  {isExpandedReports && (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 6 }}>
                      {item.reports.map((rep) => (
                        <View
                          key={rep.id}
                          style={{
                            backgroundColor: "#f8fafc",
                            padding: 10,
                            borderRadius: 12,
                            gap: 4,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: 6,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: "bold", color: "#475569" }}>
                              Pelapor: {rep.reporter_name || "Pengguna"}{" "}
                              {rep.reporter_nickname ? `(${rep.reporter_nickname})` : ""}
                              {rep.reporter_email ? ` · ${rep.reporter_email}` : ""}
                            </Text>
                            <Text style={{ fontSize: 10, color: "#94a3b8" }}>
                              {formatRelative(rep.created_at)}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 12, color: "#1e1b20", fontWeight: "500" }}>
                            Alasan: {rep.reason || "Tidak diisi"}
                          </Text>
                          <Text
                            style={{
                              fontSize: 9,
                              fontWeight: "bold",
                              color:
                                rep.status === "pending"
                                  ? "#d97706"
                                  : rep.status === "resolved_hide"
                                    ? "#dc2626"
                                    : "#15803d",
                              textTransform: "uppercase",
                            }}
                          >
                            Status:{" "}
                            {rep.status === "pending"
                              ? "menunggu"
                              : rep.status === "resolved_keep"
                                ? "dipertahankan"
                                : "dihapus"}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    borderTopWidth: 1,
                    borderTopColor: "#f1e6eb",
                    padding: 8,
                    gap: 8,
                    backgroundColor: "#fcf8fa",
                  }}
                >
                  <TouchableOpacity
                    disabled={isActing}
                    onPress={() => handleModerateAction(item, "keep")}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: "#dcfce7",
                      borderWidth: 1,
                      borderColor: "#bbf7d0",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 6,
                    }}
                  >
                    <FontAwesome name="check" size={14} color="#15803d" />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "bold",
                        color: "#15803d",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Pertahankan
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={isActing}
                    onPress={() => handleModerateAction(item, "remove")}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: "#fee2e2",
                      borderWidth: 1,
                      borderColor: "#fecaca",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 6,
                    }}
                  >
                    <FontAwesome name="times" size={14} color="#b91c1c" />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "bold",
                        color: "#b91c1c",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Sembunyikan
                    </Text>
                  </TouchableOpacity>
                </View>

                {!item.is_anonymous && item.authorAvatarKind === "custom" && (
                  <TouchableOpacity
                    disabled={actingKey === `avatar:${item.key}`}
                    onPress={() => handleResetAvatar(item)}
                    style={{
                      marginTop: 8,
                      height: 36,
                      borderRadius: 12,
                      backgroundColor: "#fffbeb",
                      borderWidth: 1,
                      borderColor: "#fef3c7",
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 6,
                    }}
                  >
                    {actingKey === `avatar:${item.key}` ? (
                      <ActivityIndicator size="small" color="#b45309" />
                    ) : (
                      <FontAwesome name="image" size={12} color="#b45309" />
                    )}
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "bold",
                        color: "#b45309",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Reset Avatar Pengguna
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}