-- CronJobManager schema — jobs table.
--
-- How to apply:
--   1. Open your Supabase project in the dashboard.
--   2. Go to SQL Editor → New query.
--   3. Paste the contents of this file and click Run.
--
-- Security model:
--   All reads/writes happen through the Next.js API routes using the
--   service-role key (which bypasses RLS). We enable RLS with no policies
--   so that the public anon key is denied by default — a safe posture for
--   a browser-exposed project without per-user auth.

create table public.jobs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  cron        text not null,
  type        text not null,
  params      jsonb not null default '{}'::jsonb,
  run_once    boolean not null default false,
  last_run_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.jobs enable row level security;
