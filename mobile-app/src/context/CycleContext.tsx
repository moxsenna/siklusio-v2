import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from 'react';
import { subDays, format } from 'date-fns';
import { parseLocalDate } from '../lib/dateUtils';
import { storage } from '../lib/storage';
import {
  CyclePhase,
  Task,
  DailyRecord,
  calculateCycleData
} from '../lib/cycleUtils';

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
  getDayInfo: (date: Date) => { phase: string; displayPhase: string; cycleDay: number; isManualPeriod: boolean };
  isOnboardingCompleted: boolean;
  setIsOnboardingCompleted: (val: boolean) => void;
}

const CycleContext = createContext<CycleContextType | undefined>(undefined);

const generateMockHistory = (): Record<string, DailyRecord> => {
  const history: Record<string, DailyRecord> = {};
  const today = new Date();
  
  for (let i = 0; i <= 60; i++) {
    const d = subDays(today, i);
    const dateKey = format(d, 'yyyy-MM-dd');
    
    const isDone1 = Math.random() > 0.1;
    const isDone2 = Math.random() > 0.2;
    const isDone3 = Math.random() > 0.3;
    const isDone4 = Math.random() > 0.4;
    
    history[dateKey] = {
      symptoms: Math.random() > 0.7 ? ['fatigue'] : [],
      tasks: [
        { id: 1, text: 'Minum Air (2L)', emoji: '💧', done: isDone1 },
        { id: 2, text: 'Asam Folat', emoji: '💊', done: isDone2 },
        { id: 3, text: 'Olahraga', emoji: '🧘‍♀️', done: isDone3 },
        { id: 4, text: 'Istirahat Cukup', emoji: '🛌', done: isDone4 }
      ]
    };
  }
  return history;
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
  const [lastPeriodDate, setLastPeriodDate] = usePersistentState<Date | null>(
    'hs_v2_lastPeriodDate',
    null,
    (val) => (val && val !== 'null' ? parseLocalDate(val) : null)
  );
  const [cycleLength, setCycleLength] = usePersistentState<number>('hs_v2_cycleLength', 0);
  const [periodLength, setPeriodLength] = usePersistentState<number>('hs_v2_periodLength', 0);
  const [activityHistory, setActivityHistory] = usePersistentState<Record<string, DailyRecord>>('hs_activityHistory', generateMockHistory);
  const [userNickname, setUserNickname] = usePersistentState<string>('hs_v2_userNickname', '');
  const [userBirthDate, setUserBirthDate] = usePersistentState<Date | null>('hs_v2_userBirthDate', null, (val) => val && val !== 'null' ? parseLocalDate(val) : null);
  const [childrenCount, setChildrenCount] = usePersistentState<string>('hs_v2_childrenCount', '');
  const [husbandName, setHusbandName] = usePersistentState<string>('hs_v2_husbandName', '');
  const [husbandNickname, setHusbandNickname] = usePersistentState<string>('hs_v2_husbandNickname', '');
  const [husbandNumber, setHusbandNumber] = usePersistentState<string>('hs_v2_husbandNumber', '');
  const [targetSaving, setTargetSaving] = usePersistentState<number>('hs_targetSaving', 25000000);
  const [currentSaving, setCurrentSaving] = usePersistentState<number>('hs_currentSaving', 12450000);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = usePersistentState<boolean>('hs_onboardingCompleted', false);

  const cycleData = useMemo(() => {
    return calculateCycleData(lastPeriodDate, cycleLength, periodLength, activityHistory);
  }, [lastPeriodDate, cycleLength, periodLength, activityHistory]);

  return (
    <CycleContext.Provider value={{
      lastPeriodDate, setLastPeriodDate,
      cycleLength, setCycleLength,
      periodLength, setPeriodLength,
      activityHistory, setActivityHistory,
      userNickname, setUserNickname,
      userBirthDate, setUserBirthDate,
      childrenCount, setChildrenCount,
      husbandName, setHusbandName,
      husbandNickname, setHusbandNickname,
      husbandNumber, setHusbandNumber,
      targetSaving, setTargetSaving,
      currentSaving, setCurrentSaving,
      isOnboardingCompleted, setIsOnboardingCompleted,
      ...cycleData
    }}>
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
