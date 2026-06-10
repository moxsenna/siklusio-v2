import React, { useState, useEffect } from "react";
import { View, Alert, Platform } from "react-native";
import { useAdminAffiliates } from "@/src/hooks/useAdminAffiliates";
import type { AffiliateConversion, AffiliateSubTab, CreateAffiliatePayload } from "./affiliate/adminAffiliateTypes";
import { AdminAffiliateStatsCards } from "./affiliate/AdminAffiliateStatsCards";
import { AdminAffiliateToolbar } from "./affiliate/AdminAffiliateToolbar";
import { AdminAffiliateFormModal } from "./affiliate/AdminAffiliateFormModal";
import { AdminAffiliateListView } from "./affiliate/AdminAffiliateListView";
import { AdminAffiliateConversionTable } from "./affiliate/AdminAffiliateConversionTable";
import {
  EMPTY_AFFILIATE_FORM,
  toErrorMessage,
  validateCreateAffiliateForm,
} from "./affiliate/adminAffiliateUtils";
import { affiliateStyles as styles } from "./affiliate/adminAffiliateStyles";

export default function AdminAffiliatePanel() {
  const {
    affiliates,
    conversions,
    loading,
    conversionsLoading,
    error,
    fetchAffiliates,
    fetchConversions,
    createAffiliate,
    toggleAffiliate,
    deleteAffiliate,
    markPayout,
    pendingCommission,
    paidCommission,
    totalRevenue,
  } = useAdminAffiliates();

  const [activeSubTab, setActiveSubTab] = useState<AffiliateSubTab>("list");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newAffiliate, setNewAffiliate] = useState<CreateAffiliatePayload>(EMPTY_AFFILIATE_FORM);

  useEffect(() => {
    fetchAffiliates();
    fetchConversions();
  }, [fetchAffiliates, fetchConversions]);

  const handleCreate = async () => {
    if (!validateCreateAffiliateForm(newAffiliate)) {
      Alert.alert("Gagal", "Pastikan nama, email, whatsapp, dan kode rujukan terisi.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createAffiliate(newAffiliate);
      setNewAffiliate(EMPTY_AFFILIATE_FORM);
      Alert.alert("Sukses", "Afiliasi berhasil dibuat.");
    } catch (err: unknown) {
      Alert.alert("Gagal", toErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = (id: string, currentStatus: boolean) => {
    toggleAffiliate(id, currentStatus).catch((err: unknown) =>
      Alert.alert("Gagal", toErrorMessage(err)),
    );
  };

  const handleDelete = (id: string) => {
    Alert.alert("Hapus Afiliasi", "Yakin ingin menghapus afiliasi ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () =>
          deleteAffiliate(id).catch((err: unknown) => Alert.alert("Gagal", toErrorMessage(err))),
      },
    ]);
  };

  const handleMarkPayout = (conversion: AffiliateConversion) => {
    if (Platform.OS === "web") {
      const ref = window.prompt("Masukkan referensi transfer (opsional):");
      if (ref !== null) {
        markPayout(conversion.id, ref, "").catch((err: unknown) =>
          window.alert("Gagal: " + toErrorMessage(err)),
        );
      }
    } else {
      Alert.prompt("Tandai Sudah Dibayar", "Masukkan nomor referensi transfer (opsional):", [
        { text: "Batal", style: "cancel" },
        {
          text: "Simpan",
          onPress: (ref?: string) =>
            markPayout(conversion.id, ref || "", "").catch((err: unknown) =>
              Alert.alert("Gagal", toErrorMessage(err)),
            ),
        },
      ]);
    }
  };

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <View style={styles.container}>
      <AdminAffiliateStatsCards
        totalRevenue={totalRevenue}
        pendingCommission={pendingCommission}
        paidCommission={paidCommission}
      />

      <AdminAffiliateToolbar
        activeSubTab={activeSubTab}
        error={error}
        onSubTabChange={setActiveSubTab}
      />

      {activeSubTab === "list" ? (
        <View style={styles.sectionGap}>
          <AdminAffiliateFormModal
            form={newAffiliate}
            isSubmitting={isSubmitting}
            onChange={(updater) => setNewAffiliate(updater)}
            onSubmit={handleCreate}
          />
          <AdminAffiliateListView
            affiliates={affiliates}
            loading={loading}
            expandedId={expandedId}
            onToggleExpand={handleToggleExpand}
            onToggleActive={handleToggle}
            onDelete={handleDelete}
          />
        </View>
      ) : (
        <AdminAffiliateConversionTable
          conversions={conversions}
          loading={conversionsLoading}
          onMarkPayout={handleMarkPayout}
        />
      )}
    </View>
  );
}