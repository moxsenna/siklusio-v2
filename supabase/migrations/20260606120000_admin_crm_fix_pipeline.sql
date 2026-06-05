-- Admin CRM hardening: lookup indexes, backfill-safe unique constraints, and RPC helpers.
-- Additive only. Safe to run after 20260605134100_admin_crm.sql.

-- Ensure enums contain required values
alter type public.admin_crm_lead_status add value if not exists 'checkout_started';
alter type public.admin_crm_payment_status add value if not exists 'pending_payment';
alter type public.admin_crm_payment_status add value if not exists 'paid';
alter type public.admin_crm_payment_status add value if not exists 'paid_manual';
alter type public.admin_crm_payment_status add value if not exists 'failed';
alter type public.admin_crm_payment_status add value if not exists 'cancelled';

-- Create partial unique indexes (never unique on lower(email) murni)
create unique index if not exists idx_admin_crm_leads_unique_user_id
  on public.admin_crm_leads (user_id)
  where user_id is not null;

create unique index if not exists idx_admin_crm_leads_unique_mayar_transaction
  on public.admin_crm_leads (mayar_transaction_id)
  where mayar_transaction_id is not null;

create index if not exists idx_admin_crm_leads_created_at
  on public.admin_crm_leads (created_at desc);

create index if not exists idx_admin_crm_leads_status_created_at
  on public.admin_crm_leads (payment_status, lead_status, created_at desc);

create or replace function public.admin_crm_upsert_lead(
  p_user_id uuid default null,
  p_pending_registration_id uuid default null,
  p_name text default null,
  p_email text default null,
  p_whatsapp text default null,
  p_source text default 'checkout',
  p_referral_code text default null,
  p_affiliate_code text default null,
  p_lead_status public.admin_crm_lead_status default 'checkout_started',
  p_payment_status public.admin_crm_payment_status default 'pending_payment',
  p_checkout_url text default null,
  p_mayar_payment_id text default null,
  p_mayar_transaction_id text default null,
  p_amount integer default null,
  p_currency text default 'IDR'
)
returns public.admin_crm_leads
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := nullif(lower(trim(p_email)), '');
  v_row public.admin_crm_leads;
begin
  if v_email is null and p_user_id is null and p_mayar_transaction_id is null then
    raise exception 'email, user_id, or mayar_transaction_id is required';
  end if;

  -- 1. Match by user_id first
  if p_user_id is not null then
    select * into v_row
    from public.admin_crm_leads l
    where l.user_id = p_user_id
    order by l.created_at desc
    limit 1;
  end if;

  -- 2. Match by mayar_transaction_id second
  if v_row.id is null and p_mayar_transaction_id is not null then
    select * into v_row
    from public.admin_crm_leads l
    where l.mayar_transaction_id = p_mayar_transaction_id
    order by l.created_at desc
    limit 1;
  end if;

  -- 3. Match by lower(email) latest fallback
  if v_row.id is null and v_email is not null then
    select * into v_row
    from public.admin_crm_leads l
    where lower(l.email) = v_email
    order by l.created_at desc
    limit 1;
  end if;

  if v_row.id is not null then
    update public.admin_crm_leads
    set
      user_id = coalesce(p_user_id, user_id),
      pending_registration_id = coalesce(p_pending_registration_id, pending_registration_id),
      name = coalesce(nullif(trim(p_name), ''), name),
      email = coalesce(v_email, email),
      whatsapp = coalesce(nullif(trim(p_whatsapp), ''), whatsapp),
      source = coalesce(nullif(trim(p_source), ''), source),
      referral_code = coalesce(nullif(trim(p_referral_code), ''), referral_code),
      affiliate_code = coalesce(nullif(trim(p_affiliate_code), ''), affiliate_code),
      lead_status = coalesce(p_lead_status, lead_status),
      payment_status = coalesce(p_payment_status, payment_status),
      checkout_url = coalesce(nullif(trim(p_checkout_url), ''), checkout_url),
      mayar_payment_id = coalesce(nullif(trim(p_mayar_payment_id), ''), mayar_payment_id),
      mayar_transaction_id = coalesce(nullif(trim(p_mayar_transaction_id), ''), mayar_transaction_id),
      amount = coalesce(p_amount, amount),
      currency = coalesce(nullif(trim(p_currency), ''), currency),
      updated_at = now()
    where id = v_row.id
    returning * into v_row;

    return v_row;
  end if;

  insert into public.admin_crm_leads (
    user_id,
    pending_registration_id,
    name,
    email,
    whatsapp,
    source,
    referral_code,
    affiliate_code,
    lead_status,
    payment_status,
    checkout_url,
    mayar_payment_id,
    mayar_transaction_id,
    amount,
    currency
  ) values (
    p_user_id,
    p_pending_registration_id,
    nullif(trim(p_name), ''),
    v_email,
    nullif(trim(p_whatsapp), ''),
    coalesce(nullif(trim(p_source), ''), 'checkout'),
    nullif(trim(p_referral_code), ''),
    nullif(trim(p_affiliate_code), ''),
    p_lead_status,
    p_payment_status,
    nullif(trim(p_checkout_url), ''),
    nullif(trim(p_mayar_payment_id), ''),
    nullif(trim(p_mayar_transaction_id), ''),
    p_amount,
    coalesce(nullif(trim(p_currency), ''), 'IDR')
  ) returning * into v_row;

  return v_row;
end;
$$;

-- Restrict RPC to service_role only
revoke all on function public.admin_crm_upsert_lead(
  uuid, uuid, text, text, text, text, text, text,
  public.admin_crm_lead_status, public.admin_crm_payment_status,
  text, text, text, integer, text
) from public, anon, authenticated;

grant execute on function public.admin_crm_upsert_lead(
  uuid, uuid, text, text, text, text, text, text,
  public.admin_crm_lead_status, public.admin_crm_payment_status,
  text, text, text, integer, text
) to service_role;
