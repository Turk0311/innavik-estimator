"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Scope structure matching the Build Book
// ---------------------------------------------------------------------------

interface ScopeItem {
  name: string;
  accessory?: string; // the accessories sub-item name, if any
}

interface ScopeCategory {
  label: string;
  accent: string; // Tailwind border-color class
  headerBg: string;
  headerText: string;
  scopes: ScopeItem[];
}

const SCOPE_CATEGORIES: ScopeCategory[] = [
  {
    label: "Interior",
    accent: "border-yellow-500",
    headerBg: "bg-yellow-500/10",
    headerText: "text-yellow-400",
    scopes: [
      { name: "Wall Assembly", accessory: "Wall Accessories" },
      { name: "Insulation", accessory: "Insulation Accessories" },
      { name: "Drywall", accessory: "Drywall Accessories" },
      { name: "Flooring", accessory: "Flooring Accessories" },
      { name: "Painting", accessory: "Paint Accessories" },
      { name: "Interior Trim", accessory: "Interior Trim Accessories" },
      { name: "Interior Doors", accessory: "Interior Door Assembly" },
    ],
  },
  {
    label: "Bathroom",
    accent: "border-sky-500",
    headerBg: "bg-sky-500/10",
    headerText: "text-sky-400",
    scopes: [
      { name: "Vanity", accessory: "Vanity Assembly" },
      { name: "Toilet", accessory: "Toilet Assembly" },
      { name: "Sink", accessory: "Sink Assembly" },
      { name: "Faucet", accessory: "Faucet Assembly" },
      { name: "Tile", accessory: "Tile Accessories" },
    ],
  },
  {
    label: "Kitchen",
    accent: "border-pink-500",
    headerBg: "bg-pink-500/10",
    headerText: "text-pink-400",
    scopes: [
      { name: "Kitchen Cabinets", accessory: "Kitchen Assembly" },
      { name: "Sink", accessory: "Sink Assembly" },
      { name: "Tile", accessory: "Tile Accessories" },
    ],
  },
  {
    label: "Countertops",
    accent: "border-purple-500",
    headerBg: "bg-purple-500/10",
    headerText: "text-purple-400",
    scopes: [
      { name: "Countertops", accessory: "Countertop Accessories" },
    ],
  },
  {
    label: "Exterior",
    accent: "border-emerald-500",
    headerBg: "bg-emerald-500/10",
    headerText: "text-emerald-400",
    scopes: [
      { name: "Exterior Trim", accessory: "Exterior Trim Accessories" },
      { name: "Siding", accessory: "Siding Accessories" },
      { name: "Shutters", accessory: "Shutter Accessories" },
      { name: "Roofing", accessory: "Roofing Accessories" },
      { name: "Windows", accessory: "Window Accessories" },
      { name: "Exterior Door", accessory: "Exterior Door Accessories" },
      { name: "Decking", accessory: "Decking Accessories" },
      { name: "Deck Framing", accessory: "Deck Framing Accessories" },
      { name: "Fence", accessory: "Fence Accessories" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Checkbox component
// ---------------------------------------------------------------------------

function ScopeCheckbox({
  label,
  checked,
  onChange,
  indent = false,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  indent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex items-center gap-2 text-left transition-colors group ${
        indent ? "pl-5" : ""
      }`}
    >
      <div
        className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
          checked
            ? "bg-blue-500 border-blue-500"
            : "border-slate-500 group-hover:border-slate-400"
        }`}
      >
        {checked && (
          <svg
            className="w-2.5 h-2.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span
        className={`text-sm transition-colors leading-tight ${
          checked
            ? "text-white font-medium"
            : indent
            ? "text-slate-500 group-hover:text-slate-400"
            : "text-slate-300 group-hover:text-white"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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

  const totalSelected = scopes.length;

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
      router.push(`/estimates/${estimate.id}/measurements`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Nav */}
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Dashboard</span>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-sm text-white font-medium">New Estimate</span>
        </div>
      </nav>

      {/* Form */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">New Estimate</h1>
          <p className="text-slate-400 text-sm mt-1">
            Fill in the project details and select all applicable scopes.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ---- Project Details ---- */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Project Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="clientName" className="block text-sm font-medium text-slate-300 mb-1.5">
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
                <label htmlFor="projectName" className="block text-sm font-medium text-slate-300 mb-1.5">
                  Project Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="projectName"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                  placeholder="Smith Kitchen Remodel"
                  className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-slate-300 mb-1.5">
                Address
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St, Antioch, IL"
                className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* ---- Scope of Work ---- */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Scope of Work
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select all categories and sub-items that apply to this project.
                </p>
              </div>
              {totalSelected > 0 && (
                <span className="text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-700/50 px-2.5 py-1 rounded-full">
                  {totalSelected} selected
                </span>
              )}
            </div>

            {/* Category sections */}
            <div className="divide-y divide-slate-700">
              {SCOPE_CATEGORIES.map((cat) => {
                const catSelected = cat.scopes.reduce((n, s) => {
                  let count = scopes.includes(s.name) ? 1 : 0;
                  if (s.accessory) count += scopes.includes(s.accessory) ? 1 : 0;
                  return n + count;
                }, 0);

                return (
                  <div key={cat.label}>
                    {/* Category header */}
                    <div className={`px-6 py-2.5 flex items-center justify-between border-l-4 ${cat.accent} ${cat.headerBg}`}>
                      <span className={`text-xs font-bold uppercase tracking-widest ${cat.headerText}`}>
                        {cat.label}
                      </span>
                      {catSelected > 0 && (
                        <span className={`text-xs font-semibold ${cat.headerText} opacity-70`}>
                          {catSelected} selected
                        </span>
                      )}
                    </div>

                    {/* Scopes grid */}
                    <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
                      {cat.scopes.map((scope) => (
                        <div key={scope.name} className="space-y-1.5">
                          <ScopeCheckbox
                            label={scope.name}
                            checked={scopes.includes(scope.name)}
                            onChange={() => toggleScope(scope.name)}
                          />
                          {scope.accessory && (
                            <ScopeCheckbox
                              label={scope.accessory}
                              checked={scopes.includes(scope.accessory)}
                              onChange={() => toggleScope(scope.accessory!)}
                              indent
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ---- Notes ---- */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Notes
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional project notes, special requirements, site conditions..."
              rows={3}
              className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
            />
          </div>

          {/* ---- Submit ---- */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors"
            >
              Cancel
            </Link>

            <div className="flex items-center gap-3">
              {totalSelected === 0 && (
                <p className="text-xs text-slate-500 hidden sm:block">
                  Select at least one scope to continue
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    Create Estimate
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
