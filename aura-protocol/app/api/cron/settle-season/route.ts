import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { refundRazorpayPayment } from "@/lib/razorpay";

/**
 * Call this once a season's `ends_on` date has passed (e.g. a daily cron
 * that checks whether today > active season's end date, then calls this).
 * Protected by CRON_SECRET like /api/cron/reset.
 *
 * settle_season() (see supabase/migrations/002_...) does all the scoring —
 * this route's job is purely to turn the resulting ledger rows into real
 * money movement:
 *   - status = 'refunded' or 'won'  -> Razorpay refund for payout_amount_inr
 *   - status = 'forfeited'          -> no money moves, stake stays with the pool
 *
 * NOTE: a 'won' payout beyond the user's own stake (i.e. actual jackpot
 * winnings, not just a refund) is bank-transfer money the payer never sent
 * on Razorpay's Payments API — that needs RazorpayX Payouts (a separate,
 * KYC-gated product) to disburse automatically. This route refunds up to
 * each user's own paid amount via the standard Refund API and leaves
 * anything above that recorded in payout_amount_inr for manual/RazorpayX
 * disbursal rather than silently failing or overstating what's automated.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: season } = await supabase.rpc("get_active_season");
  if (!season) {
    return NextResponse.json({ ok: true, note: "No active season." });
  }

  if (new Date(season.ends_on) > new Date()) {
    return NextResponse.json({ ok: true, note: "Active season hasn't ended yet." });
  }

  const { error: settleError } = await supabase.rpc("settle_season", { p_season_id: season.id });
  if (settleError) {
    return NextResponse.json({ error: settleError.message }, { status: 500 });
  }

  const { data: payableStakes } = await supabase
    .from("stakes")
    .select("id, user_id, amount_inr, payout_amount_inr, razorpay_payment_id, status")
    .eq("season_id", season.id)
    .in("status", ["refunded", "won"]);

  const results: { userId: string; refunded: number; remainingForManualPayout: number }[] = [];

  for (const stake of payableStakes ?? []) {
    if (!stake.razorpay_payment_id) continue;

    // Refund what the API can move automatically: capped at the original
    // payment amount. Anything beyond that (jackpot share) is flagged for
    // the RazorpayX payout step.
    const autoRefundable = Math.min(stake.amount_inr, stake.payout_amount_inr);
    const remaining = stake.payout_amount_inr - autoRefundable;

    if (autoRefundable > 0) {
      try {
        await refundRazorpayPayment(stake.razorpay_payment_id, autoRefundable);
      } catch (err) {
        console.error(`Refund failed for stake ${stake.id}:`, err);
        continue;
      }
    }

    results.push({ userId: stake.user_id, refunded: autoRefundable, remainingForManualPayout: remaining });
  }

  // Kick off the next season automatically so there's no gap in play.
  await supabase.rpc("start_new_season", { entry_stake: season.entry_stake_inr });

  return NextResponse.json({ ok: true, settledSeasonId: season.id, results });
}
