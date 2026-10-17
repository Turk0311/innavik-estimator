"use client";

import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface DrywallWallSection {
  id: string;
  label: string;
  length: number; // linear ft
  height: number; // ft
}

export interface DrywallCeilingSection {
  id: string;
  label: string;
  length: number; // ft
  width: number;  // ft
}

export interface DrywallData {
  wallSections:    DrywallWallSection[];
  ceilingSections: DrywallCeilingSection[];
  sheetSize:        "4x8" | "4x12";
  wallThickness:    "1/2" | "5/8"; // walls default ½"
  ceilingThickness: "1/2" | "5/8"; // ceilings default ⅝"
  wasteFactor: number; // % default 10
}

interface Props {
  initialData?: Partial<DrywallData>;
  onChange: (data: DrywallData) => void;
  onSyncFromInsulation?: () => void;
  hasInsulationWalls?: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";

const SHEET_SQFT: Record<"4x8" | "4x12", number> = { "4x8": 32, "4x12": 48 };

function uid() { return String(Date.now() + Math.random()); }
function newWall():    DrywallWallSection    { return { id: uid(), label: "", length: 0, height: 9 }; }
function newCeiling(): DrywallCeilingSection { return { id: uid(), label: "", length: 0, width: 0 }; }

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

function ToggleGroup<T extends string>({
  label, options, value, onChange,
}: {
  label: string;
  options: { val: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex gap-1">
        {options.map((o) => (
          <button key={o.val} type="button" onClick={() => onChange(o.val)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              value === o.val
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500"
            }`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function DrywallMeasurements({ initialData, onChange, onSyncFromInsulation, hasInsulationWalls }: Props) {
  const [data, setData] = useState<DrywallData>({
    wallSections:    initialData?.wallSections    ?? [newWall()],
    ceilingSections: initialData?.ceilingSections ?? [],
    sheetSize:        initialData?.sheetSize        ?? "4x8",
    wallThickness:    initialData?.wallThickness    ?? "1/2",
    ceilingThickness: initialData?.ceilingThickness ?? "5/8",
    wasteFactor:      initialData?.wasteFactor      ?? 10,
  });

  function set<K extends keyof DrywallData>(key: K, value: DrywallData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  function patchWall(id: string, field: keyof DrywallWallSection, val: string | number) {
    set("wallSections", data.wallSections.map((w) => w.id === id ? { ...w, [field]: val } : w));
  }
  function patchCeiling(id: string, field: keyof DrywallCeilingSection, val: string | number) {
    set("ceilingSections", data.ceilingSections.map((c) => c.id === id ? { ...c, [field]: val } : c));
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const sheetSqft    = SHEET_SQFT[data.sheetSize];
  const wallSqft     = data.wallSections.reduce((s, w) => s + w.length * w.height, 0);
  const ceilSqft     = data.ceilingSections.reduce((s, c) => s + c.length * c.width, 0);
  const netSqft      = wallSqft + ceilSqft;
  const waste        = 1 + data.wasteFactor / 100;

  // Separate sheet counts per thickness
  const wallSheets   = wallSqft  > 0 ? Math.ceil(wallSqft  * waste / sheetSqft) : 0;
  const ceilSheets   = ceilSqft  > 0 ? Math.ceil(ceilSqft  * waste / sheetSqft) : 0;
  const totalSheets  = wallSheets + ceilSheets;

  // Consumables (based on net sqft)
  const mudBuckets  = Math.ceil(netSqft / 200);     // 1 bucket (~3.5 gal) per 200 sqft
  const screwBoxes  = Math.ceil(netSqft / 300);     // 1 box (5 lb) per 300 sqft
  const tapeRolls   = Math.ceil(netSqft / 500);     // 1 × 500 ft roll per 500 sqft

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Options ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Sheet Options</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <ToggleGroup
            label="Sheet Size"
            options={[{ val: "4x8", label: "4×8 (32 sqft)" }, { val: "4x12", label: "4×12 (48 sqft)" }]}
            value={data.sheetSize}
            onChange={(v) => set("sheetSize", v)}
          />
          <ToggleGroup
            label="Wall Thickness"
            options={[{ val: "1/2", label: '½"' }, { val: "5/8", label: '⅝"' }]}
            value={data.wallThickness}
            onChange={(v) => set("wallThickness", v)}
          />
          <ToggleGroup
            label="Ceiling Thickness"
            options={[{ val: "1/2", label: '½"' }, { val: "5/8", label: '⅝"' }]}
            value={data.ceilingThickness}
            onChange={(v) => set("ceilingThickness", v)}
          />
          <div>
            <label className={labelCls}>Waste %</label>
            <input type="number" min="0" max="30"
              value={data.wasteFactor === 0 ? "" : data.wasteFactor}
              onChange={(e) => set("wasteFactor", Number(e.target.value) || 0)}
              placeholder="10" className={inputCls} />
          </div>
        </div>
      </div>

      {/* ── Wall Sections ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Wall Sections</h3>
          <div className="flex items-center gap-3">
            {wallSqft > 0 && (
              <span className="text-xs text-slate-400">{wallSqft.toFixed(0)} sqft</span>
            )}
            {onSyncFromInsulation && hasInsulationWalls && (
              <button
                type="button"
                onClick={onSyncFromInsulation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/30 hover:border-indigo-400 transition-colors"
                title="Copy wall sections from Insulation measurements"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync from Insulation
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                <th className="pb-2 pr-3 font-medium">Label</th>
                <th className="pb-2 pr-3 font-medium">Length (ft)</th>
                <th className="pb-2 pr-3 font-medium">Height (ft)</th>
                <th className="pb-2 pr-3 font-medium text-right">Sqft</th>
                <th className="pb-2 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {data.wallSections.map((w) => (
                <tr key={w.id}>
                  <td className="py-2 pr-3">
                    <input type="text" value={w.label}
                      onChange={(e) => patchWall(w.id, "label", e.target.value)}
                      placeholder="e.g. Bedroom walls" className={inputCls} />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="number" min="0"
                      value={w.length === 0 ? "" : w.length}
                      onChange={(e) => patchWall(w.id, "length", Number(e.target.value) || 0)}
                      placeholder="0" className={inputCls} />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="number" min="0"
                      value={w.height === 0 ? "" : w.height}
                      onChange={(e) => patchWall(w.id, "height", Number(e.target.value) || 0)}
                      placeholder="0" className={inputCls} />
                  </td>
                  <td className="py-2 pr-3 text-right text-slate-300 tabular-nums">
                    {(w.length * w.height) > 0 ? (w.length * w.height).toFixed(0) : "—"}
                  </td>
                  <td className="py-2">
                    <RemoveBtn onClick={() => set("wallSections", data.wallSections.filter((s) => s.id !== w.id))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AddBtn onClick={() => set("wallSections", [...data.wallSections, newWall()])} label="Add Wall Section" />
      </div>

      {/* ── Ceiling Sections ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Ceiling Sections</h3>
          {ceilSqft > 0 && (
            <span className="text-xs text-slate-400">{ceilSqft.toFixed(0)} sqft</span>
          )}
        </div>

        {data.ceilingSections.length === 0 && (
          <p className="text-xs text-slate-500">No ceiling sections added — only walls will be counted.</p>
        )}

        {data.ceilingSections.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                  <th className="pb-2 pr-3 font-medium">Label</th>
                  <th className="pb-2 pr-3 font-medium">Length (ft)</th>
                  <th className="pb-2 pr-3 font-medium">Width (ft)</th>
                  <th className="pb-2 pr-3 font-medium text-right">Sqft</th>
                  <th className="pb-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {data.ceilingSections.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 pr-3">
                      <input type="text" value={c.label}
                        onChange={(e) => patchCeiling(c.id, "label", e.target.value)}
                        placeholder="e.g. Basement ceiling" className={inputCls} />
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
                      {(c.length * c.width) > 0 ? (c.length * c.width).toFixed(0) : "—"}
                    </td>
                    <td className="py-2">
                      <RemoveBtn onClick={() => set("ceilingSections", data.ceilingSections.filter((s) => s.id !== c.id))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <AddBtn onClick={() => set("ceilingSections", [...data.ceilingSections, newCeiling()])} label="Add Ceiling Section" />
      </div>

      {/* ── Material Estimate ── */}
      {netSqft > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Material Estimate</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {wallSheets > 0 && (
              <div className="bg-slate-700/50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500 mb-1">Wall Sheets</p>
                <p className="text-lg font-bold text-white">{wallSheets}</p>
                <p className="text-xs text-slate-400">{data.sheetSize} · {data.wallThickness}&quot;</p>
              </div>
            )}
            {ceilSheets > 0 && (
              <div className="bg-slate-700/50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500 mb-1">Ceiling Sheets</p>
                <p className="text-lg font-bold text-white">{ceilSheets}</p>
                <p className="text-xs text-slate-400">{data.sheetSize} · {data.ceilingThickness}&quot;</p>
              </div>
            )}
            {wallSheets === 0 && ceilSheets === 0 && (
              <div className="bg-slate-700/50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500 mb-1">Drywall Sheets</p>
                <p className="text-lg font-bold text-white">{totalSheets}</p>
                <p className="text-xs text-slate-400">{data.sheetSize} · {data.wasteFactor}% waste</p>
              </div>
            )}
            <div className="bg-slate-700/50 rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Joint Compound</p>
              <p className="text-lg font-bold text-white">{mudBuckets}</p>
              <p className="text-xs text-slate-400">buckets (3.5 gal ea)</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Drywall Screws</p>
              <p className="text-lg font-bold text-white">{screwBoxes}</p>
              <p className="text-xs text-slate-400">boxes (5 lb ea)</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Paper Tape</p>
              <p className="text-lg font-bold text-white">{tapeRolls}</p>
              <p className="text-xs text-slate-400">rolls (500 ft ea)</p>
            </div>
          </div>
          <div className="text-xs text-slate-500 pt-1">
            {wallSqft > 0 && <span>Walls: {wallSqft.toFixed(0)} sqft</span>}
            {wallSqft > 0 && ceilSqft > 0 && <span className="mx-2">·</span>}
            {ceilSqft > 0 && <span>Ceilings: {ceilSqft.toFixed(0)} sqft</span>}
            <span className="mx-2">·</span>
            <span>Net: {netSqft.toFixed(0)} sqft · {data.wasteFactor}% waste</span>
          </div>
        </div>
      )}
    </div>
  );
}
