import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import MeasurementsClient from "./MeasurementsClient";
import { sortBathProducts } from "@/lib/bathProducts";

type PageProps = { params: Promise<{ id: string }> };

function extractScopes(notes: string | null): string[] {
  if (!notes) return [];
  const line = notes.split("\n").find((l) => l.startsWith("__scopes__:"));
  if (!line) return [];
  try {
    const json = JSON.parse(line.replace("__scopes__:", ""));
    return json.scopes ?? [];
  } catch {
    return [];
  }
}

export default async function MeasurementsPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;

  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      measurements: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!estimate) notFound();

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && estimate.userId !== session.user.id) notFound();

  const scopes = extractScopes(estimate.notes);

  // Load General Labor assemblies with product names for the live preview in GeneralLaborMeasurements
  const rawLaborAssemblies = await prisma.assembly.findMany({
    where: { tradeType: "General Labor" },
    select: { name: true, items: { select: { productId: true, quantity: true, unit: true, coverageSqft: true } } },
  });
  const laborProductIds = [...new Set(rawLaborAssemblies.flatMap((a) => a.items.map((i) => i.productId)))];
  const laborProducts = laborProductIds.length > 0
    ? await prisma.product.findMany({ where: { id: { in: laborProductIds } }, select: { id: true, name: true } })
    : [];
  const lpNameMap = new Map(laborProducts.map((p) => [p.id, p.name]));
  const laborAssemblies = rawLaborAssemblies.map((a) => ({
    name: a.name,
    items: a.items.map((i) => ({
      productName: lpNameMap.get(i.productId) ?? i.productId,
      quantity: i.quantity,
      unit: i.unit,
      coverageSqft: i.coverageSqft,
    })),
  }));

  const deckProducts = await prisma.product.findMany({
    where: {
      active: true,
      OR: [
        { category: { in: ["Decking", "Deck", "TT Decking"] } },
        // TimberTech collection subCategories: "Prime Collection", "Vintage Collection", etc.
        { subCategory: { contains: "Collection", mode: "insensitive" } },
        { subCategory: { contains: "CedarTone", mode: "insensitive" } },
        { subCategory: { contains: "Pressure Treated", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, cost: true, unit: true, subCategory: true },
    orderBy: [{ subCategory: "asc" }, { name: "asc" }],
  });

  // Products the bathroom, shower and tile tabs pick from
  const bathProducts = sortBathProducts(await prisma.product.findMany({
    where: { active: true, category: { in: ["Bath", "Toilet", "Vanity", "Sink", "Shower", "Shower Assembly", "Tile"] } },
    select: { id: true, name: true, cost: true, category: true },
  }));

  // Serialize measurements data for client
  const savedMeasurements = estimate.measurements.map((m) => ({
    id: m.id,
    tradeType: m.tradeType,
    data: m.data as Record<string, number | string>,
  }));

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <div className="bg-white rounded-md px-1.5 py-1">
              <Image src="/innavik-logo.png" alt="Innavik" width={2340} height={564} className="h-4 w-auto" />
            </div>
            <span className="text-sm font-medium hidden sm:inline">Innavik</span>
          </Link>
          <span className="text-slate-600">/</span>
          <Link
            href="/dashboard"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Dashboard
          </Link>
          <span className="text-slate-600">/</span>
          <Link
            href={`/estimates/${id}`}
            className="text-sm text-slate-400 hover:text-white transition-colors truncate max-w-[160px]"
          >
            {estimate.name}
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-sm text-white font-medium">Measurements</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Measurements</h1>
          <p className="text-slate-400 text-sm mt-1">
            Enter field measurements to auto-populate estimate line items.
          </p>
        </div>

        {/* Estimate summary strip */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">{estimate.name}</p>
            <p className="text-xs text-slate-400">{estimate.clientName}</p>
          </div>
          {scopes.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {scopes.map((scope) => (
                <span
                  key={scope}
                  className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300"
                >
                  {scope}
                </span>
              ))}
            </div>
          )}
        </div>

        {scopes.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl px-8 py-16 text-center">
            <p className="text-slate-400 text-sm mb-2">No scopes selected for this estimate.</p>
            <p className="text-slate-500 text-xs mb-6">
              Go back and select the trades to enable measurement forms.
            </p>
            <Link
              href={`/estimates/${id}`}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              Go to Estimate Builder
            </Link>
          </div>
        ) : (
          <MeasurementsClient
            estimateId={id}
            scopes={scopes}
            savedMeasurements={savedMeasurements}
            deckProducts={deckProducts}
            bathProducts={bathProducts}
            laborAssemblies={laborAssemblies}
          />
        )}
      </main>
    </div>
  );
}
