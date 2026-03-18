import { prisma } from "@/lib/prisma";
import AdminContentStatsClient from "@/components/AdminContentStatsClient";

export default async function AdminContentPage() {
  const [
    totalPosts,
    postsByStatus,
    postsByType,
    linkedinPublished,
    linkedinErrors,
    totalNewsletters,
    newslettersByStatus,
    topUsers,
  ] = await Promise.all([
    prisma.post.count(),
    prisma.post.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.post.groupBy({ by: ["postType"], _count: { _all: true } }),
    prisma.post.count({ where: { postedToLinkedIn: true } }),
    prisma.post.count({ where: { postError: { not: null } } }),
    prisma.newsletter.count(),
    prisma.newsletter.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.contentPlan.groupBy({
      by: ["userId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
  ]);

  // Resolve user names for top users
  const userIds = topUsers.map((u) => u.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, image: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const topUsersWithDetails = topUsers.map((u) => ({
    userId: u.userId,
    plans: u._count.id,
    user: userMap.get(u.userId) ?? { id: u.userId, name: null, email: null, image: null },
  }));

  const statusMap: Record<string, number> = {};
  for (const p of postsByStatus) statusMap[p.status] = p._count._all;

  const typeMap: Record<string, number> = {};
  for (const p of postsByType) typeMap[p.postType] = p._count._all;

  const nlStatusMap: Record<string, number> = {};
  for (const n of newslettersByStatus) nlStatusMap[n.status] = n._count._all;

  return (
    <AdminContentStatsClient
      stats={{
        totalPosts,
        postsByStatus: statusMap,
        postsByType: typeMap,
        linkedinPublished,
        linkedinErrors,
        totalNewsletters,
        newslettersByStatus: nlStatusMap,
      }}
      topUsers={topUsersWithDetails}
    />
  );
}
