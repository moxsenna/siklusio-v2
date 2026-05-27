import { useState, useCallback } from 'react';
import { apiGetJson, apiPostJson, apiPatchJson, apiDeleteJson } from '../lib/api';

// ============================================================
// Types
// ============================================================
export interface Affiliate {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  code: string;
  commission_type: 'nominal' | 'percentage';
  commission_value: number;
  allow_zero_order_commission: boolean;
  bank_name: string | null;
  account_number: string | null;
  account_holder: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AffiliateConversion {
  id: string;
  affiliate_id: string;
  checkout_session_id: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_whatsapp: string;
  amount_paid: number;
  commission_amount: number;
  mayar_transaction_id: string | null;
  payout_status: 'pending' | 'paid';
  payout_at: string | null;
  payout_marked_by: string | null;
  payout_reference: string | null;
  payout_note: string | null;
  created_at: string;
  // Joined affiliate data
  affiliates?: {
    name: string;
    code: string;
    email: string;
    whatsapp: string;
    bank_name: string | null;
    account_number: string | null;
    account_holder: string | null;
  };
}

export interface CreateAffiliatePayload {
  name: string;
  email: string;
  whatsapp: string;
  code: string;
  commission_type: 'nominal' | 'percentage';
  commission_value: number;
  bank_name?: string;
  account_number?: string;
  account_holder?: string;
  autoCreateCoupon?: boolean;
  coupon_discount_type?: string;
  coupon_discount_value?: number;
}

// ============================================================
// Hook
// ============================================================
export function useAdminAffiliates() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [conversions, setConversions] = useState<AffiliateConversion[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversionsLoading, setConversionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAffiliates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetJson<{ affiliates: Affiliate[] }>('/api/admin/affiliates');
      setAffiliates(data.affiliates || []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat daftar afiliasi.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConversions = useCallback(async () => {
    setConversionsLoading(true);
    setError(null);
    try {
      const data = await apiGetJson<{ conversions: AffiliateConversion[] }>('/api/admin/affiliates/conversions');
      setConversions(data.conversions || []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat riwayat konversi.');
    } finally {
      setConversionsLoading(false);
    }
  }, []);

  const createAffiliate = useCallback(async (payload: CreateAffiliatePayload) => {
    const result = await apiPostJson<any>('/api/admin/affiliates', payload);
    await fetchAffiliates();
    return result;
  }, [fetchAffiliates]);

  const toggleAffiliate = useCallback(async (id: string, currentStatus: boolean) => {
    await apiPatchJson(`/api/admin/affiliates/${id}`, { is_active: !currentStatus });
    await fetchAffiliates();
  }, [fetchAffiliates]);

  const deleteAffiliate = useCallback(async (id: string) => {
    await apiDeleteJson(`/api/admin/affiliates/${id}`);
    await fetchAffiliates();
  }, [fetchAffiliates]);

  const markPayout = useCallback(async (conversionId: string, payout_reference: string, payout_note: string) => {
    await apiPatchJson(`/api/admin/affiliates/conversions/${conversionId}/payout`, {
      payout_reference,
      payout_note,
    });
    await fetchConversions();
  }, [fetchConversions]);

  // Computed metrics
  const pendingCommission = conversions
    .filter(c => c.payout_status === 'pending')
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);

  const paidCommission = conversions
    .filter(c => c.payout_status === 'paid')
    .reduce((sum, c) => sum + Number(c.commission_amount), 0);

  const totalRevenue = conversions
    .reduce((sum, c) => sum + Number(c.amount_paid), 0);

  return {
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
  };
}
