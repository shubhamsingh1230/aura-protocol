// app/api/razorpay/verify/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Bypass RLS using admin client to guarantee subscription activation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      userId 
    } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
      return NextResponse.json({ error: "Missing verification parameters" }, { status: 400 });
    }

    // 1. Verify HMAC SHA-256 signature
    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // 2. Extend subscription for 7 days
    const nextRenewal = new Date();
    nextRenewal.setDate(nextRenewal.getDate() + 7);

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        subscription_status: "active",
        trial_ends_at: nextRenewal.toISOString(),
      })
      .eq("id", userId);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // 3. Dispatch system notification
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      actor_id: userId,
      type: "subscription_activated",
      message: "⚡ Operator Membership Activated: ₹10 weekly pass confirmed. Access fully unlocked.",
    });

    return NextResponse.json({ success: true, renewalDate: nextRenewal });
  } catch (err: any) {
    console.error("Verification exception:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
