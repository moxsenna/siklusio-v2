import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import type { Database } from "../../../../../supabase/types/database.types";
import { getSupabaseClientStatus } from "../../../lib/supabaseAccess";
type CycleRow = Database["public"]["Tables"]["activity_history"]["Row"];
/**
 * Custom hook to fetch cycle data from Supabase.
 * Returns the data, loading state, error (if any) and a refetch function.
 */
export const useCycleData = () => {
  const [cycleData, setCycleData] = useState<CycleRow[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const fetchCycle = async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const status = getSupabaseClientStatus(supabase);
      if (!status.ready) {
        setError(status.error);
        setIsLoading(false);
        return;
      }
      const { data, error: supabaseError } = await status.client
        .from("activity_history")
        .select("*");
      if (supabaseError) {
        setError(supabaseError.message);
      } else {
        setCycleData(data);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCycle();
  }, []);

  return { cycleData, isLoading, error, refetch: fetchCycle };
};
