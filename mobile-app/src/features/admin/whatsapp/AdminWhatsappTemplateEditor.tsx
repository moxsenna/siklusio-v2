import React from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import type { EventKey, TextSelection } from "./adminWhatsappTypes";
import { getEventLabel } from "./adminWhatsappUtils";
import { AdminWhatsappPreviewPanel } from "./AdminWhatsappPreviewPanel";
import { AdminWhatsappTestSendPanel } from "./AdminWhatsappTestSendPanel";
import { whatsappStyles as styles } from "./adminWhatsappStyles";

interface AdminWhatsappTemplateEditorProps {
  activeEventKey: EventKey;
  isEnabled: boolean;
  delaySeconds: string;
  templateText: string;
  placeholders: string[];
  previewText: string;
  previewWarnings: string[];
  previewLoading: boolean;
  testPhone: string;
  isSaving: boolean;
  isTesting: boolean;
  onEnabledToggle: () => void;
  onDelayChange: (value: string) => void;
  onTemplateChange: (value: string) => void;
  onSelectionChange: (selection: TextSelection) => void;
  onInsertPlaceholder: (placeholder: string) => void;
  onTestPhoneChange: (value: string) => void;
  onReset: () => void;
  onSave: () => void;
  onSendTest: () => void;
}

export function AdminWhatsappTemplateEditor({
  activeEventKey,
  isEnabled,
  delaySeconds,
  templateText,
  placeholders,
  previewText,
  previewWarnings,
  previewLoading,
  testPhone,
  isSaving,
  isTesting,
  onEnabledToggle,
  onDelayChange,
  onTemplateChange,
  onSelectionChange,
  onInsertPlaceholder,
  onTestPhoneChange,
  onReset,
  onSave,
  onSendTest,
}: AdminWhatsappTemplateEditorProps) {
  return (
    <View style={styles.editorCard}>
      <Text style={styles.editorTitle}>✏️ Edit Template: {getEventLabel(activeEventKey)}</Text>

      <View style={styles.toggleRow}>
        <View style={{ gap: 2 }}>
          <Text style={styles.toggleTitle}>Aktifkan Pengiriman Otomatis</Text>
          <Text style={styles.toggleSubtitle}>
            Jika tidak aktif, log pengiriman tetap dicatat sebagai 'dilewati'.
          </Text>
        </View>

        <TouchableOpacity
          onPress={onEnabledToggle}
          style={[styles.toggleTrack, { backgroundColor: isEnabled ? "#14b8a6" : "#e2e8f0" }]}
        >
          <View
            style={[styles.toggleThumb, { alignSelf: isEnabled ? "flex-end" : "flex-start" }]}
          />
        </TouchableOpacity>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={styles.fieldLabel}>Delay Pengiriman Pesan (Detik)</Text>
        <TextInput
          placeholder="0"
          keyboardType="numeric"
          value={delaySeconds}
          onChangeText={(val) => onDelayChange(val.replace(/[^0-9]/g, ""))}
          style={styles.delayInput}
        />
        <Text style={styles.fieldHint}>
          Masukkan angka 0 untuk kirim instant, maksimal 86400 detik (24 jam).
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={styles.fieldLabel}>Isi Template Pesan (Maksimal 60.000 karakter)</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
        >
          {placeholders.map((ph) => (
            <TouchableOpacity
              key={ph}
              onPress={() => onInsertPlaceholder(ph)}
              style={styles.placeholderChip}
            >
              <Text style={styles.placeholderChipText}>{ph}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TextInput
          multiline
          numberOfLines={10}
          value={templateText}
          onChangeText={onTemplateChange}
          onSelectionChange={(e) => onSelectionChange(e.nativeEvent.selection)}
          placeholder="Ketik isi pesan WhatsApp di sini..."
          style={styles.templateInput}
        />
      </View>

      <AdminWhatsappPreviewPanel
        previewText={previewText}
        warnings={previewWarnings}
        loading={previewLoading}
      />

      <AdminWhatsappTestSendPanel
        testPhone={testPhone}
        isTesting={isTesting}
        onTestPhoneChange={onTestPhoneChange}
        onSendTest={onSendTest}
      />

      <View style={styles.actionRow}>
        <TouchableOpacity onPress={onReset} disabled={isSaving} style={styles.resetButton}>
          <Text style={styles.resetButtonText}>Reset Perubahan</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onSave} disabled={isSaving} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>
            {isSaving ? "Menyimpan..." : "Simpan Template"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}