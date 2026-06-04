import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { apiGetJson } from "@/src/lib/api";
import { CreditDetailModal } from "./CreditDetailModal";

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
      const data = await apiGetJson<{ balance: number }>("/api/ai/credits");
      setBalance(data.balance);
    } catch (e) {
      console.warn("Failed to fetch balance", e);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => {
          fetchBalance(); // refresh before opening
          setModalVisible(true);
        }}
        className="flex-row items-center bg-purple-100 px-3 py-1.5 rounded-full border border-purple-200 active:scale-95"
      >
        <Text className="text-purple-800 font-extrabold mr-1">
          {balance !== null ? balance : "..."}
        </Text>
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
