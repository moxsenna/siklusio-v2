# Landing Page Tracking Alignment and lpv2 Routing Design

## Background and Objectives

We are replacing the old landing page of Siklusio (`landing/index.html`) with a new, more conversion-focused landing page (`landing/index2.html`). We need to ensure:
1. The new landing page becomes the main homepage of the site (`landing/index.html`).
2. The old landing page is preserved as a backup/comparison page served at `/lpv2` (`landing/lpv2.html`).
3. The tracking and referral mechanics on the new landing page are fully aligned with the old page's behavior, ensuring GTM/Meta Pixel, Conversions API, and referral/attribution forwarding to `checkout.html` remain fully functional.

---

## File Routing and Setup

* **Old Homepage**: Rename `landing/index.html` to `landing/lpv2.html`.
  * Preserves relative asset paths (`./logo.webp`, `assets/stiker pack.webp`, `checkout.html`) without modifications since it remains at the root level of the Pages deployment.
* **New Homepage**: Update and rename `landing/index2.html` to `landing/index.html`.
  * Served as the main homepage at `siklusio.web.id/`.
* **Checkout Page**: `landing/checkout.html` remains unchanged but will now be accessed from both `index.html` (new LP) and `lpv2.html` (old LP).

---

## Tracking and Referral Design in New Landing Page

To keep the tracking fully compatible with the existing `checkout.html` and backend, the following tracking logic will be implemented in the new `landing/index.html` (currently `landing/index2.html`):

### 1. Google Tag Manager (GTM) Container ID
* **Container ID**: `GTM-PX5J3XBM`
* Update `gtmId: 'GTM-XXXXXXX'` to `gtmId: 'GTM-PX5J3XBM'` in the `window.siklusioTrackingConfig` object.
* Update GTM `<noscript>` fallback iframe source URL:
  ```html
  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PX5J3XBM" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  ```

### 2. Direct Meta Pixel Configuration
* **Status**: Disabled (`directMetaPixelEnabled: false` in `window.siklusioTrackingConfig`).
* The Meta Pixel is loaded and triggered through GTM to prevent double-counting.
* Direct Meta Pixel fallback will remain in code but conditionally bypassed (since `directMetaPixelEnabled: false`).

### 3. Referral Persistence (`localStorage` & Cookie)
* Upon page load, check for URL parameters `ref`, `affiliate`, or `kode`.
* Save the sanitized, uppercase referral code to:
  * `localStorage.setItem('siklusio_ref_code', refCode)` (required by `checkout.html`).
  * `document.cookie` as `siklusio_ref` (for cookie compatibility).
* Push `referral_detected_lp` event to dataLayer.

### 4. Referral Badges
* Add `.ref-badge` styling to `<style>`:
  ```css
  .ref-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 16px;
    background: rgba(236, 72, 153, 0.06);
    border: 1px solid rgba(236, 72, 153, 0.15);
    font-size: 13px;
    font-weight: 600;
    color: var(--pink);
    margin-top: 12px;
  }
  ```
* Add the badge container to the Hero section underneath the primary CTA actions:
  ```html
  <div id="hero-ref-badge" class="ref-badge" style="display: none;"></div>
  ```
* Display the badges (`hero-ref-badge` and `pricing-ref-badge`) when a referral code is present in storage.

### 5. CAPI Test Parameters Persistence
* Look for URL parameters `test_event_code` and `test_secret`.
* Persist them in `sessionStorage` (`siklusio_test_event_code` and `siklusio_test_secret`) on page load.

### 6. Attribution and Event ID Forwarding on Checkout Click
* When clicking `.cta-checkout` buttons, the click event interceptor will append all key tracking and attribution parameters to the checkout redirect URL:
  * **Attribution**: `ref` (referral code), `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid` (if any).
  * **Meta CAPI ID**: `event_id` (Conversions API event ID generated as `uuid()` / `generateEventId()` for deduplication).
  * **CAPI Test Parameters**: `test_event_code` and `test_secret` (retrieved from current URL or `sessionStorage` fallback).
  * **CTA Context**: `cta` (location parameter, e.g. `hero_primary`, `pricing`, etc.).

---

## Verification Plan

### Technical Checks (via local server)
* Run a local HTTP server targeting the `landing` directory:
  ```bash
  python -m http.server 8080 -d landing
  ```
* Open `http://localhost:8080` (new LP homepage) and check:
  * dataLayer gets `siklusio_view_content` event on page load.
  * Passing `?ref=TESTREF` displays the referral badge in both the hero and pricing sections.
  * Clicking any CTA button triggers `siklusio_initiate_checkout` dataLayer event and redirects to `checkout.html` with correct URL search parameters (including `ref=TESTREF`, `event_id`, `cta`, and any UTMs).
  * Passing `?test_event_code=TEST_CAPI` persists the test event code in `sessionStorage` and correctly forwards it to the checkout page URL.
* Open `http://localhost:8080/lpv2` and verify the old landing page loads and its asset links remain unbroken.
