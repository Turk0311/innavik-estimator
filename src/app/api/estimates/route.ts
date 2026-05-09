import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.user.role === "ADMIN";

  const estimates = await prisma.estimate.findMany({
    where: isAdmin ? undefined : { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { items: true } },
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(estimates);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, clientName, address, notes, scopes } = body;

  if (!name || !clientName) {
    return NextResponse.json(
      { error: "Project name and client name are required" },
      { status: 400 }
    );
  }

  const estimate = await prisma.estimate.create({
    data: {
      name,
      clientName,
      address: address || null,
      notes: notes || null,
      status: "draft",
      userId: session.user.id,
      // Store scopes in notes field as a prefix or in a structured way
      // Since schema has notes field, we'll encode scopes into the estimate
    },
  });

  // We'll store scopes as part of the notes or a separate mechanism
  // Since the schema doesn't have a scopes field, we'll encode it in notes
  // Update notes to include scope metadata
  const scopeData = scopes && scopes.length > 0 ? JSON.stringify({ scopes }) : null;
  const combinedNotes = [scopeData ? `__scopes__:${scopeData}` : null, notes || null]
    .filter(Boolean)
    .join("\n");

  const updatedEstimate = await prisma.estimate.update({
    where: { id: estimate.id },
    data: { notes: combinedNotes || null },
  });

  return NextResponse.json(updatedEstimate, { status: 201 });
}
