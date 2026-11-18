"use client";

import { useState } from "react";
import CarpentryHours from "./CarpentryHours";

// ── Types ──────────────────────────────────────────────────────────────────

export interface InsulWallSection {
  id: string;
  label: string;
  length: number;   // ft
  height: number;   // ft
}

export interface InsulAtticSection {
  id: string;
  label: string;
  length: number;   // ft
  width: number;    // ft
  currentDepth: number; // inches of existing insulation
  targetDepth: number;  // inches desired (e.g. R-49 = ~16")
}

export interface InsulationData {
  // Wall insulation
  studSize: "2x4" | "2x6";          // drives product selection
  wallProduct: "batt" | "fireblock"; // 2x4 only: standard R-13 batt vs JM Safe & Fireblock
  wallSections: InsulWallSection[];
  wasteFactor: number;               // % waste (default 10)
  battSqftPerUnit: number;           // sqft covered per bunk/roll (default 40)

  // Attic blow-in
  blowInType: "cellulose" | "fiberglass"; // drives product selection
  atticSections: InsulAtticSection[];
  blowInBags: number;                // override — if rep manually knows bag count
  finishCarpenterHours?: number; // 0 = use suggested
  apprenticeHours?: number;
}

interface Props {
  initialData?: Partial<InsulationData>;
  onChange: (data: InsulationData) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";

// Blow-in coverage per bag (conservative defaults — use manual override for exact counts)
const SQFT_PER_BAG: Record<"cellulose" | "fiberglass", number> = {
  cellulose: 40,   // Insulmax cellulose ~40 sqft/bag @ R-38
  fiberglass: 106, // EcoFill WX fiberglass ~106 sqft/bag @ R-19 per label
};

function uid() { return String(Date.now() + Math.random()); }

function newWallSection(): InsulWallSection {
  return { id: uid(), label: "", length: 0, height: 9 };
}
function newAtticSection(): InsulAtticSection {
  return { id: uid(), label: "", length: 0, width: 0, currentDepth: 0, targetDepth: 16 };
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

function NumInput({
  label, value, onChange, unit, min = 0, step = 1,
}: {
  label: string; value: number; onChange: (v: number) => void;
  unit?: string; min?: number; step?: number;
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}{unit && <span className="text-slate-500 ml-1">({unit})</span>}
      </label>
      <input type="number" min={min} step={step}
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        placeholder="0" className={inputCls} />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function InsulationMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<InsulationData>({
    studSize:        initialData?.studSize        ?? "2x4",
    wallProduct:     initialData?.wallProduct     ?? "batt",
    wallSections:    initialData?.wallSections    ?? [newWallSection()],
    wasteFactor:     initialData?.wasteFactor     ?? 10,
    battSqftPerUnit: initialData?.battSqftPerUnit ?? 40,
    blowInType:      initialData?.blowInType      ?? "cellulose",
    atticSections:   initialData?.atticSections   ?? [],
    blowInBags:      initialData?.blowInBags      ?? 0,
    finishCarpenterHours: initialData?.finishCarpenterHours ?? 0,
    apprenticeHours: initialData?.apprenticeHours ?? 0,
  });

  function set<K extends keyof InsulationData>(key: K, value: InsulationData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  function patchWall(id: string, field: keyof InsulWallSection, val: string | number) {
    set("wallSections", data.wallSections.map((w) => w.id === id ? { ...w, [field]: val } : w));
  }
  function patchAttic(id: string, field: keyof InsulAtticSection, val: string | number) {
    set("atticSections", data.atticSections.map((a) => a.id === id ? { ...a, [field]: val } : a));
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const is2x6 = data.studSize === "2x6";
  const rValue = is2x6 ? "R-19" : "R-13";
  const wallProductLabel = is2x6
    ? "R-19 Kraft-Faced Batt"
    : data.wallProduct === "fireblock"
      ? "JM Safe & Sound / Fireblock"
      : "R-13 Kraft-Faced Batt";

  // Total wall sqft
  const wallSqft = data.wallSections.reduce((s, w) => s + w.length * w.height, 0);
  const wallSqftWithWaste = Math.ceil(wallSqft * (1 + data.wasteFactor / 100));

  // Batt coverage — user-configurable sqft per bunk/roll (default 40)
  const sqftPerUnit = data.battSqftPerUnit > 0 ? data.battSqftPerUnit : 40;
  const battBunks = wallSqft > 0 ? Math.ceil(wallSqftWithWaste / sqftPerUnit) : 0;

  // Attic sqft and bags
  const atticSqft = data.atticSections.reduce((s, a) => s + a.length * a.width, 0);
  const sqftPerBag = SQFT_PER_BAG[data.blowInType];
  const atticBags = data.blowInBags > 0
    ? data.blowInBags
    : atticSqft > 0 ? Math.ceil(atticSqft / sqftPerBag) : 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Wall Insulation ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-5">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Wall Insulation</h3>

        {/* Stud size + product selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Stud Size */}
          <div>
            <label className={labelCls}>Wall Type (stud size)</label>
            <div className="flex gap-1">
              {(["2x4", "2x6"] as const).map((s) => (
                <button key={s} type="button" onClick={() => {
                  set("studSize", s);
                  // 2x6 always uses batt — reset fireblock if switching
                  if (s === "2x6") set("wallProduct", "batt");
                }}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    data.studSize === s
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">
              {is2x6 ? "→ R-19 kraft-faced batt" : "→ R-13 (select product below)"}
            </p>
          </div>

          {/* Product — only shown for 2x4 */}
          {!is2x6 && (
            <div>
              <label className={labelCls}>Product</label>
              <div className="flex gap-1">
                {([
                  { val: "batt",      label: "R-13 Batt" },
                  { val: "fireblock", label: "Safe & Fireblock" },
                ] as { val: "batt" | "fireblock"; label: string }[]).map((opt) => (
                  <button key={opt.val} type="button" onClick={() => set("wallProduct", opt.val)}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      data.wallProduct === opt.val
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500"
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Wall sections table */}
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
                      placeholder="e.g. North wall" className={inputCls} />
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

        <div className="flex items-center justify-between flex-wrap gap-3">
          <AddBtn onClick={() => set("wallSections", [...data.wallSections, newWallSection()])} label="Add Wall Section" />
          <div className="flex gap-3">
            <div className="w-36">
              <NumInput label="Waste %" value={data.wasteFactor} onChange={(v) => set("wasteFactor", v)} />
            </div>
            {data.wallProduct !== "fireblock" && (
              <div className="w-44">
                <NumInput label="Sqft per bunk/roll" value={data.battSqftPerUnit}
                  onChange={(v) => set("battSqftPerUnit", Math.max(1, v))} min={1} />
              </div>
            )}
          </div>
        </div>

        {/* Wall summary */}
        {wallSqft > 0 && (
          <div className="rounded-lg bg-slate-700/40 border border-slate-700 px-4 py-3 flex flex-wrap gap-x-8 gap-y-1">
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Product</p>
              <p className="text-sm font-semibold text-white">{wallProductLabel} ({rValue})</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Net sqft</p>
              <p className="text-sm font-semibold text-white">{wallSqft.toFixed(0)} sqft</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">With {data.wasteFactor}% waste</p>
              <p className="text-sm font-semibold text-white">{wallSqftWithWaste} sqft</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Bunks / rolls needed</p>
              <p className="text-sm font-semibold text-white">{battBunks} <span className="text-slate-400 font-normal text-xs">@ {sqftPerUnit} sqft ea</span></p>
            </div>
          </div>
        )}
      </div>

      {/* ── Attic Blow-In ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Attic Blow-In</h3>
          <div className="flex items-center gap-3">
            {/* Material type toggle */}
            <div className="flex gap-1">
              {(["cellulose", "fiberglass"] as const).map((t) => (
                <button key={t} type="button" onClick={() => set("blowInType", t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors ${
                    data.blowInType === t
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500"
                  }`}>
                  {t}
                </button>
              ))}
            </div>
            {atticSqft > 0 && (
              <span className="text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-700/50 px-2.5 py-1 rounded-full">
                {atticSqft.toFixed(0)} sqft
              </span>
            )}
          </div>
        </div>

        {data.atticSections.length === 0 && (
          <p className="text-xs text-slate-500">No attic sections — blow-in won&apos;t be included.</p>
        )}

        {/* Attic sections */}
        <div className="space-y-3">
          {data.atticSections.map((a, idx) => (
            <div key={a.id} className="rounded-lg bg-slate-700/40 border border-slate-700 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium w-5">{idx + 1}</span>
                <input type="text" value={a.label}
                  onChange={(e) => patchAttic(a.id, "label", e.target.value)}
                  placeholder={`Attic section ${idx + 1}`}
                  className={inputCls + " flex-1"} />
                <RemoveBtn onClick={() => set("atticSections", data.atticSections.filter((s) => s.id !== a.id))} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <NumInput label="Length" unit="ft" value={a.length}
                  onChange={(v) => patchAttic(a.id, "length", v)} />
                <NumInput label="Width" unit="ft" value={a.width}
                  onChange={(v) => patchAttic(a.id, "width", v)} />
                <NumInput label="Existing depth" unit="in" value={a.currentDepth}
                  onChange={(v) => patchAttic(a.id, "currentDepth", v)} />
                <NumInput label="Target depth" unit="in" value={a.targetDepth}
                  onChange={(v) => patchAttic(a.id, "targetDepth", v)} />
              </div>
              {a.length > 0 && a.width > 0 && (
                <p className="text-xs text-slate-400">
                  Area: <span className="text-white">{(a.length * a.width).toFixed(0)} sqft</span>
                  {a.targetDepth > a.currentDepth && (
                    <> · Adding <span className="text-white">{a.targetDepth - a.currentDepth}&quot;</span> of blow-in</>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>

        <AddBtn onClick={() => set("atticSections", [...data.atticSections, newAtticSection()])} label="Add Attic Section" />

        {/* Manual bag override */}
        {data.atticSections.length > 0 && (
          <div className="pt-2 border-t border-slate-700">
            <div className="w-48">
              <NumInput label="Manual bag override (0 = auto-calculate)"
                value={data.blowInBags} onChange={(v) => set("blowInBags", v)} />
            </div>
          </div>
        )}

        {/* Attic summary */}
        {atticSqft > 0 && (
          <div className="rounded-lg bg-slate-700/40 border border-slate-700 px-4 py-3 flex flex-wrap gap-x-8 gap-y-1">
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Material</p>
              <p className="text-sm font-semibold text-white capitalize">{data.blowInType}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Total attic sqft</p>
              <p className="text-sm font-semibold text-white">{atticSqft.toFixed(0)} sqft</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Blow-in bags</p>
              <p className="text-sm font-semibold text-white">
                {atticBags} bags
                {data.blowInBags > 0 && <span className="text-slate-400 font-normal ml-1">(manual)</span>}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-0.5">Coverage rate</p>
              <p className="text-sm text-slate-400">{sqftPerBag} sqft/bag</p>
            </div>
          </div>
        )}
      </div>

      <CarpentryHours
        boxed
        fields={[
          { key: "finishCarpenterHours", label: "Finish Carpenter", value: data.finishCarpenterHours },
          { key: "apprenticeHours", label: "Finish Apprentice", value: data.apprenticeHours },
        ]}
        onChange={(k, v) => set(k as "finishCarpenterHours" | "apprenticeHours", v)}
      />

    </div>
  );
}
