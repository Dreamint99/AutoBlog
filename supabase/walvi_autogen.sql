-- ============================================================
-- Walvi cloud auto-publisher — state table + pg_cron driver
-- Mirrors the InfKey / Countly setup. Runs entirely in Supabase
-- (no local PC, no GitHub Actions minutes).
--
-- Run in the Supabase SQL editor (project yfzxnxexhssbthfyiznj).
-- Replace <DEEPSEEK_KEY> and <ANON_KEY> before running. No secrets
-- are committed to the repo.
-- ============================================================

-- 1) state table (single row, id=1) ---------------------------------
create table if not exists public.walvi_autogen_state (
  id            int primary key default 1,
  enabled       boolean     not null default false,
  day           text,                    -- 'YYYY-MM-DD' (UTC) of the current count
  count_today   int         not null default 0,
  daily_target  int         not null default 8,   -- ~8/day (user asked 7-10, max 10)
  min_per_day   int         not null default 6,
  gap_min_sec   int         not null default 6000,    -- ~1.7 h between posts
  gap_max_sec   int         not null default 9000,    -- ~2.5 h
  next_due_at   timestamptz not null default now(),
  total_made    int         not null default 0,
  last_title    text,
  last_run_at   timestamptz,
  last_status   text,
  deepseek_key  text,                    -- service-role only (RLS below)
  constraint walvi_autogen_state_singleton check (id = 1)
);

-- RLS: lock it down. The edge function uses the service-role key
-- (bypasses RLS); pg_cron only pings the function. No public access,
-- so the deepseek_key column is never exposed to anon/auth clients.
alter table public.walvi_autogen_state enable row level security;
-- (no policies on purpose -> anon/authenticated cannot read or write)

-- seed the single row (set the DeepSeek key here)
insert into public.walvi_autogen_state (id, enabled, deepseek_key)
values (1, false, '<DEEPSEEK_KEY>')
on conflict (id) do nothing;

-- 2) extensions for the cron driver ---------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 3) cron job: ping the edge function every 30 min ------------------
-- The function self-gates on walvi_autogen_state (daily_target + gaps),
-- so extra pings are safe no-ops. Uses the anon JWT just to invoke it.
select cron.schedule(
  'walvi-autogen',
  '*/30 * * * *',
  $$
  select net.http_post(
    url     := 'https://yfzxnxexhssbthfyiznj.supabase.co/functions/v1/walvi-generate',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer <ANON_KEY>'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- Tuning (live, no redeploy):
--   update public.walvi_autogen_state set enabled = true  where id = 1;  -- GO LIVE
--   update public.walvi_autogen_state set daily_target = 10 where id = 1; -- up to 10/day
--   update public.walvi_autogen_state set daily_target = 3  where id = 1; -- safer drip
--   update public.walvi_autogen_state set enabled = false where id = 1;  -- pause
-- Inspect:
--   select enabled, count_today, daily_target, last_status, last_title, next_due_at
--     from public.walvi_autogen_state where id = 1;
-- Remove the cron job:
--   select cron.unschedule('walvi-autogen');
-- ============================================================
