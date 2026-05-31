import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { CreditDetailModal } from './CreditDetailModal';

export function HeaderCreditChip() {
  const { session } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (session) {
      fetchBalance();
    }
  }, [session]);

  const fetchBalance = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) return;
      
      const res = await fetch('https://app.siklusio.web.id/api/ai/credits', {
        headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch (e) {
      console.warn("Failed to fetch balance", e);
    }
  };

  if (balance === null) return null;

  return (
    <>
      <TouchableOpacity 
        onPress={() => {
          fetchBalance(); // refresh before opening
          setModalVisible(true);
        }}
        className="flex-row items-center bg-purple-100 px-3 py-1.5 rounded-full border border-purple-200 active:scale-95"
      >
        <Text className="text-purple-800 font-extrabold mr-1">{balance}</Text>
        <Text className="text-sm">✨</Text>
      </TouchableOpacity>
      
      <CreditDetailModal 
        visible={modalVisible} 
        onClose={() => {
          setModalVisible(false);
          fetchBalance(); // refresh after modal closes
        }} 
      />
    </>
  );
}
