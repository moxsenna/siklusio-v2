import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory cache untuk mendukung pembacaan sinkron yang cocok dengan implementasi web
const cache: Record<string, string> = {};
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

export const storage = {
  /**
   * Inisialisasi media penyimpanan dengan memuat semua data dari AsyncStorage ke memori.
   * Harus dipanggil sekali di titik masuk utama aplikasi (misal: di layout utama).
   */
  init: async (): Promise<void> => {
    if (isLoaded) return;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const pairs = await AsyncStorage.multiGet(keys);
        for (const [key, val] of pairs) {
          if (val !== null) {
            cache[key] = val;
          }
        }
        isLoaded = true;
      } catch (e) {
        console.error("Gagal menginisialisasi cache penyimpanan sinkron:", e);
      }
    })();

    return loadPromise;
  },

  getItem: (key: string): string | null => {
    return cache[key] || null;
  },

  setItem: (key: string, value: string): void => {
    cache[key] = value;
    // Simpan di latar belakang secara asinkron
    AsyncStorage.setItem(key, value).catch((e) =>
      console.error("Gagal menyimpan kunci:", key, e)
    );
  },

  removeItem: (key: string): void => {
    delete cache[key];
    // Hapus di latar belakang secara asinkron
    AsyncStorage.removeItem(key).catch((e) =>
      console.error("Gagal menghapus kunci:", key, e)
    );
  },

  getKeys: (): string[] => {
    return Object.keys(cache);
  },
};
