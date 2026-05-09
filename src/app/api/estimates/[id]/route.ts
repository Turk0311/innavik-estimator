import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

async function getEstimateOrFail(id: string, userId: string, isAdmin: boolean) {
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      items: { orderBy: { category: "asc" } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!estimate) return null;
  if (!isAdmin && estimate.userId !== userId) return null;
  return estimate;
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const isAdmin = session.user.role === "ADMIN";
  const estimate = await getEstimateOrFail(id, session.user.id, isAdmin);

  if (!estimate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(estimate);
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const isAdmin = session.user.role === "ADMIN";
  const estimate = await getEstimateOrFail(id, session.user.id, isAdmin);

  if (!estimate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, clientName, address, notes, status, scopes } = body;

  // Build notes with scopes metadata if scopes are provided
  let finalNotes = notes !== undefined ? notes : estimate.notes;
  if (scopes !== undefined) {
    // Strip existing scopes prefix if present
    const existingNotes = estimate.notes || "";
    const plainNotes = existingNotes.includes("__scopes__:")
      ? existingNotes
          .split("\n")
          .filter((line) => !line.startsWith("__scopes__:"))
          .join("\n")
      : existingNotes;

    const scopeData = scopes.length > 0 ? `__scopes__:${JSON.stringify({ scopes })}` : null;
    finalNotes = [scopeData, plainNotes || null].filter(Boolean).join("\n") || null;
  }

  const updated = await prisma.estimate.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(clientName !== undefined && { clientName }),
      ...(address !== undefined && { address }),
      ...(status !== undefined && { status }),
      notes: finalNotes,
    },
    include: {
      items: { orderBy: { category: "asc" } },
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const isAdmin = session.user.role === "ADMIN";
  const estimate = await getEstimateOrFail(id, session.user.id, isAdmin);

  if (!estimate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Delete items first, then estimate
  await prisma.estimateItem.deleteMany({ where: { estimateId: id } });
  await prisma.estimate.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
