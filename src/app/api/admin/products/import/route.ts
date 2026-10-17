import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const VALID_TIERS = ["GOOD", "GOOD_PLUS", "BETTER", "BETTER_PLUS", "BEST", "BEST_PLUS"] as const;
type Tier = (typeof VALID_TIERS)[number];

function normalizeTier(raw: string): Tier {
  const up = raw.toUpperCase().replace(/\s+/g, "_");
  return VALID_TIERS.includes(up as Tier) ? (up as Tier) : "GOOD";
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return null;
  return session;
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const rows: Record<string, string>[] = body.rows ?? [];

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const name = row.name?.trim();
    if (!name) {
      errors.push(`Skipped row — missing name`);
      continue;
    }

    // cost / price column (accept either)
    const rawCost = row.cost ?? row.price ?? "";
    const cost = parseFloat(rawCost.replace(/[$,]/g, ""));
    if (isNaN(cost) || cost < 0) {
      errors.push(`"${name}": invalid cost "${rawCost}"`);
      continue;
    }

    // Build update data — only include fields present in the CSV row
    const data: Record<string, unknown> = { cost };
    if (row.sku     !== undefined) data.sku         = row.sku.trim()         || null;
    if (row.category !== undefined && row.category.trim()) data.category     = row.category.trim();
    if (row.subcategory !== undefined) data.subCategory = row.subcategory.trim() || null;
    if (row.supplier !== undefined) data.supplier    = row.supplier.trim()   || null;
    if (row.unit     !== undefined && row.unit.trim()) data.unit             = row.unit.trim();
    if (row.tier     !== undefined && row.tier.trim()) data.tier             = normalizeTier(row.tier);
    if (row.active   !== undefined) {
      data.active = !["false", "0", "no", "inactive"].includes(row.active.toLowerCase());
    }

    try {
      // Match by SKU first (if provided), then by exact name (case-insensitive)
      let existing = null;
      if (row.sku?.trim()) {
        existing = await prisma.product.findFirst({ where: { sku: row.sku.trim() } });
      }
      if (!existing) {
        existing = await prisma.product.findFirst({
          where: { name: { equals: name, mode: "insensitive" } },
        });
      }

      if (existing) {
        await prisma.product.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.product.create({
          data: {
            name,
            cost,
            category:    (data.category    as string)  ?? "Accessory",
            unit:        (data.unit        as string)  ?? "ea",
            sku:         (data.sku        as string | null) ?? null,
            subCategory: (data.subCategory as string | null) ?? null,
            supplier:    (data.supplier    as string | null) ?? null,
            tier:        (data.tier        as Tier)    ?? "GOOD",
            active:      (data.active      as boolean) ?? true,
          },
        });
        created++;
      }
    } catch (e) {
      errors.push(`"${name}": ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  return NextResponse.json({ created, updated, errors });
}
