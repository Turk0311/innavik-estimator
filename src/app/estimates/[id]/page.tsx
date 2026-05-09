import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import EstimateBuilder from "./EstimateBuilder";

type PageProps = { params: Promise<{ id: string }> };

export default async function EstimatePage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      items: { orderBy: { category: "asc" } },
    },
  });

  if (!estimate) {
    notFound();
  }

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && estimate.userId !== session.user.id) {
    notFound();
  }

  // Serialize dates to strings for client component
  const serialized = {
    ...estimate,
    createdAt: estimate.createdAt.toISOString(),
    updatedAt: estimate.updatedAt.toISOString(),
    items: estimate.items.map((item) => ({ ...item })),
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
              <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 21V12h6v9"
                  />
                </svg>
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
      <EstimateBuilder estimate={serialized} />
    </>
  );
}
