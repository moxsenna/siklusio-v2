import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { apiGetJson, apiPostJson, apiPatchJson } from "@/src/lib/api";

interface AutoresponderSetting {
  id: string;
  event_key: "registration_completed" | "payment_completed";
  title: string;
  description: string | null;
  is_enabled: boolean;
  message_template: string;
  send_delay_seconds: number;
}

interface DeliveryLog {
  id: string;
  event_key: string;
  recipient_whatsapp: string;
  recipient_name: string | null;
  rendered_message: string;
  status: "pending" | "sent" | "failed" | "skipped";
  provider: string;
  provider_request_id: string | null;
  provider_message_id: string | null;
  provider_response: any;
  error_message: string | null;
  idempotency_key: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
}

export default function AdminWhatsappAutoresponderPanel() {
  const [settings, setSettings] = useState<AutoresponderSetting[]>([]);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);

  // Selection states
  const [activeEventKey, setActiveEventKey] = useState<
    "registration_completed" | "payment_completed"
  >("registration_completed");

  // Setting Editor Form State
  const [isEnabled, setIsEnabled] = useState(false);
  const [templateText, setTemplateText] = useState("");
  const [delaySeconds, setDelaySeconds] = useState("0");
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  // Log filters
  const [statusFilter, setStatusFilter] = useState<
    "all" | "sent" | "failed" | "skipped" | "pending"
  >("all");
  const [eventFilter, setEventFilter] = useState<
    "all" | "registration_completed" | "payment_completed"
  >("all");

  // Action states
  const [testPhone, setTestPhone] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  // Collapsed states for log items
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [expandedMetadataLogId, setExpandedMetadataLogId] = useState<string | null>(null);

  // 1. Fetch settings
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await apiGetJson<{
        settings: AutoresponderSetting[];
        placeholders: string[];
      }>("/api/admin/whatsapp/settings");
      setSettings(res.settings || []);
      setPlaceholders(res.placeholders || []);

      // Load active settings to editor
      const activeSetting = res.settings.find((s) => s.event_key === activeEventKey);
      if (activeSetting) {
        setIsEnabled(activeSetting.is_enabled);
        setTemplateText(activeSetting.message_template);
        setDelaySeconds(String(activeSetting.send_delay_seconds));
      }
    } catch (err: any) {
      Alert.alert("Gagal", err.message || "Gagal memuat pengaturan.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Fetch logs (server-filtered)
  const fetchLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const params = [];
      if (statusFilter !== "all") params.push(`status=${statusFilter}`);
      if (eventFilter !== "all") params.push(`event=${eventFilter}`);
      const query = params.length > 0 ? `?${params.join("&")}` : "";

      const res = await apiGetJson<{ logs: DeliveryLog[] }>(
        `/api/admin/whatsapp/logs${query}`
      );
      setLogs(res.logs || []);
    } catch (err: any) {
      console.error("Gagal memuat logs:", err);
    } finally {
      setLogsLoading(false);
    }
  }, [statusFilter, eventFilter]);

  // Load initial settings and logs
  useEffect(() => {
    fetchSettings();
  }, []);

  // Fetch logs whenever filters change
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Load editor state when active event key changes
  useEffect(() => {
    const activeSetting = settings.find((s) => s.event_key === activeEventKey);
    if (activeSetting) {
      setIsEnabled(activeSetting.is_enabled);
      setTemplateText(activeSetting.message_template);
      setDelaySeconds(String(activeSetting.send_delay_seconds));
    }
  }, [activeEventKey, settings]);

  // Debounced Template preview
  useEffect(() => {
    if (!templateText.trim()) {
      setPreviewText("");
      setWarnings(["Template masih kosong."]);
      return;
    }
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await apiPostJson<{ preview: string; warnings?: string[] }>(
          "/api/admin/whatsapp/preview",
          { message_template: templateText }
        );
        setPreviewText(res.preview);
        setWarnings(res.warnings || []);
      } catch (err: any) {
        console.error("Gagal render preview:", err);
      } finally {
        setPreviewLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [templateText]);

  // Insert placeholder at cursor location
  const handleInsertPlaceholder = (placeholder: string) => {
    const start = selection.start;
    const end = selection.end;
    const before = templateText.slice(0, start);
    const after = templateText.slice(end);
    const newText = before + placeholder + after;
    setTemplateText(newText);
    const newCursor = start + placeholder.length;
    setSelection({ start: newCursor, end: newCursor });
  };

  // Reset local changes back to the saved state
  const handleResetChanges = () => {
    const activeSetting = settings.find((s) => s.event_key === activeEventKey);
    if (activeSetting) {
      setIsEnabled(activeSetting.is_enabled);
      setTemplateText(activeSetting.message_template);
      setDelaySeconds(String(activeSetting.send_delay_seconds));
      Alert.alert("Direset", "Perubahan template berhasil dibatalkan.");
    }
  };

  // Save current setting to server
  const handleSaveSetting = async () => {
    if (templateText.trim().length < 20) {
      Alert.alert("Gagal", "Template pesan minimal 20 karakter.");
      return;
    }
    const delay = Number(delaySeconds);
    if (!Number.isFinite(delay) || delay < 0 || delay > 86400) {
      Alert.alert("Gagal", "Delay pengiriman harus antara 0 sampai 86400 detik.");
      return;
    }

    try {
      setIsSaving(true);
      const res = await apiPatchJson<{ setting: AutoresponderSetting }>(
        `/api/admin/whatsapp/settings/${activeEventKey}`,
        {
          is_enabled: isEnabled,
          message_template: templateText,
          send_delay_seconds: delay,
        }
      );
      // Update local settings list
      setSettings((prev) =>
        prev.map((s) => (s.event_key === activeEventKey ? res.setting : s))
      );
      Alert.alert("Berhasil", "Pengaturan autoresponder WhatsApp disimpan.");
    } catch (err: any) {
      Alert.alert("Gagal", err.message || "Gagal menyimpan pengaturan.");
    } finally {
      setIsSaving(false);
    }
  };

  // Live test send
  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      Alert.alert("Gagal", "Nomor WhatsApp tujuan wajib diisi.");
      return;
    }
    try {
      setIsTesting(true);
      const res = await apiPostJson<any>("/api/admin/whatsapp/test", {
        eventKey: activeEventKey,
        target: testPhone,
        message_template: templateText,
      });

      if (res.status === "ok") {
        Alert.alert("Sukses", "Pesan test WhatsApp berhasil terkirim via Fonnte.");
        fetchLogs(); // refresh logs
      } else {
        Alert.alert("Gagal", "Fonnte menolak pengiriman test.");
      }
    } catch (err: any) {
      Alert.alert("Gagal", err.message || "Terjadi kesalahan saat kirim test.");
    } finally {
      setIsTesting(false);
    }
  };

  // Format Event Key Label
  const getEventLabel = (key: string) => {
    return key === "registration_completed"
      ? "Setelah User Isi Data"
      : "Setelah Pembayaran Berhasil";
  };

  // Format Status Badge
  const renderStatusBadge = (status: DeliveryLog["status"]) => {
    let bgColor = "#f1f5f9";
    let textColor = "#475569";
    let label: string = status;

    if (status === "sent") {
      bgColor = "#dcfce7";
      textColor = "#14b8a6";
      label = "Terkirim";
    } else if (status === "failed") {
      bgColor = "#fee2e2";
      textColor = "#ec4899";
      label = "Gagal";
    } else if (status === "skipped") {
      bgColor = "#e2e8f0";
      textColor = "#64748b";
      label = "Dilewati";
    } else if (status === "pending") {
      bgColor = "#fef3c7";
      textColor = "#d97706";
      label = "Pending";
    }

    return (
      <View
        style={{
          backgroundColor: bgColor,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 8,
          alignSelf: "flex-start",
        }}
      >
        <Text style={{ fontSize: 10, fontWeight: "bold", color: textColor, textTransform: "uppercase" }}>
          {label}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={{ paddingVertical: 48, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#ec4899" />
        <Text style={{ marginTop: 12, color: "#64748b", fontSize: 13 }}>
          Memuat Pengaturan WhatsApp...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 24 }}>
      {/* 1. Intro Card */}
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 24,
          padding: 20,
          borderWidth: 1,
          borderColor: "#f1e6eb",
          gap: 6,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1e1b20" }}>
          📱 WhatsApp Autoresponder (Fonnte)
        </Text>
        <Text style={{ fontSize: 13, color: "#64748b", lineHeight: 18 }}>
          Kelola pesan otomatis yang dikirimkan ke WhatsApp pelanggan. Nada pesan disesuaikan ramah dan hangat (menyapa dengan "Bunda") sesuai brand Siklusio.
        </Text>
      </View>

      {/* 2. Event Selector Cards */}
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: "bold", color: "#475569", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Pilih Event Untuk Diedit
        </Text>

        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          {settings.map((item) => {
            const isActive = activeEventKey === item.event_key;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => setActiveEventKey(item.event_key)}
                style={{
                  flex: 1,
                  minWidth: 200,
                  backgroundColor: "#fff",
                  borderRadius: 20,
                  borderWidth: isActive ? 2 : 1,
                  borderColor: isActive ? "#ec4899" : "#f1e6eb",
                  padding: 16,
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 15, fontWeight: "bold", color: "#1e1b20" }}>
                    {item.title}
                  </Text>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: item.is_enabled ? "#14b8a6" : "#cbd5e1",
                    }}
                  />
                </View>

                <Text style={{ fontSize: 12, color: "#64748b", lineHeight: 16 }}>
                  {item.description || "Tidak ada deskripsi."}
                </Text>

                <View style={{ flexDirection: "row", gap: 8, marginTop: 4, alignItems: "center" }}>
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: item.is_enabled ? "#14b8a6" : "#64748b" }}>
                    {item.is_enabled ? "Aktif" : "Nonaktif"}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#94a3b8" }}>·</Text>
                  <Text style={{ fontSize: 11, color: "#64748b" }}>
                    Delay: {item.send_delay_seconds} dtk
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. Main Config Editor */}
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 24,
          borderWidth: 1,
          borderColor: "#f1e6eb",
          padding: 20,
          gap: 16,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1e1b20" }}>
          ✏️ Edit Template: {getEventLabel(activeEventKey)}
        </Text>

        {/* Enabled Toggle Switch */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 14, fontWeight: "bold", color: "#1e1b20" }}>
              Aktifkan Pengiriman Otomatis
            </Text>
            <Text style={{ fontSize: 12, color: "#64748b" }}>
              Jika tidak aktif, log pengiriman tetap dicatat sebagai 'dilewati'.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setIsEnabled(!isEnabled)}
            style={{
              width: 52,
              height: 32,
              borderRadius: 16,
              backgroundColor: isEnabled ? "#14b8a6" : "#e2e8f0",
              padding: 2,
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: "#fff",
                alignSelf: isEnabled ? "flex-end" : "flex-start",
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              }}
            />
          </TouchableOpacity>
        </View>

        {/* Delay Input */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 13, fontWeight: "bold", color: "#475569" }}>
            Delay Pengiriman Pesan (Detik)
          </Text>
          <TextInput
            placeholder="0"
            keyboardType="numeric"
            value={delaySeconds}
            onChangeText={(val) => setDelaySeconds(val.replace(/[^0-9]/g, ""))}
            style={{
              height: 44,
              borderRadius: 12,
              backgroundColor: "#f8fafc",
              borderWidth: 1,
              borderColor: "#e2e8f0",
              paddingHorizontal: 16,
              fontSize: 13,
              color: "#1e1b20",
            }}
          />
          <Text style={{ fontSize: 11, color: "#94a3b8" }}>
            Masukkan angka 0 untuk kirim instant, maksimal 86400 detik (24 jam).
          </Text>
        </View>

        {/* Template Message Editor */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: "bold", color: "#475569" }}>
            Isi Template Pesan (Maksimal 60.000 karakter)
          </Text>

          {/* Placeholders Chip Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
          >
            {placeholders.map((ph) => (
              <TouchableOpacity
                key={ph}
                onPress={() => handleInsertPlaceholder(ph)}
                style={{
                  backgroundColor: "#faf5f8",
                  borderWidth: 1,
                  borderColor: "#fce7f3",
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                }}
              >
                <Text style={{ fontSize: 11, color: "#ec4899", fontFamily: "monospace", fontWeight: "bold" }}>
                  {ph}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput
            multiline
            numberOfLines={10}
            value={templateText}
            onChangeText={setTemplateText}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            placeholder="Ketik isi pesan WhatsApp di sini..."
            style={{
              minHeight: 180,
              borderRadius: 16,
              backgroundColor: "#f8fafc",
              borderWidth: 1,
              borderColor: "#e2e8f0",
              padding: 16,
              fontSize: 13,
              color: "#334155",
              textAlignVertical: "top",
              lineHeight: 18,
            }}
          />
        </View>

        {/* Debounced Preview Panel */}
        <View
          style={{
            backgroundColor: "#fafafb",
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#f1f5f9",
            padding: 16,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 12, fontWeight: "bold", color: "#64748b", textTransform: "uppercase" }}>
              👁️ Preview Pesan (Dummy Data)
            </Text>
            {previewLoading && <ActivityIndicator size="small" color="#ec4899" />}
          </View>

          {warnings.length > 0 ? (
            <View style={{ paddingVertical: 4 }}>
              {warnings.map((w, idx) => (
                <Text key={idx} style={{ fontSize: 12, color: "#d97706", fontWeight: "500", fontStyle: "italic" }}>
                  ⚠️ {w}
                </Text>
              ))}
            </View>
          ) : (
            <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e2e8f0", padding: 12 }}>
              <Text style={{ fontSize: 13, color: "#334155", lineHeight: 18, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" }}>
                {previewText}
              </Text>
            </View>
          )}
        </View>

        {/* Live Test Form */}
        <View
          style={{
            backgroundColor: "#faf5f8",
            borderWidth: 1,
            borderColor: "#fce7f3",
            borderRadius: 16,
            padding: 16,
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "bold", color: "#1e1b20" }}>
            🧪 Uji Coba Pengiriman Langsung
          </Text>

          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <TextInput
              placeholder="Contoh: 081234567890"
              keyboardType="phone-pad"
              value={testPhone}
              onChangeText={setTestPhone}
              style={{
                flex: 1,
                minWidth: 180,
                height: 40,
                borderRadius: 10,
                backgroundColor: "#fff",
                borderWidth: 1,
                borderColor: "#fce7f3",
                paddingHorizontal: 12,
                fontSize: 13,
                color: "#1e1b20",
              }}
            />

            <TouchableOpacity
              onPress={handleSendTest}
              disabled={isTesting || !testPhone.trim()}
              style={{
                height: 40,
                paddingHorizontal: 16,
                backgroundColor: testPhone.trim() ? "#9333ea" : "#e2e8f0",
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
              }}
            >
              {isTesting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <FontAwesome name="paper-plane" size={12} color="#fff" />
              )}
              <Text style={{ fontSize: 12, fontWeight: "bold", color: "#fff" }}>
                Kirim Test WA
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Editor Form Action Buttons */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
          <TouchableOpacity
            onPress={handleResetChanges}
            disabled={isSaving}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              backgroundColor: "#f1f5f9",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "bold", color: "#64748b" }}>
              Reset Perubahan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSaveSetting}
            disabled={isSaving}
            style={{
              flex: 2,
              height: 44,
              borderRadius: 12,
              backgroundColor: "#ec4899",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "bold", color: "#fff", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {isSaving ? "Menyimpan..." : "Simpan Template"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. Logs Delivery Section */}
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 24,
          borderWidth: 1,
          borderColor: "#f1e6eb",
          padding: 20,
          gap: 16,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1e1b20" }}>
            📋 Log Pengiriman Terakhir
          </Text>

          <TouchableOpacity
            onPress={fetchLogs}
            disabled={logsLoading}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "#faf5f8",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FontAwesome name="refresh" size={14} color="#ec4899" />
          </TouchableOpacity>
        </View>

        {/* Log Filter Bar */}
        <View style={{ gap: 10 }}>
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" }}>
              Filter Status:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {([
                { k: "all", l: "Semua" },
                { k: "sent", l: "Terkirim" },
                { k: "failed", l: "Gagal" },
                { k: "skipped", l: "Dilewati" },
                { k: "pending", l: "Pending" },
              ] as const).map((item) => {
                const isSel = statusFilter === item.k;
                return (
                  <TouchableOpacity
                    key={item.k}
                    onPress={() => setStatusFilter(item.k)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: isSel ? "#ec4899" : "#f1f5f9",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "bold", color: isSel ? "#fff" : "#64748b" }}>
                      {item.l}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: "bold", color: "#94a3b8", textTransform: "uppercase" }}>
              Filter Event:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {([
                { k: "all", l: "Semua Event" },
                { k: "registration_completed", l: "Registrasi Selesai" },
                { k: "payment_completed", l: "Pembayaran Berhasil" },
              ] as const).map((item) => {
                const isSel = eventFilter === item.k;
                return (
                  <TouchableOpacity
                    key={item.k}
                    onPress={() => setEventFilter(item.k)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 12,
                      backgroundColor: isSel ? "#9333ea" : "#f1f5f9",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "bold", color: isSel ? "#fff" : "#64748b" }}>
                      {item.l}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Log List View */}
        {logsLoading ? (
          <View style={{ paddingVertical: 32, alignItems: "center" }}>
            <ActivityIndicator size="small" color="#ec4899" />
          </View>
        ) : logs.length === 0 ? (
          <View style={{ paddingVertical: 32, alignItems: "center" }}>
            <Text style={{ fontSize: 13, color: "#94a3b8", fontWeight: "bold" }}>
              Tidak ada log pengiriman ditemukan.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {logs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const isMetadataExpanded = expandedMetadataLogId === log.id;
              
              // Snippet message (max 140 chars)
              const snippet = log.rendered_message
                ? log.rendered_message.length > 140
                  ? log.rendered_message.substring(0, 140) + "..."
                  : log.rendered_message
                : "-";

              return (
                <View
                  key={log.id}
                  style={{
                    backgroundColor: "#fcf8fa",
                    borderWidth: 1,
                    borderColor: "#f1e6eb",
                    borderRadius: 16,
                    padding: 14,
                    gap: 8,
                  }}
                >
                  {/* Top line with event & status */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 11, fontWeight: "bold", color: "#9333ea" }}>
                      {log.event_key === "registration_completed" ? "Registrasi" : "Pembayaran"}
                    </Text>
                    {renderStatusBadge(log.status)}
                  </View>

                  {/* Recipient details */}
                  <View style={{ gap: 2 }}>
                    <Text style={{ fontSize: 13, fontWeight: "bold", color: "#1e1b20" }}>
                      {log.recipient_name || "Bunda"}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>
                      +{log.recipient_whatsapp}
                    </Text>
                  </View>

                  {/* Message body */}
                  <View style={{ backgroundColor: "#fff", padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#f1e6eb" }}>
                    <Text style={{ fontSize: 12, color: "#334155", lineHeight: 16 }}>
                      {isExpanded ? log.rendered_message : snippet}
                    </Text>
                    
                    {log.rendered_message && log.rendered_message.length > 140 && (
                      <TouchableOpacity
                        onPress={() => setExpandedLogId(isExpanded ? null : log.id)}
                        style={{ marginTop: 6 }}
                      >
                        <Text style={{ fontSize: 11, color: "#ec4899", fontWeight: "bold" }}>
                          {isExpanded ? "Sembunyikan" : "Lihat Selengkapnya"}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Error & Skipped details if applicable */}
                  {log.status === "failed" && log.error_message && (
                    <View style={{ backgroundColor: "#fef2f2", padding: 8, borderRadius: 10, borderWidth: 1, borderColor: "#fee2e2" }}>
                      <Text style={{ fontSize: 11, color: "#ef4444", fontWeight: "bold" }}>
                        Penyebab Gagal:
                      </Text>
                      <Text style={{ fontSize: 11, color: "#b91c1c", marginTop: 2 }}>
                        {log.error_message}
                      </Text>
                    </View>
                  )}

                  {log.status === "skipped" && (
                    <View style={{ backgroundColor: "#f8fafc", padding: 8, borderRadius: 10, borderWidth: 1, borderColor: "#e2e8f0" }}>
                      <Text style={{ fontSize: 11, color: "#475569", fontWeight: "bold" }}>
                        Penyebab Dilewati:
                      </Text>
                      <Text style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                        {log.metadata?.reason === "setting_disabled" && "Autoresponder dinonaktifkan di pengaturan."}
                        {log.metadata?.reason === "setting_not_found" && "Setting autoresponder untuk event ini belum diatur."}
                        {log.metadata?.reason === "duplicate_idempotency" && "Pencegahan double-send dipicu (Idempotency cocok)."}
                        {!log.metadata?.reason && (log.metadata?.reason || "Nomor tidak terdaftar atau trigger dicegah.")}
                      </Text>
                    </View>
                  )}

                  {/* Log bottom meta */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                    <Text style={{ fontSize: 10, color: "#94a3b8" }}>
                      {new Date(log.created_at).toLocaleDateString("id-ID")}{" "}
                      {new Date(log.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </Text>

                    <TouchableOpacity
                      onPress={() => setExpandedMetadataLogId(isMetadataExpanded ? null : log.id)}
                    >
                      <Text style={{ fontSize: 10, color: "#64748b", textDecorationLine: "underline" }}>
                        {isMetadataExpanded ? "Tutup Meta" : "Detail Metadata"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Expandable full metadata viewer */}
                  {isMetadataExpanded && (
                    <View style={{ backgroundColor: "#f1f5f9", padding: 10, borderRadius: 10, marginTop: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: "#475569" }}>
                        Idempotency Key:
                      </Text>
                      <Text style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", marginVertical: 2 }}>
                        {log.idempotency_key}
                      </Text>
                      {log.provider_message_id && (
                        <>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: "#475569", marginTop: 4 }}>
                            Provider Message ID:
                          </Text>
                          <Text style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>
                            {log.provider_message_id}
                          </Text>
                        </>
                      )}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <>
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: "#475569", marginTop: 4 }}>
                            Context Metadata:
                          </Text>
                          <Text style={{ fontSize: 10, color: "#475569", fontFamily: "monospace", marginTop: 2 }}>
                            {JSON.stringify(log.metadata, null, 2)}
                          </Text>
                        </>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}
