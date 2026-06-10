import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import type { AffiliateConversion } from "./adminAffiliateTypes";
import { formatRupiah } from "./adminAffiliateUtils";
import { AdminAffiliatePayoutPanel } from "./AdminAffiliatePayoutPanel";
import { affiliateStyles as styles } from "./adminAffiliateStyles";

interface AdminAffiliateConversionTableProps {
  conversions: AffiliateConversion[];
  loading: boolean;
  onMarkPayout: (conversion: AffiliateConversion) => void;
}

export function AdminAffiliateConversionTable({
  conversions,
  loading,
  onMarkPayout,
}: AdminAffiliateConversionTableProps) {
  return (
    <View style={styles.sectionGap}>
      <Text style={styles.listTitle}>Riwayat Konversi ({conversions.length})</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#ec4899" />
      ) : (
        <View style={styles.listGap}>
          {conversions.map((conv) => (
            <View key={conv.id} style={styles.conversionCard}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 12,
                }}
              >
                <View>
                  <Text style={styles.conversionBuyer}>Pembeli: {conv.buyer_name}</Text>
                  <Text style={styles.conversionEmail}>{conv.buyer_email}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.conversionAmount}>+ {formatRupiah(conv.commission_amount)}</Text>
                  <Text style={styles.conversionPaidFrom}>
                    dari Rp {conv.amount_paid.toLocaleString("id-ID")}
                  </Text>
                </View>
              </View>

              <View style={styles.affiliateInfoBox}>
                <Text style={styles.affiliateInfoTitle}>
                  Afiliator: {conv.affiliates?.name}
                </Text>
                <Text style={styles.affiliateInfoText}>
                  Rekening: {conv.affiliates?.bank_name} {conv.affiliates?.account_number} (
                  {conv.affiliates?.account_holder})
                </Text>
              </View>

              <AdminAffiliatePayoutPanel conversion={conv} onMarkPayout={onMarkPayout} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}