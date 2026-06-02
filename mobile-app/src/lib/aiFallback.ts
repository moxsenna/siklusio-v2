export type AiFallbackTone = 'credit' | 'network' | 'rate_limit' | 'server';

export interface AiFallbackInput {
  featureName?: string;
  message?: string | null;
  status?: number | null;
  code?: string | null;
}

export interface AiFallbackCopy {
  tone: AiFallbackTone;
  title: string;
  message: string;
  helper: string;
  retryLabel: string;
}

const DEFAULT_FEATURE_NAME = 'AI';

const technicalErrorPattern =
  /^(typeerror|error|server error|failed to fetch)|postgres|supabase|exception|undefined|null|json|stack|trace/i;

function getFeatureName(featureName?: string | null) {
  const trimmed = featureName?.trim();
  return trimmed || DEFAULT_FEATURE_NAME;
}

function safeMessage(message?: string | null) {
  return (message || '').trim();
}

function isCreditError(message: string, status?: number | null) {
  const lower = message.toLowerCase();
  return status === 402 || lower.includes('saldo kredit') || lower.includes('kredit belum cukup');
}

function isNetworkError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('koneksi') ||
    lower.includes('internet') ||
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('aborted')
  );
}

function isRateLimitError(message: string, status?: number | null) {
  const lower = message.toLowerCase();
  return status === 429 || lower.includes('rate limit') || lower.includes('too many') || lower.includes('terlalu banyak');
}

function isHumanSafeMessage(message: string) {
  if (!message) return false;
  if (technicalErrorPattern.test(message)) return false;
  return message.length <= 220;
}

export function buildAiFallbackCopy(input: AiFallbackInput): AiFallbackCopy {
  const featureName = getFeatureName(input.featureName);
  const message = safeMessage(input.message);

  if (isCreditError(message, input.status)) {
    return {
      tone: 'credit',
      title: 'Kredit AI belum cukup',
      message: message || `Kredit AI untuk ${featureName} belum cukup.`,
      helper: 'Top up kredit dulu, lalu coba lagi dari fitur ini.',
      retryLabel: 'Coba lagi setelah top up',
    };
  }

  if (isRateLimitError(message, input.status)) {
    return {
      tone: 'rate_limit',
      title: 'AI perlu jeda sebentar',
      message: 'Ada terlalu banyak permintaan ke AI saat ini. Tunggu sebentar, lalu coba lagi.',
      helper: 'Data yang sudah kamu isi tetap aman selama layar ini tidak ditutup.',
      retryLabel: 'Coba lagi',
    };
  }

  if (isNetworkError(message)) {
    return {
      tone: 'network',
      title: 'Koneksi ke AI sedang tidak stabil',
      message: `Siklusio belum bisa menghubungi layanan AI untuk ${featureName}.`,
      helper: 'Coba lagi setelah koneksi lebih stabil. Input kamu belum diubah.',
      retryLabel: 'Coba lagi',
    };
  }

  return {
    tone: 'server',
    title: `${featureName} belum bisa merespons`,
    message: isHumanSafeMessage(message)
      ? message
      : `${featureName} belum bisa dibuat sekarang. Data kamu tetap aman; coba lagi nanti.`,
    helper: 'Kalau ini berulang, catat fitur dan waktunya agar tim bisa mengecek log produksi.',
    retryLabel: 'Coba lagi',
  };
}

export function extractAiFallbackInput(
  error: unknown,
  fallbackMessage: string,
  featureName: string
): AiFallbackInput {
  const candidate = error as {
    message?: unknown;
    status?: unknown;
    code?: unknown;
    payload?: unknown;
  } | null;

  const status = typeof candidate?.status === 'number' ? candidate.status : null;
  const code = typeof candidate?.code === 'string' ? candidate.code : null;
  let message = typeof candidate?.message === 'string' && candidate.message.trim()
    ? candidate.message.trim()
    : fallbackMessage;

  if (status === 402 || message.toLowerCase().includes('saldo kredit')) {
    const payload = candidate?.payload as { required?: unknown; balance?: unknown } | null;
    const required = Number(payload?.required);
    const balance = Number(payload?.balance);

    if (Number.isFinite(required) && Number.isFinite(balance)) {
      message = `Saldo kredit belum cukup. Butuh ${required} kredit, saldo kamu ${balance}.`;
    }
  }

  return {
    featureName,
    message,
    status,
    code,
  };
}
