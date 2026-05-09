import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const estimate = await prisma.estimate.findUnique({ where: { id } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && estimate.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (estimate.status !== "draft") {
    return NextResponse.json(
      { error: `Cannot submit an estimate with status "${estimate.status}"` },
      { status: 400 }
    );
  }

  const updated = await prisma.estimate.update({
    where: { id },
    data: { status: "pending_review" },
  });

  return NextResponse.json(updated);
}
