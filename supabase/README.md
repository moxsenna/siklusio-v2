# Supabase Folder Contract

Tanggal audit terakhir: 2026-06-02.

## Canonical Path

`migrations/` adalah jalur canonical untuk perubahan schema production baru.

Gunakan:

```powershell
npx supabase migration new <nama_deskriptif>
```

Lalu verifikasi:

```powershell
npm run db:push:dry-run
npm run db:migrations:list
```

Jangan membuat nama migration timestamp manual kecuali sedang memperbaiki histori yang sudah ada dan sudah disetujui.

## Generated Types

`types/database.types.ts` dibuat oleh Supabase CLI:

```powershell
npm run db:types
```

File ini generated. Jangan edit manual.

Saat ini types dibuat dari linked remote project. Karena ada migration lokal yang belum ada di remote, jangan pakai file ini untuk mengetatkan `createClient<Database>()` sampai pending migrations sudah apply atau local database yang sudah lengkap dipakai untuk generate types.

## Legacy Root SQL

File `*.sql` langsung di folder ini adalah legacy/manual reference snippets. Mereka boleh dibaca untuk memahami sejarah fitur, tetapi jangan dijadikan jalur perubahan production baru.

Contoh:

- `schema.sql`: bootstrap/core reference, bukan schema lengkap.
- `community_verify.sql`: diagnostic query, bukan migration DDL.
- `community*.sql`, `affiliates.sql`, `checkout_sessions.sql`, dan file sejenis: reference fitur lama yang harus difold ke migration jika dibutuhkan lagi.

## Safe Commands

```powershell
npm run db:migrations:list
npm run db:push:dry-run
npm run db:lint
npm run db:types
```

`db:push:dry-run` tidak apply migration. Jangan menjalankan `supabase db push` tanpa approval deploy eksplisit.

## Handoff

Baca panduan lengkap di `docs/DATABASE.md` sebelum membuat migration baru, audit RLS, atau mengadopsi generated types ke client app.
