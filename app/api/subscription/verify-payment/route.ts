import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyPaymentSignature } from "@/lib/razorpay";

/**
 * Called by the client after Razorpay modal returns a successful payment.
 * Verifies the signature and activates the subscription.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    razorpay_subscription_id,
    razorpay_payment_id,
    razorpay_signature,
  } = await req.json();

  if (!razorpay_subscription_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json(
      { error: "Missing payment verification fields" },
      { status: 400 }
    );
  }

  // Verify Razorpay signature
  const isValid = verifyPaymentSignature({
    razorpay_subscription_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  if (!isValid) {
    console.error("Razorpay payment signature verification failed");
    return NextResponse.json(
      { error: "Invalid payment signature" },
      { status: 400 }
    );
  }

  // Activate subscription in DB
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

  await prisma.subscription.update({
    where: { userId: session.user.id },
    data: {
      razorpaySubscriptionId: razorpay_subscription_id,
      status: "active",
      trialEnd: null,
      currentPeriodEnd,
    },
  });

  console.log(`Subscription activated for user ${session.user.id} via Razorpay`);
  return NextResponse.json({ success: true });
}
