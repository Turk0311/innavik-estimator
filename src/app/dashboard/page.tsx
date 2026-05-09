import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import SignOutButton from "./SignOutButton";

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

  const statusLabel: Record<string, string> = {
    draft: "Draft",
    pending_review: "Pending Review",
    approved: "Approved",
    rejected: "Rejected",
    sent: "Sent",
    completed: "Completed",
    won: "Won",
    lost: "Lost",
  };

  const statusColor: Record<string, string> = {
    draft: "bg-slate-700 text-slate-300",
    pending_review: "bg-amber-900/60 text-amber-300",
    approved: "bg-emerald-900 text-emerald-300",
    rejected: "bg-red-900 text-red-300",
    sent: "bg-blue-900 text-blue-300",
    completed: "bg-emerald-900 text-emerald-300",
    won: "bg-green-900 text-green-300",
    lost: "bg-red-900 text-red-300",
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Top Nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
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
            <span className="text-lg font-bold tracking-tight">Innavik Estimator</span>
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

          {estimates.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <svg
                className="w-12 h-12 text-slate-600 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-slate-400 text-sm mb-4">No estimates yet.</p>
              <Link
                href="/estimates/new"
                className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
              >
                Create your first estimate
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {estimates.slice(0, 10).map((estimate) => (
                <Link
                  key={estimate.id}
                  href={`/estimates/${estimate.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-750 hover:bg-slate-700/50 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors truncate">
                        {estimate.name}
                      </p>
                      <span
                        className={`flex-shrink-0 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                          statusColor[estimate.status] ?? "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {statusLabel[estimate.status] ?? estimate.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs text-slate-400 truncate">{estimate.clientName}</p>
                      {estimate.address && (
                        <>
                          <span className="text-slate-600 text-xs">·</span>
                          <p className="text-xs text-slate-500 truncate">{estimate.address}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4 text-right">
                    <p className="text-xs text-slate-500">
                      {estimate._count.items} line{estimate._count.items !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {new Date(estimate.updatedAt).toLocaleDateString("en-CA", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
