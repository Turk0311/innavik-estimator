import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { SCOPE_TEMPLATES } from "@/lib/scopeTemplates";
import { Tier } from "@/generated/prisma";

type RouteContext = { params: Promise<{ id: string }> };

const DEFAULT_MARKUP = 30;

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

  const template = SCOPE_TEMPLATES[scope];
  if (!template || template.length === 0) {
    return NextResponse.json({ error: `No template defined for scope: ${scope}` }, { status: 404 });
  }

  let added = 0;
  const notFound: string[] = [];

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
        markup: DEFAULT_MARKUP,
        tier: product.tier as Tier,
        category: scope,
        isLabor: tplItem.isLabor ?? false,
      },
    });

    added++;
  }

  return NextResponse.json({ added, notFound });
}
