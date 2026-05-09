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
  calculateGutterAssembly,
  type MeasurementData,
} from "@/lib/assemblyEngine";
import { Prisma } from "@/generated/prisma";
import { Tier } from "@/generated/prisma";

type RouteContext = { params: Promise<{ id: string }> };

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
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: estimateId } = await context.params;
  const isAdmin = session.user.role === "ADMIN";
  const estimate = await verifyAccess(estimateId, session.user.id, isAdmin);
  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
    const products = await prisma.product.findMany({
      where: { active: true },
      select: { id: true, name: true, cost: true, unit: true, category: true, subCategory: true, tier: true },
    });

    let assemblyItems: Awaited<ReturnType<typeof calculateRoofingAssembly>> = [];
    const trade = tradeType.toLowerCase();

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
      assemblyItems = calculateGeneralLaborAssembly(measurementData, products);
    } else if (trade === "kitchen") {
      assemblyItems = calculateKitchenAssembly(measurementData, products);
    } else if (trade === "deck") {
      assemblyItems = calculateDeckAssembly(measurementData, products);
    } else if (trade === "gutters") {
      assemblyItems = calculateGutterAssembly(measurementData, products);
    }

    if (assemblyItems.length > 0) {
      const categories = [...new Set(assemblyItems.map((i) => i.category))];
      for (const cat of categories) {
        await prisma.estimateItem.deleteMany({ where: { estimateId, category: cat } });
      }

      await prisma.estimateItem.createMany({
        data: assemblyItems.map((item) => ({
          estimateId,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          cost: item.cost,
          markup: item.markup,
          tier: item.tier as Tier,
          category: item.category,
          isLabor: item.isLabor,
          productId: item.productId ?? "assembly",
        })),
      });
    }

    return NextResponse.json({
      measurement,
      itemsCreated: assemblyItems.length,
    });
  }

  return NextResponse.json({ measurement });
}
