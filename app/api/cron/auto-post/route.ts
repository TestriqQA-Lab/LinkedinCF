import { NextRequest, NextResponse } from "next/server";
import { runAutoPost } from "@/lib/scheduler";

export const maxDuration = 60; // Allow up to 60s for processing multiple posts

export async function GET(req: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAutoPost();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[Cron:auto-post] Error:", err);
    return NextResponse.json({ error: "Auto-post job failed" }, { status: 500 });
  }
}
