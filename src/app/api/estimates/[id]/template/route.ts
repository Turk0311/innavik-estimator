import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { SCOPE_TEMPLATES } from "@/lib/scopeTemplates";
import { Tier } from "@/generated/prisma";
import { getEstimateMarkup } from "@/lib/estimateMarkup";

type RouteContext = { params: Promise<{ id: string }> };

function resolvePackages(product: { packages: string; tier: string }): string {
  // If explicitly configured away from the default, use the catalog value
  if (product.packages && product.packages !== "good,better,best") return product.packages;
  // Otherwise derive from tier so BETTER→"better,best" and BEST→"best" automatically
  if (product.tier === "BEST" || product.tier === "BEST_PLUS") return "best";
  if (product.tier === "BETTER" || product.tier === "BETTER_PLUS") return "better,best";
  return "good,better,best";
}

// POST /api/estimates/[id]/template?scope=Wall+Assembly
// Looks up each product in the scope template by exact name (case-insensitive),
// adds found products as estimate items with defaultQty.
// Returns { added, notFound } counts.
export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: estimateId } = await context.params;
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope")?.trim();

  if (!scope) {
    return NextResponse.json({ error: "scope query param required" }, { status: 400 });
  }

  // Verify estimate access
  const estimate = await prisma.estimate.findUnique({ where: { id: estimateId } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && estimate.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let added = 0;
  const notFound: string[] = [];
  const markup = await getEstimateMarkup(estimateId);

  // 1. Check for an admin-configured DB Assembly matching this scope name
  const dbAssembly = await prisma.assembly.findFirst({
    where: { name: { equals: scope, mode: "insensitive" } },
    include: { items: true },
  });

  if (dbAssembly && dbAssembly.items.length > 0) {
    // Use DB assembly items — look up each product by ID
    const productIds = dbAssembly.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const asmItem of dbAssembly.items) {
      const product = productMap.get(asmItem.productId);
      if (!product) {
        notFound.push(asmItem.productId);
        continue;
      }

      await prisma.estimateItem.create({
        data: {
          estimateId,
          productId: product.id,
          description: product.name,
          quantity: asmItem.quantity,
          unit: product.unit,
          cost: product.cost,
          markup,
          tier: product.tier as Tier,
          packages: resolvePackages(product),
          category: scope,
          isLabor: false,
          sku: product.sku ?? null,
          supplier: product.supplier ?? null,
        },
      });

      added++;
    }

    return NextResponse.json({ added, notFound });
  }

  // 2. Fall back to hardcoded SCOPE_TEMPLATES
  const template = SCOPE_TEMPLATES[scope];
  if (!template || template.length === 0) {
    return NextResponse.json({ error: `No template defined for scope: ${scope}` }, { status: 404 });
  }

  for (const tplItem of template) {
    // Look up by exact name (case-insensitive)
    const product = await prisma.product.findFirst({
      where: {
        name: { equals: tplItem.productName, mode: "insensitive" },
        active: true,
      },
    });

    if (!product) {
      notFound.push(tplItem.productName);
      continue;
    }

    await prisma.estimateItem.create({
      data: {
        estimateId,
        productId: product.id,
        description: product.name,
        quantity: tplItem.defaultQty,
        unit: product.unit,
        cost: product.cost,
        markup,
        tier: product.tier as Tier,
        packages: resolvePackages(product),
        category: scope,
        isLabor: tplItem.isLabor ?? false,
        sku: product.sku ?? null,
        supplier: product.supplier ?? null,
      },
    });

    added++;
  }

  return NextResponse.json({ added, notFound });
}

// DELETE /api/estimates/[id]/template?scope=Decking
// Removes all items in the given scope (category) from this estimate.
export async function DELETE(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: estimateId } = await context.params;
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope")?.trim();

  if (!scope) {
    return NextResponse.json({ error: "scope query param required" }, { status: 400 });
  }

  const estimate = await prisma.estimate.findUnique({ where: { id: estimateId } });
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && estimate.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { count } = await prisma.estimateItem.deleteMany({
    where: { estimateId, category: scope },
  });

  return NextResponse.json({ deleted: count });
}
