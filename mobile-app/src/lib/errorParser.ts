export interface ParsedError {
  isRateLimit: boolean;
  message: string;
  waitSecs?: number;
}

/**
 * Menganalisis objek kesalahan yang dikembalikan oleh Supabase/PostgreSQL.
 * Mengidentifikasi trigger rate limiting (cooldown / batas per jam) dan memformatnya 
 * menjadi teks Bahasa Indonesia yang ramah bagi pengguna serta aman dari crashes.
 *
 * Contoh format error dari trigger:
 *   "rate_limit:post_cooldown:30:Tunggu 30 detik sebelum membuat postingan baru."
 *   "rate_limit:post_hourly:Batas 5 postingan per jam terlampaui. Tunggu beberapa saat lagi."
 */
export const parseDbError = (err: any): ParsedError => {
  if (!err) {
    return {
      isRateLimit: false,
      message: 'Terjadi kesalahan yang tidak diketahui.'
    };
  }

  // Ambil pesan error utama dari Supabase / Postgres payload
  const rawMessage = err.message || err.details || (typeof err === 'string' ? err : '');
  
  if (rawMessage.startsWith('rate_limit:')) {
    const parts = rawMessage.split(':');
    
    // Check format cooldown: rate_limit:type_cooldown:wait_secs:IndonesianMessage
    if (parts[1] && parts[1].includes('_cooldown')) {
      const waitSecs = parseInt(parts[2], 10) || 10;
      const displayMessage = parts[3] || `Tunggu ${waitSecs} detik sebelum mencoba kembali.`;
      
      return {
        isRateLimit: true,
        message: displayMessage,
        waitSecs
      };
    }
    
    // Check format hourly: rate_limit:type_hourly:IndonesianMessage
    if (parts[1] && parts[1].includes('_hourly')) {
      const displayMessage = parts[2] || 'Batas pengiriman per jam terlampaui. Tunggu beberapa saat lagi.';
      return {
        isRateLimit: true,
        message: displayMessage
      };
    }
  }

  // Filter out raw Postgres syntax leaks for normal users
  let cleanMessage = rawMessage;
  if (rawMessage.includes('P0001') || rawMessage.includes('exception:')) {
    cleanMessage = 'Sistem mendeteksi aktivitas tidak biasa. Tunggu beberapa saat lagi.';
  } else if (rawMessage.includes('violates foreign key constraint') || rawMessage.includes('foreign_key_violation')) {
    cleanMessage = 'Data referensi tidak ditemukan. Periksa koneksi Anda.';
  }

  return {
    isRateLimit: false,
    message: cleanMessage || 'Terjadi kesalahan jaringan atau server. Coba beberapa saat lagi.'
  };
};
