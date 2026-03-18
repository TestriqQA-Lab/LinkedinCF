import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PostEditorClient from "@/components/PostEditorClient";

export default async function PostEditorPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const [post, user] = await Promise.all([
    prisma.post.findFirst({
      where: { id: params.id, plan: { userId: session.user.id } },
      include: { plan: { select: { strategy: true, weekStart: true } } },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { postSignature: true, name: true, image: true, headline: true, timezone: true },
    }),
  ]);

  if (!post) notFound();

  return (
    <PostEditorClient
      post={post}
      postSignature={user?.postSignature ?? null}
      userProfile={{
        name: user?.name ?? null,
        image: user?.image ?? null,
        headline: user?.headline ?? null,
      }}
      userTimezone={user?.timezone ?? "Asia/Kolkata"}
    />
  );
}
