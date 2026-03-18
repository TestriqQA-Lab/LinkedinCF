import * as fs from "fs";
import * as path from "path";
import { prisma } from "@/lib/prisma";

const CLEANUP_AGE_DAYS = 7;

/**
 * Deletes local image files for posts that were published 7+ days ago.
 * Sets imageUrl to null in the database (LinkedIn link is preserved via linkedinPostId).
 * Also cleans up orphaned image files in public/generated/ that don't match any post.
 */
export async function cleanupOldImages(): Promise<{ deleted: number; errors: number }> {
  let deleted = 0;
  let errors = 0;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CLEANUP_AGE_DAYS);

  // Find published posts with images that are older than the cutoff
  const postsToClean = await prisma.post.findMany({
    where: {
      postedToLinkedIn: true,
      imageUrl: { not: null },
      updatedAt: { lt: cutoff },
    },
    select: {
      id: true,
      imageUrl: true,
    },
  });

  for (const post of postsToClean) {
    if (!post.imageUrl) continue;

    // Delete the file from disk (safe path — use basename only)
    try {
      const safeName = path.basename(post.imageUrl);
      const filepath = path.join(process.cwd(), "public", "generated", safeName);
      const genDir = path.resolve(process.cwd(), "public", "generated");
      if (!path.resolve(filepath).startsWith(genDir + path.sep)) continue;
      if (fs.existsSync(filepath) && !fs.lstatSync(filepath).isSymbolicLink()) {
        fs.unlinkSync(filepath);
        console.log(`[Cleanup] Deleted image file: ${post.imageUrl}`);
      }
    } catch (err) {
      console.error(`[Cleanup] Failed to delete file for post ${post.id}:`, (err as Error).message);
      errors++;
    }

    // Clear imageUrl in the database (keep linkedinPostId)
    try {
      await prisma.post.update({
        where: { id: post.id },
        data: { imageUrl: null },
      });
      deleted++;
    } catch (err) {
      console.error(`[Cleanup] Failed to update post ${post.id}:`, (err as Error).message);
      errors++;
    }
  }

  // Clean up orphaned files — files in public/generated/ that don't match any post
  try {
    const generatedDir = path.join(process.cwd(), "public", "generated");
    if (fs.existsSync(generatedDir)) {
      const files = fs.readdirSync(generatedDir);

      // Get all current imageUrl values
      const activePosts = await prisma.post.findMany({
        where: { imageUrl: { not: null } },
        select: { imageUrl: true },
      });
      const activeFiles = new Set(
        activePosts
          .map((p) => p.imageUrl)
          .filter(Boolean)
          .map((url) => path.basename(url!))
      );

      for (const file of files) {
        if (file === ".gitkeep") continue;
        // Only process files matching our naming pattern (prevent symlink attacks)
        if (!/^post-[a-zA-Z0-9_-]+-\d+\.(png|jpg|jpeg)$/.test(file)) continue;
        if (!activeFiles.has(file)) {
          // Check file age — only delete if older than cutoff
          const filepath = path.join(generatedDir, file);
          // Use lstat to detect symlinks and skip them
          const stat = fs.lstatSync(filepath);
          if (stat.isSymbolicLink()) continue;
          if (stat.isFile() && stat.mtime < cutoff) {
            fs.unlinkSync(filepath);
            deleted++;
            console.log(`[Cleanup] Deleted orphaned file: ${file}`);
          }
        }
      }
    }
  } catch (err) {
    console.error("[Cleanup] Error cleaning orphaned files:", (err as Error).message);
    errors++;
  }

  return { deleted, errors };
}
