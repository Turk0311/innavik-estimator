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

export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const tier = searchParams.get("tier");
  const activeParam = searchParams.get("active");

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (tier) where.tier = tier;
  if (activeParam !== null) where.active = activeParam === "true";

  const products = await prisma.product.findMany({
    where,
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { sku, name, category, subCategory, supplier, cost, unit, tier, active } = body;

  if (!name || !category || cost === undefined || !unit) {
    return NextResponse.json(
      { error: "name, category, cost, and unit are required" },
      { status: 400 }
    );
  }

  const product = await prisma.product.create({
    data: {
      sku: sku || null,
      name,
      category,
      subCategory: subCategory || null,
      supplier: supplier || null,
      cost: parseFloat(cost),
      unit,
      tier: tier || "GOOD",
      active: active !== undefined ? Boolean(active) : true,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
