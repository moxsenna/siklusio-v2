import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import { subDays, format } from "date-fns";
import { parseLocalDate } from "../lib/dateUtils";
import { isCloudOnboardingCompleted } from "../lib/profileOnboarding";
import { getSupabaseClientStatus } from "../lib/supabaseAccess";
import { canSyncCycleProfile } from "../lib/syncGuards";
import { storage } from "../lib/storage";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";
import { CyclePhase, Task, DailyRecord, calculateCycleData } from "../lib/cycleUtils";
import type { PredictionConfidence } from "../lib/cyclePrediction";

interface CycleContextType {
  lastPeriodDate: Date | null;
  setLastPeriodDate: (date: Date | null) => void;
  cycleLength: number;
  setCycleLength: (length: number) => void;
  periodLength: number;
  setPeriodLength: (length: number) => void;
  nextPeriodDate: Date;
  ovulationDate: Date;
  fertileWindowStart: Date;
  fertileWindowEnd: Date;
  currentPhase: CyclePhase;
  daysToNextPeriod: number;
  cycleDay: number;
  activityHistory: Record<string, DailyRecord>;
  setActivityHistory: React.Dispatch<React.SetStateAction<Record<string, DailyRecord>>>;
  userNickname: string;
  setUserNickname: (name: string) => void;
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
  avatarKind: "preset" | "custom" | null;
  setAvatarKind: (kind: "preset" | "custom" | null) => void;
  userBirthDate: Date | null;
  setUserBirthDate: (date: Date | null) => void;
  childrenCount: string;
  setChildrenCount: (cnt: string) => void;
  husbandName: string;
  setHusbandName: (name: string) => void;
  husbandNickname: string;
  setHusbandNickname: (name: string) => void;
  husbandNumber: string;
  setHusbandNumber: (num: string) => void;
  targetSaving: number;
  setTargetSaving: (amount: number) => void;
  currentSaving: number;
  setCurrentSaving: (amount: number) => void;
  effectiveLastPeriod: Date;
  hasManualLogs: boolean;
  predictedCycleLength: number;
  predictedPeriodLength: number;
  cycleConfidence: PredictionConfidence;
  periodConfidence: PredictionConfidence;
  lastPredictionDeltaDays: number | null;
  lastPredictedPeriodDate: Date | null;
  lastActualPeriodDate: Date | null;
  getDayInfo: (date: Date) => {
    phase: string;
    displayPhase: string;
    cycleDay: number;
    isManualPeriod: boolean;
  };
  isOnboardingCompleted: boolean;
  setIsOnboardingCompleted: (val: boolean) => void;
  isProfileLoading: boolean;
}

const CycleContext = createContext<CycleContextType | undefined>(undefined);

const createEmptyActivityHistory = (): Record<string, DailyRecord> => {
  return {};
};

function usePersistentState<T>(
  key: string,
  initialValue: T | (() => T),
  parser?: (val: string) => T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = storage.getItem(key);
      if (item) {
        if (parser) return parser(item);
        return JSON.parse(item);
      }
    } catch (e) {
      console.warn("Error reading storage", e);
    }
    return typeof initialValue === "function" ? (initialValue as () => T)() : initialValue;
  });

  useEffect(() => {
    try {
      if (state instanceof Date) {
        storage.setItem(key, state.toISOString());
      } else {
        storage.setItem(key, JSON.stringify(state));
      }
    } catch (e) {
      console.warn("Error setting storage", e);
    }
  }, [key, state]);

  return [state, setState];
}

export function CycleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lastPeriodDate, setLastPeriodDate] = usePersistentState<Date | null>(
    "hs_v3_lastPeriodDate",
    null,
    (val) => (val && val !== "null" ? parseLocalDate(val) : null),
  );
  const [cycleLength, setCycleLength] = usePersistentState<number>("hs_v3_cycleLength", 0);
  const [periodLength, setPeriodLength] = usePersistentState<number>("hs_v3_periodLength", 0);
  const [activityHistory, setActivityHistory] = usePersistentState<Record<string, DailyRecord>>(
    "hs_v3_activityHistory",
    createEmptyActivityHistory,
  );
  const [userNickname, setUserNickname] = usePersistentState<string>("hs_v3_userNickname", "");
  const [avatarUrl, setAvatarUrl] = usePersistentState<string | null>(
    "hs_v3_avatarUrl",
    null,
    (val) => (val && val !== "null" && val !== '""' ? JSON.parse(val) : null),
  );
  const [avatarKind, setAvatarKind] = usePersistentState<"preset" | "custom" | null>(
    "hs_v3_avatarKind",
    null,
    (val) => (val && val !== "null" && val !== '""' ? JSON.parse(val) : null),
  );
  const [userBirthDate, setUserBirthDate] = usePersistentState<Date | null>(
    "hs_v3_userBirthDate",
    null,
    (val) => (val && val !== "null" ? parseLocalDate(val) : null),
  );
  const [childrenCount, setChildrenCount] = usePersistentState<string>("hs_v3_childrenCount", "");
  const [husbandName, setHusbandName] = usePersistentState<string>("hs_v3_husbandName", "");
  const [husbandNickname, setHusbandNickname] = usePersistentState<string>(
    "hs_v3_husbandNickname",
    "",
  );
  const [husbandNumber, setHusbandNumber] = usePersistentState<string>("hs_v3_husbandNumber", "");
  const [targetSaving, setTargetSaving] = usePersistentState<number>("hs_v3_targetSaving", 0);
  const [currentSaving, setCurrentSaving] = usePersistentState<number>("hs_v3_currentSaving", 0);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = usePersistentState<boolean>(
    "hs_onboardingCompleted",
    false,
  );
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const profileSyncUserRef = useRef<string | null>(null);
  const activityInitialSyncUserRef = useRef<string | null>(null);
  const activityInitialSyncDoneUserRef = useRef<string | null>(null);
  const activitySyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isApplyingActivitySyncRef = useRef(false);
  const savingsInitialSyncUserRef = useRef<string | null>(null);
  const savingsInitialSyncDoneUserRef = useRef<string | null>(null);
  const savingsSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isApplyingSavingsSyncRef = useRef(false);

  // Trigger sinkronisasi otomatis ke cloud (Supabase) ketika parameter utama siklus berubah
  useEffect(() => {
    if (
      canSyncCycleProfile({
        userId: user?.id,
        isProfileLoading,
        hasLastPeriodDate: Boolean(lastPeriodDate),
        cycleLength,
        periodLength,
      }) &&
      lastPeriodDate
    ) {
      const payload = {
        last_period_date: format(lastPeriodDate, "yyyy-MM-dd"),
        cycle_length: cycleLength,
        period_length: periodLength,
      };

      import("../lib/SyncManager")
        .then(({ SyncManager }) => {
          SyncManager.syncProfileData(payload)
            .then((res) => {
              if (res.action === "pulled" && res.data) {
                // Jika cloud memiliki data baru, sesuaikan state lokal untuk menghindari overriding
                const cloudDate = res.data.last_period_date
                  ? parseLocalDate(res.data.last_period_date)
                  : null;
                setLastPeriodDate(cloudDate);
                setCycleLength(res.data.cycle_length || 28);
                setPeriodLength(res.data.period_length || 5);
              }
            })
            .catch((err) => {
              console.warn("[CycleContext] Gagal menyelaraskan data siklus:", err);
            });
        })
        .catch((e) => {
          console.error("[CycleContext] Gagal mengimpor SyncManager:", e);
        });
    }
  }, [user?.id, isProfileLoading, lastPeriodDate, cycleLength, periodLength]);

  useEffect(() => {
    profileSyncUserRef.current = null;
    savingsInitialSyncUserRef.current = null;
    savingsInitialSyncDoneUserRef.current = null;
    isApplyingSavingsSyncRef.current = false;
    if (savingsSyncTimerRef.current) {
      clearTimeout(savingsSyncTimerRef.current);
      savingsSyncTimerRef.current = null;
    }

    if (user?.id) {
      setIsProfileLoading(true);
    } else {
      setIsProfileLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || profileSyncUserRef.current === user.id) return;
    profileSyncUserRef.current = user.id;

    let cancelled = false;

    const loadCloudProfile = async () => {
      try {
        const supabaseStatus = getSupabaseClientStatus(supabase);
        if (!supabaseStatus.ready) {
          setIsProfileLoading(false);
          return;
        }
        const client = supabaseStatus.client;

        const { data: cloudProfile, error } = await client
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (cancelled) return;

        if (error) {
          console.warn("[CycleContext] Gagal memuat profil cloud:", error);
          setIsProfileLoading(false);
          return;
        }

        if (cloudProfile) {
          const hasCompletedOnboardingCloud = isCloudOnboardingCompleted(cloudProfile);

          if (hasCompletedOnboardingCloud) {
            if (cloudProfile.nickname) setUserNickname(cloudProfile.nickname);
            if (cloudProfile.children_count) setChildrenCount(cloudProfile.children_count);
            if (cloudProfile.cycle_length) setCycleLength(Number(cloudProfile.cycle_length));
            if (cloudProfile.period_length) setPeriodLength(Number(cloudProfile.period_length));
            if (cloudProfile.last_period_date) {
              setLastPeriodDate(parseLocalDate(cloudProfile.last_period_date));
            }
            if (cloudProfile.husband_name) setHusbandName(cloudProfile.husband_name);
            if (cloudProfile.husband_nickname) setHusbandNickname(cloudProfile.husband_nickname);
            if (cloudProfile.husband_number) setHusbandNumber(cloudProfile.husband_number);
            if (cloudProfile.birth_date) {
              setUserBirthDate(parseLocalDate(cloudProfile.birth_date));
            }
            if (cloudProfile.avatar_url) setAvatarUrl(cloudProfile.avatar_url);
            if (cloudProfile.avatar_kind)
              setAvatarKind(cloudProfile.avatar_kind as "preset" | "custom" | null);
            if (cloudProfile.target_saving !== null && cloudProfile.target_saving !== undefined) {
              setTargetSaving(Number(cloudProfile.target_saving));
            }
            if (cloudProfile.current_saving !== null && cloudProfile.current_saving !== undefined) {
              setCurrentSaving(Number(cloudProfile.current_saving));
            }

            setIsOnboardingCompleted(true);
            console.info(
              "[CycleContext] Profil pengguna berhasil di-sync dari cloud, otomatis menyelesaikan onboarding.",
            );
          }
        }
      } catch (e) {
        console.warn("[CycleContext] Exception saat load cloud profile:", e);
      } finally {
        if (!cancelled) {
          setIsProfileLoading(false);
        }
      }
    };

    loadCloudProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || savingsInitialSyncUserRef.current === user.id) return;

    savingsInitialSyncUserRef.current = user.id;
    let cancelled = false;

    import("../lib/SyncManager")
      .then(({ SyncManager }) =>
        SyncManager.syncSavingsData({
          target_saving: targetSaving,
          current_saving: currentSaving,
        }),
      )
      .then((res) => {
        if (cancelled || !res.data || res.action !== "pulled") return;

        isApplyingSavingsSyncRef.current = true;
        setTargetSaving(res.data.target_saving);
        setCurrentSaving(res.data.current_saving);
        setTimeout(() => {
          isApplyingSavingsSyncRef.current = false;
        }, 0);
      })
      .catch((err) => {
        console.warn("[CycleContext] Gagal menyelaraskan tabungan:", err);
      })
      .finally(() => {
        if (!cancelled) {
          savingsInitialSyncDoneUserRef.current = user.id;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (
      !user?.id ||
      savingsInitialSyncDoneUserRef.current !== user.id ||
      isApplyingSavingsSyncRef.current
    ) {
      return;
    }

    if (savingsSyncTimerRef.current) {
      clearTimeout(savingsSyncTimerRef.current);
    }

    savingsSyncTimerRef.current = setTimeout(() => {
      import("../lib/SyncManager")
        .then(({ SyncManager }) =>
          SyncManager.syncSavingsData({
            target_saving: targetSaving,
            current_saving: currentSaving,
          }),
        )
        .then((res) => {
          if (!res.data || res.action !== "pulled") return;

          isApplyingSavingsSyncRef.current = true;
          setTargetSaving(res.data.target_saving);
          setCurrentSaving(res.data.current_saving);
          setTimeout(() => {
            isApplyingSavingsSyncRef.current = false;
          }, 0);
        })
        .catch((err) => {
          console.warn("[CycleContext] Gagal mengunggah tabungan:", err);
        });
    }, 1200);

    return () => {
      if (savingsSyncTimerRef.current) {
        clearTimeout(savingsSyncTimerRef.current);
      }
    };
  }, [user?.id, targetSaving, currentSaving]);

  useEffect(() => {
    activityInitialSyncUserRef.current = null;
    activityInitialSyncDoneUserRef.current = null;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || activityInitialSyncUserRef.current === user.id) return;

    activityInitialSyncUserRef.current = user.id;
    let cancelled = false;

    import("../lib/SyncManager")
      .then(({ SyncManager }) => SyncManager.syncActivityHistory(activityHistory))
      .then((res) => {
        if (cancelled || !res.data || res.action === "skipped" || res.action === "error") return;

        setActivityHistory((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(res.data)) return prev;
          isApplyingActivitySyncRef.current = true;
          return res.data!;
        });

        setTimeout(() => {
          isApplyingActivitySyncRef.current = false;
        }, 0);
      })
      .catch((err) => {
        console.warn("[CycleContext] Gagal menyelaraskan histori aktivitas:", err);
      })
      .finally(() => {
        if (!cancelled) {
          activityInitialSyncDoneUserRef.current = user.id;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (
      !user?.id ||
      activityInitialSyncDoneUserRef.current !== user.id ||
      isApplyingActivitySyncRef.current
    )
      return;

    if (activitySyncTimerRef.current) {
      clearTimeout(activitySyncTimerRef.current);
    }

    activitySyncTimerRef.current = setTimeout(() => {
      import("../lib/SyncManager")
        .then(({ SyncManager }) => SyncManager.syncActivityHistory(activityHistory))
        .catch((err) => {
          console.warn("[CycleContext] Gagal mengunggah histori aktivitas:", err);
        });
    }, 1500);

    return () => {
      if (activitySyncTimerRef.current) {
        clearTimeout(activitySyncTimerRef.current);
      }
    };
  }, [user?.id, activityHistory]);

  const cycleData = useMemo(() => {
    return calculateCycleData(lastPeriodDate, cycleLength, periodLength, activityHistory);
  }, [lastPeriodDate, cycleLength, periodLength, activityHistory]);

  // Memoize the context value to prevent unnecessary re-renders downstream.
  // Without this, every render creates a new object literal and forces all
  // consumers (including the navigation tree) to rerender, which can trigger
  // infinite navigation replace loops in React Navigation 7.
  const contextValue = useMemo(
    () => ({
      lastPeriodDate,
      setLastPeriodDate,
      cycleLength,
      setCycleLength,
      periodLength,
      setPeriodLength,
      activityHistory,
      setActivityHistory,
      userNickname,
      setUserNickname,
      avatarUrl,
      setAvatarUrl,
      avatarKind,
      setAvatarKind,
      userBirthDate,
      setUserBirthDate,
      childrenCount,
      setChildrenCount,
      husbandName,
      setHusbandName,
      husbandNickname,
      setHusbandNickname,
      husbandNumber,
      setHusbandNumber,
      targetSaving,
      setTargetSaving,
      currentSaving,
      setCurrentSaving,
      isOnboardingCompleted,
      setIsOnboardingCompleted,
      isProfileLoading,
      ...cycleData,
    }),
    [
      lastPeriodDate,
      cycleLength,
      periodLength,
      activityHistory,
      userNickname,
      avatarUrl,
      avatarKind,
      userBirthDate,
      childrenCount,
      husbandName,
      husbandNickname,
      husbandNumber,
      targetSaving,
      currentSaving,
      isOnboardingCompleted,
      isProfileLoading,
      cycleData,
    ],
  );

  return <CycleContext.Provider value={contextValue}>{children}</CycleContext.Provider>;
}

export function useCycle() {
  const context = useContext(CycleContext);
  if (context === undefined) {
    throw new Error("useCycle must be used within a CycleProvider");
  }
  return context;
}
