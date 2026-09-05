-- ============================================================================
-- THE AURA PROTOCOL — migration 003
-- Fixes a real gap: current_streak only recalculates when a user checks in
-- again, so a missed day leaves the leaderboard showing a stale, unbroken
-- streak until their next successful log. This adds a function to actively
-- zero streaks for anyone who missed their most recent local day, meant to
-- run daily from /api/cron/reset (see that route for the wiring).
-- ============================================================================

create or replace function public.expire_stale_streaks()
returns void
language plpgsql
as $$
begin
  -- A profile's streak is stale if its most recent Aura-earning day is more
  -- than 1 calendar day behind "now" in UTC terms. This is a coarse check
  -- (it doesn't re-derive each user's exact 3 AM local boundary the way
  -- lib/timezone.ts does client-side), so it deliberately errs generous —
  -- one full extra day of grace — rather than zero someone's streak while
  -- their local day technically hasn't rolled over yet.
  update public.profiles p
  set current_streak = 0
  where current_streak > 0
    and not exists (
      select 1 from public.daily_logs d
      where d.user_id = p.id
        and d.daily_aura_earned > 0
        and d.log_date >= current_date - interval '1 day'
    );
end;
$$;
