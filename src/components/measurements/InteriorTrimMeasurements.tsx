"use client";

import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface TrimDoor {
  id: string;
  label: string;
  widthFt: number;
  widthIn: number;
  heightFt: number;
  heightIn: number;
  count: number;
  type: "interior" | "exterior"; // interior = both sides, exterior = one side
}

export interface TrimWindow {
  id: string;
  label: string;
  widthFt: number;
  widthIn: number;
  heightFt: number;
  heightIn: number;
  count: number;
}

export interface InteriorTrimData {
  baseLf:         number;        // total wall LF for base molding
  doorDeductions: number;        // # of door openings (each deducts 3 ft of base)
  crownLf:        number;        // optional crown molding LF
  doors:          TrimDoor[];
  windows:        TrimWindow[];
  stickLength:    8 | 12 | 16;   // trim stick length in ft
  wasteFactor:    number;         // % default 10
  baseProfile:    string;        // e.g. "colonial", "ranch", "craftsman" — drives product lookup
  casingProfile:  string;        // drives door + window casing product lookup
  crownProfile:   string;        // drives crown molding product lookup
}

interface Props {
  initialData?: Partial<InteriorTrimData>;
  onChange: (data: InteriorTrimData) => void;
}

// ── Profile options ────────────────────────────────────────────────────────

export const TRIM_PROFILES = [
  { value: "",           label: "— any profile —" },
  { value: "colonial",   label: "Colonial" },
  { value: "ranch",      label: "Ranch / Flat" },
  { value: "craftsman",  label: "Craftsman" },
  { value: "clamshell",  label: "Clamshell" },
  { value: "ogee",       label: "Ogee" },
  { value: "beaded",     label: "Beaded" },
  { value: "victorian",  label: "Victorian" },
] as const;

// ── Constants ──────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";

function uid() { return String(Date.now() + Math.random()); }

function newDoor(): TrimDoor {
  return { id: uid(), label: "", widthFt: 2, widthIn: 8, heightFt: 6, heightIn: 8, count: 1, type: "interior" };
}
function newWindow(): TrimWindow {
  return { id: uid(), label: "", widthFt: 3, widthIn: 0, heightFt: 4, heightIn: 0, count: 1 };
}

// Casing LF for a door: (2 × h + w) × sides × count
function doorCasingLf(d: TrimDoor): number {
  const w = d.widthFt + d.widthIn / 12;
  const h = d.heightFt + d.heightIn / 12;
  if (w <= 0 || h <= 0) return 0;
  const sides = d.type === "interior" ? 2 : 1;
  return (2 * h + w) * sides * d.count;
}

// Casing LF for a window: (2h + 2w) × count  (4-sided wrap)
function windowCasingLf(w: TrimWindow): number {
  const wd = w.widthFt + w.widthIn / 12;
  const ht = w.heightFt + w.heightIn / 12;
  if (wd <= 0 || ht <= 0) return 0;
  return (2 * ht + 2 * wd) * w.count;
}

function sticks(lf: number, stickLen: number, waste: number): number {
  return lf > 0 ? Math.ceil(lf * waste / stickLen) : 0;
}

function fmtFtIn(ft: number, inches: number): string {
  if (ft === 0 && inches === 0) return "—";
  return inches === 0 ? `${ft}'` : `${ft}' ${inches}"`;
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

function FtInInput({
  label, ft, inches, onFt, onIn,
}: {
  label: string; ft: number; inches: number;
  onFt: (v: number) => void; onIn: (v: number) => void;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-1">
        <input type="number" min="0" value={ft || ""}
          onChange={(e) => onFt(Math.max(0, Number(e.target.value) || 0))}
          placeholder="0"
          className="w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
        <span className="text-slate-500 text-xs flex-shrink-0">ft</span>
        <input type="number" min="0" max="11" value={inches || ""}
          onChange={(e) => onIn(Math.min(11, Math.max(0, Number(e.target.value) || 0)))}
          placeholder="0"
          className="w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
        <span className="text-slate-500 text-xs flex-shrink-0">in</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function InteriorTrimMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<InteriorTrimData>({
    baseLf:         initialData?.baseLf         ?? 0,
    doorDeductions: initialData?.doorDeductions ?? 0,
    crownLf:        initialData?.crownLf        ?? 0,
    doors:          initialData?.doors          ?? [],
    windows:        initialData?.windows        ?? [],
    stickLength:    initialData?.stickLength    ?? 8,
    wasteFactor:    initialData?.wasteFactor    ?? 10,
    baseProfile:    initialData?.baseProfile    ?? "",
    casingProfile:  initialData?.casingProfile  ?? "",
    crownProfile:   initialData?.crownProfile   ?? "",
  });

  function set<K extends keyof InteriorTrimData>(key: K, value: InteriorTrimData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  function patchDoor(id: string, field: keyof TrimDoor, val: string | number) {
    set("doors", data.doors.map((d) => d.id === id ? { ...d, [field]: val } : d));
  }
  function patchWindow(id: string, field: keyof TrimWindow, val: string | number) {
    set("windows", data.windows.map((w) => w.id === id ? { ...w, [field]: val } : w));
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const waste       = 1 + data.wasteFactor / 100;
  const sl          = data.stickLength;

  const netBaseLf   = Math.max(0, data.baseLf - data.doorDeductions * 3);
  const baseSticks  = sticks(netBaseLf, sl, waste);
  const crownSticks = sticks(data.crownLf, sl, waste);

  const totalDoorCasingLf   = data.doors.reduce((s, d) => s + doorCasingLf(d), 0);
  const totalWindowCasingLf = data.windows.reduce((s, w) => s + windowCasingLf(w), 0);
  const doorCasingSticks    = sticks(totalDoorCasingLf, sl, waste);
  const windowCasingSticks  = sticks(totalWindowCasingLf, sl, waste);
  const totalSticks         = baseSticks + crownSticks + doorCasingSticks + windowCasingSticks;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Global options ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Trim Options</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Stick length */}
          <div>
            <label className={labelCls}>Stick Length</label>
            <div className="flex gap-1">
              {([8, 12, 16] as const).map((l) => (
                <button key={l} type="button" onClick={() => set("stickLength", l)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    data.stickLength === l
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500"
                  }`}>{l}&apos;</button>
              ))}
            </div>
          </div>
          {/* Waste */}
          <div>
            <label className={labelCls}>Waste %</label>
            <input type="number" min="0" max="30" value={data.wasteFactor || ""}
              onChange={(e) => set("wasteFactor", Number(e.target.value) || 0)}
              placeholder="10" className={inputCls} />
          </div>
        </div>
      </div>

      {/* ── Base Molding ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Base Molding</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Total wall LF</label>
            <input type="number" min="0" value={data.baseLf || ""}
              onChange={(e) => set("baseLf", Number(e.target.value) || 0)}
              placeholder="0" className={inputCls} />
            <p className="text-[10px] text-slate-500 mt-1">From Wall Assembly total LF</p>
          </div>
          <div>
            <label className={labelCls}>Door openings</label>
            <input type="number" min="0" value={data.doorDeductions || ""}
              onChange={(e) => set("doorDeductions", Number(e.target.value) || 0)}
              placeholder="0" className={inputCls} />
            <p className="text-[10px] text-slate-500 mt-1">Each deducts 3 lf of base</p>
          </div>
          <div>
            <label className={labelCls}>Crown Molding LF <span className="text-slate-600">(optional)</span></label>
            <input type="number" min="0" value={data.crownLf || ""}
              onChange={(e) => set("crownLf", Number(e.target.value) || 0)}
              placeholder="0" className={inputCls} />
          </div>
        </div>

        {/* Base profile */}
        <div>
          <label className={labelCls}>Base Profile</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {TRIM_PROFILES.filter(p => p.value !== "").map((p) => (
              <button key={p.value} type="button"
                onClick={() => set("baseProfile", data.baseProfile === p.value ? "" : p.value)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  data.baseProfile === p.value
                    ? "bg-emerald-700 border-emerald-600 text-white"
                    : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          {data.baseProfile && (
            <p className="text-[10px] text-emerald-500 mt-1">Will search catalog for &quot;{data.baseProfile}&quot; base products first</p>
          )}
        </div>

        {data.baseLf > 0 && (
          <div className="rounded-lg bg-slate-700/40 border border-slate-700 px-4 py-2.5 flex flex-wrap gap-x-6 gap-y-1 text-xs">
            <span className="text-slate-400">Gross: <span className="text-white font-medium">{data.baseLf} lf</span></span>
            {data.doorDeductions > 0 && (
              <span className="text-slate-400">− {data.doorDeductions} doors × 3&apos; = <span className="text-white font-medium">{netBaseLf} lf net</span></span>
            )}
            <span className="text-slate-400">→ <span className="text-white font-medium">{baseSticks} sticks</span> ({sl}&apos; ea)</span>
            {data.crownLf > 0 && (
              <span className="text-slate-400">Crown: <span className="text-white font-medium">{crownSticks} sticks</span></span>
            )}
          </div>
        )}
      </div>

      {/* ── Door Casing ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Door Casing</h3>
          {totalDoorCasingLf > 0 && (
            <span className="text-xs text-slate-400">{totalDoorCasingLf.toFixed(1)} lf · {doorCasingSticks} sticks</span>
          )}
        </div>

        {/* Casing profile — shared with window casing */}
        <div>
          <label className={labelCls}>Casing Profile <span className="text-slate-600">(applies to doors &amp; windows)</span></label>
          <div className="flex flex-wrap gap-2 mt-1">
            {TRIM_PROFILES.filter(p => p.value !== "").map((p) => (
              <button key={p.value} type="button"
                onClick={() => set("casingProfile", data.casingProfile === p.value ? "" : p.value)}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  data.casingProfile === p.value
                    ? "bg-blue-700 border-blue-600 text-white"
                    : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          {data.casingProfile && (
            <p className="text-[10px] text-blue-400 mt-1">Will search catalog for &quot;{data.casingProfile}&quot; casing products first</p>
          )}
        </div>

        <p className="text-xs text-slate-500">Interior = both sides · Exterior = one side</p>

        {data.doors.length === 0 && (
          <p className="text-xs text-slate-500">No doors added.</p>
        )}

        <div className="space-y-3">
          {data.doors.map((d, idx) => {
            const lf = doorCasingLf(d);
            return (
              <div key={d.id} className="rounded-lg bg-slate-700/40 border border-slate-700 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-5">{idx + 1}</span>
                  <input type="text" value={d.label}
                    onChange={(e) => patchDoor(d.id, "label", e.target.value)}
                    placeholder="e.g. Bedroom door"
                    className={inputCls + " flex-1"} />
                  {/* Interior / Exterior toggle */}
                  <div className="flex gap-1 flex-shrink-0">
                    {(["interior", "exterior"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => patchDoor(d.id, "type", t)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          d.type === t
                            ? t === "interior" ? "bg-blue-600 border-blue-600 text-white" : "bg-amber-600 border-amber-600 text-white"
                            : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500"
                        }`}>
                        {t === "interior" ? "Int" : "Ext"}
                      </button>
                    ))}
                  </div>
                  <RemoveBtn onClick={() => set("doors", data.doors.filter((x) => x.id !== d.id))} />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <FtInInput label="Width"
                    ft={d.widthFt} inches={d.widthIn}
                    onFt={(v) => patchDoor(d.id, "widthFt", v)}
                    onIn={(v) => patchDoor(d.id, "widthIn", v)} />
                  <FtInInput label="Height"
                    ft={d.heightFt} inches={d.heightIn}
                    onFt={(v) => patchDoor(d.id, "heightFt", v)}
                    onIn={(v) => patchDoor(d.id, "heightIn", v)} />
                  <div>
                    <label className={labelCls}>Count</label>
                    <input type="number" min="1" value={d.count || ""}
                      onChange={(e) => patchDoor(d.id, "count", Math.max(1, Number(e.target.value) || 1))}
                      placeholder="1" className={inputCls} />
                  </div>
                </div>

                {lf > 0 && (
                  <p className="text-xs text-slate-400">
                    {fmtFtIn(d.widthFt, d.widthIn)} × {fmtFtIn(d.heightFt, d.heightIn)}
                    {" · "}{d.type === "interior" ? "both sides" : "one side"}
                    {" · "}<span className="text-white font-medium">{lf.toFixed(1)} lf</span>
                    {d.count > 1 && ` (${d.count} doors)`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <AddBtn onClick={() => set("doors", [...data.doors, newDoor()])} label="Add Door" />
      </div>

      {/* ── Window Casing ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Window Casing</h3>
          <div className="flex items-center gap-3">
            {data.casingProfile && (
              <span className="text-xs text-blue-400 font-medium capitalize">{data.casingProfile} profile</span>
            )}
            {totalWindowCasingLf > 0 && (
              <span className="text-xs text-slate-400">{totalWindowCasingLf.toFixed(1)} lf · {windowCasingSticks} sticks</span>
            )}
          </div>
        </div>

        {data.windows.length === 0 && (
          <p className="text-xs text-slate-500">No windows added.</p>
        )}

        <div className="space-y-3">
          {data.windows.map((w, idx) => {
            const lf = windowCasingLf(w);
            return (
              <div key={w.id} className="rounded-lg bg-slate-700/40 border border-slate-700 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-5">{idx + 1}</span>
                  <input type="text" value={w.label}
                    onChange={(e) => patchWindow(w.id, "label", e.target.value)}
                    placeholder="e.g. Living room window"
                    className={inputCls + " flex-1"} />
                  <RemoveBtn onClick={() => set("windows", data.windows.filter((x) => x.id !== w.id))} />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <FtInInput label="Width"
                    ft={w.widthFt} inches={w.widthIn}
                    onFt={(v) => patchWindow(w.id, "widthFt", v)}
                    onIn={(v) => patchWindow(w.id, "widthIn", v)} />
                  <FtInInput label="Height"
                    ft={w.heightFt} inches={w.heightIn}
                    onFt={(v) => patchWindow(w.id, "heightFt", v)}
                    onIn={(v) => patchWindow(w.id, "heightIn", v)} />
                  <div>
                    <label className={labelCls}>Count</label>
                    <input type="number" min="1" value={w.count || ""}
                      onChange={(e) => patchWindow(w.id, "count", Math.max(1, Number(e.target.value) || 1))}
                      placeholder="1" className={inputCls} />
                  </div>
                </div>

                {lf > 0 && (
                  <p className="text-xs text-slate-400">
                    {fmtFtIn(w.widthFt, w.widthIn)} × {fmtFtIn(w.heightFt, w.heightIn)}
                    {" · "}<span className="text-white font-medium">{lf.toFixed(1)} lf</span>
                    {w.count > 1 && ` (${w.count} windows)`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <AddBtn onClick={() => set("windows", [...data.windows, newWindow()])} label="Add Window" />
      </div>

      {/* ── Summary ── */}
      {totalSticks > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Material Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {baseSticks > 0 && (
              <div className="bg-slate-700/50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500 mb-1">Base Molding</p>
                <p className="text-lg font-bold text-white">{baseSticks}</p>
                <p className="text-xs text-slate-400">sticks · {netBaseLf.toFixed(0)} lf net</p>
              </div>
            )}
            {crownSticks > 0 && (
              <div className="bg-slate-700/50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500 mb-1">Crown Molding</p>
                <p className="text-lg font-bold text-white">{crownSticks}</p>
                <p className="text-xs text-slate-400">sticks · {data.crownLf} lf</p>
              </div>
            )}
            {doorCasingSticks > 0 && (
              <div className="bg-slate-700/50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500 mb-1">Door Casing</p>
                <p className="text-lg font-bold text-white">{doorCasingSticks}</p>
                <p className="text-xs text-slate-400">sticks · {totalDoorCasingLf.toFixed(0)} lf</p>
              </div>
            )}
            {windowCasingSticks > 0 && (
              <div className="bg-slate-700/50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500 mb-1">Window Casing</p>
                <p className="text-lg font-bold text-white">{windowCasingSticks}</p>
                <p className="text-xs text-slate-400">sticks · {totalWindowCasingLf.toFixed(0)} lf</p>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500">
            All counts include {data.wasteFactor}% waste · {sl}&apos; sticks
          </p>
        </div>
      )}

    </div>
  );
}
