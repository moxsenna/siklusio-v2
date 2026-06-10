import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { AvatarPicker } from "@/src/shared/components/AvatarPicker";
import type { AvatarKind } from "@/src/lib/avatars";

interface ProfilePartnerSectionProps {
  avatarUrl: string | null;
  avatarKind: AvatarKind | null;
  userNickname: string;
  husbandName: string;
  husbandNickname: string;
  husbandNumber: string;
  errorPhone: string;
  onAvatarChange: (next: { url: string | null; kind: AvatarKind | null }) => void | Promise<void>;
  onUserNicknameChange: (value: string) => void;
  onHusbandNameChange: (value: string) => void;
  onHusbandNicknameChange: (value: string) => void;
  onHusbandNumberChange: (value: string) => void;
  onSubmit: () => void;
}

export function ProfilePartnerSection({
  avatarUrl,
  avatarKind,
  userNickname,
  husbandName,
  husbandNickname,
  husbandNumber,
  errorPhone,
  onAvatarChange,
  onUserNicknameChange,
  onHusbandNameChange,
  onHusbandNicknameChange,
  onHusbandNumberChange,
  onSubmit,
}: ProfilePartnerSectionProps) {
  return (
    <View className="bg-surface rounded-[32px] p-6 shadow-sm border border-outline-variant">
      <View className="flex-row items-center gap-3 mb-2">
        <FontAwesome name="heart" size={18} color="#ec4899" />
        <Text className="text-base font-bold text-on-surface">Profil & Pasangan</Text>
      </View>
      <Text className="text-[10px] font-mono text-on-surface-variant opacity-60 mb-4">
        Atur foto profil, nama panggilan Anda, dan kontak WhatsApp suami.
      </Text>

      <View className="items-center justify-center mb-6 mt-2 pb-5 border-b border-purple-100">
        <AvatarPicker
          value={avatarUrl}
          kind={avatarKind}
          onChange={onAvatarChange}
          size={80}
        />
        <Text className="text-[10px] text-primary/80 font-bold uppercase tracking-wider mt-2.5">
          Ketuk untuk Mengubah Foto Profil
        </Text>
      </View>

      <View className="gap-4">
        <View>
          <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
            Nama Panggilan Anda
          </Text>
          <TextInput
            value={userNickname}
            onChangeText={onUserNicknameChange}
            placeholder="Cth: Bunda, Sayang"
            placeholderTextColor="#ec489950"
            className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3 text-sm text-on-surface"
          />
        </View>

        <View>
          <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
            Nama Suami
          </Text>
          <TextInput
            value={husbandName}
            onChangeText={onHusbandNameChange}
            placeholder="Cth: Budi Susanto"
            placeholderTextColor="#ec489950"
            className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3 text-sm text-on-surface"
          />
        </View>

        <View>
          <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
            Nama Panggilan Suami
          </Text>
          <TextInput
            value={husbandNickname}
            onChangeText={onHusbandNicknameChange}
            placeholder="Cth: Mas, Sayang, Koko"
            placeholderTextColor="#ec489950"
            className="w-full bg-surface-variant border border-outline-variant rounded-xl p-3 text-sm text-on-surface"
          />
        </View>

        <View>
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Nomor WhatsApp Suami
            </Text>
            {errorPhone ? (
              <Text className="text-[10px] text-error font-medium">{errorPhone}</Text>
            ) : null}
          </View>
          <TextInput
            value={husbandNumber}
            onChangeText={onHusbandNumberChange}
            placeholder="Cth: 6281234567890"
            keyboardType="phone-pad"
            placeholderTextColor="#ec489950"
            className={`w-full bg-surface-variant border rounded-xl p-3 text-sm ${errorPhone ? "border-error text-error" : "border-outline-variant text-on-surface"}`}
          />
        </View>

        <TouchableOpacity
          onPress={onSubmit}
          disabled={!!errorPhone}
          className={`w-full py-3 rounded-2xl items-center justify-center shadow-sm mt-2 active:scale-95 ${
            errorPhone ? "bg-primary/50" : "bg-primary"
          }`}
        >
          <Text className="text-on-primary font-bold text-sm uppercase tracking-wider">
            Simpan Profil & Pasangan
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}