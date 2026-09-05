import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createRazorpayOrder } from "@/lib/razorpay";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();

  // get_active_season() returns a single row (not SETOF), so PostgREST
  // hands back the row object directly — no .single() needed here.
  const { data: season } = await service.rpc("get_active_season");
  if (!season) {
    return NextResponse.json({ error: "No active season is open right now." }, { status: 400 });
  }

  const order = await createRazorpayOrder({
    amountInr: season.entry_stake_inr,
    receipt: `stake_${user.id}_${season.id}`,
    notes: { user_id: user.id, season_id: season.id },
  });

  const { error } = await service.from("stakes").upsert(
    {
      user_id: user.id,
      season_id: season.id,
      amount_inr: season.entry_stake_inr,
      razorpay_order_id: order.id,
      status: "created",
    },
    { onConflict: "user_id,season_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  });
}
