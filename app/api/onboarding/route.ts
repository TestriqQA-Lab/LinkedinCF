import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    positioning,
    contentGoals,
    contentStyles,
    targetAudience,
    headline,
    summary,
    industry,
    timezone,
  } = body;

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      positioning: positioning || null,
      contentGoals: contentGoals ? JSON.stringify(contentGoals) : null,
      contentStyles: contentStyles ? JSON.stringify(contentStyles) : null,
      targetAudience: targetAudience || null,
      headline: headline || undefined,
      summary: summary || undefined,
      industry: industry || undefined,
      timezone: timezone || undefined,
      onboardingCompleted: true,
    },
  });

  return NextResponse.json({ success: true, user: updated });
}
