import crypto from "crypto";

const RAZORPAY_API = "https://api.razorpay.com/v1";

function authHeader() {
  const key = process.env.RAZORPAY_KEY_ID!;
  const secret = process.env.RAZORPAY_KEY_SECRET!;
  return "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
}

export async function createRazorpayOrder(params: {
  amountInr: number;
  receipt: string;
  notes?: Record<string, string>;
}) {
  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amountInr * 100, // Razorpay takes paise
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Razorpay order creation failed: ${body}`);
  }

  return res.json() as Promise<{ id: string; amount: number; currency: string }>;
}

/**
 * Verifies the signature Razorpay's checkout.js handler returns on the
 * client after a successful payment. This confirms the payment/order pair
 * genuinely came from Razorpay before we mark a stake "paid".
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.signature));
}

/** Verifies the X-Razorpay-Signature header on incoming webhook payloads. */
export function verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}

export async function refundRazorpayPayment(paymentId: string, amountInr: number) {
  const res = await fetch(`${RAZORPAY_API}/payments/${paymentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: amountInr * 100 }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Razorpay refund failed: ${body}`);
  }

  return res.json();
}
