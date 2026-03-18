import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  if (!sub) {
    return NextResponse.json({ status: "none", daysRemaining: 0 });
  }

  const now = new Date();
  let daysRemaining = 0;
  if (sub.status === "trialing" && sub.trialEnd) {
    daysRemaining = Math.max(
      0,
      Math.ceil((sub.trialEnd.getTime() - now.getTime()) / 86400000)
    );
  }

  return NextResponse.json({
    status: sub.status,
    trialEnd: sub.trialEnd?.toISOString() ?? null,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    daysRemaining,
    razorpayCustomerId: sub.razorpayCustomerId ?? null,
    razorpaySubscriptionId: sub.razorpaySubscriptionId ?? null,
    currency: sub.currency ?? "INR",
  });
}
