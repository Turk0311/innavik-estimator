import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

function resolvePackages(product: { packages: string; tier: string }): string {
  if (product.packages && product.packages !== "good,better,best") return product.packages;
  if (product.tier === "BEST" || product.tier === "BEST_PLUS") return "best";
  if (product.tier === "BETTER" || product.tier === "BETTER_PLUS") return "better,best";
  return "good,better,best";
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: estimateId } = await context.params;

  const estimate = await prisma.estimate.findUnique({ where: { id: estimateId } });
  if (!estimate) return NextResponse.json({ error: "Estimate not found" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && estimate.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { category } = body as { category?: string };

  // Fetch items for this estimate (optionally filtered by category)
  const items = await prisma.estimateItem.findMany({
    where: {
      estimateId,
      ...(category ? { category } : {}),
    },
    select: { id: true, productId: true },
  });

  // Gather unique productIds (excluding "custom")
  const productIds = [...new Set(items.map((i) => i.productId).filter((p) => p && p !== "custom"))];

  // Look up packages (and tier as fallback) from catalog
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, tier: true, packages: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Update each item
  let updated = 0;
  for (const item of items) {
    const product = productMap.get(item.productId ?? "") ?? null;
    if (!product) continue; // custom items — skip
    // Use explicit product packages if set, otherwise derive from tier
    const packages = resolvePackages(product);
    await prisma.estimateItem.update({
      where: { id: item.id },
      data: { packages },
    });
    updated++;
  }

  return NextResponse.json({ updated, total: items.length });
}
