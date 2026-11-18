import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  calculateRoofingAssembly,
  calculateSidingAssembly,
  calculateInteriorAssembly,
  calculatePlumbingElectricalAssembly,
  calculatePaintingAssembly,
  calculateDemoAssembly,
  calculateGeneralLaborAssembly,
  calculateKitchenAssembly,
  calculateDeckAssembly,
  calculateDeckingAccessoriesAssembly,
  calculateDeckFramingAssembly,
  calculateDeckFramingAccessoriesAssembly,
  calculateGutterAssembly,
  calculateWallAssembly,
  calculateWindowsDoorAssembly,
  calculateInteriorDoorsAssembly,
  calculateInteriorDoorHardwareAssembly,
  calculateFlooringAssembly,
  calculateTileAssembly,
  calculateBathroomAssembly,
  calculateInsulationAssembly,
  calculateInsulationAccessoriesAssembly,
  calculateDrywallAssembly,
  calculateDrywallAccessoriesAssembly,
  calculateInteriorTrimAssembly,
  calculateExteriorTrimAssembly,
  type MeasurementData,
} from "@/lib/assemblyEngine";
import { Prisma } from "@/generated/prisma";
import { Tier } from "@/generated/prisma";
import { DEFAULT_MARKUP, getEstimateMarkup } from "@/lib/estimateMarkup";
import { clampMarkup } from "@/lib/pricing";

type RouteContext = { params: Promise<{ id: string }> };

// Every category an assembly writes, keyed by lowercase trade
const TRADE_CLEAR_MAP: Record<string, string[]> = {
  "roofing":                      ["Roofing", "Roofing Accessories"],
  "siding":                       ["Siding", "Siding Accessories"],
  "siding accessories":           ["Siding", "Siding Accessories"],
  "interior trim":                ["Interior Trim", "Interior Trim Accessories"],
  "interior trim accessories":    ["Interior Trim", "Interior Trim Accessories"],
  "exterior trim":                ["Exterior Trim", "Exterior Trim Accessories"],
  "exterior trim accessories":    ["Exterior Trim", "Exterior Trim Accessories"],
  "decking":                      ["Decking", "Deck"],
  "deck":                         ["Decking", "Deck"],
  "decking accessories":          ["Decking Accessories"],
  "deck framing":                 ["Deck Framing"],
  "deck framing accessories":     ["Deck Framing Accessories"],
  "gutters":                      ["Gutters"],
};

async function verifyAccess(estimateId: string, userId: string, isAdmin: boolean) {
  const estimate = await prisma.estimate.findUnique({ where: { id: estimateId } });
  if (!estimate) return null;
  if (!isAdmin && estimate.userId !== userId) return null;
  return estimate;
}

// GET — retrieve saved measurements for an estimate
export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const isAdmin = session.user.role === "ADMIN";
  const estimate = await verifyAccess(id, session.user.id, isAdmin);
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const measurements = await prisma.measurement.findMany({
    where: { estimateId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(measurements);
}

// POST — save measurements and (optionally) run assembly engine to add items
export async function POST(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized — not logged in" }, { status: 401 });

  const { id: estimateId } = await context.params;
  const isAdmin = session.user.role === "ADMIN";
  const userId = session.user.id;

  const rawEstimate = await prisma.estimate.findUnique({ where: { id: estimateId } });
  if (!rawEstimate) {
    console.error(`[measurements POST] estimate ${estimateId} not found in DB`);
    return NextResponse.json({ error: `Estimate ${estimateId} not found` }, { status: 404 });
  }
  if (!isAdmin && rawEstimate.userId !== userId) {
    console.error(`[measurements POST] access denied: estimate.userId=${rawEstimate.userId} session.userId=${userId}`);
    return NextResponse.json({ error: `Access denied (userId mismatch)` }, { status: 404 });
  }
  const estimate = rawEstimate;

  const body = await request.json();
  const { tradeType, data: measurementData, applyAssembly } = body as {
    tradeType: string;
    data: MeasurementData;
    applyAssembly?: boolean;
  };

  if (!tradeType || !measurementData) {
    return NextResponse.json({ error: "tradeType and data are required" }, { status: 400 });
  }

  // Upsert measurement (one per trade per estimate)
  const existing = await prisma.measurement.findFirst({
    where: { estimateId, tradeType },
  });

  const measurement = existing
    ? await prisma.measurement.update({
        where: { id: existing.id },
        data: { data: measurementData as Prisma.InputJsonValue },
      })
    : await prisma.measurement.create({
        data: { estimateId, tradeType, data: measurementData as Prisma.InputJsonValue },
      });

  // If applyAssembly flag set, calculate and insert line items
  if (applyAssembly) {
    const trade = tradeType.toLowerCase();

    // ── Pre-clear stale items BEFORE the assembly try/catch ──────────────────
    // Running this outside the try block guarantees old items are wiped even
    // if the assembly function later throws or returns 0 items.
    const estimateMarkup = await getEstimateMarkup(estimateId);
    const categoriesToPreClear = TRADE_CLEAR_MAP[trade] ?? [];
    for (const cat of categoriesToPreClear) {
      await prisma.estimateItem.deleteMany({
        where: { estimateId, category: { equals: cat, mode: 'insensitive' } },
      });
    }
    if (categoriesToPreClear.length > 0) {
      console.log(`[assembly] pre-cleared categories for "${tradeType}":`, categoriesToPreClear);
    }

    try {
    // Load ALL active products
    const allProducts = await prisma.product.findMany({
      where: { active: true },
      select: { id: true, name: true, cost: true, unit: true, category: true, subCategory: true, tier: true, packages: true, sku: true, supplier: true },
    });

    // Load ALL curated assemblies for this trade and promote their products to
    // the front of the list so the engine's .find() calls prefer admin-selected
    // products over fuzzy-matched alternatives.  Using findMany (not findFirst)
    // ensures both "Siding" and "Siding Accessories" assemblies are respected.
    const tradeAssemblies = await prisma.assembly.findMany({
      where: { tradeType: { equals: tradeType, mode: 'insensitive' } },
      select: { name: true, items: { select: { productId: true, quantity: true, unit: true, coverageSqft: true } } },
    });

    let products = allProducts;
    const allAssemblyIds = new Set(tradeAssemblies.flatMap(a => a.items.map(i => i.productId)));
    if (allAssemblyIds.size > 0) {
      const assemblyProducts = allProducts.filter(p => allAssemblyIds.has(p.id));
      const remainingProducts = allProducts.filter(p => !allAssemblyIds.has(p.id));
      // Assembly products first → engine's .find() prefers them
      products = [...assemblyProducts, ...remainingProducts];
    }

    let assemblyItems: Awaited<ReturnType<typeof calculateRoofingAssembly>> = [];

    if (trade === "roofing") {
      assemblyItems = calculateRoofingAssembly(measurementData, products);
    } else if (trade === "siding") {
      assemblyItems = calculateSidingAssembly(measurementData, products);
    } else if (trade === "interior") {
      assemblyItems = calculateInteriorAssembly(measurementData, products);
    } else if (trade === "plumbing/electrical" || trade === "plumbing" || trade === "electrical") {
      assemblyItems = calculatePlumbingElectricalAssembly(measurementData, products);
    } else if (trade === "painting") {
      assemblyItems = calculatePaintingAssembly(measurementData, products);
    } else if (trade === "demo") {
      assemblyItems = calculateDemoAssembly(measurementData, products);
    } else if (trade === "general labor") {
      assemblyItems = calculateGeneralLaborAssembly(measurementData, products, tradeAssemblies);
    } else if (trade === "kitchen") {
      assemblyItems = calculateKitchenAssembly(measurementData, products);
    } else if (trade === "decking") {
      assemblyItems = calculateDeckAssembly(measurementData, products);
    } else if (trade === "deck") {
      assemblyItems = calculateDeckAssembly(measurementData, products);
    } else if (trade === "decking accessories") {
      assemblyItems = calculateDeckingAccessoriesAssembly(measurementData, products);
    } else if (trade === "deck framing accessories") {
      assemblyItems = calculateDeckFramingAccessoriesAssembly(measurementData, products);
    } else if (trade === "deck framing") {
      assemblyItems = calculateDeckFramingAssembly(measurementData, products);
    } else if (trade === "gutters") {
      assemblyItems = calculateGutterAssembly(measurementData, products);
    } else if (trade === "wall assembly" || trade === "wall") {
      assemblyItems = calculateWallAssembly(measurementData, products);
    } else if (trade === "interior doors") {
      assemblyItems = calculateInteriorDoorsAssembly(measurementData, products);
    } else if (trade === "interior door assembly") {
      assemblyItems = calculateInteriorDoorHardwareAssembly(measurementData, products);
    } else if (trade === "windows/doors" || trade === "windows" || trade === "doors") {
      assemblyItems = calculateWindowsDoorAssembly(measurementData, products);
    } else if (trade === "flooring") {
      assemblyItems = calculateFlooringAssembly(measurementData, products);
    } else if (trade === "tile") {
      assemblyItems = calculateTileAssembly(measurementData, products);
    } else if (trade === "bathroom") {
      assemblyItems = calculateBathroomAssembly(measurementData, products);
    } else if (trade === "insulation") {
      assemblyItems = calculateInsulationAssembly(measurementData, products);
    } else if (trade === "insulation accessories") {
      assemblyItems = calculateInsulationAccessoriesAssembly(measurementData, products);
    } else if (trade === "drywall") {
      assemblyItems = calculateDrywallAssembly(measurementData, products);
    } else if (trade === "drywall accessories") {
      assemblyItems = calculateDrywallAccessoriesAssembly(measurementData, products);
    } else if (trade === "interior trim") {
      assemblyItems = calculateInteriorTrimAssembly(measurementData, products);
    } else if (trade === "interior trim accessories") {
      // Run full Interior Trim assembly — populates BOTH categories so
      // clicking Apply from either tab always gives the complete result.
      assemblyItems = calculateInteriorTrimAssembly(measurementData, products);
    } else if (trade === "exterior trim") {
      assemblyItems = calculateExteriorTrimAssembly(measurementData, products);
    } else if (trade === "exterior trim accessories") {
      // Run full Exterior Trim assembly for the same reason.
      assemblyItems = calculateExteriorTrimAssembly(measurementData, products);
    }

    console.log(`[assembly] "${tradeType}" → ${assemblyItems.length} items:`,
      assemblyItems.map(i => `${i.category}/${i.description} qty=${i.quantity} pkg=${i.packages ?? 'none'}`));

    if (assemblyItems.length > 0) {
      // Clear any remaining categories the new items will occupy that weren't pre-cleared
      const newCategories = [...new Set(assemblyItems.map((i) => i.category))];
      const alreadyCleared = new Set(categoriesToPreClear);
      for (const cat of newCategories) {
        if (!alreadyCleared.has(cat)) {
          await prisma.estimateItem.deleteMany({ where: { estimateId, category: { equals: cat, mode: 'insensitive' } } });
        }
      }

      // Build a productId → {sku, supplier} lookup so we can store them on each line item
      const productMeta = new Map(products.map(p => [p.id, { sku: p.sku, supplier: p.supplier }]));

      await prisma.estimateItem.createMany({
        data: assemblyItems.map((item) => {
          const pid = item.productId ?? "assembly";
          const meta = productMeta.get(pid);
          return {
            estimateId,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            cost: item.cost,
            // Engine default markup follows the estimate's global; deliberate ones (e.g. Roofing Charge) stay
            markup: clampMarkup(item.category, item.markup === DEFAULT_MARKUP ? estimateMarkup : item.markup),
            tier: item.tier as Tier,
            packages: item.packages ?? "good,better,best",
            category: item.category,
            isLabor: item.isLabor,
            productId: pid,
            sku: meta?.sku ?? null,
            supplier: meta?.supplier ?? null,
          };
        }),
      });
    }

    // For decking: compute per-tier display labels ("Prime – Dark Teak", "CedarTone PT", etc.)
    // and persist them in the measurement data so EstimateBuilder can show them instead of Good/Better/Best.
    if (trade === 'decking' || trade === 'deck') {
      const deckIds: string[] = Array.isArray(measurementData.deckProductIds)
        ? (measurementData.deckProductIds as string[]) : []
      const resolvedDeck = deckIds
        .map(id => products.find(p => p.id === id))
        .filter((p): p is typeof products[0] => !!p)
        .sort((a, b) => a.cost - b.cost)

      if (resolvedDeck.length > 0) {
        const TIER_KEYS = ['good', 'better', 'best', 'good_plus', 'better_plus', 'best_plus']
        const tierLabels: Record<string, string> = {}
        for (let i = 0; i < resolvedDeck.length; i++) {
          const key = TIER_KEYS[i]; if (!key) break
          const prod = resolvedDeck[i]
          const sub = prod.subCategory ?? ''
          const isCollection = sub.toLowerCase().includes('collection')
          let label: string
          if (isCollection) {
            const afterLen = prod.name.replace(/^.*?\d+['"]\s*/i, '')
            const cleaned = afterLen.replace(/\([^)]*\)\s*/g, '').replace(/\d+['"]\s*[Xx]\s*\d+['"]\s*/gi, '')
            const m = cleaned.match(/^(.+?)\s+(GV|SQ)\b/i)
            const rawColor = (m ? m[1] : cleaned.split(/\s+(GV|SQ)\b/i)[0] ?? '').trim()
            const color = rawColor.replace(/(?<![A-Za-z])(PRIME\+|PRIME|PREMIER|SCALLOPED)(?![A-Za-z])/gi, '').trim()
            const baseName = sub.replace(/\s*Collection\s*/i, '').trim()
            label = color
              ? `${baseName} – ${color.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}`
              : baseName
          } else {
            label = sub || prod.name
          }
          tierLabels[key] = label
        }
        const updatedData = { ...(measurementData as Record<string, unknown>), _tierLabels: tierLabels }
        await prisma.measurement.update({ where: { id: measurement.id }, data: { data: updatedData as Prisma.InputJsonValue } })
      }
    }

    return NextResponse.json({
      measurement,
      itemsCreated: assemblyItems.length,
      debug: assemblyItems.map(i => ({ cat: i.category, desc: i.description, qty: i.quantity, pkg: i.packages ?? 'none' })),
    });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[assembly] ${tradeType}:`, err);
      return NextResponse.json(
        { error: `Assembly failed: ${message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ measurement });
}

// DELETE — remove a scope tab and all its estimate items
export async function DELETE(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: estimateId } = await context.params;
  const isAdmin = session.user.role === "ADMIN";
  const estimate = await verifyAccess(estimateId, session.user.id, isAdmin);
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const tabName = searchParams.get("tab"); // normalized tab name, e.g. "Roofing"
  if (!tabName) return NextResponse.json({ error: "tab query param required" }, { status: 400 });

  // Remove all raw scopes that map to this tab from the stored scopes list
  const existingNotes = estimate.notes || "";
  const scopesLine = existingNotes.split("\n").find((l) => l.startsWith("__scopes__:"));
  let currentScopes: string[] = [];
  if (scopesLine) {
    try { currentScopes = JSON.parse(scopesLine.replace("__scopes__:", "")).scopes ?? []; } catch { /* ignore */ }
  }

  function normalizeTrade(scope: string): string {
    const s = scope.toLowerCase();
    if (["floor protection","room protection","contents movement","mitigation"].includes(s)) return "General Labor";
    if (s.includes("roof")) return "Roofing";
    if (s.includes("sid")) return "Siding";
    if (s.includes("kitchen")) return "Kitchen";
    if (s.includes("interior") && s.includes("trim") && s.includes("accessor")) return "Interior Trim Accessories";
    if (s.includes("interior") && s.includes("trim")) return "Interior Trim";
    if (s.includes("interior") && s.includes("door")) return s.includes("assembl") || s.includes("accessor") ? "Interior Door Assembly" : "Interior Doors";
    if (s.includes("interior")) return "Interior Trim";
    if (s.includes("exterior") && s.includes("trim") && s.includes("accessor")) return "Exterior Trim Accessories";
    if (s.includes("exterior") && s.includes("trim")) return "Exterior Trim";
    if (s.includes("plumb") || s.includes("electric")) return "Plumbing/Electrical";
    if (s.includes("demo") || s.includes("demolition")) return "Demo";
    if (s.includes("paint")) return "Painting";
    if (s.includes("general labor") || s === "labor") return "General Labor";
    if (s.includes("decking") && s.includes("accessor")) return "Decking Accessories";
    if (s.includes("deck") && s.includes("framing") && s.includes("accessor")) return "Deck Framing Accessories";
    if (s.includes("deck") && s.includes("framing")) return "Deck Framing";
    if (s === "decking" || s.includes("deck")) return "Decking";
    if (s.includes("gutter")) return "Gutters";
    if (s.startsWith("wall")) return "Wall Assembly";
    if (s.includes("floor")) return "Flooring";
    if (s.includes("tile")) return "Tile";
    if (s.includes("vanity") || s.includes("toilet") || s.includes("sink") || s.includes("faucet") || s.includes("shower")) return "Bathroom";
    if (s.includes("window") || s.includes("door")) return "Windows/Doors";
    if (s.includes("insul") && s.includes("accessor")) return "Insulation Accessories";
    if (s.includes("insul")) return "Insulation";
    if (s.includes("drywall") && s.includes("accessor")) return "Drywall Accessories";
    if (s.includes("drywall")) return "Drywall";
    return scope;
  }

  const newScopes = currentScopes.filter((s) => normalizeTrade(s) !== tabName);

  // Rebuild notes
  const plainNotes = existingNotes.split("\n").filter((l) => !l.startsWith("__scopes__:")).join("\n");
  const scopeData = newScopes.length > 0 ? `__scopes__:${JSON.stringify({ scopes: newScopes })}` : null;
  const finalNotes = [scopeData, plainNotes || null].filter(Boolean).join("\n") || null;

  await prisma.estimate.update({ where: { id: estimateId }, data: { notes: finalNotes } });

  // Delete this tab's categories, keeping any still owned by a remaining tab
  const remainingTabs = new Set(newScopes.map((s) => normalizeTrade(s).toLowerCase()));
  const categories = [...new Set([tabName, ...(TRADE_CLEAR_MAP[tabName.toLowerCase()] ?? [])])]
    .filter((c) => !remainingTabs.has(c.toLowerCase()));
  for (const cat of categories) {
    await prisma.estimateItem.deleteMany({
      where: { estimateId, category: { equals: cat, mode: "insensitive" } },
    });
  }

  // Also delete saved measurement record for this tab
  await prisma.measurement.deleteMany({
    where: { estimateId, tradeType: { equals: tabName, mode: "insensitive" } },
  });

  return NextResponse.json({ removed: tabName, remainingScopes: newScopes });
}
