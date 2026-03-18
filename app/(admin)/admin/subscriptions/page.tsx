import { prisma } from "@/lib/prisma";
import AdminSubscriptionsClient from "@/components/AdminSubscriptionsClient";

export default async function AdminSubscriptionsPage() {
  const subscriptions = await prisma.subscription.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const statusCounts = await prisma.subscription.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const countsMap: Record<string, number> = {};
  for (const s of statusCounts) {
    countsMap[s.status] = s._count._all;
  }

  return (
    <AdminSubscriptionsClient
      initialSubscriptions={JSON.parse(JSON.stringify(subscriptions))}
      statusCounts={countsMap}
    />
  );
}
