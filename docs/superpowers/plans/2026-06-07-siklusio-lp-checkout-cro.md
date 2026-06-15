# Siklusio LP Checkout CRO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the landing page and checkout so cold Meta traffic sees outcome, trust, total price, and post-payment activation clarity before being asked to buy.

**Architecture:** Keep the current static `landing/` funnel and existing `/api/checkout/register` backend flow. This plan improves low-risk conversion levers first: above-fold value hierarchy, price framing, bonus hierarchy, checkout reassurance, and tracking/QA guardrails. The larger "password after payment" migration is intentionally kept as a separate decision gate because it touches auth, webhook activation, and support flows.

**Tech Stack:** Static HTML/CSS/JS in `landing/`, Node `node:test` regression tests, existing `npm test` runner, optional Playwright visual verification.

---

## File Structure

- Modify: `landing/index.html`
  - Responsibility: Landing page hero, price framing, feature hierarchy, bonus hierarchy, CTA copy.
- Modify: `landing/checkout.html`
  - Responsibility: Checkout form UX, payment reassurance, form-field microcopy, redirect clarity, GTM events.
- Modify: `landing/conversionFunnel.test.js`
  - Responsibility: Static conversion-regression tests for LP/checkout copy and event naming.
- No backend changes in this phase.
  - Current backend creates a pending Supabase Auth user before Mayar payment. Moving password after payment should be planned separately after this lower-risk CRO phase is shipped and measured.

---

## Task 1: Add Conversion Regression Tests

**Files:**
- Modify: `landing/conversionFunnel.test.js`

- [ ] **Step 1: Add failing tests for outcome-first price framing**

Append these tests after the existing tests in `landing/conversionFunnel.test.js`:

```js
test("landing frames price with immediate outcome before the primary hero CTA", () => {
  const outcome = "Dalam 5 menit setelah login";
  const cta = "Mulai Promil Lebih Rapi Hari Ini";
  const priceNote = "Premium Lifetime Rp37.000";

  const outcomeIndex = landingHtml.indexOf(outcome);
  const ctaIndex = landingHtml.indexOf(cta);
  const priceIndex = landingHtml.indexOf(priceNote);

  assert.notEqual(outcomeIndex, -1);
  assert.notEqual(ctaIndex, -1);
  assert.notEqual(priceIndex, -1);
  assert.ok(outcomeIndex < ctaIndex);
  assert.ok(ctaIndex < priceIndex);

  assert.match(landingHtml, /lihat perkiraan masa subur/i);
  assert.match(landingHtml, /mulai checklist promil harian/i);
});

test("landing hero keeps bonus secondary to core app benefits", () => {
  const heroStart = landingHtml.indexOf("<section class=\"hero\"");
  const stripStart = landingHtml.indexOf("<div class=\"strip\">");
  const heroHtml = landingHtml.slice(heroStart, stripStart);

  assert.doesNotMatch(heroHtml, /Bonus digital Rp196\.000/);
  assert.match(heroHtml, /Pelacak siklus/);
  assert.match(heroHtml, /Checklist promil/);
  assert.match(heroHtml, /TWW lebih tenang/);
});

test("checkout form explains payment method and redirect before submit", () => {
  assert.match(checkoutHtml, /Total hari ini Rp 37\.000/);
  assert.match(checkoutHtml, /Mayar akan menampilkan metode pembayaran yang tersedia/);
  assert.match(checkoutHtml, /Bunda akan diarahkan ke halaman pembayaran Mayar/);
});
```

- [ ] **Step 2: Run the new tests and confirm they fail**

Run:

```bash
node landing/conversionFunnel.test.js
```

Expected: FAIL on the new tests because the new outcome block, revised CTA copy, secondary bonus framing, and checkout payment-method copy do not exist yet.

- [ ] **Step 3: Commit only the failing tests**

Run:

```bash
git add landing/conversionFunnel.test.js
git commit -m "test: capture lp checkout conversion framing"
```

Expected: commit succeeds. If the worktree contains unrelated user changes, keep `git add` scoped to `landing/conversionFunnel.test.js`.

---

## Task 2: Reframe Landing Hero Around Immediate Outcome

**Files:**
- Modify: `landing/index.html`
- Test: `landing/conversionFunnel.test.js`

- [ ] **Step 1: Add hero outcome CSS**

In `landing/index.html`, add this CSS near the existing `.hero-proof` styles:

```css
.hero-outcome{
  margin:18px 0 18px;
  max-width:690px;
  background:rgba(255,255,255,.9);
  border:1px solid rgba(20,184,166,.18);
  border-radius:22px;
  padding:16px 18px;
  box-shadow:0 16px 42px rgba(20,184,166,.10);
}
.hero-outcome strong{
  display:block;
  color:var(--slate-950);
  font-family:Outfit,sans-serif;
  font-size:18px;
  margin-bottom:8px;
}
.hero-outcome ul{
  list-style:none;
  margin:0;
  padding:0;
  display:grid;
  gap:7px;
  color:var(--slate-600);
  font-size:14px;
  font-weight:800;
}
.hero-outcome li:before{
  content:"✓";
  color:var(--teal);
  font-weight:900;
  margin-right:8px;
}
.hero-price-note{
  margin:0 0 16px;
  color:var(--slate-600);
  font-size:13px;
  font-weight:900;
}
.hero-price-note strong{color:var(--pink-dark)}
```

- [ ] **Step 2: Replace the hero actions area**

In the hero content, replace this current block:

```html
<div class="hero-actions">
  <a class="btn btn-primary cta-checkout" href="./checkout.html" data-cta-location="hero_primary">Aktifkan Premium Lifetime — Rp37.000</a>
  <a class="btn btn-secondary" href="#fitur" data-track="hero_view_features">Lihat Isi Aplikasinya Dulu ↓</a>
</div>
```

with this block:

```html
<div class="hero-outcome" aria-label="Yang bisa Bunda mulai setelah aktivasi">
  <strong>Dalam 5 menit setelah login, Bunda bisa mulai promil lebih rapi.</strong>
  <ul>
    <li>Isi HPHT dan lihat perkiraan masa subur tanpa hitung manual.</li>
    <li>Mulai checklist promil harian sesuai fase tubuh.</li>
    <li>Buka dukungan TWW dan panduan AI saat butuh ditenangkan.</li>
  </ul>
</div>
<div class="hero-actions">
  <a class="btn btn-primary cta-checkout" href="./checkout.html" data-cta-location="hero_primary">Mulai Promil Lebih Rapi Hari Ini</a>
  <a class="btn btn-secondary" href="#fitur" data-track="hero_view_features">Lihat Isi Aplikasinya Dulu</a>
</div>
<p class="hero-price-note"><strong>Premium Lifetime Rp37.000</strong> - sekali bayar, tanpa langganan bulanan, akses langsung setelah pembayaran.</p>
```

- [ ] **Step 3: Update sticky and final CTA copy to keep outcome-first language**

In `landing/index.html`, update the final CTA text:

```html
<a class="btn btn-primary cta-checkout" href="./checkout.html" data-cta-location="final">Mulai Promil Lebih Rapi Hari Ini</a>
```

Update the sticky CTA button text:

```html
<a class="btn btn-primary cta-checkout" href="./checkout.html" data-cta-location="sticky_mobile">Mulai Sekarang</a>
```

Keep the sticky price line:

```html
<div><strong>Premium Lifetime Rp37.000</strong><small class="hide-mobile">Sekali bayar - akses langsung</small></div>
```

- [ ] **Step 4: Run landing test**

Run:

```bash
node landing/conversionFunnel.test.js
```

Expected: The outcome-first test passes. The bonus hierarchy and checkout payment-method tests may still fail until later tasks.

- [ ] **Step 5: Commit the hero changes**

Run:

```bash
git add landing/index.html landing/conversionFunnel.test.js
git commit -m "feat: reframe landing hero around immediate outcome"
```

---

## Task 3: De-Emphasize Bonus Gimmick In The Above-Fold Landing Area

**Files:**
- Modify: `landing/index.html`
- Test: `landing/conversionFunnel.test.js`

- [ ] **Step 1: Replace the hero micro benefits**

In `landing/index.html`, replace the hero `.micro` block:

```html
<div class="micro"><span>✓ Sekali bayar</span><span>✓ Tanpa langganan bulanan</span><span>✓ Bonus digital Rp196.000</span><span>✓ Bebas iklan pihak ketiga</span></div>
```

with:

```html
<div class="micro">
  <span>✓ Pelacak siklus</span>
  <span>✓ Checklist promil</span>
  <span>✓ TWW lebih tenang</span>
  <span>✓ Data privat</span>
</div>
```

- [ ] **Step 2: Replace the hero mini offer cards**

In `landing/index.html`, replace:

```html
<div class="offer-mini" aria-label="Ringkasan penawaran Siklusio">
  <div><strong>Rp37rb</strong><small>Premium Lifetime</small></div>
  <div><strong>4 Bonus</strong><small>Ikut gratis hari ini</small></div>
  <div><strong>Privat</strong><small>Tanpa iklan pihak ketiga</small></div>
</div>
```

with:

```html
<div class="offer-mini" aria-label="Ringkasan manfaat Siklusio">
  <div><strong>HPHT</strong><small>Mulai dari data pertama</small></div>
  <div><strong>Fase</strong><small>Masa subur dan TWW</small></div>
  <div><strong>Privat</strong><small>Tanpa iklan pihak ketiga</small></div>
</div>
```

- [ ] **Step 3: Keep price and bonus visible lower on the page**

Do not remove the strip and pricing section. Keep these existing pieces:

```html
<div class="price-pill"><strong>Rp37.000</strong><span>tanpa langganan bulanan</span></div>
```

and:

```html
<div><span class="old">Rp233.000</span> <strong style="color:#be185d">termasuk bonus Rp196.000</strong></div>
```

This keeps transparency while reducing the "bonus-first" feel in the first viewport.

- [ ] **Step 4: Run landing test**

Run:

```bash
node landing/conversionFunnel.test.js
```

Expected: The bonus hierarchy test passes. Checkout payment-method test may still fail.

- [ ] **Step 5: Commit the bonus hierarchy change**

Run:

```bash
git add landing/index.html landing/conversionFunnel.test.js
git commit -m "feat: prioritize core app benefits above fold"
```

---

## Task 4: Add Checkout Payment Reassurance Near Submit

**Files:**
- Modify: `landing/checkout.html`
- Test: `landing/conversionFunnel.test.js`

- [ ] **Step 1: Add payment assurance CSS**

In `landing/checkout.html`, add this CSS near `.activation-note`:

```css
.payment-method-note{
  margin:14px 0 0;
  padding:13px 14px;
  border-radius:16px;
  background:#fff;
  border:1px solid rgba(20,184,166,.18);
  color:#334155;
  font-size:12.5px;
  line-height:1.55;
  font-weight:800;
}
.payment-method-note strong{
  display:block;
  color:#0f766e;
  margin-bottom:3px;
}
```

- [ ] **Step 2: Add the payment method note before the submit button**

In `landing/checkout.html`, insert this block after the coupon `<details>` and before `<button type="submit"...>`:

```html
<div class="payment-method-note">
  <strong>Total hari ini Rp 37.000 - sekali bayar.</strong>
  Bunda akan diarahkan ke halaman pembayaran Mayar. Mayar akan menampilkan metode pembayaran yang tersedia sebelum Bunda menyelesaikan pembayaran.
</div>
```

- [ ] **Step 3: Keep password helper close to password field**

Confirm this exact helper remains below the password input:

```html
<p class="helper">Password ini dipakai untuk login ke aplikasi setelah pembayaran berhasil.</p>
```

- [ ] **Step 4: Run checkout conversion test**

Run:

```bash
node landing/conversionFunnel.test.js
```

Expected: All tests in `landing/conversionFunnel.test.js` pass.

- [ ] **Step 5: Commit checkout reassurance**

Run:

```bash
git add landing/checkout.html landing/conversionFunnel.test.js
git commit -m "feat: add checkout payment reassurance"
```

---

## Task 5: Add Better Checkout Error And Redirect Tracking

**Files:**
- Modify: `landing/conversionFunnel.test.js`
- Modify: `landing/checkout.html`

- [ ] **Step 1: Add failing tracking tests**

Append this test to `landing/conversionFunnel.test.js`:

```js
test("checkout tracks submit attempts, validation errors, and Mayar redirect start", () => {
  assert.match(checkoutHtml, /event:\s*'checkout_form_submit_attempt'/);
  assert.match(checkoutHtml, /event:\s*'checkout_validation_error'/);
  assert.match(checkoutHtml, /event:\s*'checkout_mayar_redirect_start'/);
});
```

- [ ] **Step 2: Run test and confirm failure**

Run:

```bash
node landing/conversionFunnel.test.js
```

Expected: FAIL because these events are not present yet.

- [ ] **Step 3: Track submit attempt at the start of form submission**

In `landing/checkout.html`, inside:

```js
  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
```

add this immediately after `e.preventDefault();`:

```js
    pushCheckoutEvent({
      event: 'checkout_form_submit_attempt',
      initiate_checkout_event_id: initiateCheckoutEventId,
      value: 37000,
      currency: 'IDR'
    });
```

- [ ] **Step 4: Track validation errors with one helper**

In `landing/checkout.html`, add this helper before the submit listener:

```js
    function trackCheckoutValidationError(reason) {
      pushCheckoutEvent({
        event: 'checkout_validation_error',
        initiate_checkout_event_id: initiateCheckoutEventId,
        error_reason: reason
      });
    }
```

Then update validation branches:

```js
      if (!name || !whatsapp || !email || !password) {
        const errMsg = 'Mohon lengkapi semua data akun terlebih dahulu.';
        showError(errMsg);
        trackCheckoutValidationError('missing_required_fields');
        return;
      }
      if (password.length < 6) {
        const errMsg = 'Kata sandi minimal 6 karakter ya, Bunda.';
        showError(errMsg);
        trackCheckoutValidationError('password_too_short');
        return;
      }
```

- [ ] **Step 5: Track Mayar redirect start**

In `landing/checkout.html`, immediately before:

```js
        setTimeout(() => {
          window.location.href = result.paymentUrl;
        }, 800);
```

add:

```js
        pushCheckoutEvent({
          event: 'checkout_mayar_redirect_start',
          initiate_checkout_event_id: initiateCheckoutEventId,
          transaction_id: result.transactionId || '',
          value: result.finalAmount || 37000,
          currency: 'IDR'
        });
```

- [ ] **Step 6: Run tests**

Run:

```bash
node landing/conversionFunnel.test.js
npm test
```

Expected: both commands pass.

- [ ] **Step 7: Commit tracking changes**

Run:

```bash
git add landing/checkout.html landing/conversionFunnel.test.js
git commit -m "feat: improve checkout funnel tracking"
```

---

## Task 6: Visual QA On Mobile And Desktop

**Files:**
- Modify only if screenshots reveal layout issues: `landing/index.html`, `landing/checkout.html`

- [ ] **Step 1: Start a local static server**

Run:

```bash
npx http-server landing -p 4183
```

Expected: static server available at `http://127.0.0.1:4183`.

- [ ] **Step 2: Capture mobile screenshots with Playwright**

Run this from the repo root in a separate shell:

```bash
node -e "const { chromium } = require('playwright'); (async()=>{ const b=await chromium.launch(); const p=await b.newPage({ viewport:{ width:390, height:844 }, deviceScaleFactor:2, isMobile:true }); await p.goto('http://127.0.0.1:4183/index.html', { waitUntil:'networkidle' }); await p.screenshot({ path:'scratch/lp-checkout-cro-lp-mobile.png', fullPage:false }); await p.goto('http://127.0.0.1:4183/checkout.html', { waitUntil:'networkidle' }); await p.screenshot({ path:'scratch/lp-checkout-cro-checkout-mobile.png', fullPage:false }); await b.close(); })();"
```

Expected:
- LP mobile first viewport shows headline, immediate outcome block, CTA, and price note without text overlap.
- Checkout mobile first viewport reaches the form quickly and shows total/payment reassurance before submit.

- [ ] **Step 3: Capture desktop screenshots**

Run:

```bash
node -e "const { chromium } = require('playwright'); (async()=>{ const b=await chromium.launch(); const p=await b.newPage({ viewport:{ width:1440, height:1000 } }); await p.goto('http://127.0.0.1:4183/index.html', { waitUntil:'networkidle' }); await p.screenshot({ path:'scratch/lp-checkout-cro-lp-desktop.png', fullPage:false }); await p.goto('http://127.0.0.1:4183/checkout.html', { waitUntil:'networkidle' }); await p.screenshot({ path:'scratch/lp-checkout-cro-checkout-desktop.png', fullPage:false }); await b.close(); })();"
```

Expected:
- Desktop LP does not look like price is the first promise.
- Desktop checkout still balances form, summary, and trust badges.

- [ ] **Step 4: Fix any visual issues found**

If the hero becomes too crowded on mobile, reduce `.hero-outcome` padding:

```css
@media (max-width: 560px){
  .hero-outcome{padding:14px 15px}
  .hero-outcome strong{font-size:16px}
  .hero-outcome ul{font-size:13px}
}
```

If checkout payment note pushes the submit button too low on mobile, reduce its margin and padding:

```css
@media (max-width: 560px){
  .payment-method-note{margin-top:10px;padding:11px 12px}
}
```

- [ ] **Step 5: Run final verification**

Run:

```bash
git diff --check -- landing/index.html landing/checkout.html landing/conversionFunnel.test.js
npm test
```

Expected: both commands pass.

- [ ] **Step 6: Commit visual fixes if any**

Run:

```bash
git add landing/index.html landing/checkout.html landing/conversionFunnel.test.js
git commit -m "fix: polish lp checkout mobile layout"
```

If no visual fixes were needed, skip this commit.

---

## Task 7: Manual Mayar And Meta QA Checklist

**Files:**
- No code changes unless QA finds an issue.

- [ ] **Step 1: Test checkout from a real phone**

Open production from a phone:

```text
https://siklusio.web.id/?utm_source=qa&utm_medium=manual&utm_campaign=cro_price_framing
```

Expected:
- LP loads fast enough to see headline and outcome.
- CTA opens checkout.
- Checkout keeps UTM parameters.
- Form is readable on mobile.
- Password helper is visible before submit.

- [ ] **Step 2: Test redirect to Mayar without completing payment**

Use a test email and phone number. Submit checkout and stop on the Mayar page.

Expected:
- Loading state says payment is being prepared.
- Mayar page merchant/product copy does not feel suspicious.
- Product name is recognizably Siklusio.
- Payment methods shown by Mayar are understandable.

- [ ] **Step 3: Verify Meta event sequence in GTM/Pixel Helper**

Expected event sequence for LP to checkout:

```text
PageView
siklusio_landing_view
siklusio_initiate_checkout
begin_checkout
checkout_form_submit_attempt
siklusio_lead
checkout_payment_link_created
checkout_mayar_redirect_start
Purchase only after Mayar payment.success webhook
```

Expected:
- `siklusio_initiate_checkout` is not duplicated on checkout page when the LP passes `event_id`.
- No `purchase_initiated` event exists.
- `Purchase` is sent only after actual successful payment or valid free-bypass coupon.

- [ ] **Step 4: Decide on password-after-payment as a separate project**

Use this decision rule:

```text
If checkout submit rate is healthy but Mayar payment completion is poor, improve payment trust/merchant clarity first.
If form-start is healthy but form-submit is poor, plan password-after-payment or magic-link checkout.
If LP CTA click is poor, keep price visible but test CTA copy and outcome block.
```

If password-after-payment is chosen, create a new dedicated plan for:
- `backend/src/controllers/checkout.controller.ts`
- `backend/src/controllers/webhook.mayar.controller.ts`
- `backend/checkoutRegister.test.ts`
- auth redirect/password setup UI in the app

Do not fold that migration into this CRO phase.

---

## Measurement Plan

Track for at least one clean campaign cycle after deployment:

- LP view to hero CTA click rate.
- LP CTA click to checkout form submit rate.
- Checkout form submit to Mayar redirect rate.
- Mayar redirect to paid purchase rate.
- Checkout validation error rate by `error_reason`.
- Meta purchase match quality and event dedup status.

Suggested minimum before judging:

```text
At least 100 checkout page sessions or 30 checkout submit attempts, whichever comes first.
```

With the current sample size of 20 clicks and 15 link clicks, treat findings as directional, not final.

---

## Self-Review

- Spec coverage: The plan covers price framing, LP trust/value hierarchy, bonus de-emphasis, checkout clarity, tracking, and Mayar QA. The larger auth/password migration is explicitly separated.
- Placeholder scan: No task uses TBD/TODO/fill later language. The only deferred item is clearly marked as a separate project with a decision rule.
- Type/name consistency: Tests reference exact strings and event names that implementation steps add: `checkout_form_submit_attempt`, `checkout_validation_error`, and `checkout_mayar_redirect_start`.
