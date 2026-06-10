import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import type { CrmLead } from "./adminCrmTypes";
import { formatDateTime } from "./adminCrmUtils";
import { crmStyles as styles } from "./adminCrmStyles";

interface AdminCrmNotesPanelProps {
  lead: CrmLead;
  noteText: string;
  saving: boolean;
  onNoteTextChange: (value: string) => void;
  onAddNote: () => void;
}

export function AdminCrmNotesPanel({
  lead,
  noteText,
  saving,
  onNoteTextChange,
  onAddNote,
}: AdminCrmNotesPanelProps) {
  return (
    <View style={styles.detailSection}>
      <Text style={styles.detailSectionTitle}>Catatan Admin ({lead.notes?.length || 0})</Text>
      <TextInput
        value={noteText}
        onChangeText={onNoteTextChange}
        placeholder="Tambah catatan perkembangan follow-up..."
        multiline
        style={[styles.formInput, { minHeight: 60 }]}
      />
      <TouchableOpacity
        disabled={saving || !noteText.trim()}
        style={[styles.btnPink, !noteText.trim() && { backgroundColor: "#cbd5e1" }, { marginTop: 8 }]}
        onPress={onAddNote}
      >
        <Text style={styles.btnPinkText}>Simpan Catatan</Text>
      </TouchableOpacity>

      <View style={{ gap: 8, marginTop: 12 }}>
        {(lead.notes || []).map((n) => (
          <View key={n.id} style={styles.noteBox}>
            <Text style={styles.noteText}>{n.note}</Text>
            <Text style={styles.noteMeta}>Oleh Admin • {formatDateTime(n.created_at)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}