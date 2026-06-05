# Instruksi untuk Antigravity — Replace Landing Siklusio

Tujuan: gunakan file `landing/index2.html` ini sebagai versi baru landing page Siklusio yang lebih conversion-focused, dengan GTM + Meta Pixel tracking support.

## 1. Copy file
- Replace file lama: `landing/index2.html`
- Copy asset logo: `landing/logo-siklusio.png`

## 2. Wajib ganti placeholder tracking
Di bagian `<head>` file `landing/index2.html`, ganti:

```js
gtmId: 'GTM-XXXXXXX',
metaPixelId: 'YOUR_META_PIXEL_ID',
directMetaPixelEnabled: false,
```

Rekomendasi setup:
- Jika Meta Pixel sudah ditembak dari GTM, biarkan `directMetaPixelEnabled: false` agar tidak double-count.
- Jika belum memakai tag Pixel di GTM dan ingin direct Pixel dari halaman, isi `metaPixelId` lalu set `directMetaPixelEnabled: true`.

## 3. DataLayer events yang sudah tersedia
Landing mengirim event berikut:

### ViewContent
Event dataLayer:
```js
siklusio_view_content
```
Dikirim saat halaman dimuat.

### InitiateCheckout
Event dataLayer:
```js
siklusio_initiate_checkout
```
Dikirim saat user klik CTA checkout. Payload menyertakan:
- `event_id`
- `value: 37000`
- `currency: IDR`
- `cta_location`
- UTM params
- `ref_code`
- `visitor_id`

Event ID juga diteruskan ke checkout URL sebagai query param:
```text
?event_id=...&cta=...
```
Ini bisa dipakai untuk deduplication dengan CAPI jika checkout/backend meneruskannya.

### Generic click
Event dataLayer:
```js
siklusio_click
```
Untuk klik navigasi dan login.

## 4. GTM trigger yang perlu dibuat
Di Google Tag Manager:

1. Custom Event Trigger: `siklusio_view_content`
   - Tag Meta Pixel: `ViewContent`

2. Custom Event Trigger: `siklusio_initiate_checkout`
   - Tag Meta Pixel: `InitiateCheckout`
   - Gunakan `event_id` dari DataLayer Variable untuk dedup.

3. Optional Custom Event Trigger: `siklusio_click`
   - Bisa untuk GA4/debug, tidak wajib untuk Meta.

## 5. Validasi teknis
Jalankan pengecekan:

```bash
# dari root repo
python3 -m http.server 8080 -d landing
```

Buka:
```text
http://localhost:8080
```

Cek:
- halaman responsive mobile
- semua CTA mengarah ke `checkout.html`
- query param `event_id`, `cta`, UTM, dan `ref` ikut terbawa
- dataLayer berisi `siklusio_view_content` saat page load
- dataLayer berisi `siklusio_initiate_checkout` saat klik CTA

## 6. Jangan lupa
- Pastikan `checkout.html` bisa menerima `event_id` dari query param dan meneruskannya ke backend/Lead flow bila diperlukan.
- Jika Pixel fired via GTM, jangan aktifkan direct Meta Pixel di HTML.
