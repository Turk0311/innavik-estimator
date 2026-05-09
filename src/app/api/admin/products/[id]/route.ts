import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  if (session.user.role !== "ADMIN") return null;
  return session;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { sku, name, category, subCategory, supplier, cost, unit, tier, active } = body;

  const data: Record<string, unknown> = {};
  if (sku !== undefined) data.sku = sku || null;
  if (name !== undefined) data.name = name;
  if (category !== undefined) data.category = category;
  if (subCategory !== undefined) data.subCategory = subCategory || null;
  if (supplier !== undefined) data.supplier = supplier || null;
  if (cost !== undefined) data.cost = parseFloat(cost);
  if (unit !== undefined) data.unit = unit;
  if (tier !== undefined) data.tier = tier;
  if (active !== undefined) data.active = Boolean(active);

  try {
    const product = await prisma.product.update({
      where: { id },
      data,
    });
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
}
