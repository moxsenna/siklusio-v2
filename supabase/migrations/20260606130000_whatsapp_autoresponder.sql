create type public.whatsapp_autoresponder_event as enum (
  'registration_completed',
  'payment_completed'
);

create type public.whatsapp_autoresponder_log_status as enum (
  'pending',
  'sent',
  'failed',
  'skipped'
);

create table if not exists public.whatsapp_autoresponder_settings (
  id uuid primary key default gen_random_uuid(),
  event_key public.whatsapp_autoresponder_event not null unique,
  title text not null,
  description text,
  is_enabled boolean not null default false,
  message_template text not null,
  send_delay_seconds integer not null default 0 check (send_delay_seconds >= 0 and send_delay_seconds <= 86400),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_template_length_check check (char_length(message_template) between 20 and 60000)
);

create table if not exists public.whatsapp_autoresponder_logs (
  id uuid primary key default gen_random_uuid(),
  event_key public.whatsapp_autoresponder_event not null,
  recipient_whatsapp text not null,
  recipient_name text,
  rendered_message text not null,
  status public.whatsapp_autoresponder_log_status not null default 'pending',
  provider text not null default 'fonnte',
  provider_request_id text,
  provider_message_id text,
  provider_response jsonb,
  error_message text,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists whatsapp_autoresponder_logs_created_idx
  on public.whatsapp_autoresponder_logs(created_at desc);

create index if not exists whatsapp_autoresponder_logs_event_created_idx
  on public.whatsapp_autoresponder_logs(event_key, created_at desc);

create index if not exists whatsapp_autoresponder_logs_status_created_idx
  on public.whatsapp_autoresponder_logs(status, created_at desc);

alter table public.whatsapp_autoresponder_settings enable row level security;
alter table public.whatsapp_autoresponder_logs enable row level security;

create policy "Admin can read whatsapp autoresponder settings"
on public.whatsapp_autoresponder_settings
for select
to authenticated
using (public.is_admin(auth.uid()));

create policy "Admin can manage whatsapp autoresponder settings"
on public.whatsapp_autoresponder_settings
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "Admin can read whatsapp autoresponder logs"
on public.whatsapp_autoresponder_logs
for select
to authenticated
using (public.is_admin(auth.uid()));

create policy "Service role can manage whatsapp autoresponder logs"
on public.whatsapp_autoresponder_logs
for all
to service_role
using (true)
with check (true);

create or replace function public.set_whatsapp_autoresponder_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_whatsapp_autoresponder_settings_updated_at
on public.whatsapp_autoresponder_settings;

create trigger trg_whatsapp_autoresponder_settings_updated_at
before update on public.whatsapp_autoresponder_settings
for each row
execute function public.set_whatsapp_autoresponder_updated_at();

drop trigger if exists trg_whatsapp_autoresponder_logs_updated_at
on public.whatsapp_autoresponder_logs;

create trigger trg_whatsapp_autoresponder_logs_updated_at
before update on public.whatsapp_autoresponder_logs
for each row
execute function public.set_whatsapp_autoresponder_updated_at();

insert into public.whatsapp_autoresponder_settings (
  event_key,
  title,
  description,
  is_enabled,
  message_template
)
values
(
  'registration_completed',
  'Setelah User Isi Data',
  'Dikirim setelah Bunda selesai mengisi form registrasi dan link pembayaran berhasil dibuat.',
  false,
  'Assalamu’alaikum Bunda {{nama}} 🌸

Terima kasih sudah daftar di Siklusio.

Ini link pembayaran Bunda:
{{link_pembayaran}}

Setelah pembayaran selesai, akses Siklusio akan aktif otomatis.

Siklusio — Promil lebih terarah, suami lebih paham, hati lebih tenang.'
),
(
  'payment_completed',
  'Setelah Pembayaran Berhasil',
  'Dikirim setelah pembayaran premium berhasil dikonfirmasi oleh Mayar/webhook.',
  false,
  'Alhamdulillah, pembayaran Bunda {{nama}} sudah berhasil 🌸

Akses Siklusio Premium Lifetime sudah aktif.

Bunda bisa login di sini:
{{link_login}}

Semoga Siklusio bisa menemani perjalanan promil Bunda dengan lebih tenang dan terarah 💖'
)
on conflict (event_key) do nothing;
