"use client";

import { useState } from "react";
import Link from "next/link";

interface Estimate {
  id: string;
  name: string;
  clientName: string;
  address: string | null;
  status: string;
  updatedAt: string;
  _count: { items: number };
  user: { name: string | null };
}

interface Props {
  estimates: Estimate[];
  isAdmin: boolean;
}

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

export default function DashboardEstimateList({ estimates: initial, isAdmin }: Props) {
  const [estimates, setEstimates] = useState(initial);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/estimates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        let errorMsg = `Delete failed (${res.status})`;
        try {
          const text = await res.text();
          if (text) {
            const data = JSON.parse(text);
            if (data?.error) errorMsg = data.error;
          }
        } catch {
          // body wasn't JSON — keep the status-code message
        }
        throw new Error(errorMsg);
      }
      setEstimates((prev) => prev.filter((e) => e.id !== id));
      setConfirmingId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  if (estimates.length === 0) {
    return (
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
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-700">
      {deleteError && (
        <div className="px-6 py-3 bg-red-900/20 border-b border-red-800/40 text-xs text-red-400">
          {deleteError}
        </div>
      )}
      {estimates.slice(0, 10).map((estimate) => {
        const isConfirming = confirmingId === estimate.id;
        const isDeleting = deletingId === estimate.id;

        return (
          <div
            key={estimate.id}
            className={`flex items-center gap-3 px-6 py-4 transition-colors ${
              isConfirming ? "bg-red-950/30" : "hover:bg-slate-700/50"
            }`}
          >
            {/* Main link area */}
            <Link
              href={`/estimates/${estimate.id}`}
              className="flex items-center justify-between flex-1 min-w-0 group"
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
                  {isAdmin && estimate.user.name && (
                    <>
                      <span className="text-slate-600 text-xs">·</span>
                      <p className="text-xs text-slate-600">{estimate.user.name}</p>
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

            {/* Delete controls */}
            {isConfirming ? (
              <div className="flex-shrink-0 flex items-center gap-2 pl-2">
                <span className="text-xs text-red-400 font-medium whitespace-nowrap">Delete?</span>
                <button
                  onClick={() => handleDelete(estimate.id)}
                  disabled={isDeleting}
                  className="text-xs font-semibold text-white bg-red-700 hover:bg-red-600 disabled:opacity-60 px-2.5 py-1 rounded-md transition-colors"
                >
                  {isDeleting ? "…" : "Yes"}
                </button>
                <button
                  onClick={() => setConfirmingId(null)}
                  disabled={isDeleting}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setConfirmingId(estimate.id);
                  setDeleteError(null);
                }}
                className="flex-shrink-0 p-1.5 text-slate-600 hover:text-red-400 transition-colors rounded"
                title="Delete estimate"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
