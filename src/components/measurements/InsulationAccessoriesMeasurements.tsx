"use client";

import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CeilingSection {
  id: string;
  label: string;
  length: number; // ft — direction along joists (wire spacing direction)
  width: number;  // ft — direction across joists (number of bays)
}

export interface InsulationAccessoriesData {
  // Support wire for ceiling batt insulation
  ceilingSections: CeilingSection[];

  // Blow-in equipment rental
  hasBlowIn: boolean;   // toggle — does this job include blow-in?
  rentalDays: number;   // how many days rental needed
}

interface Props {
  initialData?: Partial<InsulationAccessoriesData>;
  onChange: (data: InsulationAccessoriesData) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";

// Support wire every 24" along the joist run.
// qty = ceil(length / 2) wires per joist bay × number of bays (width / joist_spacing)
// We default to 16" OC (1.33 ft) joist spacing for the bay count.
// Simplified: wires = ceil(length / 2) × ceil(width / 1.33)
function supportWireCount(length: number, width: number): number {
  if (length <= 0 || width <= 0) return 0;
  const wiresPerBay = Math.ceil(length / 2);           // every 24" along length
  const numBays     = Math.ceil(width / (16 / 12));    // 16" OC joists
  return wiresPerBay * numBays;
}

function uid() { return String(Date.now() + Math.random()); }

function newCeiling(): CeilingSection {
  return { id: uid(), label: "", length: 0, width: 0 };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-slate-600 hover:text-red-400 transition-colors p-1" title="Remove">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      {label}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function InsulationAccessoriesMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<InsulationAccessoriesData>({
    ceilingSections: initialData?.ceilingSections ?? [],
    hasBlowIn:       initialData?.hasBlowIn       ?? false,
    rentalDays:      initialData?.rentalDays       ?? 1,
  });

  function set<K extends keyof InsulationAccessoriesData>(key: K, value: InsulationAccessoriesData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  function patchCeiling(id: string, field: keyof CeilingSection, val: string | number) {
    set("ceilingSections", data.ceilingSections.map((c) =>
      c.id === id ? { ...c, [field]: val } : c
    ));
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const totalCeilingSqft = data.ceilingSections.reduce((s, c) => s + c.length * c.width, 0);
  const totalWires       = data.ceilingSections.reduce((s, c) => s + supportWireCount(c.length, c.width), 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Ceiling Support Wire ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Ceiling Support Wire</h3>
            <p className="text-xs text-slate-500 mt-0.5">One wire every 24&quot; along joist run (16&quot; OC bays)</p>
          </div>
          {totalWires > 0 && (
            <span className="text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-700/50 px-2.5 py-1 rounded-full">
              {totalWires} wires
            </span>
          )}
        </div>

        {data.ceilingSections.length === 0 && (
          <p className="text-xs text-slate-500">No ceiling sections — support wire won&apos;t be included.</p>
        )}

        {/* Ceiling sections table */}
        {data.ceilingSections.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                  <th className="pb-2 pr-3 font-medium">Label</th>
                  <th className="pb-2 pr-3 font-medium">Length (ft) <span className="text-slate-600 font-normal">along joists</span></th>
                  <th className="pb-2 pr-3 font-medium">Width (ft) <span className="text-slate-600 font-normal">across joists</span></th>
                  <th className="pb-2 pr-3 font-medium text-right">Sqft</th>
                  <th className="pb-2 pr-3 font-medium text-right">Wires</th>
                  <th className="pb-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {data.ceilingSections.map((c) => {
                  const sqft  = c.length * c.width;
                  const wires = supportWireCount(c.length, c.width);
                  return (
                    <tr key={c.id}>
                      <td className="py-2 pr-3">
                        <input type="text" value={c.label}
                          onChange={(e) => patchCeiling(c.id, "label", e.target.value)}
                          placeholder="e.g. Basement ceiling"
                          className={inputCls} />
                      </td>
                      <td className="py-2 pr-3">
                        <input type="number" min="0"
                          value={c.length === 0 ? "" : c.length}
                          onChange={(e) => patchCeiling(c.id, "length", Number(e.target.value) || 0)}
                          placeholder="0" className={inputCls} />
                      </td>
                      <td className="py-2 pr-3">
                        <input type="number" min="0"
                          value={c.width === 0 ? "" : c.width}
                          onChange={(e) => patchCeiling(c.id, "width", Number(e.target.value) || 0)}
                          placeholder="0" className={inputCls} />
                      </td>
                      <td className="py-2 pr-3 text-right text-slate-300 tabular-nums">
                        {sqft > 0 ? sqft.toFixed(0) : "—"}
                      </td>
                      <td className="py-2 pr-3 text-right text-white font-medium tabular-nums">
                        {wires > 0 ? wires : "—"}
                      </td>
                      <td className="py-2">
                        <RemoveBtn onClick={() =>
                          set("ceilingSections", data.ceilingSections.filter((s) => s.id !== c.id))
                        } />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <AddBtn onClick={() => set("ceilingSections", [...data.ceilingSections, newCeiling()])} label="Add Ceiling Section" />

        {/* Wire summary */}
        {totalCeilingSqft > 0 && (
          <div className="rounded-lg bg-slate-700/40 border border-slate-700 px-4 py-3 flex flex-wrap gap-x-8 gap-y-1">
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Total ceiling sqft</p>
              <p className="text-sm font-semibold text-white">{totalCeilingSqft.toFixed(0)} sqft</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Support wires</p>
              <p className="text-sm font-semibold text-white">{totalWires} ea</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Rate</p>
              <p className="text-sm text-slate-400">every 24&quot; · 16&quot; OC bays</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Blow-In Equipment Rental ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Equipment Rental</h3>

        {/* Toggle */}
        <button type="button" onClick={() => set("hasBlowIn", !data.hasBlowIn)}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors w-full text-left ${
            data.hasBlowIn
              ? "bg-orange-600/20 border-orange-500"
              : "bg-slate-700 border-slate-600 hover:border-slate-500"
          }`}>
          <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs font-bold ${
            data.hasBlowIn ? "bg-orange-500 border-orange-500 text-white" : "border-slate-500 text-transparent"
          }`}>✓</span>
          <div>
            <p className={`text-sm font-medium ${data.hasBlowIn ? "text-orange-300" : "text-slate-300"}`}>
              Blow-in insulation included
            </p>
            <p className="text-xs text-slate-500">Adds blower machine rental to the estimate</p>
          </div>
        </button>

        {/* Rental days — only shown when blow-in is on */}
        {data.hasBlowIn && (
          <div className="flex items-center gap-4 pt-1">
            <div className="w-48">
              <label className={labelCls}>Rental days</label>
              <div className="flex items-center gap-1">
                <button type="button"
                  onClick={() => set("rentalDays", Math.max(1, data.rentalDays - 1))}
                  className="w-8 h-8 flex-shrink-0 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-bold flex items-center justify-center transition-colors">−</button>
                <input type="number" min="1"
                  value={data.rentalDays === 0 ? "" : data.rentalDays}
                  onChange={(e) => set("rentalDays", Math.max(1, Number(e.target.value) || 1))}
                  placeholder="1"
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                <button type="button"
                  onClick={() => set("rentalDays", data.rentalDays + 1)}
                  className="w-8 h-8 flex-shrink-0 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-bold flex items-center justify-center transition-colors">+</button>
              </div>
            </div>
            <div className="mt-5 text-xs text-orange-400 font-medium">
              {data.rentalDays} day{data.rentalDays !== 1 ? "s" : ""} of blower rental
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
