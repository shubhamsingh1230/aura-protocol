-- ============================================================================
-- THE AURA PROTOCOL — Supabase schema
-- Run this once against a fresh project (SQL Editor -> New query -> Run).
-- Idempotent: safe to re-run.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. PROFILES
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role_tag text default 'CONTENDER',
  timezone_offset text default '+00:00',        -- e.g. '+05:30', kept in sync client-side
  current_streak int not null default 0,
  longest_streak int not null default 0,
  total_aura int not null default 0,
  rank_title text not null default '👶 TRY HARD KIDS',
  rest_tokens_remaining int not null default 1,
  rest_tokens_reset_at date not null default date_trunc('week', now())::date,
  flag_accuracy_score int not null default 100,  -- starts at 100, -10 per false flag
  stake_paid boolean not null default false,     -- ₹100 buy-in confirmed
  contract_signed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. DAILY LOGS  (one row per user per local calendar day)
-- ----------------------------------------------------------------------------
create table if not exists public.daily_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null,
  timezone_offset text not null default '+00:00',

  breakfast_img text,
  lunch_img text,
  pre_workout_img text,
  post_workout_img text,
  dinner_img text,
  movement_img text,
  grind_img text,

  calories_logged int,
  calorie_goal_met boolean not null default false,

  daily_aura_earned int not null default 0,
  is_perfect_day boolean not null default false,
  is_rest_token_used boolean not null default false,

  gesture_of_the_day text,
  gesture_verified boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (user_id, log_date)
);

create index if not exists daily_logs_user_date_idx on public.daily_logs (user_id, log_date desc);
create index if not exists daily_logs_date_idx on public.daily_logs (log_date desc);

-- ----------------------------------------------------------------------------
-- 3. FLAGS  (long-press accusation on another user's daily log)
-- ----------------------------------------------------------------------------
create table if not exists public.flags (
  id uuid primary key default uuid_generate_v4(),
  daily_log_id uuid not null references public.daily_logs(id) on delete cascade,
  flagged_by_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),

  unique (daily_log_id, flagged_by_user_id)
);

create index if not exists flags_status_idx on public.flags (status);

-- ============================================================================
-- BUSINESS LOGIC
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 7-Pillar Gauntlet + Aura Surge calculation.
-- 5 meals = 10 Aura each (50 total). Movement = 25. Grind = 25. Max base = 100.
-- All 7 present -> 1.5x surge -> 150. Recomputed on every insert/update.
-- ----------------------------------------------------------------------------
create or replace function public.calculate_daily_aura()
returns trigger
language plpgsql
as $$
declare
  meals_done int := 0;
  movement_done boolean := false;
  grind_done boolean := false;
  base_aura int := 0;
  perfect boolean := false;
begin
  meals_done :=
    (case when new.breakfast_img is not null then 1 else 0 end) +
    (case when new.lunch_img is not null then 1 else 0 end) +
    (case when new.pre_workout_img is not null then 1 else 0 end) +
    (case when new.post_workout_img is not null then 1 else 0 end) +
    (case when new.dinner_img is not null then 1 else 0 end);

  -- Rest Token auto-completes Movement without breaking the surge
  movement_done := (new.movement_img is not null) or new.is_rest_token_used;
  grind_done := new.grind_img is not null;

  base_aura := (meals_done * 10)
    + (case when movement_done then 25 else 0 end)
    + (case when grind_done then 25 else 0 end);

  perfect := (meals_done = 5) and movement_done and grind_done;

  new.is_perfect_day := perfect;
  new.daily_aura_earned := case when perfect then round(base_aura * 1.5) else base_aura end;
  new.updated_at := now();

  return new;
end;
$$;

drop trigger if exists trg_calculate_daily_aura on public.daily_logs;
create trigger trg_calculate_daily_aura
  before insert or update on public.daily_logs
  for each row execute function public.calculate_daily_aura();

-- ----------------------------------------------------------------------------
-- Roll a daily_log's aura + streak into the owning profile's totals.
-- A day counts toward the streak if daily_aura_earned > 0.
-- Streak breaks if the previous local calendar day has no log (and wasn't a
-- rest-token day), unless a rest token was used today.
-- ----------------------------------------------------------------------------
create or replace function public.apply_daily_log_to_profile()
returns trigger
language plpgsql
as $$
declare
  prev_log record;
  streak_continues boolean := false;
  aura_delta int := 0;
begin
  if tg_op = 'UPDATE' then
    aura_delta := new.daily_aura_earned - coalesce(old.daily_aura_earned, 0);
  else
    aura_delta := new.daily_aura_earned;
  end if;

  update public.profiles
    set total_aura = greatest(0, total_aura + aura_delta)
    where id = new.user_id;

  -- Streak bookkeeping only needs to run once per new log, or when a log
  -- flips from empty to non-empty.
  if new.daily_aura_earned > 0 and (tg_op = 'INSERT' or coalesce(old.daily_aura_earned, 0) = 0) then
    select * into prev_log
      from public.daily_logs
      where user_id = new.user_id
        and log_date = new.log_date - interval '1 day'
      limit 1;

    streak_continues := (prev_log.id is not null and prev_log.daily_aura_earned > 0);

    update public.profiles
      set current_streak = case when streak_continues then current_streak + 1 else 1 end,
          longest_streak = greatest(longest_streak,
            case when streak_continues then current_streak + 1 else 1 end)
      where id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_apply_daily_log_to_profile on public.daily_logs;
create trigger trg_apply_daily_log_to_profile
  after insert or update on public.daily_logs
  for each row execute function public.apply_daily_log_to_profile();

-- ----------------------------------------------------------------------------
-- Ego Leaderboard Tags — recompute rank_title for every profile based on
-- total_aura order. Call via the refresh_leaderboard_ranks() RPC (cheap,
-- run after each check-in) rather than a trigger on every profile row.
-- ----------------------------------------------------------------------------
create or replace function public.refresh_leaderboard_ranks()
returns void
language plpgsql
as $$
begin
  with ranked as (
    select id, row_number() over (order by total_aura desc, current_streak desc) as pos
    from public.profiles
  )
  update public.profiles p
  set rank_title = case
    when ranked.pos = 1 then '👑 FINAL BOSS'
    when ranked.pos = 2 then '🥶 OG'
    when ranked.pos = 3 then '💀 IM TRYING BLUD'
    else '👶 TRY HARD KIDS'
  end
  from ranked
  where ranked.id = p.id;
end;
$$;

-- ----------------------------------------------------------------------------
-- Weekly Rest Token refill. Call from a scheduled Edge Function / cron
-- (see /api/cron/reset) once a week, or lazily on login.
-- ----------------------------------------------------------------------------
create or replace function public.refill_rest_tokens()
returns void
language plpgsql
as $$
begin
  update public.profiles
    set rest_tokens_remaining = 1,
        rest_tokens_reset_at = date_trunc('week', now())::date
    where rest_tokens_reset_at < date_trunc('week', now())::date;
end;
$$;

-- ----------------------------------------------------------------------------
-- Flag resolution: an approved flag is left as-is for admin/community
-- record-keeping. A REJECTED flag means the accusation was false, so the
-- accuser is penalized -10 Aura and -10 flag_accuracy_score to discourage
-- spam-flagging.
-- ----------------------------------------------------------------------------
create or replace function public.apply_flag_resolution()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'rejected' and old.status = 'pending' then
    update public.profiles
      set total_aura = greatest(0, total_aura - 10),
          flag_accuracy_score = greatest(0, flag_accuracy_score - 10)
      where id = new.flagged_by_user_id;
  end if;

  if new.status <> old.status then
    new.reviewed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_apply_flag_resolution on public.flags;
create trigger trg_apply_flag_resolution
  before update on public.flags
  for each row execute function public.apply_flag_resolution();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.daily_logs enable row level security;
alter table public.flags enable row level security;

-- Profiles: everyone (signed in) can read the leaderboard; only the owner
-- can update their own row.
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Daily logs: feed is visible to all authenticated users (so people can
-- flag each other); only the owner can insert/update their own log.
drop policy if exists "daily_logs_select_all" on public.daily_logs;
create policy "daily_logs_select_all"
  on public.daily_logs for select
  using (auth.role() = 'authenticated');

drop policy if exists "daily_logs_insert_own" on public.daily_logs;
create policy "daily_logs_insert_own"
  on public.daily_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "daily_logs_update_own" on public.daily_logs;
create policy "daily_logs_update_own"
  on public.daily_logs for update
  using (auth.uid() = user_id);

-- Flags: any authenticated user can raise one; only the accuser (or an
-- admin via the service role) can update its status.
drop policy if exists "flags_select_all" on public.flags;
create policy "flags_select_all"
  on public.flags for select
  using (auth.role() = 'authenticated');

drop policy if exists "flags_insert_own" on public.flags;
create policy "flags_insert_own"
  on public.flags for insert
  with check (auth.uid() = flagged_by_user_id);

-- Note: status transitions (approve/reject) are done via the service role
-- key from an admin-only server route, not directly by clients.

-- ============================================================================
-- STORAGE — "daily-proofs" bucket for the 7 daily photos
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('daily-proofs', 'daily-proofs', true)
on conflict (id) do nothing;

-- Path convention enforced by policy: {user_id}/{log_date}/{slot}.jpg
-- so a user can only ever write into their own folder.
drop policy if exists "daily_proofs_insert_own" on storage.objects;
create policy "daily_proofs_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'daily-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "daily_proofs_update_own" on storage.objects;
create policy "daily_proofs_update_own"
  on storage.objects for update
  using (
    bucket_id = 'daily-proofs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "daily_proofs_read_all" on storage.objects;
create policy "daily_proofs_read_all"
  on storage.objects for select
  using (bucket_id = 'daily-proofs');

-- ============================================================================
-- SEED: today's gesture (simple rotating table; swap for a real picker)
-- ============================================================================

create table if not exists public.daily_gestures (
  gesture_date date primary key default current_date,
  gesture_label text not null,
  gesture_emoji text not null
);

insert into public.daily_gestures (gesture_date, gesture_label, gesture_emoji)
values (current_date, 'Peace Sign', '✌️')
on conflict (gesture_date) do nothing;
