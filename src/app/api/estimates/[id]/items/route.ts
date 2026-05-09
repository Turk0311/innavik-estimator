import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Tier } from "@/generated/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: estimateId } = await context.params;

  // Verify estimate ownership
  const estimate = await prisma.estimate.findUnique({ where: { id: estimateId } });
  if (!estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }
  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && estimate.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const {
    description,
    quantity,
    unit,
    cost,
    markup,
    tier,
    category,
    isLabor,
    productId,
  } = body;

  if (!description || quantity == null || !unit || cost == null || !tier || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["GOOD", "BETTER", "BEST"].includes(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const item = await prisma.estimateItem.create({
    data: {
      estimateId,
      description,
      quantity: Number(quantity),
      unit,
      cost: Number(cost),
      markup: Number(markup ?? 0),
      tier: tier as Tier,
      category,
      isLabor: Boolean(isLabor),
      productId: productId || "custom",
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: estimateId } = await context.params;

  const estimate = await prisma.estimate.findUnique({ where: { id: estimateId } });
  if (!estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }
  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && estimate.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");

  if (!itemId) {
    return NextResponse.json({ error: "itemId query param required" }, { status: 400 });
  }

  const item = await prisma.estimateItem.findUnique({ where: { id: itemId } });
  if (!item || item.estimateId !== estimateId) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  await prisma.estimateItem.delete({ where: { id: itemId } });

  return NextResponse.json({ success: true });
}
