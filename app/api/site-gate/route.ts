import { NextRequest, NextResponse } from "next/server";
import { createGateResponse } from "@/lib/site-gate";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }
    return createGateResponse(password);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
