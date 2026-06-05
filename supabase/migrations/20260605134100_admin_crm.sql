-- Admin CRM for lead, payment follow-up, manual payment override, and audit trail.
-- This migration is additive only. It does not alter existing checkout/webhook behavior.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'admin_crm_lead_status') then
    create type public.admin_crm_lead_status as enum (
      'new_lead',
      'contacted',
      'interested',
      'checkout_started',
      'pending_payment',
      'paid',
      'onboarded',
      'no_response',
      'not_interested'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'admin_crm_payment_status') then
    create type public.admin_crm_payment_status as enum (
      'new',
      'checkout_started',
      'pending_payment',
      'paid',
      'paid_manual',
      'failed',
      'cancelled',
      'refunded'
    );
  end if;
end $$;

create table if not exists public.admin_crm_leads (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id) on delete set null,
  pending_registration_id uuid null,

  name text null,
  email text null,
  whatsapp text null,

  source text not null default 'unknown',
  referral_code text null,
  affiliate_code text null,

  lead_status public.admin_crm_lead_status not null default 'new_lead',
  payment_status public.admin_crm_payment_status not null default 'new',

  checkout_url text null,
  mayar_payment_id text null,
  mayar_transaction_id text null,
  manual_payment_reference text null,

  amount integer null,
  currency text not null default 'IDR',

  last_contacted_at timestamptz null,
  next_followup_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(email, mayar_payment_id)
);

create table if not exists public.admin_crm_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.admin_crm_leads(id) on delete cascade,
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_crm_payment_overrides (
  id uuid primary key default gen_random_uuid(),

  lead_id uuid not null references public.admin_crm_leads(id) on delete cascade,
  admin_user_id uuid not null references auth.users(id) on delete restrict,

  old_payment_status public.admin_crm_payment_status null,
  new_payment_status public.admin_crm_payment_status not null,

  reason text not null,
  reference text null,
  amount integer null,

  should_activate_user boolean not null default false,
  activated_user_id uuid references auth.users(id) on delete set null,

  idempotency_key text unique not null,

  created_at timestamptz not null default now()
);

create table if not exists public.admin_crm_audit_logs (
  id uuid primary key default gen_random_uuid(),

  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid null,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_crm_leads_email
  on public.admin_crm_leads (lower(email));

create index if not exists idx_admin_crm_leads_payment_status
  on public.admin_crm_leads (payment_status);

create index if not exists idx_admin_crm_leads_lead_status
  on public.admin_crm_leads (lead_status);

create index if not exists idx_admin_crm_leads_next_followup_at
  on public.admin_crm_leads (next_followup_at);

create index if not exists idx_admin_crm_notes_lead_id_created_at
  on public.admin_crm_notes (lead_id, created_at desc);

create index if not exists idx_admin_crm_payment_overrides_lead_id_created_at
  on public.admin_crm_payment_overrides (lead_id, created_at desc);

alter table public.admin_crm_leads enable row level security;
alter table public.admin_crm_notes enable row level security;
alter table public.admin_crm_payment_overrides enable row level security;
alter table public.admin_crm_audit_logs enable row level security;

-- Leads policies
drop policy if exists "Admins can read crm leads" on public.admin_crm_leads;
create policy "Admins can read crm leads"
on public.admin_crm_leads
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
);

drop policy if exists "Admins can manage crm leads" on public.admin_crm_leads;
create policy "Admins can manage crm leads"
on public.admin_crm_leads
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
);

-- Notes policies
drop policy if exists "Admins can manage crm notes" on public.admin_crm_notes;
create policy "Admins can manage crm notes"
on public.admin_crm_notes
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
);

-- Overrides policies
drop policy if exists "Admins can manage payment overrides" on public.admin_crm_payment_overrides;
create policy "Admins can manage payment overrides"
on public.admin_crm_payment_overrides
for all
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
);

-- Audit logs policies
drop policy if exists "Admins can read audit logs" on public.admin_crm_audit_logs;
create policy "Admins can read audit logs"
on public.admin_crm_audit_logs
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
);

drop policy if exists "Admins can insert audit logs" on public.admin_crm_audit_logs;
create policy "Admins can insert audit logs"
on public.admin_crm_audit_logs
for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_admin = true
  )
);

create or replace function public.set_admin_crm_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_admin_crm_leads_updated_at on public.admin_crm_leads;
create trigger set_admin_crm_leads_updated_at
before update on public.admin_crm_leads
for each row
execute function public.set_admin_crm_updated_at();
