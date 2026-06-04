# Setup Akun Admin

Akun admin pakai Supabase Auth biasa, lalu kita flag `is_admin = true` di tabel `profiles`.

## Kredensial yang dibuat

```
Email    : admin@siklusio.local
Password : 123456
```

> Catatan: Supabase Auth butuh format email dan password minimal 6 karakter. Saya pakai
> `admin@siklusio.local` (TLD `.local` tidak akan dikirimi email asli — aman). Ganti
> password ini segera setelah deploy ke produksi.

## Langkah 1 — Buat akun di Supabase Dashboard

1. Buka **Authentication → Users → Add user → Create new user**
2. Isi:
   - Email: `admin@siklusio.local`
   - Password: `123456`
   - Centang **Auto Confirm User** (penting, supaya tidak perlu klik link verifikasi)
3. Klik **Create user**
4. Copy **User UID** dari row yang baru dibuat (format: `xxxxxxxx-xxxx-...`)

## Langkah 2 — Tandai sebagai admin

Buka **SQL Editor** dan jalankan (ganti `<USER_UID>` dengan UID dari langkah 1):

```sql
-- Pastikan profile-nya ada (trigger handle_new_user biasanya sudah membuatnya,
-- tapi kita amankan dengan UPSERT)
INSERT INTO public.profiles (id, name, nickname, is_admin)
VALUES ('<USER_UID>', 'Admin', 'Admin', TRUE)
ON CONFLICT (id) DO UPDATE SET is_admin = TRUE;
```

Verifikasi:

```sql
SELECT id, name, nickname, is_admin
FROM public.profiles
WHERE is_admin = TRUE;
```

Harus muncul 1 baris dengan `is_admin = true`.

## Langkah 3 — Login

Setelah deploy:

- Buka aplikasi → login dengan `admin@siklusio.local` / `123456`
- Akses `/admin` (akan dicek oleh frontend, hanya admin yang lolos)
- Backend `/api/admin/users` juga akan menolak non-admin

## Mau jadikan akun lain admin?

```sql
-- Cari user UID berdasarkan email
SELECT u.id, u.email, p.is_admin
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'email-target@example.com';

-- Promote
UPDATE public.profiles SET is_admin = TRUE WHERE id = '<USER_UID>';

-- Demote
UPDATE public.profiles SET is_admin = FALSE WHERE id = '<USER_UID>';
```
