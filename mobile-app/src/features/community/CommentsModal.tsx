import React, { useEffect, useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Image,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { COMMENT_MAX_LENGTH } from "@/src/lib/communityTypes";
import { CommentWithAuthor } from "@/src/hooks/useCommunityFeed";
import { resolveAvatarSource } from "@/src/lib/avatars";

interface CommentsModalProps {
  visible: boolean;
  postId: string | null;
  postPreview: string | null;
  onClose: () => void;
  fetchComments: (postId: string) => Promise<CommentWithAuthor[]>;
  onCreateComment: (postId: string, content: string, isAnonymous: boolean) => Promise<void>;
  onReportComment: (commentId: string, reason: string) => Promise<void>;
  /** Detik cooldown sisa. 0 = boleh komen. */
  cooldownLeft?: number;
}

export function CommentsModal({
  visible,
  postId,
  postPreview,
  onClose,
  fetchComments,
  onCreateComment,
  onReportComment,
  cooldownLeft = 0,
}: CommentsModalProps) {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const remaining = COMMENT_MAX_LENGTH - draft.length;
  const isOverLimit = remaining < 0;
  const isCoolingDown = cooldownLeft > 0;
  const canSubmit = draft.trim().length > 0 && !isOverLimit && !submitting && !isCoolingDown;

  const reload = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchComments(postId);
      setComments(list);
    } catch (e: any) {
      setError(e.message || "Gagal memuat komentar.");
    } finally {
      setLoading(false);
    }
  }, [postId, fetchComments]);

  useEffect(() => {
    if (visible && postId) {
      setDraft("");
      setIsAnonymous(false);
      reload();
    }
  }, [visible, postId, reload]);

  const handleSend = async () => {
    if (!canSubmit || !postId) return;
    setSubmitting(true);
    try {
      await onCreateComment(postId, draft, isAnonymous);
      setDraft("");
      setIsAnonymous(false);
      await reload();
    } catch (e: any) {
      const msg = e?.message || "Gagal mengirim komentar.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Gagal", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = (commentId: string) => {
    const askReason = (cb: (reason: string) => void) => {
      if (Platform.OS === "web") {
        const r = window.prompt("Alasan laporan (opsional):", "");
        if (r !== null) cb(r);
      } else {
        Alert.prompt(
          "Laporkan Komentar",
          "Alasan laporan (opsional)",
          [
            { text: "Batal", style: "cancel" },
            { text: "Lapor", onPress: (r?: string) => cb(r ?? "") },
          ],
          "plain-text",
        );
      }
    };
    askReason(async (reason) => {
      try {
        await onReportComment(commentId, reason);
        const okMsg = "Laporan terkirim. Tim akan mereview.";
        if (Platform.OS === "web") window.alert(okMsg);
        else Alert.alert("Terkirim", okMsg);
      } catch (e: any) {
        const msg = e?.message || "Gagal melaporkan komentar.";
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert("Gagal", msg);
      }
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: Platform.OS === "web" ? "rgba(20, 20, 20, 0.4)" : "#fcf8fa",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <KeyboardAvoidingView
          style={{
            flex: 1,
            width: "100%",
            maxWidth: Platform.OS === "web" ? 520 : undefined,
            backgroundColor: "#fcf8fa",
            ...(Platform.OS === "web" && {
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: "rgba(251, 207, 232, 0.6)",
            }),
          }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <View
            style={{
              paddingTop: 16,
              paddingHorizontal: 20,
              paddingBottom: 12,
              backgroundColor: "#fff",
              borderBottomWidth: 1,
              borderBottomColor: "#f1e6eb",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1e1b20" }}>Komentar</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <FontAwesome name="times" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Post preview */}
          {postPreview && (
            <View
              style={{
                paddingHorizontal: 20,
                paddingVertical: 12,
                backgroundColor: "#fff",
                borderBottomWidth: 1,
                borderBottomColor: "#f8fafc",
              }}
            >
              <Text numberOfLines={2} style={{ fontSize: 12, color: "#64748b", lineHeight: 18 }}>
                {postPreview}
              </Text>
            </View>
          )}

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 100, gap: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            {loading && (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <ActivityIndicator size="small" color="#ec4899" />
              </View>
            )}

            {error && (
              <View
                style={{
                  backgroundColor: "#fef2f2",
                  borderColor: "#fee2e2",
                  borderWidth: 1,
                  borderRadius: 16,
                  padding: 12,
                }}
              >
                <Text style={{ fontSize: 12, color: "#ef4444" }}>{error}</Text>
              </View>
            )}

            {!loading && comments.length === 0 && !error && (
              <View
                style={{
                  paddingVertical: 32,
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <FontAwesome name="comments-o" size={28} color="#cbd5e1" />
                <Text style={{ fontSize: 13, color: "#94a3b8" }}>
                  Belum ada komentar. Jadilah yang pertama!
                </Text>
              </View>
            )}

            {comments.map((c) => {
              const dateLabel = (() => {
                try {
                  return format(new Date(c.created_at), "d MMM 'pukul' HH:mm", {
                    locale: localeId,
                  });
                } catch {
                  return c.created_at;
                }
              })();
              return (
                <View
                  key={c.id}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "#f1e6eb",
                    padding: 14,
                    gap: 6,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      {c.is_anonymous ? (
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: "#e2e8f0",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <FontAwesome name="user-secret" size={11} color="#64748b" />
                        </View>
                      ) : (
                        (() => {
                          const src = resolveAvatarSource(
                            c.avatar_url,
                            c.avatar_url?.startsWith("preset:") ? "preset" : "custom",
                          );
                          if (src) {
                            return (
                              <Image
                                source={src}
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 12,
                                  borderWidth: 1,
                                  borderColor: "#fce7f3",
                                }}
                              />
                            );
                          }
                          return (
                            <View
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                backgroundColor: "#fce7f3",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <FontAwesome name="user" size={11} color="#ec4899" />
                            </View>
                          );
                        })()
                      )}
                      <Text style={{ fontSize: 13, fontWeight: "bold", color: "#1e1b20" }}>
                        {c.display_name}
                      </Text>
                      <Text style={{ fontSize: 11, color: "#94a3b8" }}>· {dateLabel}</Text>
                    </View>
                    {!c.is_own && (
                      <TouchableOpacity
                        onPress={() => handleReport(c.id)}
                        accessibilityLabel="Laporkan komentar"
                        style={{ padding: 4 }}
                      >
                        <FontAwesome name="flag-o" size={12} color="#94a3b8" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={{ fontSize: 13, color: "#1e1b20", lineHeight: 19 }}>
                    {c.content}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          {/* Composer footer */}
          <View
            style={{
              backgroundColor: "#fff",
              borderTopWidth: 1,
              borderTopColor: "#f1e6eb",
              padding: 12,
              gap: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <TouchableOpacity
                onPress={() => setIsAnonymous((v) => !v)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: isAnonymous ? "#fce7f3" : "#f8fafc",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                accessibilityLabel="Toggle anonim"
              >
                <FontAwesome
                  name="user-secret"
                  size={14}
                  color={isAnonymous ? "#ec4899" : "#94a3b8"}
                />
              </TouchableOpacity>

              <View
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: "#f1e6eb",
                  borderRadius: 18,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  backgroundColor: "#f8fafc",
                }}
              >
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={isAnonymous ? "Tulis komentar (anonim)…" : "Tulis komentar…"}
                  placeholderTextColor="#94a3b8"
                  multiline
                  style={{ fontSize: 13, color: "#1e1b20", maxHeight: 80 }}
                />
              </View>

              <TouchableOpacity
                onPress={handleSend}
                disabled={!canSubmit}
                style={{
                  minWidth: 40,
                  height: 40,
                  paddingHorizontal: isCoolingDown ? 12 : 0,
                  borderRadius: 20,
                  backgroundColor: canSubmit ? "#ec4899" : "#e2e8f0",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                accessibilityLabel="Kirim komentar"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : isCoolingDown ? (
                  <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "bold" }}>
                    {cooldownLeft}s
                  </Text>
                ) : (
                  <FontAwesome name="send" size={14} color="#fff" />
                )}
              </TouchableOpacity>
            </View>

            {(isOverLimit || draft.length > 0) && (
              <Text
                style={{
                  fontSize: 11,
                  color: isOverLimit ? "#ef4444" : "#94a3b8",
                  textAlign: "right",
                }}
              >
                {remaining} karakter
              </Text>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
