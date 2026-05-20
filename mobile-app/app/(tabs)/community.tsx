import React from 'react';
import { View, Text, ScrollView, SafeAreaView } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function CommunityScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background">
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 40, flexGrow: 1 }}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View className="mb-6 pt-4 flex-row justify-between items-center border-b border-primary/20 pb-4">
          <View className="flex-1 pr-2">
            <Text className="text-3xl font-bold text-on-background">Komunitas</Text>
            <Text className="text-xs font-mono uppercase tracking-widest text-on-surface-variant opacity-60 mt-1">
              Ruang Saling Mendukung
            </Text>
          </View>
          <View className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shrink-0">
            <FontAwesome name="users" size={22} color="#ec4899" />
          </View>
        </View>

        {/* Coming Soon Placeholder */}
        <View className="flex-1 items-center justify-center py-16 gap-6">
          <View className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
            <FontAwesome name="heart" size={28} color="#ec4899" />
          </View>
          <View className="items-center max-w-[280px]">
            <Text className="text-xl font-bold text-on-background mb-2 text-center">
              Segera Hadir
            </Text>
            <Text className="text-sm text-on-surface-variant text-center leading-relaxed">
              Sebentar lagi kamu bisa berbagi cerita, memberi dukungan, dan
              terhubung dengan sesama pengguna Siklusio.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
