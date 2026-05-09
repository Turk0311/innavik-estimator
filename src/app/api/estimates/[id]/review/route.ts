import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin only
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  const { id } = await context.params;

  const estimate = await prisma.estimate.findUnique({ where: { id } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (estimate.status !== "pending_review") {
    return NextResponse.json(
      { error: `Estimate is not pending review (status: "${estimate.status}")` },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { action, notes } = body as { action: "approve" | "reject"; notes?: string };

  if (!action || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  const updated = await prisma.estimate.update({
    where: { id },
    data: {
      status: action === "approve" ? "approved" : "rejected",
      reviewNotes: notes ?? null,
    },
  });

  return NextResponse.json(updated);
}
