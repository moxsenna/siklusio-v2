import { supabase } from './supabase';
import { storage } from './storage';
import { format, subDays } from 'date-fns';
import {
  activityHistoryToRows,
  mergeActivityHistories,
  rowsToActivityHistory,
  type ActivityHistoryMap,
  type ActivityHistoryRow,
} from './activityHistorySync';

export interface CycleSyncPayload {
  last_period_date: string;
  cycle_length: number;
  period_length: number;
}

export interface SyncResult {
  action: 'pulled' | 'pushed' | 'skipped' | 'error';
  data?: {
    last_period_date: string;
    cycle_length: number;
    period_length: number;
    updated_at: string;
  };
  error?: any;
}

export interface ActivitySyncResult {
  action: 'merged' | 'pushed' | 'pulled' | 'skipped' | 'error';
  data?: ActivityHistoryMap;
  error?: any;
}

/**
 * Manajer rekonsiliasi data siklus menstruasi (HPHT, panjang siklus, panjang haid).
 * Membandingkan waktu perubahan terakhir (updated_at) dari Supabase dengan timestamp lokal
 * di storage untuk mencegah data yang usang dari perangkat offline menimpa data baru di cloud.
 */
export const SyncManager = {
  syncProfileData: async (localData: CycleSyncPayload): Promise<SyncResult> => {
    try {
      // Pastikan Supabase klien sudah diinisialisasi dan pengguna masuk
      if (!supabase) {
        return { action: 'skipped', error: 'Supabase client not initialized' };
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { action: 'skipped', error: 'User not authenticated' };
      }

      // 1. Ambil data profil dari Supabase cloud
      const { data: cloudProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('last_period_date, cycle_length, period_length, updated_at')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = Object not found (e.g. newly created user)
        return { action: 'error', error: fetchError };
      }

      // Ambil waktu sinkronisasi lokal terakhir
      const lastSyncTimeStr = storage.getItem('hs_v3_last_sync_time') || '0';
      const localSyncTime = parseInt(lastSyncTimeStr, 10);

      // 2. Jika profil ada di cloud, lakukan cek konflik timestamp
      if (cloudProfile && cloudProfile.updated_at) {
        const cloudTime = new Date(cloudProfile.updated_at).getTime();

        // Jika waktu di cloud lebih baru daripada pencatatan sinkronisasi lokal terakhir
        if (cloudTime > localSyncTime) {
          console.info("[SyncManager] Cloud data is newer than local sync time. Pulling cloud changes.");
          
          // Simpan data cloud ke penyimpanan lokal secara aman
          if (cloudProfile.last_period_date) {
            storage.setItem('hs_v3_lastPeriodDate', cloudProfile.last_period_date);
          } else {
            storage.removeItem('hs_v3_lastPeriodDate');
          }
          storage.setItem('hs_v3_cycleLength', String(cloudProfile.cycle_length || 28));
          storage.setItem('hs_v3_periodLength', String(cloudProfile.period_length || 5));
          
          // Samakan waktu sinkronisasi terakhir dengan cloud updated_at
          storage.setItem('hs_v3_last_sync_time', String(cloudTime));

          return {
            action: 'pulled',
            data: cloudProfile
          };
        }
      }

      // 3. Jika data lokal lebih baru atau data cloud belum pernah ada, dorong ke cloud
      const newSyncTime = new Date().toISOString();
      const newSyncTimeMs = new Date(newSyncTime).getTime();

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          last_period_date: localData.last_period_date,
          cycle_length: localData.cycle_length,
          period_length: localData.period_length,
          updated_at: newSyncTime
        })
        .eq('id', user.id);

      if (updateError) {
        // Jika update gagal (misal RLS tidak mengizinkan atau kendala jaringan)
        return { action: 'error', error: updateError };
      }

      // Perbarui penanda waktu lokal setelah push berhasil
      storage.setItem('hs_v3_last_sync_time', String(newSyncTimeMs));
      console.info("[SyncManager] Local cycle data pushed successfully to cloud.");

      return { action: 'pushed' };
    } catch (err) {
      console.error("[SyncManager] Exception during syncProfileData:", err);
      return { action: 'error', error: err };
    }
  },

  syncActivityHistory: async (localHistory: ActivityHistoryMap): Promise<ActivitySyncResult> => {
    try {
      if (!supabase) {
        return { action: 'skipped', error: 'Supabase client not initialized' };
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { action: 'skipped', error: 'User not authenticated' };
      }

      const startDate = format(subDays(new Date(), 400), 'yyyy-MM-dd');
      const { data: cloudRows, error: fetchError } = await supabase
        .from('activity_history')
        .select('date_key, is_period, symptoms, tasks, updated_at')
        .eq('user_id', user.id)
        .gte('date_key', startDate)
        .order('date_key', { ascending: true });

      if (fetchError) {
        return { action: 'error', error: fetchError };
      }

      const cloudHistory = rowsToActivityHistory((cloudRows ?? []) as ActivityHistoryRow[]);
      const localHistoryWindow = Object.keys(localHistory).reduce<ActivityHistoryMap>((acc, dateKey) => {
        if (dateKey >= startDate) {
          acc[dateKey] = localHistory[dateKey];
        }
        return acc;
      }, {});
      const rowsToPush = activityHistoryToRows(localHistoryWindow, cloudHistory, user.id);
      const mergedHistory = mergeActivityHistories(localHistory, cloudHistory);

      for (const row of rowsToPush) {
        mergedHistory[row.date_key] = {
          symptoms: row.symptoms,
          tasks: row.tasks,
          isPeriod: row.is_period,
          updatedAt: row.updated_at,
        };
      }

      if (rowsToPush.length > 0) {
        const { error: upsertError } = await supabase
          .from('activity_history')
          .upsert(rowsToPush, { onConflict: 'user_id,date_key' });

        if (upsertError) {
          return { action: 'error', data: mergedHistory, error: upsertError };
        }
      }

      const hasCloudRows = (cloudRows ?? []).length > 0;
      if (rowsToPush.length > 0 && hasCloudRows) {
        return { action: 'merged', data: mergedHistory };
      }
      if (rowsToPush.length > 0) {
        return { action: 'pushed', data: mergedHistory };
      }
      if (hasCloudRows) {
        return { action: 'pulled', data: mergedHistory };
      }

      return { action: 'skipped', data: mergedHistory };
    } catch (err) {
      console.error("[SyncManager] Exception during syncActivityHistory:", err);
      return { action: 'error', error: err };
    }
  }
};
