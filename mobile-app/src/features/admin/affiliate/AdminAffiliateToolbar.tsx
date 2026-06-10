import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { AffiliateSubTab } from "./adminAffiliateTypes";
import { affiliateStyles as styles } from "./adminAffiliateStyles";

interface AdminAffiliateToolbarProps {
  activeSubTab: AffiliateSubTab;
  error: string | null;
  onSubTabChange: (tab: AffiliateSubTab) => void;
}

export function AdminAffiliateToolbar({
  activeSubTab,
  error,
  onSubTabChange,
}: AdminAffiliateToolbarProps) {
  const tabs: Array<{ id: AffiliateSubTab; label: string }> = [
    { id: "list", label: "Daftar Afiliasi" },
    { id: "conversions", label: "Riwayat Konversi" },
  ];

  return (
    <>
      <View style={styles.subTabs}>
        {tabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => onSubTabChange(tab.id)}
              style={[
                styles.subTabButton,
                {
                  backgroundColor: isActive ? "#fff" : "transparent",
                  shadowColor: isActive ? "#000" : "transparent",
                  shadowOpacity: isActive ? 0.05 : 0,
                  shadowRadius: 5,
                  elevation: isActive ? 2 : 0,
                },
              ]}
            >
              <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </>
  );
}