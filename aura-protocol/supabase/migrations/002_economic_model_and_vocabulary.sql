-- ============================================================================
-- THE AURA PROTOCOL — migration 002
-- Economic model (₹10 stake, 85% refund tier, forfeit jackpot, sudden-death
-- tie-break) + custom vocabulary mapping (Day 1 onboarding descriptors).
-- Run after supabase/schema.sql. Idempotent: safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CUSTOM VOCABULARY — Day 1 onboarding maps real-life descriptors onto
--    the fixed Movement/Grind pillars instead of showing generic labels.
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists movement_label text not null default 'Movement',
  add column if not exists grind_label text not null default 'Grind',
  add column if not exists calorie_goal int;

comment on column public.profiles.movement_label is 'User''s own name for the Sweat pillar, e.g. "Leg Day" or "Running Splits"';
comment on column public.profiles.grind_label is 'User''s own name for the Grind pillar, e.g. "BugParallax Edits" or "B.Tech Modules"';

-- ----------------------------------------------------------------------------
-- 2. SEASONS — a 30-day window with its own entry stake and prize pool.
-- ----------------------------------------------------------------------------
create table if not exists public.seasons (
  id uuid primary key default uuid_generate_v4(),
  starts_on date not null,
  ends_on date not null,
  entry_stake_inr int not null default 10,
  status text not null default 'active' check (status in ('active', 'settled')),
  pool_amount_inr int not null default 0,
  created_at timestamptz not null default now()
);

-- One active season at a time is the expected shape; enforced by convention
-- (start_new_season() below closes the window), not a hard constraint.
create index if not exists seasons_status_idx on public.seasons (status);

alter table public.seasons enable row level security;

drop policy if exists "seasons_select_all" on public.seasons;
create policy "seasons_select_all"
  on public.seasons for select
  using (auth.role() = 'authenticated');

-- Seasons are only ever written by service-role calls (start_new_season /
-- settle_season), so no client insert/update policy is defined.

-- ----------------------------------------------------------------------------
-- 3. STAKES — one row per user per season. This is the ledger; Razorpay
--    order/payment IDs live here so payment state is auditable.
-- ----------------------------------------------------------------------------
create table if not exists public.stakes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  amount_inr int not null,
  razorpay_order_id text,
  razorpay_payment_id text,
  status text not null default 'created'
    check (status in ('created', 'paid', 'refunded', 'forfeited', 'won')),
  paid_at timestamptz,
  settled_at timestamptz,
  payout_amount_inr int not null default 0,
  consistency_pct numeric(5, 2),
  created_at timestamptz not null default now(),

  unique (user_id, season_id)
);

create index if not exists stakes_season_status_idx on public.stakes (season_id, status);

alter table public.stakes enable row level security;

drop policy if exists "stakes_select_own" on public.stakes;
create policy "stakes_select_own"
  on public.stakes for select
  using (auth.uid() = user_id);

-- Inserts/updates to stakes only ever happen from server routes using the
-- service role (payment creation, webhook confirmation, settlement), so no
-- client insert/update policy is defined — RLS denies both by default.

-- ----------------------------------------------------------------------------
-- 4. Start a new season. Call manually (or from a yearly/monthly admin
--    action) — there's no fixed cadence assumed, since "30 days" starts
--    whenever the operator opens entries.
-- ----------------------------------------------------------------------------
create or replace function public.start_new_season(entry_stake int default 10)
returns uuid
language plpgsql
as $$
declare
  new_season_id uuid;
begin
  update public.seasons set status = 'settled' where status = 'active';

  insert into public.seasons (starts_on, ends_on, entry_stake_inr, status)
  values (current_date, current_date + interval '29 days', entry_stake, 'active')
  returning id into new_season_id;

  return new_season_id;
end;
$$;

create or replace function public.get_active_season()
returns public.seasons
language sql
stable
as $$
  select * from public.seasons where status = 'active' order by starts_on desc limit 1;
$$;

-- ----------------------------------------------------------------------------
-- 5. Consistency % for a user within a season: perfect-Aura days / days
--    elapsed so far in the season (capped at the season length).
-- ----------------------------------------------------------------------------
create or replace function public.compute_consistency(p_user_id uuid, p_season_id uuid)
returns numeric
language plpgsql
as $$
declare
  season record;
  logged_days int;
  season_length int;
  elapsed_days int;
begin
  select * into season from public.seasons where id = p_season_id;
  if season is null then
    return 0;
  end if;

  season_length := (season.ends_on - season.starts_on) + 1;
  elapsed_days := least(season_length, greatest(1, (least(current_date, season.ends_on) - season.starts_on) + 1));

  select count(*) into logged_days
    from public.daily_logs
    where user_id = p_user_id
      and log_date between season.starts_on and season.ends_on
      and daily_aura_earned > 0;

  return round((logged_days::numeric / elapsed_days::numeric) * 100, 2);
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. Settle a season:
--    Tier 1 — >=85% consistency -> full refund of the stake.
--    Tier 2 — everyone else's forfeited stake goes into the pool, split
--             winner-takes-most among the Top 3 by total_aura.
--    Sudden Death — if two or more paid participants hit a flawless 100%
--             consistency, the pool is split evenly among just them instead
--             of the Top 3 rule.
--    This function only computes and records amounts (payout_amount_inr,
--    status). Actually moving money — refunds via the Razorpay Refund API,
--    payouts via RazorpayX — happens in the /api/cron/settle-season route
--    that calls this function first, then walks the resulting rows.
-- ----------------------------------------------------------------------------
create or replace function public.settle_season(p_season_id uuid)
returns void
language plpgsql
as $$
declare
  season record;
  r record;
  forfeited_total int := 0;
  perfect_scorers uuid[] := '{}';
  perfect_count int := 0;
  winner_ids uuid[];
  share int;
begin
  select * into season from public.seasons where id = p_season_id;
  if season is null or season.status = 'settled' then
    return;
  end if;

  -- Pass 1: score everyone, apply the 85% refund tier, tally forfeits.
  for r in
    select s.id, s.user_id, s.amount_inr,
           public.compute_consistency(s.user_id, p_season_id) as pct
    from public.stakes s
    where s.season_id = p_season_id and s.status = 'paid'
  loop
    if r.pct >= 85 then
      update public.stakes
        set status = 'refunded', consistency_pct = r.pct, settled_at = now(),
            payout_amount_inr = amount_inr
        where id = r.id;
    else
      update public.stakes
        set status = 'forfeited', consistency_pct = r.pct, settled_at = now()
        where id = r.id;
      forfeited_total := forfeited_total + r.amount_inr;
    end if;

    if r.pct >= 100 then
      perfect_scorers := array_append(perfect_scorers, r.user_id);
    end if;
  end loop;

  perfect_count := array_length(perfect_scorers, 1);

  if perfect_count is not null and perfect_count >= 2 then
    -- Sudden Death: flawless scorers split the whole pool evenly, no matter
    -- how many there are or where they land on total_aura.
    share := forfeited_total / perfect_count;
    winner_ids := perfect_scorers;
  else
    -- Standard Top 3, ranked by total_aura among everyone who kept their
    -- stake alive (refunded or still-forfeited-but-participating counts
    -- toward the leaderboard already via profiles.total_aura).
    select array_agg(p.id) into winner_ids
      from (
        select pr.id
        from public.profiles pr
        join public.stakes s on s.user_id = pr.id and s.season_id = p_season_id
        where s.status in ('refunded', 'forfeited')
        order by pr.total_aura desc
        limit 3
      ) p;
    if winner_ids is not null and array_length(winner_ids, 1) > 0 then
      share := forfeited_total / array_length(winner_ids, 1);
    end if;
  end if;

  if winner_ids is not null then
    update public.stakes
      set status = 'won',
          payout_amount_inr = payout_amount_inr + share,
          settled_at = now()
      where season_id = p_season_id and user_id = any(winner_ids);
  end if;

  update public.seasons
    set status = 'settled', pool_amount_inr = forfeited_total
    where id = p_season_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. calorie_goal_met — now compares against the user's own onboarding
--    target instead of a hardcoded number. Replaces the simpler version of
--    calculate_daily_aura() from supabase/schema.sql.
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
  target_calories int;
begin
  meals_done :=
    (case when new.breakfast_img is not null then 1 else 0 end) +
    (case when new.lunch_img is not null then 1 else 0 end) +
    (case when new.pre_workout_img is not null then 1 else 0 end) +
    (case when new.post_workout_img is not null then 1 else 0 end) +
    (case when new.dinner_img is not null then 1 else 0 end);

  movement_done := (new.movement_img is not null) or new.is_rest_token_used;
  grind_done := new.grind_img is not null;

  base_aura := (meals_done * 10)
    + (case when movement_done then 25 else 0 end)
    + (case when grind_done then 25 else 0 end);

  perfect := (meals_done = 5) and movement_done and grind_done;

  select calorie_goal into target_calories from public.profiles where id = new.user_id;
  new.calorie_goal_met := (target_calories is not null)
    and (new.calories_logged is not null)
    and (abs(new.calories_logged - target_calories) <= 150);

  new.is_perfect_day := perfect;
  new.daily_aura_earned := case when perfect then round(base_aura * 1.5) else base_aura end;
  new.updated_at := now();

  return new;
end;
$$;
-- trg_calculate_daily_aura already points at calculate_daily_aura() by name
-- from supabase/schema.sql, so replacing the function body is enough — no
-- need to recreate the trigger itself.

-- ----------------------------------------------------------------------------
-- 8. Bootstrap: open Season 1 automatically so /api/payments/create-order
--    has something to attach a stake to on a fresh install. Skipped if an
--    active season already exists (safe to re-run this migration).
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.seasons where status = 'active') then
    perform public.start_new_season(10);
  end if;
end $$;

