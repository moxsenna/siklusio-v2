# Landing Page Tracking Alignment and lpv2 Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the old landing page to `lpv2.html`, copy and update the new landing page `index2.html` to `index.html` with correct Google Tag Manager (GTM), Meta Pixel, Conversions API, and referral/attribution forwarding configurations, and verify the changes locally.

**Architecture:** Rename file `index.html` to `lpv2.html` to serve it on the `/lpv2` routing path. Create the new homepage by copying `index2.html` to `index.html` and modifying its tracking script block to support referral persistence (cookies & localStorage), GTM ID config, CAPI parameters forwarding, and testing redirects.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript, Google Tag Manager, Meta Pixel, Conversions API.

---

### Task 1: Preserve Old Homepage as lpv2
**Files:**
- Create/Rename: `landing/lpv2.html`
- Delete: `landing/index.html`

- [ ] **Step 1: Rename the old landing page file**
  Run: `git mv landing/index.html landing/lpv2.html`
  Expected: File renamed in git and local filesystem successfully.

- [ ] **Step 2: Commit file rename**
  Run: `git commit -m "chore: rename old index.html to lpv2.html"`
  Expected: Commit succeeds.

---

### Task 2: Configure GTM and Meta Pixel tracking in index2.html
**Files:**
- Modify: `landing/index2.html`

- [ ] **Step 1: Update tracking configuration script and noscript iframe**
  Change the GTM container ID from `GTM-XXXXXXX` to `GTM-PX5J3XBM` in both the script configuration block and the GTM `<noscript>` fallback iframe. Ensure that `directMetaPixelEnabled` is set to `false`.

  Specifically, replace:
  ```html
    <!-- GTM: ganti GTM-XXXXXXX dengan container ID Siklusio. DataLayer events sudah dikirim dari script bawah. -->
    <script>
      window.dataLayer = window.dataLayer || [];
      window.siklusioTrackingConfig = {
        gtmId: 'GTM-XXXXXXX',
        metaPixelId: 'YOUR_META_PIXEL_ID',
        directMetaPixelEnabled: false, // true hanya jika Pixel TIDAK ditembak dari GTM agar tidak double-count.
        checkoutUrl: './checkout.html',
        loginUrl: 'https://app.siklusio.web.id/auth'
      };
    </script>
    <script>
      (function(w,d,s,l,i){
        if (!i || i === 'GTM-XXXXXXX') return;
        w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
        var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
        j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
        f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer',window.siklusioTrackingConfig.gtmId);
    </script>
  ```
  And:
  ```html
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  ```
  With:
  ```html
    <!-- GTM: GTM-PX5J3XBM. DataLayer events sudah dikirim dari script bawah. -->
    <script>
      window.dataLayer = window.dataLayer || [];
      window.siklusioTrackingConfig = {
        gtmId: 'GTM-PX5J3XBM',
        metaPixelId: '',
        directMetaPixelEnabled: false, // true hanya jika Pixel TIDAK ditembak dari GTM agar tidak double-count.
        checkoutUrl: './checkout.html',
        loginUrl: 'https://app.siklusio.web.id/auth'
      };
    </script>
    <script>
      (function(w,d,s,l,i){
        if (!i || i === 'GTM-XXXXXXX') return;
        w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});
        var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
        j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
        f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer',window.siklusioTrackingConfig.gtmId);
    </script>
  ```
  And:
  ```html
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PX5J3XBM" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
  ```

- [ ] **Step 2: Commit GTM configuration**
  Run: `git commit -am "feat: update index2.html GTM ID configuration"`
  Expected: Commit succeeds.

---

### Task 3: Add Referral Badges, Styles, and Persistence to index2.html
**Files:**
- Modify: `landing/index2.html`

- [ ] **Step 1: Add ref-badge CSS styles**
  Insert the `.ref-badge` styles inside the `<style>` block in `<head>`.
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

- [ ] **Step 2: Add hero-ref-badge container to Hero markup**
  Add the badge container in the hero section below the CTA action group:
  ```html
            <div class="hero-actions">
              <a class="btn btn-primary cta-checkout" href="./checkout.html" data-cta-location="hero_primary">Aktifkan Premium Lifetime — Rp37.000</a>
              <a class="btn btn-secondary" href="#fitur" data-track="hero_view_features">Lihat Isi Aplikasinya Dulu ↓</a>
            </div>
            <div id="hero-ref-badge" class="ref-badge" style="display: none;"></div>
  ```

- [ ] **Step 3: Update tracking script to support referral persistence, CAPI parameter persistence, badges, and forwarding**
  Rewrite the tracking script at the bottom of the file (lines 255-347) to:
  1. Parse referral parameter (`ref`/`affiliate`/`kode`) and CAPI parameters (`test_event_code`/`test_secret`).
  2. Save referral to `localStorage.setItem('siklusio_ref_code', ...)` and cookie `siklusio_ref`.
  3. Save CAPI parameter to `sessionStorage`.
  4. Display `hero-ref-badge` and `pricing-ref-badge` when referral code exists.
  5. Intercept `.cta-checkout` click to forward all required query params (`ref`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid`, `event_id`, `lead_event_id`, `cta`, `test_event_code`, `test_secret`).

  Specifically, replace the bottom script block with the following updated code:
  ```html
    <script>
      (function(){
        var cfg = window.siklusioTrackingConfig || {};
        var dl = window.dataLayer = window.dataLayer || [];

        function uuid(){
          if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
          return 'evt_' + Date.now() + '_' + Math.random().toString(16).slice(2);
        }
        function getCookie(name){
          var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
          return match ? decodeURIComponent(match[2]) : '';
        }
        function setCookie(name, value, days){
          var maxAge = days * 24 * 60 * 60;
          document.cookie = name + '=' + encodeURIComponent(value) + '; path=/; max-age=' + maxAge + '; SameSite=Lax';
        }
        function getOrCreateVisitorId(){
          var key = 'siklusio_visitor_id';
          var id = localStorage.getItem(key);
          if (!id) { id = uuid(); localStorage.setItem(key, id); }
          return id;
        }

        // Persist referral to localStorage and Cookie
        function persistReferral(){
          var params = new URLSearchParams(window.location.search);
          var ref = params.get('ref') || params.get('affiliate') || params.get('kode');
          if (ref && ref.trim()) {
            var upperRef = ref.trim().toUpperCase();
            localStorage.setItem('siklusio_ref_code', upperRef);
            setCookie('siklusio_ref', upperRef, 30);
            dl.push({
              event: 'referral_detected_lp',
              referral_code: upperRef
            });
            console.log('--> Referral detected & persisted:', upperRef);
          }
        }

        // Persist Meta CAPI Test Parameters to sessionStorage
        function persistTestParameters(){
          var params = new URLSearchParams(window.location.search);
          var testCode = params.get('test_event_code');
          var testSecret = params.get('test_secret');
          if (testCode) {
            sessionStorage.setItem('siklusio_test_event_code', testCode);
          }
          if (testSecret) {
            sessionStorage.setItem('siklusio_test_secret', testSecret);
          }
        }

        // Display referral badges on LP
        function displayReferralBadges(){
          var finalRef = localStorage.getItem('siklusio_ref_code');
          var normalizedRef = finalRef ? finalRef.trim().toUpperCase() : '';
          if (normalizedRef) {
            var heroBadge = document.getElementById('hero-ref-badge');
            var pricingBadge = document.getElementById('pricing-ref-badge');
            if (heroBadge) {
              heroBadge.textContent = '🌸 Direkomendasikan oleh ' + normalizedRef;
              heroBadge.style.display = 'inline-flex';
            }
            if (pricingBadge) {
              pricingBadge.textContent = '🌸 Direkomendasikan oleh ' + normalizedRef;
              pricingBadge.style.display = 'inline-flex';
            }
          }
        }

        function basePayload(extra){
          var params = new URLSearchParams(window.location.search);
          return Object.assign({
            page_title: document.title,
            page_url: window.location.href,
            landing_path: window.location.pathname,
            visitor_id: getOrCreateVisitorId(),
            ref_code: localStorage.getItem('siklusio_ref_code') || getCookie('siklusio_ref') || '',
            utm_source: params.get('utm_source') || '',
            utm_medium: params.get('utm_medium') || '',
            utm_campaign: params.get('utm_campaign') || '',
            utm_content: params.get('utm_content') || '',
            utm_term: params.get('utm_term') || '',
            value: 37000,
            currency: 'IDR'
          }, extra || {});
        }

        function track(eventName, payload){
          var data = basePayload(payload);
          dl.push(Object.assign({ event: eventName }, data));
          if (window.fbq) {
            if (eventName === 'siklusio_view_content') fbq('track', 'ViewContent', data, { eventID: data.event_id });
            if (eventName === 'siklusio_initiate_checkout') fbq('track', 'InitiateCheckout', data, { eventID: data.event_id });
            if (eventName === 'siklusio_lead') fbq('track', 'Lead', data, { eventID: data.event_id });
          }
        }

        function appendCheckoutParams(url, eventId, ctaLocation){
          var target = new URL(url, window.location.href);
          var current = new URLSearchParams(window.location.search);
          
          // Forward UTM params
          ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'].forEach(function(k){
            var v = current.get(k) || (k === 'fbclid' ? sessionStorage.getItem('siklusio_fbclid') : '');
            if (v) target.searchParams.set(k, v);
          });

          // Forward Referral
          var ref = localStorage.getItem('siklusio_ref_code') || getCookie('siklusio_ref');
          if (ref) target.searchParams.set('ref', ref);

          // Forward Meta CAPI test params
          var testCode = current.get('test_event_code') || sessionStorage.getItem('siklusio_test_event_code');
          if (testCode) target.searchParams.set('test_event_code', testCode);

          var testSecret = current.get('test_secret') || sessionStorage.getItem('siklusio_test_secret');
          if (testSecret) target.searchParams.set('test_secret', testSecret);

          target.searchParams.set('event_id', eventId);
          target.searchParams.set('lead_event_id', eventId); // for consistency with backend
          target.searchParams.set('cta', ctaLocation || 'unknown');
          return target.toString();
        }

        // Persist fbclid if present
        var params = new URLSearchParams(window.location.search);
        var fbclid = params.get('fbclid');
        if (fbclid) {
          sessionStorage.setItem('siklusio_fbclid', fbclid);
        }

        persistReferral();
        persistTestParameters();

        document.addEventListener('DOMContentLoaded', function(){
          displayReferralBadges();
          
          var viewEventId = uuid();
          track('siklusio_view_content', { event_id: viewEventId, content_name: 'Siklusio Landing Page', content_category: 'landing' });

          document.querySelectorAll('[data-track]').forEach(function(el){
            el.addEventListener('click', function(){
              track('siklusio_click', { event_id: uuid(), click_name: el.getAttribute('data-track') || '', click_text: (el.textContent || '').trim().slice(0,80) });
            });
          });

          document.querySelectorAll('.cta-checkout').forEach(function(el){
            el.addEventListener('click', function(e){
              e.preventDefault();
              var eventId = uuid();
              var ctaLocation = el.getAttribute('data-cta-location') || 'unknown';
              track('siklusio_initiate_checkout', {
                event_id: eventId,
                content_name: 'Premium Lifetime Siklusio',
                content_category: 'checkout_intent',
                cta_location: ctaLocation
              });
              setTimeout(function(){ 
                window.location.href = appendCheckoutParams(el.getAttribute('href') || cfg.checkoutUrl || './checkout.html', eventId, ctaLocation); 
              }, 180);
            });
          });
        });
      })();
    </script>
  ```

- [ ] **Step 4: Commit script updates**
  Run: `git commit -am "feat: add referral persistence, badges, and CAPI parameters forwarding to index2.html"`
  Expected: Commit succeeds.

---

### Task 4: Move index2.html to index.html
**Files:**
- Create/Rename: `landing/index.html`
- Delete: `landing/index2.html`

- [ ] **Step 1: Move and rename the file**
  Run: `git mv landing/index2.html landing/index.html`
  Expected: File moved to `landing/index.html` in git and local filesystem.

- [ ] **Step 2: Commit homepage updates**
  Run: `git commit -m "feat: set updated new landing page as main index.html"`
  Expected: Commit succeeds.

---

### Task 5: Verification and Testing
**Files:**
- None (Local manual testing)

- [ ] **Step 1: Run local HTTP server**
  Run: `python3 -m http.server 8080 -d landing` (Wait, on Windows we can run `python -m http.server 8080 -d landing`)
  Expected: Local server runs on port 8080.

- [ ] **Step 2: Verify old LP routing**
  Open: `http://localhost:8080/lpv2.html`
  Verify: Old landing page loads, all images and styling are functional.

- [ ] **Step 3: Verify new LP GTM and Referral badges**
  Open: `http://localhost:8080/?ref=TESTREFERRAL&test_event_code=TESTCODE`
  Verify:
  1. GTM is loaded (check console for any load warnings or use Tag Assistant).
  2. Referral badge appears in the hero and pricing cards: "🌸 Direkomendasikan oleh TESTREFERRAL".
  3. `localStorage.getItem('siklusio_ref_code')` returns `"TESTREFERRAL"`.
  4. `sessionStorage.getItem('siklusio_test_event_code')` returns `"TESTCODE"`.

- [ ] **Step 4: Verify checkout redirect parameters**
  Click a CTA button (e.g. "Aktifkan Premium Lifetime").
  Verify:
  1. dataLayer receives `siklusio_initiate_checkout` event.
  2. The page redirects to `checkout.html?utm_source=...&ref=TESTREFERRAL&test_event_code=TESTCODE&event_id=...&lead_event_id=...&cta=hero_primary`.
  3. No `test_secret` or credentials appear in dataLayer or logs.
