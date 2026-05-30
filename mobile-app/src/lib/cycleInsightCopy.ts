import type { PredictionConfidence } from './cyclePrediction';

export function getCycleConfidenceMessage(confidence: PredictionConfidence) {
  if (confidence === 'high') return 'Pola siklus cukup stabil';
  if (confidence === 'medium') return 'Prediksi mulai personal';
  return 'Butuh lebih banyak catatan';
}

export function getPredictionDeltaMessage(deltaDays: number | null) {
  if (deltaDays === null) return null;
  if (Math.abs(deltaDays) <= 1) {
    return 'Prediksi terakhir sesuai dengan catatan haidmu.';
  }

  const days = Math.abs(deltaDays);
  const direction = deltaDays > 0 ? 'lebih lambat' : 'lebih cepat';
  return `Haid terakhir datang ${days} hari ${direction} dari prediksi; kalender disesuaikan.`;
}
