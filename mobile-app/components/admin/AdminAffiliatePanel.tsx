import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform, ScrollView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useAdminAffiliates, CreateAffiliatePayload, AffiliateConversion } from '../../src/hooks/useAdminAffiliates';
import { formatRelative, format } from 'date-fns';

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export default function AdminAffiliatePanel() {
  const {
    affiliates,
    conversions,
    loading,
    conversionsLoading,
    error,
    fetchAffiliates,
    fetchConversions,
    createAffiliate,
    toggleAffiliate,
    deleteAffiliate,
    markPayout,
    pendingCommission,
    paidCommission,
    totalRevenue,
  } = useAdminAffiliates();

  const [activeSubTab, setActiveSubTab] = useState<'list' | 'conversions'>('list');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New Affiliate Form State
  const [newAffiliate, setNewAffiliate] = useState<CreateAffiliatePayload>({
    name: '',
    email: '',
    whatsapp: '',
    code: '',
    commission_type: 'percentage',
    commission_value: 10,
    bank_name: '',
    account_number: '',
    account_holder: '',
    autoCreateCoupon: true,
    coupon_discount_type: 'percentage',
    coupon_discount_value: 10,
  });

  useEffect(() => {
    fetchAffiliates();
    fetchConversions();
  }, [fetchAffiliates, fetchConversions]);

  const handleCreate = async () => {
    if (!newAffiliate.name || !newAffiliate.email || !newAffiliate.whatsapp || !newAffiliate.code) {
      Alert.alert('Gagal', 'Pastikan nama, email, whatsapp, dan kode rujukan terisi.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createAffiliate(newAffiliate);
      setNewAffiliate({
        name: '',
        email: '',
        whatsapp: '',
        code: '',
        commission_type: 'percentage',
        commission_value: 10,
        bank_name: '',
        account_number: '',
        account_holder: '',
        autoCreateCoupon: true,
        coupon_discount_type: 'percentage',
        coupon_discount_value: 10,
      });
      Alert.alert('Sukses', 'Afiliasi berhasil dibuat.');
    } catch (err: any) {
      Alert.alert('Gagal', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = (id: string, currentStatus: boolean) => {
    toggleAffiliate(id, currentStatus).catch((err: unknown) =>
      Alert.alert('Gagal', toErrorMessage(err))
    );
  };

  const handleDelete = (id: string) => {
    Alert.alert('Hapus Afiliasi', 'Yakin ingin menghapus afiliasi ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () =>
          deleteAffiliate(id).catch((err: unknown) =>
            Alert.alert('Gagal', toErrorMessage(err))
          ),
      }
    ]);
  };

  const handleMarkPayout = (conversion: AffiliateConversion) => {
    if (Platform.OS === 'web') {
      const ref = window.prompt('Masukkan referensi transfer (opsional):');
      if (ref !== null) {
        markPayout(conversion.id, ref, '').catch((err: unknown) =>
          window.alert('Gagal: ' + toErrorMessage(err))
        );
      }
    } else {
      Alert.prompt(
        'Tandai Sudah Dibayar',
        'Masukkan nomor referensi transfer (opsional):',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Simpan',
            onPress: (ref?: string) =>
              markPayout(conversion.id, ref || '', '').catch((err: unknown) =>
                Alert.alert('Gagal', toErrorMessage(err))
              ),
          }
        ]
      );
    }
  };

  const formatRupiah = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  return (
    <View style={{ gap: 20 }}>
      {/* Stats Summary */}
      <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
        <View style={{ flex: 1, minWidth: 200, backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1e6eb' }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Total Pendapatan</Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#1e1b20', marginTop: 8 }}>{formatRupiah(totalRevenue)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 200, backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1e6eb' }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Komisi Tertunda</Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#eab308', marginTop: 8 }}>{formatRupiah(pendingCommission)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 200, backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f1e6eb' }}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Komisi Dibayar</Text>
          <Text style={{ fontSize: 24, fontWeight: '900', color: '#10b981', marginTop: 8 }}>{formatRupiah(paidCommission)}</Text>
        </View>
      </View>

      {/* Sub-Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 16, padding: 4 }}>
        <TouchableOpacity
          onPress={() => setActiveSubTab('list')}
          style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, backgroundColor: activeSubTab === 'list' ? '#fff' : 'transparent', shadowColor: activeSubTab === 'list' ? '#000' : 'transparent', shadowOpacity: 0.05, shadowRadius: 5, elevation: activeSubTab === 'list' ? 2 : 0 }}
        >
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: activeSubTab === 'list' ? '#1e1b20' : '#64748b' }}>Daftar Afiliasi</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveSubTab('conversions')}
          style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, backgroundColor: activeSubTab === 'conversions' ? '#fff' : 'transparent', shadowColor: activeSubTab === 'conversions' ? '#000' : 'transparent', shadowOpacity: 0.05, shadowRadius: 5, elevation: activeSubTab === 'conversions' ? 2 : 0 }}
        >
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: activeSubTab === 'conversions' ? '#1e1b20' : '#64748b' }}>Riwayat Konversi</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={{ backgroundColor: '#fef2f2', borderColor: '#fee2e2', borderWidth: 1, borderRadius: 16, padding: 16 }}>
          <Text style={{ color: '#991b1b', fontSize: 13, fontWeight: 'bold' }}>{error}</Text>
        </View>
      )}

      {activeSubTab === 'list' ? (
        <View style={{ gap: 24 }}>
          {/* Create Affiliate Form */}
          <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#f1e6eb', gap: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1e1b20' }}>Tambah Afiliasi Baru</Text>
            
            <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
              <TextInput
                placeholder="Nama Lengkap"
                value={newAffiliate.name}
                onChangeText={t => setNewAffiliate(p => ({ ...p, name: t }))}
                style={{ flex: 1, minWidth: 200, height: 44, borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16 }}
              />
              <TextInput
                placeholder="Email"
                value={newAffiliate.email}
                onChangeText={t => setNewAffiliate(p => ({ ...p, email: t }))}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ flex: 1, minWidth: 200, height: 44, borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16 }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
              <TextInput
                placeholder="Nomor WhatsApp"
                value={newAffiliate.whatsapp}
                onChangeText={t => setNewAffiliate(p => ({ ...p, whatsapp: t }))}
                keyboardType="phone-pad"
                style={{ flex: 1, minWidth: 200, height: 44, borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16 }}
              />
              <TextInput
                placeholder="Kode Afiliasi (Mis: BUNDACERDAS)"
                value={newAffiliate.code}
                onChangeText={t => setNewAffiliate(p => ({ ...p, code: t.toUpperCase().replace(/\s/g, '') }))}
                autoCapitalize="characters"
                style={{ flex: 1, minWidth: 200, height: 44, borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16, fontWeight: 'bold' }}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 12, overflow: 'hidden', height: 44 }}>
                <TouchableOpacity
                  onPress={() => setNewAffiliate(p => ({ ...p, commission_type: 'percentage' }))}
                  style={{ paddingHorizontal: 16, justifyContent: 'center', backgroundColor: newAffiliate.commission_type === 'percentage' ? '#ec4899' : 'transparent' }}
                >
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: newAffiliate.commission_type === 'percentage' ? '#fff' : '#64748b' }}>Persen (%)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setNewAffiliate(p => ({ ...p, commission_type: 'nominal' }))}
                  style={{ paddingHorizontal: 16, justifyContent: 'center', backgroundColor: newAffiliate.commission_type === 'nominal' ? '#ec4899' : 'transparent' }}
                >
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: newAffiliate.commission_type === 'nominal' ? '#fff' : '#64748b' }}>Nominal (Rp)</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                placeholder={newAffiliate.commission_type === 'percentage' ? "Nilai Komisi (%)" : "Nilai Komisi (Rp)"}
                value={String(newAffiliate.commission_value)}
                onChangeText={t => setNewAffiliate(p => ({ ...p, commission_value: Number(t.replace(/[^0-9]/g, '')) }))}
                keyboardType="numeric"
                style={{ flex: 1, minWidth: 150, height: 44, borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16 }}
              />
            </View>

            <View style={{ height: 1, backgroundColor: '#f1e6eb', marginVertical: 8 }} />
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1e1b20' }}>Informasi Bank (Opsional)</Text>
            
            <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
               <TextInput
                placeholder="Nama Bank"
                value={newAffiliate.bank_name}
                onChangeText={t => setNewAffiliate(p => ({ ...p, bank_name: t }))}
                style={{ flex: 1, minWidth: 120, height: 44, borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16 }}
              />
              <TextInput
                placeholder="Nomor Rekening"
                value={newAffiliate.account_number}
                onChangeText={t => setNewAffiliate(p => ({ ...p, account_number: t }))}
                keyboardType="numeric"
                style={{ flex: 1, minWidth: 150, height: 44, borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16 }}
              />
              <TextInput
                placeholder="Nama Pemilik Rekening"
                value={newAffiliate.account_holder}
                onChangeText={t => setNewAffiliate(p => ({ ...p, account_holder: t }))}
                style={{ flex: 1, minWidth: 200, height: 44, borderRadius: 12, backgroundColor: '#f8fafc', paddingHorizontal: 16 }}
              />
            </View>

            <TouchableOpacity
              onPress={() => setNewAffiliate(p => ({ ...p, autoCreateCoupon: !p.autoCreateCoupon }))}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}
            >
              <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: newAffiliate.autoCreateCoupon ? '#ec4899' : '#cbd5e1', backgroundColor: newAffiliate.autoCreateCoupon ? '#ec4899' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                {newAffiliate.autoCreateCoupon && <FontAwesome name="check" size={14} color="#fff" />}
              </View>
              <Text style={{ fontSize: 13, color: '#475569', fontWeight: '500' }}>Buat kupon diskon otomatis dengan kode ini</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCreate}
              disabled={isSubmitting}
              style={{ height: 48, borderRadius: 16, backgroundColor: '#ec4899', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}
            >
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#fff' }}>Tambah Afiliasi</Text>}
            </TouchableOpacity>
          </View>

          {/* List Affiliates */}
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1e1b20' }}>Daftar Afiliasi ({affiliates.length})</Text>
          {loading ? (
             <ActivityIndicator size="large" color="#ec4899" />
          ) : (
             <View style={{ gap: 12 }}>
                {affiliates.map(aff => (
                  <View key={aff.id} style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#f1e6eb', padding: 20, opacity: aff.is_active ? 1 : 0.6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ gap: 4, flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1e1b20' }}>{aff.name}</Text>
                        <Text style={{ fontSize: 13, color: '#64748b' }}>{aff.email} • {aff.whatsapp}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                           <View style={{ backgroundColor: '#fce7f3', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                             <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#db2777', fontFamily: 'monospace' }}>{aff.code}</Text>
                           </View>
                           <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#ec4899' }}>
                             Komisi: {aff.commission_type === 'percentage' ? `${aff.commission_value}%` : formatRupiah(aff.commission_value)}
                           </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                         <TouchableOpacity
                           onPress={() => setExpandedId(expandedId === aff.id ? null : aff.id)}
                           style={{ padding: 8 }}
                         >
                           <FontAwesome name={expandedId === aff.id ? "chevron-up" : "chevron-down"} size={14} color="#94a3b8" />
                         </TouchableOpacity>
                         <TouchableOpacity
                           onPress={() => handleToggle(aff.id, aff.is_active)}
                           style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: aff.is_active ? '#fef2f2' : '#dcfce7' }}
                         >
                           <Text style={{ fontSize: 11, fontWeight: 'bold', color: aff.is_active ? '#b91c1c' : '#15803d' }}>
                             {aff.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                           </Text>
                         </TouchableOpacity>
                         <TouchableOpacity
                           onPress={() => handleDelete(aff.id)}
                           style={{ padding: 8 }}
                         >
                           <FontAwesome name="trash" size={14} color="#94a3b8" />
                         </TouchableOpacity>
                      </View>
                    </View>
                    
                    {expandedId === aff.id && (
                      <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1e6eb', gap: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Informasi Bank</Text>
                        {aff.bank_name ? (
                          <Text style={{ fontSize: 13, color: '#1e1b20' }}>
                            {aff.bank_name} - {aff.account_number} a.n {aff.account_holder}
                          </Text>
                        ) : (
                          <Text style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>Belum ada data rekening</Text>
                        )}
                        <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Dibuat pada {format(new Date(aff.created_at), 'dd MMM yyyy HH:mm')}</Text>
                      </View>
                    )}
                  </View>
                ))}
             </View>
          )}
        </View>
      ) : (
        <View style={{ gap: 24 }}>
          {/* Conversions List */}
           <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1e1b20' }}>Riwayat Konversi ({conversions.length})</Text>
           {conversionsLoading ? (
             <ActivityIndicator size="large" color="#ec4899" />
           ) : (
             <View style={{ gap: 12 }}>
               {conversions.map(conv => (
                 <View key={conv.id} style={{ backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#f1e6eb', padding: 20 }}>
                   <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                     <View>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1e1b20' }}>Pembeli: {conv.buyer_name}</Text>
                        <Text style={{ fontSize: 12, color: '#64748b' }}>{conv.buyer_email}</Text>
                     </View>
                     <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#10b981' }}>+ {formatRupiah(conv.commission_amount)}</Text>
                        <Text style={{ fontSize: 11, color: '#94a3b8' }}>dari Rp {conv.amount_paid.toLocaleString('id-ID')}</Text>
                     </View>
                   </View>
                   
                   <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, gap: 4 }}>
                     <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#64748b' }}>Afiliator: {conv.affiliates?.name}</Text>
                     <Text style={{ fontSize: 12, color: '#475569' }}>Rekening: {conv.affiliates?.bank_name} {conv.affiliates?.account_number} ({conv.affiliates?.account_holder})</Text>
                   </View>

                   <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                     <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                       <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: conv.payout_status === 'paid' ? '#10b981' : '#f59e0b' }} />
                       <Text style={{ fontSize: 12, fontWeight: 'bold', color: conv.payout_status === 'paid' ? '#10b981' : '#f59e0b' }}>
                         {conv.payout_status === 'paid' ? 'SUDAH DIBAYAR' : 'MENUNGGU PEMBAYARAN'}
                       </Text>
                     </View>
                     
                     {conv.payout_status === 'pending' && (
                       <TouchableOpacity
                         onPress={() => handleMarkPayout(conv)}
                         style={{ backgroundColor: '#ec4899', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                       >
                         <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#fff' }}>Tandai Dibayar</Text>
                       </TouchableOpacity>
                     )}
                   </View>
                   {conv.payout_status === 'paid' && conv.payout_reference && (
                      <Text style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>Ref: {conv.payout_reference}</Text>
                   )}
                 </View>
               ))}
             </View>
           )}
        </View>
      )}
    </View>
  );
}
