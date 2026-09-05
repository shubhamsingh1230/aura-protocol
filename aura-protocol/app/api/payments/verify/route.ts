import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifyPaymentSignature } from "@/lib/razorpay";

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, paymentId, signature } = (await request.json()) as {
    orderId: string;
    paymentId: string;
    signature: string;
  };

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
  }

  const valid = verifyPaymentSignature({ orderId, paymentId, signature });
  if (!valid) {
    return NextResponse.json({ error: "Signature mismatch" }, { status: 400 });
  }

  const service = createServiceClient();

  // Belt-and-suspenders: this route confirms instantly for the user waiting
  // on the checkout modal, but /api/payments/webhook is the durable source
  // of truth in case the browser tab closes before this call lands.
  const { error: stakeError } = await service
    .from("stakes")
    .update({ status: "paid", razorpay_payment_id: paymentId, paid_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("razorpay_order_id", orderId);

  if (stakeError) return NextResponse.json({ error: stakeError.message }, { status: 500 });

  const { error: profileError } = await service
    .from("profiles")
    .update({ stake_paid: true })
    .eq("id", user.id);

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
