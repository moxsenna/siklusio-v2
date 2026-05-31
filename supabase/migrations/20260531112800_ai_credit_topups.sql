create table if not exists public.ai_credit_topups (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  mayar_link text,
  mayar_transaction_id text unique,
  amount_rp numeric not null,
  credits_amount integer not null,
  status text not null default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  paid_at timestamp with time zone
);

alter table public.ai_credit_topups enable row level security;

create policy "Users can view their own topups"
  on public.ai_credit_topups for select
  using (auth.uid() = user_id);
