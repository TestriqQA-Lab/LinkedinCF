import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { postToLinkedIn } from "@/lib/linkedin-post";
import { getTokenStatus, refreshAccessToken } from "@/lib/linkedin-token";
import { sendNewsletterEmail, sendTrialReminderEmail, type NewsletterContent } from "@/lib/email";
import { cleanupOldImages } from "@/lib/image-cleanup";

let schedulerStarted = false;

export function startScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // NOTE: The scheduler operates entirely in UTC. It compares the current
  // UTC time against scheduledAt, which is always stored as UTC in the database.
  // Timezone conversion happens upstream when scheduledAt is set:
  // - Post generation: app/api/generate/posts/route.ts
  // - Manual scheduling: components/PostEditorClient.tsx → /api/content/[id]

  // Run every minute — check for posts due in the next 60 seconds
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const windowEnd = new Date(now.getTime() + 60 * 1000);

      const duePosts = await prisma.post.findMany({
        where: {
          status: "ready",
          postedToLinkedIn: false,
          scheduledAt: { gte: now, lt: windowEnd },
          plan: {
            user: {
              subscription: {
                status: { in: ["active", "trialing", "cancel_pending"] },
              },
            },
          },
        },
        include: { plan: true },
      });

      if (duePosts.length > 0) {
        console.log(
          `[Scheduler] Found ${duePosts.length} post(s) due for publishing`
        );
      }

      for (const post of duePosts) {
        console.log(
          `[Scheduler] Auto-posting post ${post.id} for user ${post.plan.userId}`
        );
        const result = await postToLinkedIn(post.plan.userId, {
          title: post.title,
          body: post.body,
          hashtags: post.hashtags,
          imageUrl: post.imageUrl,
        });

        await prisma.post.update({
          where: { id: post.id },
          data: {
            postedToLinkedIn: result.success,
            linkedinPostId: result.linkedinPostId ?? undefined,
            status: result.success ? "published" : "ready",
            postError: result.error ?? null,
          },
        });

        if (result.success) {
          console.log(
            `[Scheduler] Successfully posted ${post.id} → LinkedIn ID: ${result.linkedinPostId}`
          );
        } else {
          console.error(
            `[Scheduler] Failed to post ${post.id}: ${result.error}`
          );
        }
      }
    } catch (err) {
      console.error("[Scheduler] Error in scheduled job:", err);
    }
  });

  // Newsletter scheduler — same 1-minute cadence
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const windowEnd = new Date(now.getTime() + 60 * 1000);

      const dueNewsletters = await prisma.newsletter.findMany({
        where: {
          status: "scheduled",
          scheduledAt: { gte: now, lt: windowEnd },
          user: {
            subscription: { status: { in: ["active", "trialing"] } },
          },
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      if (dueNewsletters.length > 0) {
        console.log(`[Scheduler] Found ${dueNewsletters.length} newsletter(s) due for sending`);
      }

      for (const nl of dueNewsletters) {
        if (!nl.user.email) {
          console.error(`[Scheduler] No email for newsletter ${nl.id}`);
          continue;
        }

        let content: NewsletterContent;
        try {
          content = JSON.parse(nl.body) as NewsletterContent;
        } catch {
          console.error(`[Scheduler] Invalid newsletter body for ${nl.id}`);
          continue;
        }

        const result = await sendNewsletterEmail({
          to: nl.user.email,
          authorName: nl.user.name ?? "Author",
          content,
        });

        await prisma.newsletter.update({
          where: { id: nl.id },
          data: {
            status: result.success ? "sent" : "scheduled",
            ...(result.success ? { scheduledAt: null } : {}),
          },
        });

        if (result.success) {
          console.log(`[Scheduler] Newsletter ${nl.id} sent to ${nl.user.email}`);
        } else {
          console.error(`[Scheduler] Newsletter ${nl.id} send failed: ${result.error}`);
        }
      }
    } catch (err) {
      console.error("[Scheduler] Newsletter job error:", err);
    }
  });

  // Trial reminder emails — runs daily at 8 AM UTC
  cron.schedule("0 8 * * *", async () => {
    try {
      const now = new Date();

      const trialingSubs = await prisma.subscription.findMany({
        where: {
          status: "trialing",
          trialEnd: { not: null },
        },
        include: {
          user: { select: { email: true, name: true } },
        },
      });

      for (const sub of trialingSubs) {
        if (!sub.trialEnd || !sub.user.email) continue;

        const daysLeft = Math.ceil(
          (sub.trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );
        const alreadySent = sub.trialRemindersSent
          .split(",")
          .filter(Boolean);

        let reminderTag: string | null = null;
        let daysRemaining: number | null = null;

        if (daysLeft <= 0 && !alreadySent.includes("0d")) {
          reminderTag = "0d";
          daysRemaining = 0;
        } else if (daysLeft === 1 && !alreadySent.includes("1d")) {
          reminderTag = "1d";
          daysRemaining = 1;
        } else if (daysLeft <= 3 && daysLeft > 1 && !alreadySent.includes("3d")) {
          reminderTag = "3d";
          daysRemaining = 3;
        }

        if (reminderTag !== null && daysRemaining !== null) {
          const subscribeUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3002"}/subscribe`;

          const result = await sendTrialReminderEmail({
            to: sub.user.email,
            userName: sub.user.name?.split(" ")[0] || "there",
            daysRemaining,
            subscribeUrl,
          });

          if (result.success) {
            const updated = alreadySent.length > 0
              ? `${sub.trialRemindersSent},${reminderTag}`
              : reminderTag;
            await prisma.subscription.update({
              where: { id: sub.id },
              data: { trialRemindersSent: updated },
            });
            console.log(
              `[Scheduler] Sent ${reminderTag} trial reminder to ${sub.user.email}`
            );
          } else {
            console.error(
              `[Scheduler] Trial reminder failed for ${sub.user.email}: ${result.error}`
            );
          }
        }
      }
    } catch (err) {
      console.error("[Scheduler] Trial reminder job error:", err);
    }
  });

  // Image cleanup — runs daily at 3 AM
  cron.schedule("0 3 * * *", async () => {
    try {
      console.log("[Scheduler] Running image cleanup...");
      const result = await cleanupOldImages();
      if (result.deleted > 0 || result.errors > 0) {
        console.log(
          `[Scheduler] Image cleanup complete: ${result.deleted} deleted, ${result.errors} errors`
        );
      }
    } catch (err) {
      console.error("[Scheduler] Image cleanup error:", err);
    }
  });

  // Proactive LinkedIn token refresh — runs daily at 6 AM UTC
  // Refreshes tokens that expire within 7 days to prevent failed auto-posts
  cron.schedule("0 6 * * *", async () => {
    try {
      // Find all active users with LinkedIn accounts
      const accounts = await prisma.account.findMany({
        where: {
          provider: "linkedin",
          access_token: { not: null },
          user: {
            subscription: {
              status: { in: ["active", "trialing", "cancel_pending"] },
            },
          },
        },
        select: { userId: true, expires_at: true },
      });

      const nowSecs = Math.floor(Date.now() / 1000);
      const sevenDaysSecs = 7 * 24 * 60 * 60;
      let refreshed = 0;
      let failed = 0;

      for (const acct of accounts) {
        // Only refresh tokens expiring within 7 days
        if (acct.expires_at && acct.expires_at <= nowSecs + sevenDaysSecs) {
          const status = await getTokenStatus(acct.userId);
          if (status.refreshable) {
            const result = await refreshAccessToken(acct.userId);
            if (result.success) {
              refreshed++;
            } else {
              failed++;
              console.warn(
                `[Scheduler] Token refresh failed for user ${acct.userId}: ${result.error}`
              );
            }
          } else {
            console.warn(
              `[Scheduler] Token expiring for user ${acct.userId} but no refresh token available`
            );
          }
        }
      }

      if (refreshed > 0 || failed > 0) {
        console.log(
          `[Scheduler] Token refresh: ${refreshed} refreshed, ${failed} failed out of ${accounts.length} checked`
        );
      }
    } catch (err) {
      console.error("[Scheduler] Token refresh job error:", err);
    }
  });

  console.log("✅ LinkedIn auto-post scheduler started (runs every minute)");
  console.log("✅ Newsletter scheduler started (runs every minute)");
  console.log("✅ Image cleanup scheduler started (runs daily at 3 AM)");
  console.log("✅ Trial reminder scheduler started (runs daily at 8 AM UTC)");
  console.log("✅ LinkedIn token refresh scheduler started (runs daily at 6 AM UTC)");
}
