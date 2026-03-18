import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SettingsClient from "@/components/SettingsClient";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      headline: true,
      summary: true,
      skills: true,
      industry: true,
      tonePrefs: true,
      positioning: true,
      contentGoals: true,
      contentStyles: true,
      targetAudience: true,
      humanMode: true,
      postingSchedule: true,
      postSignature: true,
      timezone: true,
      subscription: {
        select: {
          status: true,
          trialEnd: true,
          currentPeriodEnd: true,
          razorpayCustomerId: true,
          razorpaySubscriptionId: true,
          currency: true,
        },
      },
    },
  });

  return <SettingsClient user={user} />;
}
