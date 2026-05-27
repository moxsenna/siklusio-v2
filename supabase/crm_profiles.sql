-- ============================================================
-- Admin CRM profile export RPC
-- Run AFTER schema.sql, community.sql, community_admin.sql, and community_avatar.sql
-- ============================================================
--
-- Why a view/RPC instead of adding email to public.profiles?
-- - Supabase stores login email in auth.users, not public.profiles.
-- - auth.users contains sensitive auth data and should only be exposed to admins.
-- - This keeps the CRM column order stable without recreating the table.

CREATE OR REPLACE VIEW public.crm_profiles AS
  SELECT
    u.email::TEXT AS email,
    p.name,
    p.nickname,
    p.whatsapp_number,
    p.id AS user_id,
    p.created_at AS registered_at,
    u.last_sign_in_at,
    u.email_confirmed_at,
    p.birth_date,
    EXTRACT(YEAR FROM age(CURRENT_DATE, p.birth_date))::INTEGER AS age_years,
    p.children_count,
    p.last_period_date,
    p.cycle_length,
    p.period_length,
    p.husband_name,
    p.husband_nickname,
    p.husband_number,
    p.target_saving,
    p.current_saving,
    p.is_admin,
    p.avatar_kind,
    p.avatar_url,
    p.updated_at AS profile_updated_at
  FROM public.profiles p
  INNER JOIN auth.users u
    ON u.id = p.id;

REVOKE ALL ON public.crm_profiles FROM anon, authenticated;
GRANT SELECT ON public.crm_profiles TO service_role;

COMMENT ON VIEW public.crm_profiles
  IS 'CRM export view of profiles joined with auth.users email. Not granted to anon/authenticated clients.';

CREATE OR REPLACE FUNCTION public.admin_get_crm_profiles()
RETURNS TABLE (
  email TEXT,
  name TEXT,
  nickname TEXT,
  whatsapp_number TEXT,
  user_id UUID,
  registered_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ,
  birth_date DATE,
  age_years INTEGER,
  children_count TEXT,
  last_period_date DATE,
  cycle_length INTEGER,
  period_length INTEGER,
  husband_name TEXT,
  husband_nickname TEXT,
  husband_number TEXT,
  target_saving NUMERIC,
  current_saving NUMERIC,
  is_admin BOOLEAN,
  avatar_kind TEXT,
  avatar_url TEXT,
  profile_updated_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.email,
    c.name,
    c.nickname,
    c.whatsapp_number,
    c.user_id,
    c.registered_at,
    c.last_sign_in_at,
    c.email_confirmed_at,
    c.birth_date,
    c.age_years,
    c.children_count,
    c.last_period_date,
    c.cycle_length,
    c.period_length,
    c.husband_name,
    c.husband_nickname,
    c.husband_number,
    c.target_saving,
    c.current_saving,
    c.is_admin,
    c.avatar_kind,
    c.avatar_url,
    c.profile_updated_at
  FROM public.crm_profiles c
  WHERE auth.uid() IS NOT NULL
    AND public.is_admin(auth.uid())
  ORDER BY c.registered_at DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_get_crm_profiles() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_get_crm_profiles() TO authenticated;

COMMENT ON FUNCTION public.admin_get_crm_profiles()
  IS 'Admin-only CRM export of profiles joined with auth.users email, ordered from most useful CRM fields left to right.';
