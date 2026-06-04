export const MEDICAL_DISCLAIMER =
  "Informasi ini bersifat pendampingan promil harian umum, bukan pengganti diagnosis medis Sp.OG dan pemeriksaan klinis langsung oleh tenaga kesehatan.";

export const HARD_FORBIDDEN = [
  "pasti hamil",
  "dijamin",
  "tidak perlu dokter"
];

export const CONTEXTUAL_FORBIDDEN = [
  "dosis",
  "obat hormon"
];

export const ACTION_TRIGGERS = [
  "minum",
  "gunakan",
  "konsumsi",
  "atur",
  "resep",
  "ambil"
];

export interface SafetyFlags {
  noDiagnosis: boolean;
  noPregnancyGuarantee: boolean;
}

export type SafetyEnveloped<T> = T & {
  disclaimer: string;
  safetyFlags: SafetyFlags;
};

export function containsForbiddenWords(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const str = JSON.stringify(value).toLowerCase();

  // 1. Check hard forbidden words
  if (HARD_FORBIDDEN.some(word => str.includes(word.toLowerCase()))) {
    return true;
  }

  // 2. Check contextual forbidden words
  const hasContextual = CONTEXTUAL_FORBIDDEN.some(word => str.includes(word.toLowerCase()));
  if (hasContextual) {
    const hasActionTrigger = ACTION_TRIGGERS.some(trigger => str.includes(trigger.toLowerCase()));
    if (hasActionTrigger) {
      return true;
    }
  }

  return false;
}

export function stripExistingSafetyEnvelope<T extends Record<string, any>>(result: T): Omit<T, "disclaimer" | "safetyFlags"> {
  if (!result || typeof result !== "object") return result;
  const { disclaimer, safetyFlags, ...rest } = result as any;
  return rest;
}

export function aiSafetyEnvelope<T extends Record<string, any>>(result: T): SafetyEnveloped<T> {
  if (containsForbiddenWords(result)) {
    throw new Error("Safety validation failed: AI response contains forbidden medical claims or phrases.");
  }

  // Strip existing safety envelope fields to prevent accumulation or conflicts
  const cleanResult = stripExistingSafetyEnvelope(result);

  return {
    ...cleanResult,
    disclaimer: MEDICAL_DISCLAIMER,
    safetyFlags: {
      noDiagnosis: true,
      noPregnancyGuarantee: true,
    },
  } as any;
}

