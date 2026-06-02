import test from "node:test";
import assert from "node:assert/strict";
import { resolveTopupPackage } from "./topupPackages";

test("resolveTopupPackage returns server-owned package values", () => {
  assert.deepEqual(resolveTopupPackage("coba_dulu"), {
    id: "coba_dulu",
    name: "Coba Dulu",
    credits: 300,
    price: 9900,
  });

  assert.deepEqual(resolveTopupPackage("bekal_tenang"), {
    id: "bekal_tenang",
    name: "Bekal Tenang",
    credits: 6000,
    price: 99000,
  });
});

test("resolveTopupPackage rejects unknown or malformed package ids", () => {
  assert.equal(resolveTopupPackage("paket_palsu"), null);
  assert.equal(resolveTopupPackage(""), null);
  assert.equal(resolveTopupPackage(null), null);
  assert.equal(resolveTopupPackage({ id: "coba_dulu" }), null);
});
