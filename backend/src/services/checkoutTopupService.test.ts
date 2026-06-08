import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTopupCustomerDetails,
  buildTopupMayarProductFields,
} from "./checkoutTopupService";

test("buildTopupCustomerDetails prefers profile fields and falls back to email local-part", () => {
  assert.deepEqual(
    buildTopupCustomerDetails({
      profile: { name: "Maya", whatsapp_number: "08123456789" },
      user: { email: "maya@example.com" },
    }),
    {
      name: "Maya",
      whatsapp: "08123456789",
      email: "maya@example.com",
    },
  );

  assert.deepEqual(
    buildTopupCustomerDetails({
      profile: null,
      user: { email: "buyer@example.com" },
    }),
    {
      name: "buyer",
      whatsapp: "-",
      email: "buyer@example.com",
    },
  );
});

test("buildTopupMayarProductFields uses server-owned package id and credits", () => {
  assert.deepEqual(
    buildTopupMayarProductFields({
      id: "coba_dulu",
      name: "Coba Dulu",
      credits: 300,
      price: 9900,
    }),
    {
      productName: "Top Up Kredit AI Siklusio (300 Kredit)",
      productDescription: "Top up saldo kredit AI Siklusio sebanyak 300 kredit.",
      productId: "coba_dulu",
    },
  );
});