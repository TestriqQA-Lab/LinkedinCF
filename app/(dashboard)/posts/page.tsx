import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PostsClient from "@/components/PostsClient";
import { format } from "date-fns";

export default async function PostsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const plans = await prisma.contentPlan.findMany({
    where: { userId: session.user.id },
    include: { posts: { orderBy: { scheduledAt: "asc" } } },
    orderBy: { weekStart: "desc" },
    take: 8,
  });

  const allPosts = plans.flatMap((p) =>
    p.posts.map((post) => ({
      ...post,
      weekLabel: `Posts from ${format(new Date(p.weekStart), "MMM d, yyyy")}`,
    }))
  );

  return <PostsClient posts={allPosts} />;
}
