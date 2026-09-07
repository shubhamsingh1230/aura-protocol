// app/api/razorpay/verify/route.ts (or app/api/payments/verify/route.ts)
import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();

    // Support both client naming formats (razorpay_xxx vs xxx)
    const orderId = body.razorpay_order_id || body.orderId;
    const paymentId = body.razorpay_payment_id || body.paymentId;
    const signature = body.razorpay_signature || body.signature;
    const userId = body.user_id || user?.id;

    if (!orderId || !paymentId || !signature || !userId) {
      return NextResponse.json(
        { error: "Missing required verification parameters" },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return NextResponse.json(
        { error: "Razorpay server secret is undefined" },
        { status: 500 }
      );
    }

    // 1. Verify HMAC-SHA256 Signature
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json(
        { error: "Invalid signature: payment verification failed" },
        { status: 400 }
      );
    }

    // 2. Admin client to commit state changes bypassing RLS
    const service = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 7);

    // 3. Update operator profile status & assets
    const { data: profile } = await service
      .from("profiles")
      .select("aura_points, streak_shields, current_streak, longest_streak")
      .eq("id", userId)
      .single();

    const updatedAP = (profile?.aura_points || 0) + 50;
    const updatedShields = (profile?.streak_shields || 0) + 1;

    await service
      .from("profiles")
      .update({
        subscription_status: "active",
        trial_ends_at: trialEnds.toISOString(),
        stake_paid: true,
        aura_points: updatedAP,
        streak_shields: updatedShields,
        current_streak: Math.max(1, profile?.current_streak || 1),
        longest_streak: Math.max(1, profile?.longest_streak || 1),
      })
      .eq("id", userId);

    // 4. Log transaction record if table exists
    await service.from("store_purchases").insert({
      user_id: userId,
      item_id: "weekly_stake_pass",
      item_name: "Weekly Protocol Stake (₹10)",
      cost_ap: 0,
    }).select().maybeSingle();

    // 5. Dispatch success notification
    await service.from("notifications").insert({
      user_id: userId,
      actor_id: userId,
      type: "stake_verified",
      message: `💳 Stake Ratified: ₹10 weekly commitment locked. 1 Defense Shield and 50 AP credited to your armory.`,
      is_read: false,
    });

    return NextResponse.json({ success: true, message: "Stake verified and credited." });
  } catch (err: any) {
    console.error("Razorpay verification exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error during verification" },
      { status: 500 }
    );
  }
}
