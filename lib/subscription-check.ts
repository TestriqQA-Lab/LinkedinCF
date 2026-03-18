import { prisma } from "@/lib/prisma";

/**
 * Check if a user has an active subscription that allows content generation.
 * Returns allowed: false for expired trials, canceled, unpaid, or missing subscriptions.
 */
export async function checkActiveSubscription(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!sub) {
    return { allowed: false, reason: "No subscription found. Please subscribe to continue." };
  }

  if (sub.status === "active" || sub.status === "cancel_pending") {
    return { allowed: true };
  }

  if (sub.status === "trialing") {
    if (sub.trialEnd && sub.trialEnd < new Date()) {
      return {
        allowed: false,
        reason: "Your free trial has ended. Subscribe to continue creating content.",
      };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: "Your subscription is not active. Please subscribe to continue." };
}
