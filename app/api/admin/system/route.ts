import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { cleanupOldImages } from "@/lib/image-cleanup";
import * as fs from "fs";
import * as path from "path";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

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
      select: { id: true, title: true, postError: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  // Image storage stats
  let imageStats = { fileCount: 0, totalSizeMB: 0 };
  try {
    const generatedDir = path.join(process.cwd(), "public", "generated");
    if (fs.existsSync(generatedDir)) {
      const files = fs.readdirSync(generatedDir).filter((f) => f !== ".gitkeep");
      let totalBytes = 0;
      for (const file of files) {
        const stat = fs.statSync(path.join(generatedDir, file));
        totalBytes += stat.size;
      }
      imageStats = {
        fileCount: files.length,
        totalSizeMB: Math.round((totalBytes / (1024 * 1024)) * 100) / 100,
      };
    }
  } catch {
    // ignore
  }

  return NextResponse.json({
    counts: {
      users: userCount,
      accounts: accountCount,
      subscriptions: subscriptionCount,
      contentPlans: contentPlanCount,
      posts: postCount,
      newsletters: newsletterCount,
    },
    imageStats,
    recentErrors,
    environment: {
      nodeVersion: process.version,
      nextVersion: "14.2.5",
      database: "SQLite",
    },
  });
}

// Manual image cleanup trigger (admin only)
export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  const result = await cleanupOldImages();
  return NextResponse.json({
    message: `Cleanup complete: ${result.deleted} images deleted, ${result.errors} errors`,
    ...result,
  });
}
