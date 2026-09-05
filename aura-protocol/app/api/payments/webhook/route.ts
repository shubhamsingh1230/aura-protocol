import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/razorpay";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    const orderId = payment.order_id as string;
    const paymentId = payment.id as string;

    const service = createServiceClient();

    const { data: stake } = await service
      .from("stakes")
      .select("user_id, status")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();

    // Already confirmed via /api/payments/verify — avoid double-processing.
    if (stake && stake.status !== "paid") {
      await service
        .from("stakes")
        .update({ status: "paid", razorpay_payment_id: paymentId, paid_at: new Date().toISOString() })
        .eq("razorpay_order_id", orderId);

      await service.from("profiles").update({ stake_paid: true }).eq("id", stake.user_id);
    }
  }

  return NextResponse.json({ received: true });
}
