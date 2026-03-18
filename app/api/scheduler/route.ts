import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { startScheduler } from "@/lib/scheduler";

/**
 * Protected scheduler trigger endpoint.
 * Must be called with Authorization: Bearer CRON_SECRET header.
 * Use this from a cron service (e.g., Vercel Cron, Railway Cron, external).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Timing-safe comparison to prevent timing attacks
  const secretBuf = Buffer.from(secret, "utf-8");
  const expectedBuf = Buffer.from(cronSecret, "utf-8");
  if (secretBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  startScheduler();
  return NextResponse.json({ ok: true, message: "Scheduler running" });
}
