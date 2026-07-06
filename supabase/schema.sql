-- Run this in the Supabase SQL editor for the Sloggers ride tracker.

create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'active' check (status in ('active', 'ended')),
  meeting_label text not null default 'Southam',
  started_at timestamptz not null default now()
);

create table if not exists public.ride_riders (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  name text not null,
  joined_at timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  updated_at timestamptz,
  speed_kmh double precision,
  is_sharing boolean not null default true,
  unique (ride_id, name)
);

create index if not exists rides_status_idx on public.rides (status);
create index if not exists ride_riders_ride_id_idx on public.ride_riders (ride_id);
create unique index if not exists ride_riders_ride_id_name_lower_idx
  on public.ride_riders (ride_id, lower(name));

create table if not exists public.ride_reports (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  rider_id uuid not null references public.ride_riders(id) on delete cascade,
  rider_name text not null,
  report_type text not null check (report_type in ('accident', 'mechanical', 'lost', 'other')),
  message text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

create index if not exists ride_reports_ride_id_idx on public.ride_reports (ride_id);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  password_hash text not null,
  status text not null default 'pending' check (status in ('pending', 'awaiting_activation', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  activation_token text,
  activation_expires_at timestamptz
);

create index if not exists members_status_idx on public.members (status);
create unique index if not exists members_email_lower_idx on public.members (lower(email));
create unique index if not exists members_activation_token_idx
  on public.members (activation_token) where activation_token is not null;

-- Ride data is only accessed from Vercel server functions with the secret/service key.
-- RLS is disabled so inserts/updates are not blocked when using the API key.
alter table public.rides disable row level security;
alter table public.ride_riders disable row level security;
alter table public.ride_reports disable row level security;
alter table public.members disable row level security;

-- If you already created the tables, run this once in the SQL editor:
-- alter table public.ride_riders add column if not exists speed_kmh double precision;
-- create unique index if not exists ride_riders_ride_id_name_lower_idx on public.ride_riders (ride_id, lower(name));
-- (then run the ride_reports create table block above if needed)
-- (then run the members create table block above if needed)
-- If members already exists, run once:
-- alter table public.members drop constraint if exists members_status_check;
-- alter table public.members add column if not exists activation_token text;
-- alter table public.members add column if not exists activation_expires_at timestamptz;
-- alter table public.members add constraint members_status_check check (status in ('pending', 'awaiting_activation', 'approved', 'rejected'));
-- create unique index if not exists members_activation_token_idx on public.members (activation_token) where activation_token is not null;
