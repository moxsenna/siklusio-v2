import React from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { DeliveryLog, EventFilter, StatusFilter } from "./adminWhatsappTypes";
import {
  formatLogSnippet,
  formatLogTimestamp,
  getLogEventLabel,
  getSkippedReasonText,
  getStatusBadgeStyle,
} from "./adminWhatsappUtils";
import { whatsappStyles as styles } from "./adminWhatsappStyles";

const STATUS_FILTERS = [
  { k: "all" as const, l: "Semua" },
  { k: "sent" as const, l: "Terkirim" },
  { k: "failed" as const, l: "Gagal" },
  { k: "skipped" as const, l: "Dilewati" },
  { k: "pending" as const, l: "Pending" },
];

const EVENT_FILTERS = [
  { k: "all" as const, l: "Semua Event" },
  { k: "registration_completed" as const, l: "Registrasi Selesai" },
  { k: "payment_completed" as const, l: "Pembayaran Berhasil" },
];

interface AdminWhatsappLogCardProps {
  log: DeliveryLog;
  isExpanded: boolean;
  isMetadataExpanded: boolean;
  onToggleExpand: () => void;
  onToggleMetadata: () => void;
}

function AdminWhatsappLogCard({
  log,
  isExpanded,
  isMetadataExpanded,
  onToggleExpand,
  onToggleMetadata,
}: AdminWhatsappLogCardProps) {
  const badge = getStatusBadgeStyle(log.status);
  const snippet = formatLogSnippet(log.rendered_message);
  const timestamp = formatLogTimestamp(log.created_at);

  return (
    <View style={styles.logCard}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={styles.logEventLabel}>{getLogEventLabel(log.event_key)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: badge.bgColor }]}>
          <Text style={[styles.statusBadgeText, { color: badge.textColor }]}>{badge.label}</Text>
        </View>
      </View>

      <View style={{ gap: 2 }}>
        <Text style={styles.logRecipientName}>{log.recipient_name || "Bunda"}</Text>
        <Text style={styles.logRecipientPhone}>+{log.recipient_whatsapp}</Text>
      </View>

      <View style={styles.logMessageBox}>
        <Text style={styles.logMessageText}>
          {isExpanded ? log.rendered_message : snippet}
        </Text>

        {log.rendered_message && log.rendered_message.length > 140 && (
          <TouchableOpacity onPress={onToggleExpand} style={{ marginTop: 6 }}>
            <Text style={styles.expandLink}>{isExpanded ? "Sembunyikan" : "Lihat Selengkapnya"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {log.status === "failed" && log.error_message && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Penyebab Gagal:</Text>
          <Text style={styles.errorText}>{log.error_message}</Text>
        </View>
      )}

      {log.status === "skipped" && (
        <View style={styles.skippedBox}>
          <Text style={styles.skippedTitle}>Penyebab Dilewati:</Text>
          <Text style={styles.skippedText}>{getSkippedReasonText(log.metadata)}</Text>
        </View>
      )}

      <View style={styles.logMetaRow}>
        <Text style={styles.logMetaText}>
          {timestamp.date} {timestamp.time}
        </Text>

        <TouchableOpacity onPress={onToggleMetadata}>
          <Text style={styles.metadataLink}>
            {isMetadataExpanded ? "Tutup Meta" : "Detail Metadata"}
          </Text>
        </TouchableOpacity>
      </View>

      {isMetadataExpanded && (
        <View style={styles.metadataBox}>
          <Text style={styles.metadataLabel}>Idempotency Key:</Text>
          <Text style={styles.metadataValue}>{log.idempotency_key}</Text>
          {log.provider_message_id && (
            <>
              <Text style={[styles.metadataLabel, { marginTop: 4 }]}>Provider Message ID:</Text>
              <Text style={styles.metadataValue}>{log.provider_message_id}</Text>
            </>
          )}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <>
              <Text style={[styles.metadataLabel, { marginTop: 4 }]}>Context Metadata:</Text>
              <Text style={[styles.metadataValue, { marginTop: 2 }]}>
                {JSON.stringify(log.metadata, null, 2)}
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

interface AdminWhatsappLogsTableProps {
  logs: DeliveryLog[];
  logsLoading: boolean;
  statusFilter: StatusFilter;
  eventFilter: EventFilter;
  expandedLogId: string | null;
  expandedMetadataLogId: string | null;
  onRefresh: () => void;
  onStatusFilterChange: (filter: StatusFilter) => void;
  onEventFilterChange: (filter: EventFilter) => void;
  onToggleLogExpand: (logId: string) => void;
  onToggleMetadataExpand: (logId: string) => void;
}

export function AdminWhatsappLogsTable({
  logs,
  logsLoading,
  statusFilter,
  eventFilter,
  expandedLogId,
  expandedMetadataLogId,
  onRefresh,
  onStatusFilterChange,
  onEventFilterChange,
  onToggleLogExpand,
  onToggleMetadataExpand,
}: AdminWhatsappLogsTableProps) {
  return (
    <View style={styles.logsCard}>
      <View style={styles.logsHeader}>
        <Text style={styles.logsTitle}>📋 Log Pengiriman Terakhir</Text>

        <TouchableOpacity
          onPress={onRefresh}
          disabled={logsLoading}
          style={styles.refreshButton}
        >
          <FontAwesome name="refresh" size={14} color="#ec4899" />
        </TouchableOpacity>
      </View>

      <View style={{ gap: 10 }}>
        <View style={{ gap: 4 }}>
          <Text style={styles.filterLabel}>Filter Status:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {STATUS_FILTERS.map((item) => {
              const isSel = statusFilter === item.k;
              return (
                <TouchableOpacity
                  key={item.k}
                  onPress={() => onStatusFilterChange(item.k)}
                  style={[styles.filterChip, { backgroundColor: isSel ? "#ec4899" : "#f1f5f9" }]}
                >
                  <Text style={[styles.filterChipText, { color: isSel ? "#fff" : "#64748b" }]}>
                    {item.l}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ gap: 4 }}>
          <Text style={styles.filterLabel}>Filter Event:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {EVENT_FILTERS.map((item) => {
              const isSel = eventFilter === item.k;
              return (
                <TouchableOpacity
                  key={item.k}
                  onPress={() => onEventFilterChange(item.k)}
                  style={[styles.filterChip, { backgroundColor: isSel ? "#9333ea" : "#f1f5f9" }]}
                >
                  <Text style={[styles.filterChipText, { color: isSel ? "#fff" : "#64748b" }]}>
                    {item.l}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {logsLoading ? (
        <View style={{ paddingVertical: 32, alignItems: "center" }}>
          <ActivityIndicator size="small" color="#ec4899" />
        </View>
      ) : logs.length === 0 ? (
        <View style={{ paddingVertical: 32, alignItems: "center" }}>
          <Text style={styles.emptyLogsText}>Tidak ada log pengiriman ditemukan.</Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {logs.map((log) => (
            <AdminWhatsappLogCard
              key={log.id}
              log={log}
              isExpanded={expandedLogId === log.id}
              isMetadataExpanded={expandedMetadataLogId === log.id}
              onToggleExpand={() => onToggleLogExpand(log.id)}
              onToggleMetadata={() => onToggleMetadataExpand(log.id)}
            />
          ))}
        </View>
      )}
    </View>
  );
}