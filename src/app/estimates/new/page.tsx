"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const SCOPE_OPTIONS = [
  "Roofing",
  "Siding",
  "Interior",
  "Kitchen",
  "Bathroom",
  "Demo",
  "Painting",
  "Flooring",
  "Decking",
  "Fence",
  "General Labor",
  "Custom",
] as const;

export default function NewEstimatePage() {
  const router = useRouter();

  const [clientName, setClientName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [address, setAddress] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleScope(scope: string) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!clientName.trim() || !projectName.trim()) {
      setError("Client name and project name are required.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName.trim(),
          clientName: clientName.trim(),
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          scopes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create estimate");
      }

      const estimate = await res.json();
      router.push(`/estimates/${estimate.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Dashboard</span>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-sm text-white font-medium">New Estimate</span>
        </div>
      </nav>

      {/* Form */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">New Estimate</h1>
          <p className="text-slate-400 text-sm mt-1">
            Fill in the project details to get started.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client & Project */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-5">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Project Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="clientName"
                  className="block text-sm font-medium text-slate-300 mb-1.5"
                >
                  Client Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="clientName"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  placeholder="John Smith"
                  className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div>
                <label
                  htmlFor="projectName"
                  className="block text-sm font-medium text-slate-300 mb-1.5"
                >
                  Project Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="projectName"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                  placeholder="Smith Roof Replacement"
                  className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-slate-300 mb-1.5"
              >
                Address
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, Anytown, ON"
                className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Scope of Work */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
                Scope of Work
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select all trades that apply to this project.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SCOPE_OPTIONS.map((scope) => {
                const checked = scopes.includes(scope);
                return (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => toggleScope(scope)}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-sm font-medium transition-all text-left ${
                      checked
                        ? "bg-blue-600/20 border-blue-500 text-blue-300"
                        : "bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                        checked
                          ? "bg-blue-500 border-blue-500"
                          : "border-slate-500"
                      }`}
                    >
                      {checked && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    {scope}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Notes
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional project notes, special requirements, site conditions..."
              rows={4}
              className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  Create Estimate
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
