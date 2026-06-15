import React from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

interface BonusItem {
  id: string;
  title: string;
  category: string;
  description: string;
  url: string;
  imageUrl: string;
  icon: string;
  badgeColor: string;
  badgeTextColor: string;
}

const BONUSES: BonusItem[] = [
  {
    id: "kalender-promil",
    title: "Kalender Promil 30 Hari",
    category: "EDUKASI",
    description: "Langkah kecil harian yang dirancang untuk memahami ritme tubuh Bunda dan Ayah secara alami.",
    url: "https://siklusio.web.id/bonus/kalender-promil-30-hari.html",
    imageUrl: "https://siklusio.web.id/assets/Kalender%20Promil%2030%20hari.webp",
    icon: "calendar",
    badgeColor: "bg-pink-100",
    badgeTextColor: "text-pink-700",
  },
  {
    id: "kamus-sinyal",
    title: "Kamus Sinyal Tubuh Bunda",
    category: "PANDUAN",
    description: "Terjemahkan bahasa tubuh Bunda di setiap fase siklus agar Bunda paham kapan hormon bekerja.",
    url: "https://siklusio.web.id/bonus/kamus-sinyal-tubuh-bunda.html",
    imageUrl: "https://siklusio.web.id/assets/Kamus%20sinyal%20tubuh.webp",
    icon: "book",
    badgeColor: "bg-purple-100",
    badgeTextColor: "text-purple-700",
  },
  {
    id: "promil-planner",
    title: "Promil Hemat Planner",
    category: "FINANSIAL",
    description: "Susun target finansial promil, kalkulasi biaya, dan hindari bocor halus bersama Ayah.",
    url: "https://siklusio.web.id/bonus/promil-hemat-planner.html",
    imageUrl: "https://siklusio.web.id/assets/Promil_Hemat_Planner.webp",
    icon: "money",
    badgeColor: "bg-emerald-100",
    badgeTextColor: "text-emerald-700",
  },
  {
    id: "tww-survival",
    title: "TWW Survival Kit",
    category: "MENTAL HEALTH",
    description: "Atasi overthinking dan bantu kelola cemas di masa 2 minggu menanti (Two Week Wait) setelah ovulasi.",
    url: "https://siklusio.web.id/bonus/tww-survival-kit.html",
    imageUrl: "https://siklusio.web.id/assets/TWW%20Survival%20Kit.webp",
    icon: "heart",
    badgeColor: "bg-amber-100",
    badgeTextColor: "text-amber-700",
  },
  {
    id: "stiker-wa",
    title: "Stiker WhatsApp Eksklusif",
    category: "CREATIVE PACK",
    description: "Bagikan ekspresi gemas dan pesan hangat seputar promil dan haid langsung ke chat WhatsApp suami.",
    url: "https://sticker.ly/s/CIMZ7A",
    imageUrl: "https://siklusio.web.id/assets/stiker%20pack.webp",
    icon: "smile-o",
    badgeColor: "bg-indigo-100",
    badgeTextColor: "text-indigo-700",
  },
];

export default function BonusScreen() {
  const router = useRouter();

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch((err) => {
      console.error("Gagal membuka tautan bonus:", err);
    });
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-background">
      <Stack.Screen options={{ title: "Bonus Eksklusif", headerShown: false }} />
      
      {/* Custom Header */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-3 border-b border-purple-100/50">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white items-center justify-center border border-purple-100 shadow-sm active:scale-95"
        >
          <FontAwesome name="angle-left" size={24} color="#ec4899" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-on-background">Bonus Eksklusif</Text>
        <View className="w-10" /> {/* Spacer */}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} style={{ flex: 1 }}>
        {/* Intro Section */}
        <View className="mb-6 items-center bg-white/70 border border-purple-100 rounded-3xl p-5 shadow-sm">
          <View className="w-12 h-12 bg-pink-100 rounded-2xl items-center justify-center mb-3">
            <FontAwesome name="gift" size={24} color="#ec4899" />
          </View>
          <Text className="text-xl font-bold text-gray-800 text-center">Spesial Untuk Bunda & Ayah</Text>
          <Text className="text-xs text-gray-500 text-center mt-2 leading-5">
            Gunakan starter kit dan material edukasi berikut untuk mendampingi perjalanan promil yang lebih harmonis dan bebas stres.
          </Text>
        </View>

        {/* Bonus List */}
        <View className="gap-6">
          {BONUSES.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.9}
              onPress={() => handleOpenLink(item.url)}
              className="bg-white rounded-[28px] overflow-hidden border border-purple-100/60 shadow-sm active:scale-[0.99] active:shadow-md"
            >
              {/* Cover Image */}
              <View className="relative w-full h-44 bg-pink-50/20">
                <Image
                  source={{ uri: item.imageUrl }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
                <View className={`absolute top-4 right-4 px-3 py-1 rounded-full ${item.badgeColor}`}>
                  <Text className={`text-[10px] font-bold tracking-wider ${item.badgeTextColor}`}>
                    {item.category}
                  </Text>
                </View>
              </View>

              {/* Body */}
              <View className="p-5">
                <View className="flex-row items-center gap-2 mb-2">
                  <FontAwesome name={item.icon as any} size={16} color="#ec4899" />
                  <Text className="text-base font-bold text-gray-800 flex-1">{item.title}</Text>
                </View>
                
                <Text className="text-xs text-gray-500 leading-5 mb-4">
                  {item.description}
                </Text>

                <View className="flex-row items-center justify-center gap-2 py-3 bg-pink-50/80 rounded-2xl border border-pink-100/30">
                  <Text className="text-primary font-bold text-xs uppercase tracking-wider">
                    {item.id === "stiker-wa" ? "Ambil Stiker WA" : "Buka Panduan"}
                  </Text>
                  <FontAwesome
                    name={item.id === "stiker-wa" ? "external-link" : "arrow-right"}
                    size={10}
                    color="#ec4899"
                  />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Disclaimer */}
        <View className="mt-8 bg-purple-50/50 border border-purple-100/50 rounded-2xl p-4">
          <Text className="text-[10px] text-purple-700/80 font-bold uppercase tracking-wider mb-1">
            Disclaimer Medis
          </Text>
          <Text className="text-[10px] text-gray-400 leading-4">
            Materi di atas bersifat edukasi umum dan bukan pengganti saran atau rujukan medis resmi dari dokter spesialis kandungan Anda.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
