import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

// Add a single product as a new line item on an existing assembly,
// without disturbing the assembly's other items.
export async function POST(request: Request, { params }: RouteParams) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { productId, quantity, unit, coverageSqft } = body;

  if (!productId || quantity === undefined || !unit) {
    return NextResponse.json({ error: "productId, quantity, and unit are required" }, { status: 400 });
  }

  const assembly = await prisma.assembly.findUnique({ where: { id } });
  if (!assembly) {
    return NextResponse.json({ error: "Assembly not found" }, { status: 404 });
  }

  const item = await prisma.assemblyItem.create({
    data: {
      assemblyId: id,
      productId,
      quantity: parseFloat(quantity),
      unit,
      coverageSqft: coverageSqft != null ? parseFloat(coverageSqft) : null,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
