import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const updateData: Record<string, unknown> = {};

  if ("status" in body) {
    updateData.status = body.status;
  }

  if ("extendTrial" in body) {
    const sub = await prisma.subscription.findUnique({ where: { id: params.id } });
    if (sub) {
      const currentEnd = sub.trialEnd ?? new Date();
      const newEnd = new Date(currentEnd);
      newEnd.setDate(newEnd.getDate() + body.extendTrial);
      updateData.trialEnd = newEnd;
      if (!("status" in body)) updateData.status = "trialing";
    }
  }

  if ("trialEnd" in body) {
    updateData.trialEnd = new Date(body.trialEnd);
  }

  const updated = await prisma.subscription.update({
    where: { id: params.id },
    data: updateData,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(updated);
}
