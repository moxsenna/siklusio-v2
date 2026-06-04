import type { DailyRecord, Task } from "./cycleUtils";
import { parseLocalDate } from "./dateUtils";

export type ActivityHistoryMap = Record<string, DailyRecord>;

export interface ActivityHistoryRow {
  user_id?: string;
  date_key: string;
  is_period: boolean | null;
  symptoms: string[] | null;
  tasks: Task[] | null;
  updated_at: string | null;
}

export interface ActivityHistoryUpsertRow {
  user_id: string;
  date_key: string;
  is_period: boolean;
  symptoms: string[];
  tasks: Task[];
  updated_at: string;
}

const normalizeDateKey = (dateKey: string) => {
  if (!dateKey.includes("T")) return dateKey;
  const parsed = parseLocalDate(dateKey);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toTime = (value?: string | null) => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeRecord = (record: Partial<DailyRecord>): DailyRecord => ({
  symptoms: record.symptoms ?? [],
  tasks: record.tasks ?? [],
  isPeriod: !!record.isPeriod,
  ...(record.updatedAt ? { updatedAt: record.updatedAt } : {}),
});

const hasDoneTask = (record: Partial<DailyRecord>) =>
  Array.isArray(record.tasks) && record.tasks.some((task) => !!task.done);

export const isAuthoritativeLocalRecord = (record?: Partial<DailyRecord>) => {
  if (!record) return false;
  return (
    !!record.updatedAt ||
    !!record.isPeriod ||
    (record.symptoms?.length ?? 0) > 0 ||
    hasDoneTask(record)
  );
};

export const stampDailyRecord = (
  record: Partial<DailyRecord>,
  timestamp = new Date().toISOString(),
): DailyRecord => ({
  ...normalizeRecord(record),
  updatedAt: timestamp,
});

const shouldLocalWin = (local?: DailyRecord, cloud?: DailyRecord) => {
  if (!local || !isAuthoritativeLocalRecord(local)) return false;
  if (!cloud) return true;
  if (!local.updatedAt) return false;
  if (!cloud.updatedAt) return true;
  return toTime(local.updatedAt) >= toTime(cloud.updatedAt);
};

export function rowsToActivityHistory(rows: ActivityHistoryRow[] = []): ActivityHistoryMap {
  return rows.reduce<ActivityHistoryMap>((history, row) => {
    const dateKey = normalizeDateKey(row.date_key);
    history[dateKey] = {
      symptoms: row.symptoms ?? [],
      tasks: row.tasks ?? [],
      isPeriod: !!row.is_period,
      ...(row.updated_at ? { updatedAt: row.updated_at } : {}),
    };
    return history;
  }, {});
}

export function mergeActivityHistories(
  localHistory: ActivityHistoryMap,
  cloudHistory: ActivityHistoryMap,
): ActivityHistoryMap {
  const merged: ActivityHistoryMap = {};
  const dateKeys = new Set([...Object.keys(localHistory), ...Object.keys(cloudHistory)]);

  for (const dateKey of Array.from(dateKeys).sort()) {
    const local = localHistory[dateKey] ? normalizeRecord(localHistory[dateKey]) : undefined;
    const cloud = cloudHistory[dateKey] ? normalizeRecord(cloudHistory[dateKey]) : undefined;

    if (shouldLocalWin(local, cloud)) {
      merged[dateKey] = local as DailyRecord;
    } else if (cloud) {
      merged[dateKey] = cloud;
    } else if (local && isAuthoritativeLocalRecord(local)) {
      merged[dateKey] = local;
    }
  }

  return merged;
}

export function activityHistoryToRows(
  localHistory: ActivityHistoryMap,
  cloudHistory: ActivityHistoryMap,
  userId: string,
  timestamp = new Date().toISOString(),
): ActivityHistoryUpsertRow[] {
  return Object.keys(localHistory)
    .sort()
    .filter((dateKey) =>
      shouldLocalWin(normalizeRecord(localHistory[dateKey]), cloudHistory[dateKey]),
    )
    .map((dateKey) => {
      const record = localHistory[dateKey];
      const stamped = record.updatedAt
        ? normalizeRecord(record)
        : stampDailyRecord(record, timestamp);

      return {
        user_id: userId,
        date_key: dateKey,
        is_period: !!stamped.isPeriod,
        symptoms: stamped.symptoms ?? [],
        tasks: stamped.tasks ?? [],
        updated_at: stamped.updatedAt ?? timestamp,
      };
    });
}
