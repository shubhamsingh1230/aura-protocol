// app/api/razorpay/create-order/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Razorpay from "razorpay";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: Operator session not found" },
        { status: 401 }
      );
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Server Configuration Error: Razorpay keys are missing in Vercel environment." },
        { status: 500 }
      );
    }

    // @ts-ignore
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const options = {
      amount: 1000, // ₹10 in paise
      currency: "INR",
      receipt: `stake_${user.id.slice(0, 6)}_${Date.now()}`,
      notes: { user_id: user.id },
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err: any) {
    console.error("Razorpay order creation fatal exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error during order creation" },
      { status: 500 }
    );
  }
}
