# Siklusio Avatar Upload And Moderation Policy

Tanggal audit terakhir: 2026-06-03.

Dokumen ini adalah handoff untuk fitur avatar custom komunitas/admin. Fokusnya menjaga upload avatar aman tanpa menambah image-processing dependency berat ke Cloudflare Worker.

## Runtime Guardrails

Endpoint backend:

```text
POST /api/upload-avatar
```

Guardrail yang aktif:

1. Wajib authenticated user.
2. Payload wajib `base64` string.
3. Estimasi raw bytes maksimal 5 MB.
4. Format yang diterima hanya WebP, PNG, atau JPEG berdasarkan magic bytes.
5. Dimensi gambar harus bisa dibaca dari header ringan.
6. Dimensi maksimal 2048x2048 piksel dan maksimal 4.194.304 piksel.
7. Sebelum upload ke R2, backend menjalankan metadata stripping ringan:
   - PNG: hanya critical chunks disimpan, ancillary chunks seperti `tEXt`, `iTXt`, `zTXt`, dan `eXIf` dibuang.
   - JPEG: APP metadata non-JFIF dan COM segments dibuang sebelum scan data disimpan.
   - WebP: `EXIF`, `ICCP`, dan `XMP ` chunks dibuang; VP8X metadata flags dibersihkan.

## Why Not Full Re-Encode In Worker Yet

Cloudflare Worker saat ini tidak memakai native image library seperti Sharp. Menambahkan re-encode penuh ke Worker bisa menaikkan bundle size, cold-start, dan risiko compatibility. Karena itu Phase 29 mengambil jalur yang aman untuk produksi sekarang:

1. Tolak upload yang tidak punya dimensi valid.
2. Batasi dimensi dan ukuran file.
3. Strip metadata chunks yang bisa dibuang tanpa decode penuh.
4. Pertahankan admin moderation reset untuk kasus avatar yang lolos teknis tapi melanggar kebijakan konten.

Jika nanti Siklusio membutuhkan normalisasi visual penuh, pilihan yang lebih tepat adalah Cloudflare Images, queue-based image pipeline, atau service khusus yang melakukan re-encode ke WebP/AVIF ukuran tetap.

## Moderation Workflow

Fitur admin yang sudah tersedia:

```text
admin_reset_user_avatar(user_id uuid)
```

Behavior:

1. Hanya admin yang bisa memanggil RPC dari layar admin.
2. RPC menghapus `profiles.avatar_url` dan `profiles.avatar_kind` untuk user target.
3. Setelah reset, UI kembali memakai avatar default/preset.

Kebijakan operasional:

1. Avatar custom yang mengandung wajah anak, dokumen identitas, teks ofensif, pornografi, kekerasan, atau informasi pribadi sebaiknya di-reset.
2. Jika avatar melanggar karena data sensitif atau harassment, admin sebaiknya juga mencatat konteksnya di moderation queue internal sebelum reset.
3. Jangan expose direct R2 delete ke client. Cleanup object lama bisa jadi job backend terpisah nanti.

## Verification

Commands:

```powershell
node --import tsx backend/storage/avatarImage.test.ts
node --import tsx backend/avatarUpload.test.ts
npm run check
```

Expected:

1. Non-image base64 ditolak sebelum R2.
2. Oversized avatar dimensions ditolak sebelum R2.
3. PNG/JPEG dimensions terbaca.
4. PNG metadata ancillary chunks ter-strip.
