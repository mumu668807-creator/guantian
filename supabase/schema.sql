-- Guantian light auth schema.
-- Run this in Supabase SQL editor after enabling Google and Email OTP providers.

create table if not exists public.guantian_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  last_cast_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.guantian_profiles enable row level security;

drop policy if exists "Users can read their own guantian profile" on public.guantian_profiles;
create policy "Users can read their own guantian profile"
on public.guantian_profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can insert their own guantian profile" on public.guantian_profiles;
create policy "Users can insert their own guantian profile"
on public.guantian_profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update their own guantian profile" on public.guantian_profiles;
create policy "Users can update their own guantian profile"
on public.guantian_profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create or replace function public.claim_daily_cast()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  profile public.guantian_profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.guantian_profiles (id, last_cast_at)
  values (auth.uid(), null)
  on conflict (id) do nothing;

  select *
  into profile
  from public.guantian_profiles
  where id = auth.uid()
  for update;

  if profile.last_cast_at is not null and profile.last_cast_at::date = now()::date then
    return false;
  end if;

  update public.guantian_profiles
  set last_cast_at = now(),
      updated_at = now()
  where id = auth.uid();

  return true;
end;
$$;

grant execute on function public.claim_daily_cast() to authenticated;

-- Guantian reading history.
-- Logged-in users can keep their own recent readings in Supabase.

create table if not exists public.guantian_readings (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null,
  question text not null,
  original_hexagram jsonb not null,
  changed_hexagram jsonb not null,
  moving_lines integer[] not null default '{}',
  interpretation_text text not null,
  lines jsonb not null,
  note text,
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.guantian_readings
add column if not exists note text;

create index if not exists guantian_readings_user_created_at_idx
on public.guantian_readings (user_id, created_at desc);

alter table public.guantian_readings enable row level security;

drop policy if exists "Users can read their own guantian readings" on public.guantian_readings;
create policy "Users can read their own guantian readings"
on public.guantian_readings
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own guantian readings" on public.guantian_readings;
create policy "Users can insert their own guantian readings"
on public.guantian_readings
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own guantian readings" on public.guantian_readings;
create policy "Users can update their own guantian readings"
on public.guantian_readings
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
