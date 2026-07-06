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

-- Ride data is only accessed from Vercel server functions with the secret/service key.
-- RLS is disabled so inserts/updates are not blocked when using the API key.
alter table public.rides disable row level security;
alter table public.ride_riders disable row level security;

-- If you already created the tables, run this once in the SQL editor:
-- alter table public.ride_riders add column if not exists speed_kmh double precision;
