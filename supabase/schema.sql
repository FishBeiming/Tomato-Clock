create table if not exists public.tomato_clock_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  timer jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.tomato_clock_profiles enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tomato_clock_profiles_updated_at on public.tomato_clock_profiles;

create trigger set_tomato_clock_profiles_updated_at
before update on public.tomato_clock_profiles
for each row
execute function public.set_updated_at();

drop policy if exists "Users can read their tomato clock profile"
on public.tomato_clock_profiles;

create policy "Users can read their tomato clock profile"
on public.tomato_clock_profiles
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their tomato clock profile"
on public.tomato_clock_profiles;

create policy "Users can insert their tomato clock profile"
on public.tomato_clock_profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their tomato clock profile"
on public.tomato_clock_profiles;

create policy "Users can update their tomato clock profile"
on public.tomato_clock_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their tomato clock profile"
on public.tomato_clock_profiles;

create policy "Users can delete their tomato clock profile"
on public.tomato_clock_profiles
for delete
using (auth.uid() = user_id);
