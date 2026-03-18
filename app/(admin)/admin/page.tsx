import { prisma } from "@/lib/prisma";
import AdminOverviewClient from "@/components/AdminOverviewClient";

export default async function AdminOverviewPage() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersThisWeek,
    subscriptionsByStatus,
    totalPosts,
    postsByStatus,
    newPostsThisWeek,
    totalNewsletters,
    totalPlans,
    recentSignups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.post.count(),
    prisma.post.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.post.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.newsletter.count(),
    prisma.contentPlan.count(),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
    }),
  ]);

  const subStatusMap: Record<string, number> = {};
  for (const s of subscriptionsByStatus) {
    subStatusMap[s.status] = s._count._all;
  }

  const postStatusMap: Record<string, number> = {};
  for (const p of postsByStatus) {
    postStatusMap[p.status] = p._count._all;
  }

  return (
    <AdminOverviewClient
      stats={{
        totalUsers,
        newUsersThisWeek,
        activeSubs: subStatusMap["active"] ?? 0,
        trialingSubs: subStatusMap["trialing"] ?? 0,
        canceledSubs: subStatusMap["canceled"] ?? 0,
        totalPosts,
        postsByStatus: postStatusMap,
        newPostsThisWeek,
        totalNewsletters,
        totalPlans,
      }}
      recentSignups={recentSignups}
    />
  );
}
