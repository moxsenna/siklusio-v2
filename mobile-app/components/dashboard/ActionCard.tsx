import React, { useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useCycle } from "../../src/context/CycleContext";
import { useTodayKey } from "../../src/hooks/useTodayKey";

interface ActionCardProps {
  onOpenMessageModal: () => void;
  isFertile: boolean;
  isStrictOvulation: boolean;
}

export function ActionCard({ onOpenMessageModal, isFertile, isStrictOvulation }: ActionCardProps) {
  const { currentPhase, activityHistory, userNickname } = useCycle();
  const router = useRouter();
  const todayKey = useTodayKey();

  // Completion metric for today
  const completionPercent = useMemo(() => {
    const todayRecord = activityHistory[todayKey];
    if (todayRecord && todayRecord.tasks && todayRecord.tasks.length > 0) {
      const completed = todayRecord.tasks.filter((t: any) => t.done).length;
      return Math.round((completed / todayRecord.tasks.length) * 100);
    }
    return 0;
  }, [activityHistory, todayKey]);

  // Dynamic Action/Insight Card
  const actionCard = useMemo(() => {
    if (completionPercent < 50) {
      return {
        icon: "🔔",
        title: "Siklus Hari Ini",
        desc: `Aktivitas promil baru selesai ${completionPercent}%. Yuk lengkapi checklist harian Anda demi hasil yang maksimal!`,
        actionText: "Lanjutkan Aktivitas",
      };
    } else if (isStrictOvulation) {
      return {
        icon: "💖",
        title: "Puncak Ovulasi",
        desc: "Ini adalah hari puncak ovulasi Anda. Peluang terbaik Anda sedang berlangsung. Sudah atur waktu dengan suami hari ini?",
        actionText: "Lanjutkan Aktivitas",
      };
    } else if (isFertile) {
      return {
        icon: "💕",
        title: "Masa Subur",
        desc: "Anda sedang dalam masa subur. Ini adalah waktu yang sangat baik untuk berhubungan. Tetap rileks dan nikmati momen bersama.",
        actionText: "Lanjutkan Aktivitas",
      };
    } else if (currentPhase === "Menstrual") {
      return {
        icon: "🩸",
        title: "Fokus Pemulihan",
        desc: "Hari ini sebaiknya Anda banyak istirahat. Asupan zat besi dan kompres hangat sangat direkomendasikan.",
        actionText: "Lihat Nutrisi",
      };
    } else {
      return {
        icon: "✨",
        title: "Konsistensi Luar Biasa",
        desc: `Checklist harian Anda berjalan baik. Tetap jaga pola hidup sehat dan cukup istirahat ya ${userNickname}.`,
        actionText: "Lihat Histori",
      };
    }
  }, [completionPercent, currentPhase, isFertile, isStrictOvulation, userNickname]);

  const iconBgClass = useMemo(() => {
    if (isStrictOvulation || isFertile) {
      return "bg-secondary"; // Teal (fase subur / ovulasi)
    }
    return "bg-primary/10"; // Soft pink (fase menstruasi / normal)
  }, [isStrictOvulation, isFertile]);

  return (
    <View className="w-full pb-8">
      <View className="bg-surface rounded-[32px] p-[24px] shadow-sm border border-outline-variant">
        <View
          className={`w-12 h-12 ${iconBgClass} rounded-2xl items-center justify-center mb-[16px]`}
        >
          <Text className="text-2xl">{actionCard.icon}</Text>
        </View>
        <Text className="text-sm font-bold text-on-background mb-[4px]">{actionCard.title}</Text>
        <Text className="text-[10px] text-on-background opacity-50 leading-relaxed min-h-[40px] font-bold">
          {actionCard.desc}
        </Text>

        <TouchableOpacity
          onPress={() => {
            if (
              actionCard.actionText === "Lanjutkan Aktivitas" ||
              actionCard.actionText === "Lihat Nutrisi"
            ) {
              router.replace("/(tabs)/habits");
            } else if (actionCard.actionText === "Lihat Histori") {
              router.replace("/(tabs)/calendar");
            }
          }}
          className="w-full bg-primary py-[16px] rounded-2xl items-center justify-center mt-[16px] shadow-md active:scale-95"
        >
          <Text className="text-on-primary font-bold uppercase text-[10px] tracking-widest">
            {actionCard.actionText}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
