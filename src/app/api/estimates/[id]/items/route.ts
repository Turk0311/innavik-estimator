import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Tier } from "@/generated/prisma";
import { getEstimateMarkup } from "@/lib/estimateMarkup";
import { clampMarkup, MIN_MARKUP_BY_CATEGORY } from "@/lib/pricing";

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
    packages,
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

  const validPkgs = new Set(["good", "better", "best"]);
  const pkgList = typeof packages === "string" ? packages : "good,better,best";
  if (!pkgList.split(",").every((p) => validPkgs.has(p.trim()))) {
    return NextResponse.json({ error: "Invalid packages value" }, { status: 400 });
  }

  // Look up sku/supplier from the product catalog if a real productId was supplied
  let sku: string | null = null;
  let supplier: string | null = null;
  if (productId && productId !== "custom") {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { sku: true, supplier: true },
    });
    sku = product?.sku ?? null;
    supplier = product?.supplier ?? null;
  }

  const item = await prisma.estimateItem.create({
    data: {
      estimateId,
      description,
      quantity: Number(quantity),
      unit,
      cost: Number(cost),
      markup: clampMarkup(category, Number(markup ?? 0)),
      tier: tier as Tier,
      packages: pkgList,
      category,
      isLabor: Boolean(isLabor),
      productId: productId || "custom",
      sku,
      supplier,
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PATCH(request: Request, context: RouteContext) {
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

  const existing = await prisma.estimateItem.findUnique({ where: { id: itemId } });
  if (!existing || existing.estimateId !== estimateId) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const body = await request.json();
  const { description, quantity, unit, cost, markup, tier, packages: pkgsPatch } = body;

  if (tier && !["GOOD", "BETTER", "BEST"].includes(tier)) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  let updated;
  try {
    updated = await prisma.estimateItem.update({
      where: { id: itemId },
      data: {
        ...(description != null && { description }),
        ...(quantity    != null && { quantity: Number(quantity) }),
        ...(unit        != null && { unit }),
        ...(cost        != null && { cost: Number(cost) }),
        ...(markup      != null && { markup: clampMarkup(existing.category, Number(markup)) }),
        ...(tier        != null && { tier: tier as Tier }),
        ...(pkgsPatch   != null && { packages: String(pkgsPatch) }),
      },
    });
  } catch (err) {
    console.error("PATCH estimateItem error:", err);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }

  return NextResponse.json(updated);
}

// PUT — move every item on the global markup to a new value; per-line overrides keep theirs
export async function PUT(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: estimateId } = await context.params;

  const estimate = await prisma.estimate.findUnique({ where: { id: estimateId } });
  if (!estimate) return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && estimate.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const markup = Number(body.markup);
  if (isNaN(markup) || markup < 0 || markup > 100) {
    return NextResponse.json({ error: "markup must be 0–100" }, { status: 400 });
  }

  const from = await getEstimateMarkup(estimateId);
  await prisma.estimateItem.updateMany({ where: { estimateId, markup: from }, data: { markup } });
  // Floored trades never drop below their minimum
  for (const [category, min] of Object.entries(MIN_MARKUP_BY_CATEGORY)) {
    await prisma.estimateItem.updateMany({
      where: { estimateId, category: { equals: category, mode: "insensitive" }, markup: { lt: min } },
      data: { markup: min },
    });
  }
  return NextResponse.json({ updated: true, markup, from });
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
