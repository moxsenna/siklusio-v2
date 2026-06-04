import { useState, useCallback } from "react";
import { apiGetJson, apiPostJson, apiPatchJson } from "../lib/api";
import { Affiliate, AffiliateConversion } from "./useAdminAffiliates";

export function useAffiliate() {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [conversions, setConversions] = useState<AffiliateConversion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGetJson<{ affiliate: Affiliate | null }>("/api/affiliate/me");
      setAffiliate(data.affiliate);
    } catch (err: any) {
      setError(err.message || "Gagal memuat profil afiliasi.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConversions = useCallback(async () => {
    try {
      const data = await apiGetJson<{ conversions: AffiliateConversion[] }>(
        "/api/affiliate/me/conversions",
      );
      setConversions(data.conversions || []);
    } catch (err: any) {
      console.warn("Gagal memuat konversi:", err);
    }
  }, []);

  const registerAffiliate = useCallback(
    async (payload: {
      code: string;
      bank_name?: string;
      account_number?: string;
      account_holder?: string;
    }) => {
      setLoading(true);
      try {
        const result = await apiPostJson<{ affiliate: Affiliate }>(
          "/api/affiliate/register",
          payload,
        );
        setAffiliate(result.affiliate);
        return result.affiliate;
      } catch (err: any) {
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const updateBankInfo = useCallback(
    async (payload: { bank_name: string; account_number: string; account_holder: string }) => {
      try {
        await apiPatchJson("/api/affiliate/me/bank", payload);
        await fetchProfile(); // refresh data
      } catch (err: any) {
        throw err;
      }
    },
    [fetchProfile],
  );

  return {
    affiliate,
    conversions,
    loading,
    error,
    fetchProfile,
    fetchConversions,
    registerAffiliate,
    updateBankInfo,
  };
}
