export const MEDICAL_DISCLAIMER =
  "Informasi ini bersifat pendampingan promil harian umum, bukan pengganti diagnosis medis Sp.OG dan pemeriksaan klinis langsung oleh tenaga kesehatan.";

export const FORBIDDEN_WORDS = [
  "pasti hamil",
  "dijamin",
  "obat hormon",
  "tidak perlu dokter",
  "dosis"
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
  return FORBIDDEN_WORDS.some(word => str.includes(word.toLowerCase()));
}

export function aiSafetyEnvelope<T extends Record<string, any>>(result: T): SafetyEnveloped<T> {
  if (containsForbiddenWords(result)) {
    throw new Error("Safety validation failed: AI response contains forbidden medical claims or phrases.");
  }

  return {
    ...result,
    disclaimer: MEDICAL_DISCLAIMER,
    safetyFlags: {
      noDiagnosis: true,
      noPregnancyGuarantee: true,
    },
  };
}
