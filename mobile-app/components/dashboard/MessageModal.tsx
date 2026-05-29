import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, Modal } from 'react-native';
import { useCycle } from '../../src/context/CycleContext';

interface MessageModalProps {
  onClose: () => void;
}

export function MessageModal({ onClose }: MessageModalProps) {
  const {
    currentPhase,
    cycleDay,
    daysToNextPeriod,
    husbandNickname,
    husbandNumber,
    getDayInfo,
  } = useCycle();
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);

  const getTipsSuamiPhase = () => {
    const todayInfo = getDayInfo(new Date());

    if (todayInfo.displayPhase === 'Masa Subur') {
      return 'subur';
    }

    if (todayInfo.displayPhase === 'Ovulasi') {
      return 'ovulasi';
    }

    const phaseMap: Record<string, string> = {
      Menstrual: 'menstruasi',
      Folikular: 'folikular',
      Luteal: 'luteal',
    };

    return phaseMap[currentPhase] || 'umum';
  };

  const getSafeHusbandNickname = () => {
    const trimmed = husbandNickname.trim();
    return trimmed ? trimmed.slice(0, 24) : 'Mas';
  };

  const getTipsSuamiUrl = () => {
    const fase = getTipsSuamiPhase();
    const nama = encodeURIComponent(getSafeHusbandNickname());
    return `https://siklusio.web.id/tips-suami.html?fase=${fase}&nama=${nama}`;
  };

  const appendTipsLink = (message: string) => {
    return `${message}\n\nAku juga kirim panduan singkat buat kamu di sini ya: ${getTipsSuamiUrl()}`;
  };

  const templates = useMemo(() => {
    if (currentPhase === 'Menstrual') {
      return [
        appendTipsLink(`Masih haid hari ke-${cycleDay} nih ${husbandNickname}, bawain cemilan yang manis-manis dong pas pulang 🥺`),
        appendTipsLink(`${husbandNickname}, perutku lagi kram banget nih hari ini. Nanti tolong pijitin yaa 🤗`),
        appendTipsLink(`Lagi dapet nih ${husbandNickname}, mood lagi gampang berubah. Maafin ya kalo agak rewel hari ini 🙏 hehe`),
        appendTipsLink(`Hari ini haid hari ke-${cycleDay} lho ${husbandNickname}. Doain cepet selesai ya biar kita bisa lanjut promil lagi 🥰`)
      ];
    } else if (currentPhase === 'Ovulasi') {
      return [
        appendTipsLink(`${husbandNickname || 'Mas'}, aku lagi di masa subur menurut Siklusio. Baca tipsnya sebentar ya, biar kita bisa ikhtiar lebih kompak 💕`),
        appendTipsLink(`${husbandNickname}, aplikasiku bilang hari ini lagi puncak masa subur (ovulasi) nih! Jangan pulang malem-malem yaa 😉`),
        appendTipsLink(`Lagi masa subur nih ${husbandNickname}, yuk semangat promilnya bulan ini biar cepet dikasih momongan ❤️`),
        appendTipsLink(`Hari ini ovulasi lho ${husbandNickname}. Persiapkan tenagamu ya untuk malam ini! 🔥`),
        appendTipsLink(`${husbandNickname}... moodku lagi bagus banget nih karena lagi masa subur. Quality time yuk nanti! ✨`)
      ];
    } else {
      return [
        appendTipsLink(`${husbandNickname}, bulan ini haidnya diprediksi sekitar ${daysToNextPeriod} hari lagi. Doain semoga bulan ini ada garis dua yaa 🙏`),
        appendTipsLink(`${husbandNickname}, jangan lupa minum vitamin promilnya juga okey! Biar kita berdua sama-sama sehat 💪`),
        appendTipsLink(`Sekarang udah masuk fase ${currentPhase} lho ${husbandNickname}. Semoga bulan ini bawa kabar baik buat kita ❤️`),
        appendTipsLink(`Lagi nunggu-nunggu hasil promil bulan ini nih ${husbandNickname}... Banyakin doa ya semoga dimudahkan 🥰`)
      ];
    }
  }, [currentPhase, cycleDay, daysToNextPeriod, husbandNickname, getDayInfo]);

  const handleSend = () => {
    const text = templates[selectedTemplateIndex];
    const url = `https://wa.me/${husbandNumber}/?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(err => console.error("Gagal membuka WhatsApp", err));
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        {/* Backdrop */}
        <TouchableOpacity 
          activeOpacity={1}
          onPress={onClose}
          className="absolute inset-0"
        />
        
        {/* Bottom Sheet */}
        <View className="relative bg-background rounded-t-[32px] w-full max-w-md mx-auto p-[24px] pb-[40px] border border-outline-variant shadow-lg">
        <View className="flex-row justify-between items-center mb-[24px]">
           <Text className="text-[10px] font-bold uppercase tracking-widest opacity-60 text-on-background">TEMPLATE PESAN</Text>
           <TouchableOpacity 
             onPress={onClose}
             className="w-8 h-8 rounded-full bg-surface-variant items-center justify-center"
           >
             <Text className="text-sm font-bold text-on-surface-variant">✕</Text>
           </TouchableOpacity>
        </View>
        
        <ScrollView className="max-h-[300px] mb-[24px]">
          {templates.map((template, index) => (
            <TouchableOpacity 
              key={index} 
              onPress={() => setSelectedTemplateIndex(index)}
              className={`p-[16px] rounded-[24px] mb-3 border ${
                selectedTemplateIndex === index 
                  ? 'bg-primary/10 border-primary text-on-background' 
                  : 'bg-surface border-outline-variant text-on-surface-variant'
              }`}
            >
              <Text className="text-sm text-on-background leading-relaxed">{template}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          onPress={handleSend}
          className="w-full bg-[#8A9A86] py-[20px] rounded-[24px] flex-row justify-center items-center gap-[12px] shadow-md active:scale-95"
        >
          <Text className="text-white font-bold text-[12px] uppercase tracking-widest text-center">
            💝 Curhat ke Suami
          </Text>
        </TouchableOpacity>
      </View>
    </View>
    </Modal>
  );
}
