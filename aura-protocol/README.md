# THE AURA PROTOCOL

A gamified daily-accountability app: stake ₹100, log 7 pillars a day (5 meals,
1 Movement, 1 Grind) with live camera proof, and climb an Aura leaderboard
where the top 3 get glowing rank tags and everyone else can flag fakes.

Next.js 14 (App Router, TypeScript) + Supabase (Postgres, Auth, Storage) +
Tailwind (strict OLED dark mode) + Framer Motion.

## 1. Setup

```bash
npm install
cp .env.local.example .env.local   # then fill in your Supabase project values
```

In your Supabase project's SQL Editor, run these **in order**, once:

1. `supabase/schema.sql` — every table, RLS policy, storage bucket + policy,
   and the original business-logic triggers (Aura calculation, streaks,
   rank tags, flag penalties).
2. `supabase/migrations/002_economic_model_and_vocabulary.sql` — the
   season/stake ledger, the 85% refund + jackpot + sudden-death settlement
   function, custom vocabulary columns, and calorie-goal-aware scoring. It
   also auto-opens Season 1 at the end so there's something to stake into
   on a fresh install.

Enable **Email OTP (magic link)** auth in Supabase Auth settings — that's
what `/login` uses. Google Sign-In was considered and intentionally left
out to keep auth to one simple, secure path rather than add OAuth surface
area for a v1.

Add your Razorpay keys to `.env.local` (see `.env.local.example`) and, in
the Razorpay dashboard, point a webhook at
`https://yourapp.com/api/payments/webhook` subscribed to `payment.captured`.

```bash
npm run dev
```

Optional: `npm run seed` pre-populates two weeks of "Gesture of the Day"
rows so the check-in screen never shows a blank banner.

## 2. How the core mechanics are implemented

| Mechanic | Where |
|---|---|
| 7-Pillar Gauntlet + 1.5× Aura Surge | `calculate_daily_aura()` trigger, mirrored client-side in `lib/aura.ts` for instant progress-ring feedback |
| Custom vocabulary (Movement/Grind labels, calorie goal) | Captured in the onboarding "customize" step, stored on `profiles.movement_label` / `grind_label` / `calorie_goal`, and threaded through the check-in screen and feed instead of generic labels |
| Calorie-goal-aware scoring | `calculate_daily_aura()` in migration 002 compares `daily_logs.calories_logged` to the user's own `calorie_goal` (±150 kcal tolerance) to set `calorie_goal_met` |
| Timezone-aware 3:00 AM reset | `lib/timezone.ts` — computes the local "log date" against the user's stored UTC offset with a 3 AM cutoff, not server midnight |
| Rest Token (1/week, auto-clears Movement) | `is_rest_token_used` column feeds straight into the Aura trigger so the surge isn't broken; `refill_rest_tokens()` resets the weekly count via `/api/cron/reset` |
| Anti-Cheat live camera capture | `PhotoUploadSlot.tsx` uses `<input type="file" accept="image/*" capture="environment">` — no gallery picker |
| Client-side compression to <300KB | `lib/uploadProof.ts` via `browser-image-compression` before every Storage upload |
| ₹10 stake via Razorpay/UPI | `components/onboarding/RazorpayCheckout.tsx` opens checkout.js; `/api/payments/create-order` + `/api/payments/verify` + `/api/payments/webhook` handle order creation, client-side confirmation, and durable server-side confirmation |
| 85% consistency refund (Tier 1) | `compute_consistency()` + `settle_season()` in migration 002 — ≥85% logged days over the season refunds the stake in full |
| Forfeit jackpot (Tier 2) | `settle_season()` pools every forfeited stake and splits it among the Top 3 by `total_aura` |
| Sudden-death tie-break | If 2+ paid participants hit exactly 100% consistency, `settle_season()` splits the pool evenly among just them instead of the Top 3 rule |
| Season settlement + real refunds | `/api/cron/settle-season` calls `settle_season()` then fires actual Razorpay refunds via `lib/razorpay.ts` |
| Ego Leaderboard tags (👑/🥶/💀/👶) | `refresh_leaderboard_ranks()` Postgres function, called before the leaderboard renders |
| Streak badge progression + shatter | `lib/streaks.ts` defines the tiers (Locked In → Aura God); `StreakBadge.tsx` plays a shatter animation when it detects the streak dropped since the last visit |
| Profile avatars (initials, gradient ring, live pulse) | `components/ui/Avatar.tsx` — deterministic gradient per name, pulse dot on entries updated in the last 15 minutes |
| Data stamping on feed posts | `HeroTile.tsx` overlays claimed calories + goal-hit status, and shows each user's own custom Movement/Grind vocabulary instead of generic labels |
| 1.5s long-press flag + glow fill | `components/feed/LongPressFlag.tsx` — animated SVG stroke-dashoffset over 1.5s |
| False-flag penalty (-10 Aura) | `apply_flag_resolution()` trigger fires when an admin rejects a flag via `/api/admin/flags` |

## 3. Directory structure

```
app/
  login/                 magic-link auth
  auth/callback/         OTP code exchange
  onboarding/            contract + signature + ₹100 stake
  dashboard/             daily check-in (server fetch -> CheckInClient)
  feed/                  community feed (server fetch -> FeedClient)
  leaderboard/           ranks (server fetch -> LeaderboardClient)
  api/cron/reset/        weekly Rest Token refill (secret-protected)
  api/admin/flags/       admin flag review (approve/reject)
components/
  dashboard/             ProgressRings, GestureBanner, PhotoUploadSlot, CheckInClient
  feed/                  HeroTile, LongPressFlag, FeedClient
  leaderboard/           RankBadge, LeaderboardClient
  ui/                    BottomNav
lib/
  supabase/              browser + server + service-role clients
  aura.ts                shared Aura math (mirrors the DB trigger)
  timezone.ts             3 AM local-reset logic
  uploadProof.ts          compression + Storage upload
supabase/schema.sql       full DB schema, RLS, storage policies, triggers
```

## 4. Known placeholders to wire up before real money is involved

- **Admin role**: `app/api/admin/flags/route.ts` checks `role_tag === 'ADMIN'`.
  Set that column manually on your own account to test flag review.
- **Cron**: `/api/cron/reset` and `/api/cron/settle-season` both expect a
  `CRON_SECRET` bearer token. Wire them to Vercel Cron, GitHub Actions, or
  Supabase's own scheduled Edge Functions — `settle-season` only acts once
  `today > active season.ends_on`, so calling it daily is safe.
- **Jackpot payouts beyond a refund**: `/api/cron/settle-season` refunds each
  winner's own stake automatically via the Razorpay Refund API (real money
  movement). Any amount *above* that — actual jackpot winnings pulled from
  other players' forfeited stakes — isn't money Razorpay's Payments API can
  push back out, since it never came from that winner's own payment. That
  needs RazorpayX Payouts (a separate, KYC-gated product) or a manual bank
  transfer; the route records the exact leftover amount per user in
  `stakes.payout_amount_inr` rather than silently dropping it.
- **Season cadence**: `start_new_season()` defaults to a 30-day window
  starting whenever it's called. There's no fixed monthly trigger — call it
  from an admin action or chain it after `settle_season()` (the cron route
  already does the latter).
