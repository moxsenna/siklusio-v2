import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect, useRef } from 'react';
import { subDays, format } from 'date-fns';
import { parseLocalDate } from '../lib/dateUtils';
import { storage } from '../lib/storage';
import { useAuth } from './AuthContext';
import {
  CyclePhase,
  Task,
  DailyRecord,
  calculateCycleData
} from '../lib/cycleUtils';
import type { PredictionConfidence } from '../lib/cyclePrediction';

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
  avatarKind: 'preset' | 'custom' | null;
  setAvatarKind: (kind: 'preset' | 'custom' | null) => void;
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
  getDayInfo: (date: Date) => { phase: string; displayPhase: string; cycleDay: number; isManualPeriod: boolean };
  isOnboardingCompleted: boolean;
  setIsOnboardingCompleted: (val: boolean) => void;
}

const CycleContext = createContext<CycleContextType | undefined>(undefined);

const generateMockHistory = (): Record<string, DailyRecord> => {
  return {};
};

function usePersistentState<T>(key: string, initialValue: T | (() => T), parser?: (val: string) => T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const item = storage.getItem(key);
      if (item) {
        if (parser) return parser(item);
        return JSON.parse(item);
      }
    } catch (e) {
      console.warn('Error reading storage', e);
    }
    return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
  });

  useEffect(() => {
    try {
      if (state instanceof Date) {
        storage.setItem(key, state.toISOString());
      } else {
        storage.setItem(key, JSON.stringify(state));
      }
    } catch (e) {
      console.warn('Error setting storage', e);
    }
  }, [key, state]);

  return [state, setState];
}

export function CycleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lastPeriodDate, setLastPeriodDate] = usePersistentState<Date | null>(
    'hs_v3_lastPeriodDate',
    null,
    (val) => (val && val !== 'null' ? parseLocalDate(val) : null)
  );
  const [cycleLength, setCycleLength] = usePersistentState<number>('hs_v3_cycleLength', 0);
  const [periodLength, setPeriodLength] = usePersistentState<number>('hs_v3_periodLength', 0);
  const [activityHistory, setActivityHistory] = usePersistentState<Record<string, DailyRecord>>('hs_v3_activityHistory', generateMockHistory);
  const [userNickname, setUserNickname] = usePersistentState<string>('hs_v3_userNickname', '');
  const [avatarUrl, setAvatarUrl] = usePersistentState<string | null>(
    'hs_v3_avatarUrl',
    null,
    (val) => (val && val !== 'null' && val !== '""' ? JSON.parse(val) : null)
  );
  const [avatarKind, setAvatarKind] = usePersistentState<'preset' | 'custom' | null>(
    'hs_v3_avatarKind',
    null,
    (val) => (val && val !== 'null' && val !== '""' ? JSON.parse(val) : null)
  );
  const [userBirthDate, setUserBirthDate] = usePersistentState<Date | null>('hs_v3_userBirthDate', null, (val) => val && val !== 'null' ? parseLocalDate(val) : null);
  const [childrenCount, setChildrenCount] = usePersistentState<string>('hs_v3_childrenCount', '');
  const [husbandName, setHusbandName] = usePersistentState<string>('hs_v3_husbandName', '');
  const [husbandNickname, setHusbandNickname] = usePersistentState<string>('hs_v3_husbandNickname', '');
  const [husbandNumber, setHusbandNumber] = usePersistentState<string>('hs_v3_husbandNumber', '');
  const [targetSaving, setTargetSaving] = usePersistentState<number>('hs_v3_targetSaving', 0);
  const [currentSaving, setCurrentSaving] = usePersistentState<number>('hs_v3_currentSaving', 0);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = usePersistentState<boolean>('hs_onboardingCompleted', false);
  const activityInitialSyncUserRef = useRef<string | null>(null);
  const activityInitialSyncDoneUserRef = useRef<string | null>(null);
  const activitySyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isApplyingActivitySyncRef = useRef(false);

  // Trigger sinkronisasi otomatis ke cloud (Supabase) ketika parameter utama siklus berubah
  useEffect(() => {
    if (lastPeriodDate && cycleLength > 0 && periodLength > 0) {
      const payload = {
        last_period_date: format(lastPeriodDate, 'yyyy-MM-dd'),
        cycle_length: cycleLength,
        period_length: periodLength,
      };

      import('../lib/SyncManager')
        .then(({ SyncManager }) => {
          SyncManager.syncProfileData(payload)
            .then((res) => {
              if (res.action === 'pulled' && res.data) {
                // Jika cloud memiliki data baru, sesuaikan state lokal untuk menghindari overriding
                const cloudDate = res.data.last_period_date ? parseLocalDate(res.data.last_period_date) : null;
                setLastPeriodDate(cloudDate);
                setCycleLength(res.data.cycle_length || 28);
                setPeriodLength(res.data.period_length || 5);
              }
            })
            .catch((err) => {
              console.warn('[CycleContext] Gagal menyelaraskan data siklus:', err);
            });
        })
        .catch((e) => {
          console.error('[CycleContext] Gagal mengimpor SyncManager:', e);
        });
    }
  }, [lastPeriodDate, cycleLength, periodLength]);

  useEffect(() => {
    activityInitialSyncUserRef.current = null;
    activityInitialSyncDoneUserRef.current = null;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || activityInitialSyncUserRef.current === user.id) return;

    activityInitialSyncUserRef.current = user.id;
    let cancelled = false;

    import('../lib/SyncManager')
      .then(({ SyncManager }) => SyncManager.syncActivityHistory(activityHistory))
      .then((res) => {
        if (cancelled || !res.data || res.action === 'skipped' || res.action === 'error') return;

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
        console.warn('[CycleContext] Gagal menyelaraskan histori aktivitas:', err);
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
    if (!user?.id || activityInitialSyncDoneUserRef.current !== user.id || isApplyingActivitySyncRef.current) return;

    if (activitySyncTimerRef.current) {
      clearTimeout(activitySyncTimerRef.current);
    }

    activitySyncTimerRef.current = setTimeout(() => {
      import('../lib/SyncManager')
        .then(({ SyncManager }) => SyncManager.syncActivityHistory(activityHistory))
        .catch((err) => {
          console.warn('[CycleContext] Gagal mengunggah histori aktivitas:', err);
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
      lastPeriodDate, setLastPeriodDate,
      cycleLength, setCycleLength,
      periodLength, setPeriodLength,
      activityHistory, setActivityHistory,
      userNickname, setUserNickname,
      avatarUrl, setAvatarUrl,
      avatarKind, setAvatarKind,
      userBirthDate, setUserBirthDate,
      childrenCount, setChildrenCount,
      husbandName, setHusbandName,
      husbandNickname, setHusbandNickname,
      husbandNumber, setHusbandNumber,
      targetSaving, setTargetSaving,
      currentSaving, setCurrentSaving,
      isOnboardingCompleted, setIsOnboardingCompleted,
      ...cycleData,
    }),
    [
      lastPeriodDate, cycleLength, periodLength,
      activityHistory, userNickname,
      avatarUrl, avatarKind,
      userBirthDate, childrenCount,
      husbandName, husbandNickname, husbandNumber,
      targetSaving, currentSaving,
      isOnboardingCompleted,
      cycleData,
    ]
  );

  return (
    <CycleContext.Provider value={contextValue}>
      {children}
    </CycleContext.Provider>
  );
}

export function useCycle() {
  const context = useContext(CycleContext);
  if (context === undefined) {
    throw new Error('useCycle must be used within a CycleProvider');
  }
  return context;
}
