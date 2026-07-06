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
  is_sharing boolean not null default true,
  unique (ride_id, name)
);

create index if not exists rides_status_idx on public.rides (status);
create index if not exists ride_riders_ride_id_idx on public.ride_riders (ride_id);

alter table public.rides enable row level security;
alter table public.ride_riders enable row level security;
