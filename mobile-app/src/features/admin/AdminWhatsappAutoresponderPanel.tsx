import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ActivityIndicator, Alert } from "react-native";
import { apiGetJson, apiPostJson, apiPatchJson } from "@/src/lib/api";
import type {
  AutoresponderSetting,
  DeliveryLog,
  EventFilter,
  EventKey,
  LogsResponse,
  PreviewResponse,
  SaveSettingResponse,
  SettingsResponse,
  StatusFilter,
  TestSendResponse,
  TextSelection,
} from "./whatsapp/adminWhatsappTypes";
import { AdminWhatsappSettingsList } from "./whatsapp/AdminWhatsappSettingsList";
import { AdminWhatsappTemplateEditor } from "./whatsapp/AdminWhatsappTemplateEditor";
import { AdminWhatsappLogsTable } from "./whatsapp/AdminWhatsappLogsTable";
import { buildLogsQueryString } from "./whatsapp/adminWhatsappUtils";
import { whatsappStyles as styles } from "./whatsapp/adminWhatsappStyles";

export default function AdminWhatsappAutoresponderPanel() {
  const [settings, setSettings] = useState<AutoresponderSetting[]>([]);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);

  const [activeEventKey, setActiveEventKey] = useState<EventKey>("registration_completed");

  const [isEnabled, setIsEnabled] = useState(false);
  const [templateText, setTemplateText] = useState("");
  const [delaySeconds, setDelaySeconds] = useState("0");
  const [selection, setSelection] = useState<TextSelection>({ start: 0, end: 0 });

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");

  const [testPhone, setTestPhone] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [expandedMetadataLogId, setExpandedMetadataLogId] = useState<string | null>(null);

  const loadEditorFromSetting = useCallback((setting: AutoresponderSetting) => {
    setIsEnabled(setting.is_enabled);
    setTemplateText(setting.message_template);
    setDelaySeconds(String(setting.send_delay_seconds));
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await apiGetJson<SettingsResponse>("/api/admin/whatsapp/settings");
      setSettings(res.settings || []);
      setPlaceholders(res.placeholders || []);

      const activeSetting = res.settings.find((s) => s.event_key === activeEventKey);
      if (activeSetting) {
        loadEditorFromSetting(activeSetting);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal memuat pengaturan.";
      Alert.alert("Gagal", message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const query = buildLogsQueryString(statusFilter, eventFilter);
      const res = await apiGetJson<LogsResponse>(`/api/admin/whatsapp/logs${query}`);
      setLogs(res.logs || []);
    } catch (err: unknown) {
      console.error("Gagal memuat logs:", err);
    } finally {
      setLogsLoading(false);
    }
  }, [statusFilter, eventFilter]);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    const activeSetting = settings.find((s) => s.event_key === activeEventKey);
    if (activeSetting) {
      loadEditorFromSetting(activeSetting);
    }
  }, [activeEventKey, settings, loadEditorFromSetting]);

  useEffect(() => {
    if (!templateText.trim()) {
      setPreviewText("");
      setWarnings(["Template masih kosong."]);
      return;
    }
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await apiPostJson<PreviewResponse>("/api/admin/whatsapp/preview", {
          message_template: templateText,
        });
        setPreviewText(res.preview);
        setWarnings(res.warnings || []);
      } catch (err: unknown) {
        console.error("Gagal render preview:", err);
      } finally {
        setPreviewLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [templateText]);

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

  const handleResetChanges = () => {
    const activeSetting = settings.find((s) => s.event_key === activeEventKey);
    if (activeSetting) {
      loadEditorFromSetting(activeSetting);
      Alert.alert("Direset", "Perubahan template berhasil dibatalkan.");
    }
  };

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
      const res = await apiPatchJson<SaveSettingResponse>(
        `/api/admin/whatsapp/settings/${activeEventKey}`,
        {
          is_enabled: isEnabled,
          message_template: templateText,
          send_delay_seconds: delay,
        },
      );
      setSettings((prev) =>
        prev.map((s) => (s.event_key === activeEventKey ? res.setting : s)),
      );
      Alert.alert("Berhasil", "Pengaturan autoresponder WhatsApp disimpan.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal menyimpan pengaturan.";
      Alert.alert("Gagal", message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testPhone.trim()) {
      Alert.alert("Gagal", "Nomor WhatsApp tujuan wajib diisi.");
      return;
    }
    try {
      setIsTesting(true);
      const res = await apiPostJson<TestSendResponse>("/api/admin/whatsapp/test", {
        eventKey: activeEventKey,
        target: testPhone,
        message_template: templateText,
      });

      if (res.status === "ok") {
        Alert.alert("Sukses", "Pesan test WhatsApp berhasil terkirim via Fonnte.");
        fetchLogs();
      } else {
        Alert.alert("Gagal", "Fonnte menolak pengiriman test.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan saat kirim test.";
      Alert.alert("Gagal", message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleLogExpand = (logId: string) => {
    setExpandedLogId((prev) => (prev === logId ? null : logId));
  };

  const handleToggleMetadataExpand = (logId: string) => {
    setExpandedMetadataLogId((prev) => (prev === logId ? null : logId));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ec4899" />
        <Text style={styles.loadingText}>Memuat Pengaturan WhatsApp...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdminWhatsappSettingsList
        settings={settings}
        activeEventKey={activeEventKey}
        onSelectEvent={setActiveEventKey}
      />

      <AdminWhatsappTemplateEditor
        activeEventKey={activeEventKey}
        isEnabled={isEnabled}
        delaySeconds={delaySeconds}
        templateText={templateText}
        placeholders={placeholders}
        previewText={previewText}
        previewWarnings={warnings}
        previewLoading={previewLoading}
        testPhone={testPhone}
        isSaving={isSaving}
        isTesting={isTesting}
        onEnabledToggle={() => setIsEnabled((prev) => !prev)}
        onDelayChange={setDelaySeconds}
        onTemplateChange={setTemplateText}
        onSelectionChange={setSelection}
        onInsertPlaceholder={handleInsertPlaceholder}
        onTestPhoneChange={setTestPhone}
        onReset={handleResetChanges}
        onSave={handleSaveSetting}
        onSendTest={handleSendTest}
      />

      <AdminWhatsappLogsTable
        logs={logs}
        logsLoading={logsLoading}
        statusFilter={statusFilter}
        eventFilter={eventFilter}
        expandedLogId={expandedLogId}
        expandedMetadataLogId={expandedMetadataLogId}
        onRefresh={fetchLogs}
        onStatusFilterChange={setStatusFilter}
        onEventFilterChange={setEventFilter}
        onToggleLogExpand={handleToggleLogExpand}
        onToggleMetadataExpand={handleToggleMetadataExpand}
      />
    </View>
  );
}