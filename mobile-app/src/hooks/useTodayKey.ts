import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getLocalDateKey, getMsUntilNextLocalDay } from '../lib/todayKey';

const MIDNIGHT_REFRESH_BUFFER_MS = 1000;

export function useTodayKey(): string {
  const [todayKey, setTodayKey] = useState(() => getLocalDateKey());

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const refresh = () => {
      setTodayKey(getLocalDateKey());
    };

    const scheduleNextRefresh = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        refresh();
        scheduleNextRefresh();
      }, getMsUntilNextLocalDay() + MIDNIGHT_REFRESH_BUFFER_MS);
    };

    scheduleNextRefresh();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
        scheduleNextRefresh();
      }
    });

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      subscription.remove();
    };
  }, []);

  return todayKey;
}
