import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const assemblies = await prisma.assembly.findMany({
    include: { items: true },
    orderBy: [{ tradeType: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(assemblies);
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { name, tradeType, description, items } = body;

  if (!name || !tradeType) {
    return NextResponse.json({ error: "name and tradeType are required" }, { status: 400 });
  }

  const assembly = await prisma.assembly.create({
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

  return NextResponse.json(assembly, { status: 201 });
}
