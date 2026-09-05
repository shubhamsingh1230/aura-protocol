import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createRazorpayOrder } from "@/lib/razorpay";

export async function POST() {
  // ADD THIS QUICK TEST:
  console.log("DEBUG KEYS:", {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Exists" : "MISSING",
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "Exists" : "MISSING",
    service: process.env.SUPABASE_SERVICE_ROLE_KEY ? "Exists" : "MISSING",
  });
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
  // Shortened to easily bypass Razorpay's 56-character limit
  receipt: `stk_${user.id.slice(0, 8)}_${Date.now().toString().slice(-6)}`,
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
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}
