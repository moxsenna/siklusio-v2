import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { AffiliateConversion } from "./adminAffiliateTypes";
import { affiliateStyles as styles } from "./adminAffiliateStyles";

interface AdminAffiliatePayoutPanelProps {
  conversion: AffiliateConversion;
  onMarkPayout: (conversion: AffiliateConversion) => void;
}

export function AdminAffiliatePayoutPanel({
  conversion,
  onMarkPayout,
}: AdminAffiliatePayoutPanelProps) {
  const isPaid = conversion.payout_status === "paid";

  return (
    <>
      <View style={styles.payoutRow}>
        <View style={styles.payoutStatusRow}>
          <View
            style={[styles.payoutDot, { backgroundColor: isPaid ? "#10b981" : "#f59e0b" }]}
          />
          <Text style={[styles.payoutStatusText, { color: isPaid ? "#10b981" : "#f59e0b" }]}>
            {isPaid ? "SUDAH DIBAYAR" : "MENUNGGU PEMBAYARAN"}
          </Text>
        </View>

        {!isPaid && (
          <TouchableOpacity
            onPress={() => onMarkPayout(conversion)}
            style={styles.markPaidButton}
          >
            <Text style={styles.markPaidText}>Tandai Dibayar</Text>
          </TouchableOpacity>
        )}
      </View>

      {isPaid && conversion.payout_reference && (
        <Text style={styles.payoutReference}>Ref: {conversion.payout_reference}</Text>
      )}
    </>
  );
}