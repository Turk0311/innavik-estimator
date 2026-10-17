import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import EstimateBuilder from "./EstimateBuilder";

type PageProps = { params: Promise<{ id: string }> };

export default async function EstimatePage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  const [estimate, measurements] = await Promise.all([
    prisma.estimate.findUnique({
      where: { id },
      include: { items: { orderBy: { category: "asc" } } },
    }),
    prisma.measurement.findMany({
      where: { estimateId: id },
      select: { tradeType: true, data: true },
    }),
  ]);

  if (!estimate) {
    notFound();
  }

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && estimate.userId !== session.user.id) {
    notFound();
  }

  // Items are authoritative from the DB — assembly engine sets packages at apply time.
  // No auto-add or auto-sync here; re-applying measurements is the correct update path.

  // Serialize for client component
  const serialized = {
    ...estimate,
    createdAt: estimate.createdAt.toISOString(),
    updatedAt: estimate.updatedAt.toISOString(),
    items: estimate.items.map((item) => ({
      id: item.id,
      estimateId: item.estimateId,
      productId: item.productId,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      cost: item.cost,
      markup: item.markup,
      tier: item.tier,
      packages: item.packages ?? "good,better,best",
      category: item.category,
      isLabor: item.isLabor,
      sku: item.sku ?? null,
      supplier: item.supplier ?? null,
    })),
  };

  return (
    <>
      {/* Top nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
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
            <span className="text-sm text-slate-300 font-medium truncate max-w-[200px]">
              {estimate.name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:block">
              Last updated{" "}
              {estimate.updatedAt.toLocaleDateString("en-CA", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </nav>

      {/* Builder (client component) */}
      <EstimateBuilder estimate={serialized} isAdmin={isAdmin} measurements={measurements as { tradeType: string; data: unknown }[]} />
    </>
  );
}
