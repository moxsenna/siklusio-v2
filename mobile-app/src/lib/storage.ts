import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// In-memory cache untuk mendukung pembacaan sinkron yang cocok dengan implementasi web
const cache: Record<string, string> = {};
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

export const storage = {
  /**
   * Inisialisasi media penyimpanan dengan memuat semua data dari AsyncStorage atau localStorage ke memori.
   * Harus dipanggil sekali di titik masuk utama aplikasi (misal: di layout utama).
   */
  init: async (): Promise<void> => {
    if (isLoaded) return;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      try {
        if (Platform.OS === "web") {
          if (typeof window !== "undefined" && window.localStorage) {
            for (let i = 0; i < window.localStorage.length; i++) {
              const key = window.localStorage.key(i);
              if (key) {
                const val = window.localStorage.getItem(key);
                if (val !== null) {
                  cache[key] = val;
                }
              }
            }
          }
          isLoaded = true;
          return;
        }

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
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    // Simpan di latar belakang secara asinkron
    AsyncStorage.setItem(key, value).catch((e) => console.error("Gagal menyimpan kunci:", key, e));
  },

  removeItem: (key: string): void => {
    delete cache[key];
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return;
    }
    // Hapus di latar belakang secara asinkron
    AsyncStorage.removeItem(key).catch((e) => console.error("Gagal menghapus kunci:", key, e));
  },

  getKeys: (): string[] => {
    return Object.keys(cache);
  },
};
