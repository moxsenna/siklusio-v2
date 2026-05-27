/**
 * Avatar presets dan helper upload ke Cloudflare R2 (via backend proxy)
 *
 * - Preset adalah avatar built-in yang dibundel bersama app (file di
 *   `assets/images/avatars/`). Kalau user pilih preset, kita simpan
 *   `avatar_kind = 'preset'` + `avatar_url = preset:<id>` ke DB.
 *   Saat render, kita map kembali ke `require(...)` lokal.
 * - Custom adalah hasil upload ke Cloudflare R2 via `POST /api/upload-avatar`.
 *   Kita simpan `avatar_kind = 'custom'` + `avatar_url = <https URL final>`.
 *
 * Untuk MENAMBAH avatar baru:
 * 1. Taruh file PNG/JPG di `mobile-app/assets/images/avatars/`
 * 2. Tambahkan entry baru di array PRESET_AVATARS di bawah.
 *    `id` harus unik dan stabil (jangan diganti setelah dirilis,
 *    karena id ini disimpan di DB).
 */

export type AvatarKind = 'preset' | 'custom';

export interface PresetAvatar {
  id: string;
  /** Bisa berupa hasil require() atau URL string. */
  source: any;
}

/**
 * Daftar preset. Sesuaikan dengan file asli yang ada di
 * `mobile-app/assets/images/avatars/`. Sementara saya kasih placeholder
 * yang re-use icon yang sudah ada — ganti dengan asset baru kamu nanti.
 */
export const PRESET_AVATARS: PresetAvatar[] = [
  { id: 'p1', source: require('../../assets/images/icon.png') },
  { id: 'p2', source: require('../../assets/images/adaptive-icon.png') },
  { id: 'p3', source: require('../../assets/images/splash-icon.png') },
  { id: 'p4', source: require('../../assets/images/favicon.png') },
];

/**
 * Resolve avatar dari profile data (yang tersimpan di DB) menjadi
 * value yang bisa langsung dipakai oleh komponen <Image source>.
 */
export function resolveAvatarSource(
  avatarUrl: string | null | undefined,
  avatarKind: AvatarKind | null | undefined
): any | null {
  if (!avatarUrl) return null;
  if (avatarKind === 'preset') {
    const id = avatarUrl.replace(/^preset:/, '');
    const found = PRESET_AVATARS.find((p) => p.id === id);
    return found?.source ?? null;
  }
  if (avatarKind === 'custom') {
    return { uri: avatarUrl };
  }
  // legacy fallback: kalau cuma URL tanpa kind, treat sebagai uri
  if (/^https?:\/\//i.test(avatarUrl)) return { uri: avatarUrl };
  return null;
}

// ============================================================
// Upload ke Cloudflare R2 (via backend proxy)
// ============================================================

/**
 * Maks 5 MB supaya upload cepat dan tidak bikin user menunggu lama.
 */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/**
 * Upload base64 image ke Cloudflare R2 melalui Express backend.
 *
 * Client mengirim base64 ke `POST /api/upload-avatar`, backend yang
 * meng-upload ke R2 menggunakan kredensial server-side.
 *
 * @param base64    Data image dalam base64 (TANPA prefix `data:image/...;base64,`)
 * @returns         URL https final dari image yang sudah di-host di R2
 */
export async function uploadAvatarToR2(base64: string): Promise<string> {
  const { getApiBaseUrl, getAccessToken } = await import('./api');

  const token = await getAccessToken();
  const baseUrl = getApiBaseUrl();

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/upload-avatar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ base64 }),
    });
  } catch (e: any) {
    throw new Error('Tidak bisa terhubung ke server. Cek koneksi internet.');
  }

  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new Error('Server mengembalikan respons tidak terduga.');
  }

  if (!res.ok) {
    throw new Error(json?.error || `Upload gagal (HTTP ${res.status})`);
  }

  if (!json?.url) {
    throw new Error('Server tidak mengembalikan URL gambar.');
  }

  return json.url;
}

