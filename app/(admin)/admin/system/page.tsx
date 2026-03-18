import { prisma } from "@/lib/prisma";
import AdminSystemClient from "@/components/AdminSystemClient";

export default async function AdminSystemPage() {
  const [
    userCount,
    accountCount,
    subscriptionCount,
    contentPlanCount,
    postCount,
    newsletterCount,
    recentErrors,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.account.count(),
    prisma.subscription.count(),
    prisma.contentPlan.count(),
    prisma.post.count(),
    prisma.newsletter.count(),
    prisma.post.findMany({
      where: { postError: { not: null } },
      select: {
        id: true,
        title: true,
        postError: true,
        updatedAt: true,
        plan: {
          select: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <AdminSystemClient
      counts={{
        users: userCount,
        accounts: accountCount,
        subscriptions: subscriptionCount,
        contentPlans: contentPlanCount,
        posts: postCount,
        newsletters: newsletterCount,
      }}
      recentErrors={JSON.parse(JSON.stringify(recentErrors))}
      environment={{
        nodeVersion: process.version,
        nextVersion: "14.2.5",
        database: "SQLite",
      }}
    />
  );
}
