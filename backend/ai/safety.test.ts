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

  // Contextual word check (allowed without action triggers)
  assert.equal(containsForbiddenWords({ text: "Siklusio tidak memberikan dosis obat." }), false);
  assert.equal(containsForbiddenWords({ text: "Ini adalah obat hormon penting." }), false);

  // Contextual word check (blocked with action triggers)
  assert.equal(containsForbiddenWords({ text: "Silakan konsumsi obat hormon Anda." }), true);
  assert.equal(containsForbiddenWords({ text: "Atur sendiri dosis penggunaan obat." }), true);
});

test("aiSafetyEnvelope throws error on unsafe inputs", () => {
  const unsafeResult = {
    summary: "Ikuti cara ini dan kamu pasti hamil.",
  };

  assert.throws(() => {
    aiSafetyEnvelope(unsafeResult);
  }, /Safety validation failed/);
});

test("aiSafetyEnvelope successfully strips existing envelope fields before re-wrapping", () => {
  const resultWithEnvelope = {
    summary: "Siklus kamu berjalan normal minggu ini.",
    disclaimer: "Old disclaimer text",
    safetyFlags: {
      noDiagnosis: false,
      noPregnancyGuarantee: false,
      extraFlag: true,
    },
  };

  const reEnveloped = aiSafetyEnvelope(resultWithEnvelope as any);

  assert.equal(reEnveloped.summary, resultWithEnvelope.summary);
  assert.equal(reEnveloped.disclaimer, MEDICAL_DISCLAIMER);
  assert.deepEqual(reEnveloped.safetyFlags, {
    noDiagnosis: true,
    noPregnancyGuarantee: true,
  });
  assert.equal((reEnveloped.safetyFlags as any).extraFlag, undefined);
});

