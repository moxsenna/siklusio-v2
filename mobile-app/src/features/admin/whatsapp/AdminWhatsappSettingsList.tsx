import React from "react";
import { View, Text } from "react-native";
import type { AutoresponderSetting, EventKey } from "./adminWhatsappTypes";
import { AdminWhatsappEventCard } from "./AdminWhatsappEventCard";
import { whatsappStyles as styles } from "./adminWhatsappStyles";

interface AdminWhatsappSettingsListProps {
  settings: AutoresponderSetting[];
  activeEventKey: EventKey;
  onSelectEvent: (eventKey: EventKey) => void;
}

export function AdminWhatsappSettingsList({
  settings,
  activeEventKey,
  onSelectEvent,
}: AdminWhatsappSettingsListProps) {
  return (
    <>
      <View style={styles.introCard}>
        <Text style={styles.introTitle}>📱 WhatsApp Autoresponder (Fonnte)</Text>
        <Text style={styles.introSubtitle}>
          Kelola pesan otomatis yang dikirimkan ke WhatsApp pelanggan. Nada pesan disesuaikan ramah
          dan hangat (menyapa dengan "Bunda") sesuai brand Siklusio.
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <Text style={styles.sectionLabel}>Pilih Event Untuk Diedit</Text>
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          {settings.map((item) => (
            <AdminWhatsappEventCard
              key={item.id}
              setting={item}
              isActive={activeEventKey === item.event_key}
              onSelect={onSelectEvent}
            />
          ))}
        </View>
      </View>
    </>
  );
}