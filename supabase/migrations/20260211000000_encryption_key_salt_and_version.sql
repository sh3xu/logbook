-- Migration: encryption key verification (key_hash_salt) + entry encryption_version
-- Run this in Supabase SQL Editor or via supabase db push

-- ===============================
-- PROFILES: key verification salt
-- ===============================
alter table public.profiles
  add column if not exists key_hash_salt text;

-- ===============================
-- ENTRIES: encryption format version
-- ===============================
alter table public.entries
  add column if not exists encryption_version smallint default null;

-- ===============================
-- HANDLE NEW USER: persist key_hash_salt on signup
-- ===============================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (
    id,
    username,
    full_name,
    email,
    key_hash,
    key_hash_salt
  )
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'key_hash',
    new.raw_user_meta_data->>'key_hash_salt'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
