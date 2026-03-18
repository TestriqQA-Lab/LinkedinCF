import { NextRequest, NextResponse } from "next/server";
import { runImageCleanup } from "@/lib/scheduler";

export const maxDuration = 120; // Image cleanup may take longer

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runImageCleanup();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[Cron:image-cleanup] Error:", err);
    return NextResponse.json({ error: "Image cleanup job failed" }, { status: 500 });
  }
}
