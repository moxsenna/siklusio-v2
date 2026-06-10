import React from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { CreateAffiliatePayload } from "./adminAffiliateTypes";
import { affiliateStyles as styles } from "./adminAffiliateStyles";

interface AdminAffiliateFormModalProps {
  form: CreateAffiliatePayload;
  isSubmitting: boolean;
  onChange: (updater: (prev: CreateAffiliatePayload) => CreateAffiliatePayload) => void;
  onSubmit: () => void;
}

export function AdminAffiliateFormModal({
  form,
  isSubmitting,
  onChange,
  onSubmit,
}: AdminAffiliateFormModalProps) {
  return (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Tambah Afiliasi Baru</Text>

      <View style={styles.formRow}>
        <TextInput
          placeholder="Nama Lengkap"
          value={form.name}
          onChangeText={(t) => onChange((p) => ({ ...p, name: t }))}
          style={styles.formInput}
        />
        <TextInput
          placeholder="Email"
          value={form.email}
          onChangeText={(t) => onChange((p) => ({ ...p, email: t }))}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.formInput}
        />
      </View>

      <View style={styles.formRow}>
        <TextInput
          placeholder="Nomor WhatsApp"
          value={form.whatsapp}
          onChangeText={(t) => onChange((p) => ({ ...p, whatsapp: t }))}
          keyboardType="phone-pad"
          style={styles.formInput}
        />
        <TextInput
          placeholder="Kode Afiliasi (Mis: BUNDACERDAS)"
          value={form.code}
          onChangeText={(t) =>
            onChange((p) => ({ ...p, code: t.toUpperCase().replace(/\s/g, "") }))
          }
          autoCapitalize="characters"
          style={styles.formInputCode}
        />
      </View>

      <View style={[styles.formRow, { alignItems: "center" }]}>
        <View style={styles.commissionToggle}>
          <TouchableOpacity
            onPress={() => onChange((p) => ({ ...p, commission_type: "percentage" }))}
            style={[
              styles.commissionToggleBtn,
              {
                backgroundColor:
                  form.commission_type === "percentage" ? "#ec4899" : "transparent",
              },
            ]}
          >
            <Text
              style={[
                styles.commissionToggleText,
                { color: form.commission_type === "percentage" ? "#fff" : "#64748b" },
              ]}
            >
              Persen (%)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onChange((p) => ({ ...p, commission_type: "nominal" }))}
            style={[
              styles.commissionToggleBtn,
              {
                backgroundColor: form.commission_type === "nominal" ? "#ec4899" : "transparent",
              },
            ]}
          >
            <Text
              style={[
                styles.commissionToggleText,
                { color: form.commission_type === "nominal" ? "#fff" : "#64748b" },
              ]}
            >
              Nominal (Rp)
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          placeholder={
            form.commission_type === "percentage" ? "Nilai Komisi (%)" : "Nilai Komisi (Rp)"
          }
          value={String(form.commission_value)}
          onChangeText={(t) =>
            onChange((p) => ({
              ...p,
              commission_value: Number(t.replace(/[^0-9]/g, "")),
            }))
          }
          keyboardType="numeric"
          style={[styles.formInput, { minWidth: 150 }]}
        />
      </View>

      <View style={styles.divider} />
      <Text style={styles.bankSectionTitle}>Informasi Bank (Opsional)</Text>

      <View style={styles.formRow}>
        <TextInput
          placeholder="Nama Bank"
          value={form.bank_name}
          onChangeText={(t) => onChange((p) => ({ ...p, bank_name: t }))}
          style={styles.formInputSmall}
        />
        <TextInput
          placeholder="Nomor Rekening"
          value={form.account_number}
          onChangeText={(t) => onChange((p) => ({ ...p, account_number: t }))}
          keyboardType="numeric"
          style={[styles.formInput, { minWidth: 150 }]}
        />
        <TextInput
          placeholder="Nama Pemilik Rekening"
          value={form.account_holder}
          onChangeText={(t) => onChange((p) => ({ ...p, account_holder: t }))}
          style={styles.formInput}
        />
      </View>

      <TouchableOpacity
        onPress={() => onChange((p) => ({ ...p, autoCreateCoupon: !p.autoCreateCoupon }))}
        style={styles.checkboxRow}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: form.autoCreateCoupon ? "#ec4899" : "#cbd5e1",
              backgroundColor: form.autoCreateCoupon ? "#ec4899" : "#fff",
            },
          ]}
        >
          {form.autoCreateCoupon && <FontAwesome name="check" size={14} color="#fff" />}
        </View>
        <Text style={styles.checkboxLabel}>Buat kupon diskon otomatis dengan kode ini</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onSubmit} disabled={isSubmitting} style={styles.submitButton}>
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Tambah Afiliasi</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}