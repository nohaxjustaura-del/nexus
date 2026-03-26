-- Mirror of Prisma Investor rows for Supabase clients (Realtime, Edge Functions, public API).
--
-- Apply (same DB as Prisma DATABASE_URL, usually your Supabase Postgres):
--   npm run db:vc-directory
-- Or: Supabase Dashboard → SQL → New query → paste this file → Run.
--
-- If PostgREST still says "schema cache", the NOTIFY below reloads it; or Dashboard →
-- Project Settings → API → "Reload schema" (wording varies by dashboard version).
--
-- Env: SUPABASE_VC_TABLE=vc_directory (default)

create table if not exists public.vc_directory (
  id text primary key,
  firm_name text not null unique,
  email text,
  name text,
  thesis text,
  bio text,
  website_url text,
  linkedin_url text,
  application_url text,
  check_size_min integer default 0,
  check_size_max integer default 0,
  fund_type text,
  lead_follow text,
  verified boolean default false,
  stages jsonb not null default '[]'::jsonb,
  sectors jsonb not null default '[]'::jsonb,
  geography jsonb not null default '[]'::jsonb,
  portfolio jsonb not null default '[]'::jsonb,
  value_add_tags jsonb not null default '[]'::jsonb,
  research_sources jsonb,
  prisma_updated_at timestamptz,
  synced_at timestamptz not null default now()
);

create index if not exists vc_directory_synced_at_idx on public.vc_directory (synced_at desc);
create index if not exists vc_directory_verified_idx on public.vc_directory (verified) where verified = true;

alter table public.vc_directory enable row level security;
-- Supabase service_role JWT bypasses RLS for upserts from this worker.
-- Add a SELECT policy for `anon` or `authenticated` if clients should read via PostgREST.

-- Uncomment to allow anonymous read (e.g. marketing site / mobile app):
-- create policy "vc_directory_anon_select"
--   on public.vc_directory
--   for select
--   to anon
--   using (true);

comment on table public.vc_directory is 'Synced from NEXUS Prisma Investor via worker:vc-supabase';

-- Refresh PostgREST so REST/API sees the table immediately (fixes "schema cache" errors).
notify pgrst, 'reload schema';
