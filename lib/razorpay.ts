import Razorpay from "razorpay";
import crypto from "crypto";

// ── SDK Instance ────────────────────────────────────────────────────────────────
export const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// ── Constants ───────────────────────────────────────────────────────────────────
export const TRIAL_DAYS = 7;

/** Return the correct Razorpay Plan ID based on currency */
export function getPlanId(currency: "INR" | "USD"): string {
  return currency === "USD"
    ? process.env.RAZORPAY_PLAN_ID_USD!
    : process.env.RAZORPAY_PLAN_ID_INR!;
}

/** Price label used in the UI */
export function priceLabel(currency: "INR" | "USD"): string {
  return currency === "USD" ? "$19/month" : "\u20B9999/month";
}

// ── Signature Verification ──────────────────────────────────────────────────────

/**
 * Verify the payment signature returned by Razorpay Checkout modal.
 * Razorpay signs `razorpay_payment_id|razorpay_subscription_id` with key_secret.
 */
export function verifyPaymentSignature({
  razorpay_subscription_id,
  razorpay_payment_id,
  razorpay_signature,
}: {
  razorpay_subscription_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): boolean {
  const body = `${razorpay_payment_id}|${razorpay_subscription_id}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");
  return timingSafeEqual(expected, razorpay_signature);
}

/**
 * Verify the webhook signature from Razorpay.
 * Razorpay signs the raw request body with the webhook secret.
 */
export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");
  return timingSafeEqual(expected, signature);
}

/** Timing-safe string comparison to prevent timing attacks */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "utf-8"), Buffer.from(b, "utf-8"));
}
