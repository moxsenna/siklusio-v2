import React from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { LeadStatus, PaymentStatus, ViewMode } from "./adminCrmTypes";
import { leadOptions, paymentOptions } from "./adminCrmTypes";
import { crmStyles as styles } from "./adminCrmStyles";

interface AdminCrmToolbarProps {
  searchQuery: string;
  viewMode: ViewMode;
  paymentFilter: PaymentStatus | "all";
  leadStatusFilter: LeadStatus | "all";
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onViewModeChange: (mode: ViewMode) => void;
  onPaymentFilterChange: (value: PaymentStatus | "all") => void;
  onLeadStatusFilterChange: (value: LeadStatus | "all") => void;
}

export function AdminCrmToolbar({
  searchQuery,
  viewMode,
  paymentFilter,
  leadStatusFilter,
  onSearchChange,
  onRefresh,
  onViewModeChange,
  onPaymentFilterChange,
  onLeadStatusFilterChange,
}: AdminCrmToolbarProps) {
  const paymentFilterOptions: Array<{ value: PaymentStatus | "all"; label: string }> = [
    { value: "all", label: "Semua Pembayaran" },
    ...paymentOptions,
  ];

  const leadFilterOptions: Array<{ value: LeadStatus | "all"; label: string }> = [
    { value: "all", label: "Semua Status Lead" },
    ...leadOptions,
  ];

  return (
    <>
      <View style={styles.toolbar}>
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={14} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Cari nama, email, WA, referral..."
            style={styles.searchInput}
          />
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <FontAwesome name="refresh" size={14} color="#ec4899" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabsRow}>
        {(["list", "kanban", "detail"] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.tabButton, viewMode === mode && styles.tabButtonActive]}
            onPress={() => onViewModeChange(mode)}
          >
            <Text style={[styles.tabButtonText, viewMode === mode && styles.tabButtonTextActive]}>
              {mode === "list" ? "List" : mode === "kanban" ? "Kanban" : "Detail"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
            {paymentFilterOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.filterPill, paymentFilter === opt.value && styles.filterPillActive]}
                onPress={() => onPaymentFilterChange(opt.value)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    paymentFilter === opt.value && styles.filterPillTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {paymentFilter !== "all" && (
            <TouchableOpacity
              style={[styles.filterPill, { borderColor: "#ef4444", backgroundColor: "#fef2f2" }]}
              onPress={() => onPaymentFilterChange("all")}
            >
              <Text style={[styles.filterPillText, { color: "#ef4444" }]}>Hapus</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
            {leadFilterOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.filterPill, leadStatusFilter === opt.value && styles.filterPillActive]}
                onPress={() => onLeadStatusFilterChange(opt.value)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    leadStatusFilter === opt.value && styles.filterPillTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {leadStatusFilter !== "all" && (
            <TouchableOpacity
              style={[styles.filterPill, { borderColor: "#ef4444", backgroundColor: "#fef2f2" }]}
              onPress={() => onLeadStatusFilterChange("all")}
            >
              <Text style={[styles.filterPillText, { color: "#ef4444" }]}>Hapus</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
}

interface AdminCrmPaginationProps {
  offset: number;
  limit: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
}

export function AdminCrmPagination({
  offset,
  limit,
  totalCount,
  onPrev,
  onNext,
}: AdminCrmPaginationProps) {
  return (
    <View style={styles.paginationRow}>
      <TouchableOpacity
        disabled={offset === 0}
        style={[styles.pageBtn, offset === 0 && { opacity: 0.4 }]}
        onPress={onPrev}
      >
        <FontAwesome name="chevron-left" size={12} color="#475569" />
        <Text style={styles.pageBtnText}>Prev</Text>
      </TouchableOpacity>

      <Text style={styles.pageLabel}>
        Menampilkan {Math.min(totalCount, offset + 1)}-{Math.min(totalCount, offset + limit)} dari{" "}
        {totalCount} lead
      </Text>

      <TouchableOpacity
        disabled={offset + limit >= totalCount}
        style={[styles.pageBtn, offset + limit >= totalCount && { opacity: 0.4 }]}
        onPress={onNext}
      >
        <Text style={styles.pageBtnText}>Next</Text>
        <FontAwesome name="chevron-right" size={12} color="#475569" />
      </TouchableOpacity>
    </View>
  );
}