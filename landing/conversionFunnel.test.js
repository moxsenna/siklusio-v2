import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const landingHtml = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const checkoutHtml = readFileSync(new URL("./checkout.html", import.meta.url), "utf8");

function getLandingHeroHtml() {
  const heroStart = landingHtml.indexOf("<section class=\"hero\"");
  const stripStart = landingHtml.indexOf("<div class=\"strip\">");

  assert.notEqual(heroStart, -1);
  assert.notEqual(stripStart, -1);
  assert.ok(heroStart < stripStart);

  return landingHtml.slice(heroStart, stripStart);
}

test("landing hero surfaces fast trust and activation proof near the primary CTA", () => {
  assert.match(landingHtml, /Akses langsung setelah pembayaran/);
  assert.match(landingHtml, /Pembayaran aman via Mayar/);
  assert.match(landingHtml, /Bisa langsung login dan isi HPHT/);
  assert.match(landingHtml, /Dipakai oleh Bunda yang ingin promil lebih rapi/);
});

test("checkout explains account password and post-payment activation beside the form", () => {
  assert.match(
    checkoutHtml,
    /Password ini dipakai untuk login ke aplikasi setelah pembayaran berhasil/,
  );
  assert.match(checkoutHtml, /Setelah pembayaran berhasil:/);
  assert.match(checkoutHtml, /Akun Premium aktif otomatis/);
  assert.match(checkoutHtml, /Bonus dan kredit AI masuk ke akun/);
});

test("checkout keeps coupon optional and visually secondary", () => {
  assert.match(checkoutHtml, /<details class="coupon-details"/);
  assert.match(checkoutHtml, /Punya kode kupon atau referral\?/);
});

test("checkout does not double-fire InitiateCheckout or emit purchase-like events before payment", () => {
  assert.match(checkoutHtml, /incomingInitiateCheckoutEventId/);
  assert.match(checkoutHtml, /if \(!incomingInitiateCheckoutEventId\)/);
  assert.doesNotMatch(checkoutHtml, /event:\s*'purchase_initiated'/);
  assert.match(checkoutHtml, /event:\s*'checkout_payment_link_created'/);
});

test("landing frames price with immediate outcome before the primary hero CTA", () => {
  const heroHtml = getLandingHeroHtml();
  const outcome = "Dalam 5 menit setelah login";
  const cta = "Mulai Promil Lebih Rapi Hari Ini";
  const priceNote = "Premium Lifetime Rp37.000";

  const outcomeIndex = heroHtml.indexOf(outcome);
  const ctaIndex = heroHtml.indexOf(cta);
  const priceIndex = heroHtml.indexOf(priceNote, ctaIndex);

  assert.notEqual(outcomeIndex, -1);
  assert.notEqual(ctaIndex, -1);
  assert.notEqual(priceIndex, -1);
  assert.ok(outcomeIndex < ctaIndex);
  assert.ok(ctaIndex < priceIndex);

  assert.match(heroHtml, /lihat perkiraan masa subur/i);
  assert.match(heroHtml, /mulai checklist promil harian/i);
});

test("landing hero keeps bonus secondary to core app benefits", () => {
  const heroHtml = getLandingHeroHtml();

  assert.doesNotMatch(heroHtml, /Bonus digital Rp196\.000/);
  assert.match(heroHtml, /Pelacak siklus/);
  assert.match(heroHtml, /Checklist promil/);
  assert.match(heroHtml, /TWW lebih tenang/);
});

test("checkout form explains payment method and redirect before submit", () => {
  const formStart = checkoutHtml.indexOf("<form id=\"checkoutForm\">");
  const submitIndex = checkoutHtml.indexOf("id=\"btnSubmit\"", formStart);
  const formEnd = checkoutHtml.indexOf("</form>", formStart);

  assert.notEqual(formStart, -1);
  assert.notEqual(submitIndex, -1);
  assert.notEqual(formEnd, -1);
  assert.ok(formStart < submitIndex);
  assert.ok(submitIndex < formEnd);

  const formHtml = checkoutHtml.slice(formStart, formEnd);
  const submitLocalIndex = formHtml.indexOf("id=\"btnSubmit\"");
  const totalIndex = formHtml.indexOf("Total hari ini Rp 37.000");
  const paymentMethodIndex = formHtml.indexOf(
    "Mayar akan menampilkan metode pembayaran yang tersedia",
  );
  const redirectIndex = formHtml.indexOf(
    "Bunda akan diarahkan ke halaman pembayaran Mayar",
  );

  assert.notEqual(totalIndex, -1);
  assert.notEqual(paymentMethodIndex, -1);
  assert.notEqual(redirectIndex, -1);
  assert.ok(totalIndex < submitLocalIndex);
  assert.ok(paymentMethodIndex < submitLocalIndex);
  assert.ok(redirectIndex < submitLocalIndex);
});
