import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { apiGetJson, apiPostJson } from '../../src/lib/api';

interface TopUpPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  displayPrice: string;
}

const PACKAGES: TopUpPackage[] = [
  { id: 'coba_dulu', name: 'Coba Dulu', credits: 300, price: 9900, displayPrice: 'Rp9.900' },
  { id: 'teman_mingguan', name: 'Teman Mingguan', credits: 1000, price: 24900, displayPrice: 'Rp24.900' },
  { id: 'sahabat_siklus', name: 'Sahabat Siklus', credits: 2500, price: 49000, displayPrice: 'Rp49.000' },
  { id: 'bekal_tenang', name: 'Bekal Tenang', credits: 6000, price: 99000, displayPrice: 'Rp99.000' },
];

export function CreditDetailModal({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  const { session } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTopup, setLoadingTopup] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'topup' | 'history'>('topup');

  useEffect(() => {
    if (visible && session) {
      fetchData();
    }
  }, [visible, session]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const bData = await apiGetJson<{ balance: number }>('/api/ai/credits');
      setBalance(bData.balance ?? 0);
      
      const hData = await apiGetJson<{ history: any[] }>('/api/ai/credits/history');
      setHistory(hData.history || []);
    } catch (e) {
      console.warn("Error fetching credits:", e);
    }
    setLoading(false);
  };

  const handleTopUp = async (pkg: TopUpPackage) => {
    setLoadingTopup(pkg.id);
    try {
      const data = await apiPostJson<{ paymentUrl?: string; error?: string }>('/api/checkout/topup', {
        packageId: pkg.id,
        price: pkg.price,
        credits: pkg.credits
      });
      if (data.paymentUrl) {
        Linking.openURL(data.paymentUrl);
      } else {
        alert(data.error || "Gagal membuat tautan pembayaran");
      }
    } catch (e: any) {
      console.warn("Topup error:", e);
      alert(e.message || "Terjadi kesalahan sistem. Silakan coba lagi nanti.");
    }
    setLoadingTopup(null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <TouchableOpacity activeOpacity={1} onPress={onClose} className="absolute inset-0 bg-black/50" />
        <View className="relative bg-white rounded-t-[32px] w-full max-w-md mx-auto p-[24px] pb-[40px] shadow-xl z-50 min-h-[70%]">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-bold text-gray-800">Kredit AI Siklusio 🌟</Text>
            <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center">
              <Text className="text-sm font-bold text-gray-500">✕</Text>
            </TouchableOpacity>
          </View>

          {/* Balance Display */}
          <View className="bg-purple-100 rounded-[20px] p-5 items-center mb-6 border border-purple-200">
            <Text className="text-purple-600 text-sm font-bold uppercase tracking-widest mb-1">Saldo Saat Ini</Text>
            {loading && balance === null ? (
              <ActivityIndicator color="#9333ea" />
            ) : (
              <Text className="text-4xl font-extrabold text-purple-800">{balance ?? '-'} <Text className="text-xl">✨</Text></Text>
            )}
          </View>

          {/* Tabs */}
          <View className="flex-row bg-gray-100 rounded-full p-1 mb-6">
            <TouchableOpacity 
              className={`flex-1 py-2 rounded-full items-center ${activeTab === 'topup' ? 'bg-white shadow-sm' : ''}`}
              onPress={() => setActiveTab('topup')}
            >
              <Text className={`font-bold ${activeTab === 'topup' ? 'text-purple-700' : 'text-gray-500'}`}>Top-Up</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className={`flex-1 py-2 rounded-full items-center ${activeTab === 'history' ? 'bg-white shadow-sm' : ''}`}
              onPress={() => setActiveTab('history')}
            >
              <Text className={`font-bold ${activeTab === 'history' ? 'text-purple-700' : 'text-gray-500'}`}>Riwayat</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {activeTab === 'topup' ? (
              <View className="gap-3 pb-8">
                {PACKAGES.map(pkg => (
                  <View key={pkg.id} className="bg-white border border-purple-100 rounded-2xl p-4 flex-row items-center justify-between shadow-sm">
                    <View>
                      <Text className="text-base font-bold text-gray-800">{pkg.name}</Text>
                      <Text className="text-purple-600 font-bold mt-1">+{pkg.credits} Kredit ✨</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleTopUp(pkg)}
                      disabled={loadingTopup === pkg.id}
                      className="bg-purple-600 px-4 py-2 rounded-xl active:scale-95 flex-row justify-center min-w-[90px]"
                    >
                      {loadingTopup === pkg.id ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text className="text-white font-bold">{pkg.displayPrice}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View className="pb-8">
                {loading && history.length === 0 ? (
                  <ActivityIndicator color="#9333ea" className="mt-4" />
                ) : history.length === 0 ? (
                  <Text className="text-center text-gray-400 mt-4">Belum ada riwayat transaksi</Text>
                ) : (
                  history.map(item => (
                    <View key={item.id} className="border-b border-gray-100 py-3 flex-row justify-between items-center">
                      <View className="flex-1 pr-3">
                        <Text className="text-sm font-bold text-gray-700">{item.feature === 'topup' ? 'Top-Up' : 'Pemakaian'}: {item.reason}</Text>
                        <Text className="text-[10px] text-gray-400 mt-0.5">{new Date(item.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                      <Text className={`font-bold text-base ${item.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {item.amount > 0 ? '+' : ''}{item.amount}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
