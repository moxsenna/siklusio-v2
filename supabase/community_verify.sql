-- ============================================================
-- Verifikasi Skema Community
-- Jalankan di SQL Editor Supabase, blok per blok.
-- Copy hasilnya kalau ada yang aneh.
-- ============================================================

-- 1. Pastikan 4 tabel community ada beserta jumlah kolomnya
SELECT
  table_name,
  COUNT(column_name) AS column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'community_posts',
    'community_comments',
    'community_reactions',
    'community_reports'
  )
GROUP BY table_name
ORDER BY table_name;
-- Expected:
--   community_comments  | 11
--   community_posts     | 15
--   community_reactions | 5
--   community_reports   | 9


-- 2. Pastikan kolom is_admin sudah nempel di profiles
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name = 'is_admin';
-- Expected: 1 row, default false, not null


-- 3. Pastikan RLS aktif di semua tabel community
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'community_%'
ORDER BY tablename;
-- Expected: rowsecurity = true di semua row


-- 4. Pastikan policies terpasang (akan ada banyak baris)
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'community_%'
ORDER BY tablename, cmd, policyname;
-- Expected minimal: posts (5 policies), comments (5), reactions (3), reports (3)


-- 5. Pastikan trigger auto-hide & counter terpasang
SELECT event_object_table AS table_name, trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table LIKE 'community_%'
ORDER BY event_object_table, trigger_name;
-- Expected:
--   community_comments  | trg_community_comments_count   | INSERT/DELETE
--   community_posts     | trg_community_posts_updated_at | UPDATE
--   community_reactions | trg_community_reactions_count  | INSERT/DELETE
--   community_reports   | trg_community_reports_insert   | INSERT


-- 6. Pastikan helper function community aman dan bisa dipanggil
-- (akan return 0 row karena belum ada post, tapi tidak boleh error)
SELECT * FROM public.get_community_feed(10, NULL);
-- Ganti UUID di bawah dengan post_id yang ada untuk menguji komentar.
-- SELECT * FROM public.get_post_comments('00000000-0000-0000-0000-000000000000');


-- 7. Pastikan RPC community berjalan sebagai SECURITY DEFINER dan search_path public
SELECT
  proname,
  prosecdef AS security_definer,
  proconfig AS function_config
FROM pg_proc
JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
WHERE pg_namespace.nspname = 'public'
  AND proname IN (
    'get_community_feed',
    'get_post_comments',
    'admin_get_moderation_queue'
  )
ORDER BY proname;
-- Expected: security_definer = true dan function_config memuat search_path=public


-- 8. Pastikan admin moderation queue bisa dipanggil oleh admin
-- Expected untuk admin: return daftar laporan; untuk non-admin: kosong tanpa data privat.
SELECT * FROM public.admin_get_moderation_queue('pending');


-- 9. Pastikan CHECK constraint length post benar-benar bekerja
-- (HARUS error: "violates check constraint content_length_check")
-- DO $$ BEGIN
--   PERFORM 1;
--   INSERT INTO public.community_posts (user_id, content)
--   VALUES (auth.uid(), repeat('x', 501));
-- EXCEPTION WHEN check_violation THEN
--   RAISE NOTICE 'OK: 501 char rejected';
-- END $$;
-- (uncomment jika ingin test, butuh login user)
