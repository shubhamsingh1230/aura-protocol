import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createRazorpayOrder } from "@/lib/razorpay";

// Generates the current ISO week string (e.g., '2026-W36')
function getCurrentWeekId(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const weekId = getCurrentWeekId();
  const stakeAmountInr = 10; // Fixed ₹10 weekly stake

  // Create Razorpay order for the weekly stake
  const order = await createRazorpayOrder({
    amountInr: stakeAmountInr,
    receipt: `stk_${user.id.slice(0, 8)}_${Date.now().toString().slice(-6)}`,
    notes: { user_id: user.id, week_id: weekId },
  });

  // Upsert the stake record tied to the current week
  const { error } = await service.from("stakes").upsert(
    {
      user_id: user.id,
      week_id: weekId,
      amount_inr: stakeAmountInr,
      razorpay_order_id: order.id,
      status: "created",
    },
    { onConflict: "user_id,week_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}
