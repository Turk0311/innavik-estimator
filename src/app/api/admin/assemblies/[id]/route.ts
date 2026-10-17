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

export async function PUT(request: Request, { params }: RouteParams) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { name, tradeType, description, items } = body;

  if (!name || !tradeType) {
    return NextResponse.json({ error: "name and tradeType are required" }, { status: 400 });
  }

  // Replace all items: delete existing then recreate
  await prisma.assemblyItem.deleteMany({ where: { assemblyId: id } });

  const assembly = await prisma.assembly.update({
    where: { id },
    data: {
      name,
      tradeType,
      description: description || null,
      items: {
        create: (items ?? []).map((item: { productId: string; quantity: number; unit: string; coverageSqft?: number | null }) => ({
          productId: item.productId,
          quantity: item.quantity,
          unit: item.unit,
          coverageSqft: item.coverageSqft ?? null,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json(assembly);
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  await prisma.assemblyItem.deleteMany({ where: { assemblyId: id } });
  await prisma.assembly.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
