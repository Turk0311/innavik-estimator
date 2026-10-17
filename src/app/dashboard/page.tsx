import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import SignOutButton from "./SignOutButton";
import DashboardEstimateList from "./DashboardEstimateList";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "ADMIN";

  const estimates = await prisma.estimate.findMany({
    where: isAdmin ? undefined : { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { items: true } },
      user: { select: { name: true } },
    },
  });

  const totalEstimates = isAdmin ? estimates.length : estimates.filter((e) => e.userId === session.user.id).length;
  const openEstimates = estimates.filter(
    (e) => e.status === "draft" || e.status === "pending_review"
  ).length;
  const approvedEstimates = estimates.filter((e) => e.status === "approved").length;

  const pendingReview = estimates.filter((e) => e.status === "pending_review");

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Top Nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg px-2.5 py-1.5">
              <Image
                src="/innavik-logo.png"
                alt="Innavik"
                width={2340}
                height={564}
                className="h-7 w-auto"
                priority
              />
            </div>
            <span className="text-lg font-bold tracking-tight">Estimator</span>
          </div>

          <div className="flex items-center gap-6">
            {isAdmin && (
              <Link
                href="/admin"
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Admin
              </Link>
            )}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white">{session.user.name}</p>
                <p className="text-xs text-slate-400">{session.user.email}</p>
              </div>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Welcome back, {session.user.name}
            </p>
          </div>
          <Link
            href="/estimates/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Estimate
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <p className="text-slate-400 text-sm font-medium">Total Estimates</p>
            <p className="text-3xl font-bold text-white mt-1">{totalEstimates}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            {isAdmin ? (
              <>
                <p className="text-slate-400 text-sm font-medium">Pending Review</p>
                <p className="text-3xl font-bold text-amber-400 mt-1">{pendingReview.length}</p>
              </>
            ) : (
              <>
                <p className="text-slate-400 text-sm font-medium">Open / In Progress</p>
                <p className="text-3xl font-bold text-blue-400 mt-1">{openEstimates}</p>
              </>
            )}
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <p className="text-slate-400 text-sm font-medium">Approved</p>
            <p className="text-3xl font-bold text-emerald-400 mt-1">
              {approvedEstimates}
            </p>
          </div>
        </div>

        {/* Pending Review section — admin only */}
        {isAdmin && pendingReview.length > 0 && (
          <div className="bg-amber-900/10 border border-amber-700/40 rounded-xl overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-amber-700/30 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-base font-semibold text-amber-300">Pending Review</h2>
              <span className="ml-auto text-xs bg-amber-800/50 text-amber-300 px-2 py-0.5 rounded-full font-medium">
                {pendingReview.length}
              </span>
            </div>
            <div className="divide-y divide-amber-700/20">
              {pendingReview.map((estimate) => (
                <Link
                  key={estimate.id}
                  href={`/estimates/${estimate.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-amber-900/10 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors truncate">
                      {estimate.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-400 truncate">{estimate.clientName}</p>
                      <span className="text-slate-600 text-xs">·</span>
                      <p className="text-xs text-slate-500">{estimate.user.name}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4 text-right">
                    <span className="text-xs bg-amber-900/60 text-amber-300 px-2 py-0.5 rounded-full">
                      Pending Review
                    </span>
                    <p className="text-xs text-slate-600 mt-1">
                      {new Date(estimate.updatedAt).toLocaleDateString("en-CA", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Estimates Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Recent Estimates</h2>
            {estimates.length > 0 && (
              <Link
                href="/estimates"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                View all
              </Link>
            )}
          </div>

          <DashboardEstimateList
            estimates={estimates.slice(0, 10).map((e) => ({
              ...e,
              updatedAt: e.updatedAt.toISOString(),
            }))}
            isAdmin={isAdmin}
          />
        </div>
      </main>
    </div>
  );
}
