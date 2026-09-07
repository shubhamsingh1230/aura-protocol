// app/api/payments/create-order/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Razorpay from "razorpay";

export async function POST(request: Request) {
  try {
    // 1. Authenticate user using the standard createClient helper
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized operator" }, { status: 401 });
    }

    // 2. Parse request payload safely
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    const amountInr = (body as any).amountInr || 10;

    // 3. Verify Razorpay credentials
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay credentials are not configured in environment variables" },
        { status: 500 }
      );
    }

    // @ts-ignore
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const options = {
      amount: Math.round(amountInr * 100), // convert to paise (₹10 = 1000)
      currency: "INR",
      receipt: `rcpt_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        user_id: user.id,
      },
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      id: order.id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: any) {
    console.error("Razorpay order creation exception:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create payment order" },
      { status: 500 }
    );
  }
}
