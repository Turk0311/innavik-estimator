import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const category = searchParams.get("category")?.trim() ?? "";
  const type = searchParams.get("type")?.trim() ?? "material"; // "material" or "labor"

  const LABOR_CATEGORIES = ["Labor", "Roofing Labor"];

  const where: Record<string, unknown> = { active: true };

  if (category) {
    where.category = category;
  } else if (type === "labor") {
    where.category = { in: LABOR_CATEGORIES };
  } else {
    // materials — exclude labor categories
    where.category = { notIn: LABOR_CATEGORIES };
  }

  if (search) {
    where.AND = [
      {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ],
      },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    take: 50,
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: {
      id: true,
      sku: true,
      name: true,
      cost: true,
      unit: true,
      category: true,
      subCategory: true,
      supplier: true,
      tier: true,
    },
  });

  return NextResponse.json(products);
}
