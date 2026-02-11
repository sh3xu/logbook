-- ===============================
-- EXTENSIONS
-- ===============================
create extension if not exists "pgcrypto";

-- ===============================
-- 1. PROFILES TABLE
-- ===============================
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  full_name text,
  email text unique,
  avatar_url text,
  bio text,
  key_hash text,
  created_at timestamptz default timezone('utc', now()) not null,
  constraint username_length check (char_length(username) >= 3)
);

-- Ensure columns exist if table was created previously
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists is_admin boolean default false;
alter table public.profiles add column if not exists key_hash_salt text;

-- ===============================
-- 1.1 FEATURE REQUESTS TABLE
-- ===============================
create table if not exists public.feature_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  description text,
  status text check (status in ('pending', 'planned', 'in-progress', 'completed', 'rejected')) default 'pending',
  created_at timestamptz default timezone('utc', now()) not null
);

alter table public.feature_requests enable row level security;

create policy "Everyone can view feature requests"
  on public.feature_requests for select
  using (true);

create policy "Users can insert feature requests"
  on public.feature_requests for insert
  with check (auth.uid() is not null);

create policy "Admins can update feature requests"
  on public.feature_requests for update
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

create policy "Admins can delete feature requests"
  on public.feature_requests for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- ===============================
-- 2. FRIENDS TABLE
-- ===============================
create table if not exists public.friends (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users on delete cascade,
  friend_id uuid not null references auth.users on delete cascade,
  status text check (status in ('pending', 'accepted')) default 'pending',
  created_at timestamptz default timezone('utc', now()) not null,
  unique (user_id, friend_id)
);

-- ===============================
-- 3. NOTIFICATIONS TABLE
-- ===============================
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users on delete cascade,
  message text not null,
  type text not null,
  read boolean default false,
  created_at timestamptz default timezone('utc', now()) not null
);

-- ===============================
-- 4. ENTRIES TABLE
-- ===============================
create table if not exists public.entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users on delete cascade,
  content text not null,
  is_encrypted boolean default true not null,
  encryption_version smallint default null,
  created_at timestamptz default timezone('utc', now()) not null,
  updated_at timestamptz default timezone('utc', now()) not null
);

alter table public.entries add column if not exists encryption_version smallint default null;

-- ===============================
-- ENABLE RLS
-- ===============================
alter table public.profiles enable row level security;
alter table public.friends enable row level security;
alter table public.notifications enable row level security;
alter table public.entries enable row level security;

-- ===============================
-- RLS POLICIES: PROFILES
-- ===============================
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ===============================
-- RLS POLICIES: ENTRIES
-- ===============================
drop policy if exists "Users can view own entries" on public.entries;
create policy "Users can view own entries"
  on public.entries for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own entries" on public.entries;
create policy "Users can insert own entries"
  on public.entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own entries" on public.entries;
create policy "Users can update own entries"
  on public.entries for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own entries" on public.entries;
create policy "Users can delete own entries"
  on public.entries for delete
  using (auth.uid() = user_id);

-- ===============================
-- RLS POLICIES: FRIENDS
-- ===============================
drop policy if exists "Users can view their own friendships" on public.friends;
create policy "Users can view their own friendships"
  on public.friends for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists "Users can manage their own friendships" on public.friends;
create policy "Users can manage their own friendships"
  on public.friends for all
  using (auth.uid() = user_id);

-- ===============================
-- RLS POLICIES: NOTIFICATIONS
-- ===============================
drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- ===============================
-- FUNCTION: HANDLE NEW USER
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

-- ===============================
-- TRIGGER: CREATE PROFILE ON SIGNUP
-- ===============================
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- ===============================
-- 5. SECURE ACCOUNT DELETION
-- ===============================
-- This allows a user to delete their own account from the client via RPC
-- The 'delete cascade' on other tables will handle the rest of the wipe
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;
