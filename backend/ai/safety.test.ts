import assert from "node:assert/strict";
import { test } from "node:test";
import {
  aiSafetyEnvelope,
  containsForbiddenWords,
  MEDICAL_DISCLAIMER,
} from "./safety";

test("aiSafetyEnvelope successfully wraps valid AI results", () => {
  const result = {
    summary: "Siklus kamu berjalan normal minggu ini.",
    recommendations: ["Perbanyak minum air putih"],
  };

  const enveloped = aiSafetyEnvelope(result);

  assert.equal(enveloped.summary, result.summary);
  assert.equal(enveloped.disclaimer, MEDICAL_DISCLAIMER);
  assert.deepEqual(enveloped.safetyFlags, {
    noDiagnosis: true,
    noPregnancyGuarantee: true,
  });
});

test("containsForbiddenWords flags unsafe medical claims", () => {
  assert.equal(containsForbiddenWords({ text: "Kamu pasti hamil jika mengikuti panduan ini" }), true);
  assert.equal(containsForbiddenWords({ text: "Metode ini dijamin berhasil 100%" }), true);
  assert.equal(containsForbiddenWords({ text: "Gunakan obat hormon secara mandiri" }), true);
  assert.equal(containsForbiddenWords({ text: "Tidak perlu dokter untuk masalah ini" }), true);
  assert.equal(containsForbiddenWords({ text: "Minum dosis obat X sebanyak 5mg" }), true);
  
  // Case-insensitivity checks
  assert.equal(containsForbiddenWords({ text: "PASTI HAMIL" }), true);
  assert.equal(containsForbiddenWords({ text: "DIJAMIN" }), true);
  
  // Safe input check
  assert.equal(containsForbiddenWords({ text: "Konsumsi bayam merah untuk zat besi harian." }), false);
});

test("aiSafetyEnvelope throws error on unsafe inputs", () => {
  const unsafeResult = {
    summary: "Ikuti cara ini dan kamu pasti hamil.",
  };

  assert.throws(() => {
    aiSafetyEnvelope(unsafeResult);
  }, /Safety validation failed/);
});
