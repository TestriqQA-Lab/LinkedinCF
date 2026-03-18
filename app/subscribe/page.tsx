import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SubscriptionGate from "@/components/SubscriptionGate";

export default async function SubscribePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
  });

  // If already active, redirect to dashboard
  if (sub?.status === "active") redirect("/dashboard");

  const now = new Date();
  const trialExpired =
    !sub || !sub.trialEnd || sub.trialEnd < now || sub.status === "canceled";
  const daysLeft = sub?.trialEnd
    ? Math.max(0, Math.ceil((sub.trialEnd.getTime() - now.getTime()) / 86400000))
    : 0;

  return <SubscriptionGate daysLeft={daysLeft} trialExpired={trialExpired} />;
}
