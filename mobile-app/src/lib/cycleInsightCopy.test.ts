import test from "node:test";
import assert from "node:assert/strict";
import { getCycleConfidenceMessage, getPredictionDeltaMessage } from "./cycleInsightCopy";

test("maps cycle confidence to user-facing Indonesian copy", () => {
  assert.equal(getCycleConfidenceMessage("low"), "Butuh lebih banyak catatan");
  assert.equal(getCycleConfidenceMessage("medium"), "Prediksi mulai personal");
  assert.equal(getCycleConfidenceMessage("high"), "Pola siklus cukup stabil");
});

test("formats prediction correction copy from latest actual period delta", () => {
  assert.equal(
    getPredictionDeltaMessage(3),
    "Haid terakhir datang 3 hari lebih lambat dari prediksi; kalender disesuaikan.",
  );
  assert.equal(
    getPredictionDeltaMessage(-2),
    "Haid terakhir datang 2 hari lebih cepat dari prediksi; kalender disesuaikan.",
  );
  assert.equal(getPredictionDeltaMessage(1), "Prediksi terakhir sesuai dengan catatan haidmu.");
  assert.equal(getPredictionDeltaMessage(null), null);
});
