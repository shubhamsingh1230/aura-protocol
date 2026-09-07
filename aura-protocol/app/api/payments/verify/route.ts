// app/api/payments/verify/route.ts (or wherever this file is located)
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { verifyPaymentSignature } from "@/lib/razorpay";

export async function POST(request: Request) {
  // 1. Authenticate the active user session
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { orderId, paymentId, signature } = body as {
    orderId: string;
    paymentId: string;
    signature: string;
  };

  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
  }

  // 2. Cryptographic signature check
  const valid = verifyPaymentSignature({ orderId, paymentId, signature });
  if (!valid) {
    return NextResponse.json({ error: "Signature mismatch" }, { status: 400 });
  }

  // 3. Service role client bypassing RLS for administrative updates
  const service = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 4. Update stake record
  const { error: stakeError } = await service
    .from("stakes")
    .update({ 
      status: "paid", 
      razorpay_payment_id: paymentId, 
      paid_at: new Date().toISOString() 
    })
    .eq("user_id", user.id)
    .eq("razorpay_order_id", orderId);

  if (stakeError) {
    console.error("Stake update error:", stakeError.message);
    return NextResponse.json({ error: stakeError.message }, { status: 500 });
  }

  // 5. Update operator profile state
  const { error: profileError } = await service
    .from("profiles")
    .update({ 
      stake_paid: true,
      subscription_status: "active" 
    })
    .eq("id", user.id);

  if (profileError) {
    console.error("Profile update error:", profileError.message);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
