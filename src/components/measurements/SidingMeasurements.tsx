"use client";

import { useState } from "react";

export interface SidingOpening {
  id: string
  label: string
  type: "door" | "window"
  widthFt: number
  widthIn: number
  heightFt: number
  heightIn: number
  count: number
}

export interface WallEntry {
  id: string
  label: string
  width: number
  height: number
  openings: SidingOpening[]
}

export interface GableEntry {
  id: string
  label: string
  width: number   // base of triangle (ft)
  rise: number    // height of triangle (ft)
}

export type SidingMaterial = "variform" | "lp_smartside"
export type SidingColorRange = "standard" | "dark"
export type SidingGauge = ".040" | ".044" | ".046"
export type MeasurementSource = "manual" | "hover"

export interface HoverData {
  // Areas
  facadesSqft: number
  openingsSqft: number
  // Starter Strip
  starterStripLf: number        // Level Starter — Siding column
  // Corners
  insideCornerQty: number
  insideCorners: number          // Inside corner LF
  outsideCornerQty: number
  outsideCorners: number         // Outside corner LF
  // Openings / J-Channel
  openingQty: number
  openingsTopsLf: number
  openingsSillsLf: number
  openingsSidesLf: number
  openingsPerimeterLf: number
  // Fascia & Soffit
  eavesLf: number
  rakesLf: number
  fasciaLf: number
  soffitArea: number
  soffitLf: number
  friezeBoardLf: number          // Level Frieze Board LF
  // Other Trim
  verticalTrimLf: number         // Vertical Trim — Siding column
  slopedTrimLf: number           // Sloped Trim — Siding column
}

export interface SidingData {
  measurementSource: MeasurementSource
  walls: WallEntry[]
  gables: GableEntry[]
  hover: HoverData
  wasteFactor: number
  wallAreaSqft: number
  insideCorners: number
  outsideCorners: number
  perimeterLf: number
  jChannelLfDirect: number
  finishTrimLf: number
  soffitArea: number
  soffitLf: number
  fasciaLf: number
  sidingMaterial: SidingMaterial
  sidingGauge: SidingGauge
  sidingColorRange: SidingColorRange
  mountMasters: number
  splitBlocks: number
  exhaustVents: number
  throughWallVents: number
  windowWrapsSmall: number
  windowWrapsLarge: number
  doorWrapsSmall: number
  doorWrapsLarge: number
}

interface Props {
  initialData?: Partial<SidingData>;
  onChange: (data: SidingData) => void;
}

const inputCls = "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";
const sectionCls = "bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4";

const SIDING_MATERIALS: { value: SidingMaterial; label: string; sub: string }[] = [
  { value: "variform",     label: "Vinyl (Variform)",  sub: "Vinyl siding" },
  { value: "lp_smartside", label: "LP SmartSide",      sub: "Engineered wood" },
];

const SIDING_GAUGES: { value: SidingGauge; label: string; description: string }[] = [
  { value: ".040", label: ".040\"", description: "Economy" },
  { value: ".044", label: ".044\"", description: "Mid-grade" },
  { value: ".046", label: ".046\"", description: "Premium" },
];

const SIDING_COLORS: { value: SidingColorRange; label: string; sub: string }[] = [
  { value: "standard", label: "Standard Colors", sub: "Lighter / neutral tones" },
  { value: "dark",     label: "Dark Colors",     sub: "Bold / deep tones" },
];

const WASTE_OPTIONS = [0, 10, 18];

function uid() { return String(Date.now() + Math.random()); }
function newWall(): WallEntry { return { id: uid(), label: "", width: 0, height: 0, openings: [] }; }
function newGable(): GableEntry { return { id: uid(), label: "", width: 0, rise: 0 }; }
function newOpening(type: "door" | "window"): SidingOpening {
  return { id: uid(), label: "", type, widthFt: 0, widthIn: 0, heightFt: 0, heightIn: 0, count: 1 };
}
function calcOpeningArea(o: SidingOpening): number {
  return (o.widthFt + o.widthIn / 12) * (o.heightFt + o.heightIn / 12) * Math.max(1, o.count);
}
function calcGableArea(g: GableEntry): number { return 0.5 * g.width * g.rise; }

function NumField({ label, unit, value, onChange, hint }: {
  label: string; unit?: string; value: number; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {unit && <span className="text-slate-500 ml-1">({unit})</span>}
        {hint && <span className="text-slate-600 ml-1 text-[10px]">— {hint}</span>}
      </label>
      <input
        type="number"
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        placeholder="0"
        min="0"
        className={inputCls}
      />
    </div>
  );
}

function FtIn({ ft, inches, onFt, onIn }: {
  ft: number; inches: number; onFt: (v: number) => void; onIn: (v: number) => void;
}) {
  return (
    <div className="flex gap-1 min-w-[120px]">
      <div className="flex-1 relative">
        <input type="number" value={ft === 0 ? "" : ft}
          onChange={(e) => onFt(Number(e.target.value) || 0)}
          placeholder="0" min="0" className={inputCls + " pr-6 text-center"} />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">ft</span>
      </div>
      <div className="flex-1 relative">
        <input type="number" value={inches === 0 ? "" : inches}
          onChange={(e) => onIn(Math.min(11, Number(e.target.value) || 0))}
          placeholder="0" min="0" max="11" className={inputCls + " pr-6 text-center"} />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">in</span>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">{children}</p>;
}

const defaultHover: HoverData = {
  facadesSqft: 0, openingsSqft: 0,
  starterStripLf: 0,
  insideCornerQty: 0, insideCorners: 0,
  outsideCornerQty: 0, outsideCorners: 0,
  openingQty: 0,
  openingsTopsLf: 0, openingsSillsLf: 0, openingsSidesLf: 0, openingsPerimeterLf: 0,
  eavesLf: 0, rakesLf: 0, fasciaLf: 0,
  soffitArea: 0, soffitLf: 0, friezeBoardLf: 0,
  verticalTrimLf: 0, slopedTrimLf: 0,
};

export default function SidingMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<SidingData>({
    measurementSource: (initialData?.measurementSource as MeasurementSource) ?? "manual",
    walls: (initialData?.walls ?? [newWall()]).map(w => ({ ...w, openings: w.openings ?? [] })),
    gables: initialData?.gables ?? [],
    hover: { ...defaultHover, ...initialData?.hover },
    wasteFactor: initialData?.wasteFactor ?? 10,
    wallAreaSqft:      initialData?.wallAreaSqft      ?? 0,
    insideCorners:     initialData?.insideCorners     ?? 0,
    outsideCorners:    initialData?.outsideCorners    ?? 0,
    perimeterLf:       initialData?.perimeterLf       ?? 0,
    jChannelLfDirect:  initialData?.jChannelLfDirect  ?? 0,
    finishTrimLf:      initialData?.finishTrimLf      ?? 0,
    soffitArea:        initialData?.soffitArea        ?? 0,
    soffitLf:          initialData?.soffitLf          ?? 0,
    fasciaLf:          initialData?.fasciaLf          ?? 0,
    sidingMaterial:    (initialData?.sidingMaterial   as SidingMaterial)   ?? "variform",
    sidingGauge:       (initialData?.sidingGauge      as SidingGauge)      ?? ".044",
    sidingColorRange:  (initialData?.sidingColorRange as SidingColorRange) ?? "standard",
    mountMasters:      initialData?.mountMasters      ?? 0,
    splitBlocks:       initialData?.splitBlocks       ?? 0,
    exhaustVents:      initialData?.exhaustVents      ?? 0,
    throughWallVents:  initialData?.throughWallVents  ?? 0,
    windowWrapsSmall:  initialData?.windowWrapsSmall  ?? 0,
    windowWrapsLarge:  initialData?.windowWrapsLarge  ?? 0,
    doorWrapsSmall:    initialData?.doorWrapsSmall    ?? 0,
    doorWrapsLarge:    initialData?.doorWrapsLarge    ?? 0,
  });

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  function push(next: SidingData) { setData(next); onChange(next); }
  function update<K extends keyof SidingData>(key: K, value: SidingData[K]) { push({ ...data, [key]: value }); }
  function updateHover(patch: Partial<HoverData>) { push({ ...data, hover: { ...data.hover, ...patch } }); }

  // Hover perimeter auto-calc from openings subtotals
  function updateOpeningsSide(patch: Partial<HoverData>) {
    const merged = { ...data.hover, ...patch };
    const total = merged.openingsTopsLf + merged.openingsSillsLf + merged.openingsSidesLf;
    push({ ...data, hover: { ...merged, openingsPerimeterLf: total } });
  }

  // Wall helpers
  function updateWall(id: string, patch: Partial<WallEntry>) {
    push({ ...data, walls: data.walls.map(w => w.id === id ? { ...w, ...patch } : w) });
  }
  function addWall() { const w = newWall(); push({ ...data, walls: [...data.walls, w] }); setExpanded(p => new Set([...p, w.id])); }
  function removeWall(id: string) { push({ ...data, walls: data.walls.filter(w => w.id !== id) }); setExpanded(p => { const s = new Set(p); s.delete(id); return s; }); }
  function toggleExpand(id: string) { setExpanded(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; }); }

  // Gable helpers
  function addGable() { push({ ...data, gables: [...data.gables, newGable()] }); }
  function updateGable(id: string, patch: Partial<GableEntry>) { push({ ...data, gables: data.gables.map(g => g.id === id ? { ...g, ...patch } : g) }); }
  function removeGable(id: string) { push({ ...data, gables: data.gables.filter(g => g.id !== id) }); }

  // Opening helpers
  function addOpening(wallId: string, type: "door" | "window") {
    push({ ...data, walls: data.walls.map(w => w.id === wallId ? { ...w, openings: [...w.openings, newOpening(type)] } : w) });
  }
  function removeOpening(wallId: string, openingId: string) {
    push({ ...data, walls: data.walls.map(w => w.id === wallId ? { ...w, openings: w.openings.filter(o => o.id !== openingId) } : w) });
  }
  function updateOpening(wallId: string, openingId: string, patch: Partial<SidingOpening>) {
    push({ ...data, walls: data.walls.map(w => w.id === wallId ? { ...w, openings: w.openings.map(o => o.id === openingId ? { ...o, ...patch } : o) } : w) });
  }

  const isHover = data.measurementSource === "hover";

  // Manual totals
  const totalWallArea    = data.walls.reduce((s, w) => s + w.width * w.height, 0);
  const totalGableArea   = data.gables.reduce((s, g) => s + calcGableArea(g), 0);
  const totalFieldArea   = totalWallArea + totalGableArea;
  const totalOpeningArea = data.walls.reduce((s, w) => s + (w.openings ?? []).reduce((os, o) => os + calcOpeningArea(o), 0), 0);
  const grossWithWaste   = totalFieldArea * (1 + data.wasteFactor / 100);
  const netSidingArea    = Math.max(Math.ceil(grossWithWaste - totalOpeningArea), Math.ceil(totalFieldArea * 0.5));

  // Hover totals
  const hoverGross = data.hover.facadesSqft * (1 + data.wasteFactor / 100);
  const hoverNet   = Math.max(Math.ceil(hoverGross - data.hover.openingsSqft), Math.ceil(data.hover.facadesSqft * 0.5));

  return (
    <div className="space-y-5">

      {/* ── Source Toggle ─────────────────────────────────────────────────────── */}
      <div className={sectionCls}>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Measurement Source</h3>
        <div className="flex gap-3">
          {([
            { value: "hover",  label: "Hover Report",  sub: "Copy totals from Hover PDF" },
            { value: "manual", label: "Hand Measured",  sub: "Enter walls & dimensions" },
          ] as { value: MeasurementSource; label: string; sub: string }[]).map(opt => {
            const active = data.measurementSource === opt.value;
            return (
              <button key={opt.value} type="button"
                onClick={() => update("measurementSource", opt.value)}
                className={["flex flex-col items-start px-4 py-3 rounded-xl border text-left transition-all flex-1",
                  active ? "bg-blue-600/20 border-blue-500 ring-1 ring-blue-500"
                         : "bg-slate-700/50 border-slate-600 hover:border-slate-500"].join(" ")}>
                <span className={["text-sm font-bold", active ? "text-blue-300" : "text-white"].join(" ")}>{opt.label}</span>
                <span className="text-xs text-slate-400 mt-0.5">{opt.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Material ─────────────────────────────────────────────────────────── */}
      <div className={sectionCls}>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Siding Material</h3>
        <div className="flex flex-wrap gap-3">
          {SIDING_MATERIALS.map(m => {
            const active = data.sidingMaterial === m.value;
            return (
              <button key={m.value} onClick={() => update("sidingMaterial", m.value)}
                className={["flex flex-col items-start px-4 py-3 rounded-xl border text-left transition-all flex-1",
                  active ? "bg-blue-600/20 border-blue-500 ring-1 ring-blue-500"
                         : "bg-slate-700/50 border-slate-600 hover:border-slate-500"].join(" ")}>
                <span className={["text-sm font-bold", active ? "text-blue-300" : "text-white"].join(" ")}>{m.label}</span>
                <span className="text-xs text-slate-400 mt-0.5">{m.sub}</span>
              </button>
            );
          })}
        </div>

        {data.sidingMaterial === "variform" && (
          <div className="space-y-3 pt-1">
            <div>
              <SectionLabel>Gauge</SectionLabel>
              <div className="flex flex-wrap gap-3">
                {SIDING_GAUGES.map(g => {
                  const active = data.sidingGauge === g.value;
                  return (
                    <button key={g.value} onClick={() => update("sidingGauge", g.value)}
                      className={["flex flex-col items-start px-4 py-2.5 rounded-xl border text-left transition-all",
                        active ? "bg-blue-600/20 border-blue-500 ring-1 ring-blue-500"
                               : "bg-slate-700/50 border-slate-600 hover:border-slate-500"].join(" ")}>
                      <span className={["text-base font-bold tracking-wide", active ? "text-blue-300" : "text-white"].join(" ")}>{g.label}</span>
                      <span className="text-xs text-slate-400 mt-0.5">{g.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <SectionLabel>Color Range</SectionLabel>
              <div className="flex flex-wrap gap-3">
                {SIDING_COLORS.map(c => {
                  const active = data.sidingColorRange === c.value;
                  return (
                    <button key={c.value} onClick={() => update("sidingColorRange", c.value)}
                      className={["flex flex-col items-start px-4 py-2.5 rounded-xl border text-left transition-all",
                        active ? "bg-blue-600/20 border-blue-500 ring-1 ring-blue-500"
                               : "bg-slate-700/50 border-slate-600 hover:border-slate-500"].join(" ")}>
                      <span className={["text-sm font-bold", active ? "text-blue-300" : "text-white"].join(" ")}>{c.label}</span>
                      <span className="text-xs text-slate-400 mt-0.5">{c.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── HOVER MODE ──────────────────────────────────────────────────────── */}
      {isHover && (<>

        {/* 1. Wall Area */}
        <div className={sectionCls}>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-sky-400 uppercase tracking-widest">Hover</h3>
            <span className="text-xs text-slate-500">Areas — copy from Hover Summary PDF</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <NumField label="Facade Area" unit="sqft" value={data.hover.facadesSqft}
              onChange={v => updateHover({ facadesSqft: v })} hint="Siding column" />
            <NumField label="Openings" unit="sqft" value={data.hover.openingsSqft}
              onChange={v => updateHover({ openingsSqft: v })} hint="deduction" />
            <div>
              <label className={labelCls}>Waste Factor</label>
              <div className="flex gap-2">
                {WASTE_OPTIONS.map(w => (
                  <button key={w} type="button" onClick={() => update("wasteFactor", w)}
                    className={["flex-1 py-1.5 rounded-lg border text-sm font-semibold transition-colors",
                      data.wasteFactor === w
                        ? "border-blue-500 bg-blue-900/30 text-blue-300"
                        : "border-slate-600 text-slate-400 hover:border-slate-500"].join(" ")}>
                    {w}%
                  </button>
                ))}
              </div>
            </div>
          </div>
          {data.hover.facadesSqft > 0 && (
            <div className="rounded-lg bg-sky-900/20 border border-sky-800/50 px-4 py-2.5 flex flex-wrap items-center gap-4 text-sm">
              <span className="text-slate-400">{data.hover.facadesSqft.toLocaleString()} sqf</span>
              <span className="text-slate-600">+{data.wasteFactor}% →</span>
              <span className="text-white font-semibold">{Math.ceil(hoverGross).toLocaleString()} sqf</span>
              {data.hover.openingsSqft > 0 && <>
                <span className="text-slate-600">− {data.hover.openingsSqft} openings →</span>
                <span className="text-sky-300 font-bold">{hoverNet.toLocaleString()} sqf net</span>
              </>}
            </div>
          )}
        </div>

        {/* 2. Starter Strip */}
        <div className={sectionCls}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Starter Strip</h3>
          <div className="grid grid-cols-2 gap-4">
            <NumField label="Level Starter" unit="lf" value={data.hover.starterStripLf}
              onChange={v => updateHover({ starterStripLf: v })} hint="Trim → Siding column" />
          </div>
        </div>

        {/* 3. Corners */}
        <div className={sectionCls}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Corners</h3>
          <div className="space-y-3">
            <div>
              <SectionLabel>Outside Corners — Siding column</SectionLabel>
              <div className="grid grid-cols-2 gap-4">
                <NumField label="Qty" unit="ea" value={data.hover.outsideCornerQty}
                  onChange={v => updateHover({ outsideCornerQty: v })} />
                <NumField label="Length" unit="lf" value={data.hover.outsideCorners}
                  onChange={v => updateHover({ outsideCorners: v })} />
              </div>
            </div>
            <div>
              <SectionLabel>Inside Corners — Siding column</SectionLabel>
              <div className="grid grid-cols-2 gap-4">
                <NumField label="Qty" unit="ea" value={data.hover.insideCornerQty}
                  onChange={v => updateHover({ insideCornerQty: v })} />
                <NumField label="Length" unit="lf" value={data.hover.insideCorners}
                  onChange={v => updateHover({ insideCorners: v })} />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Opening Trim (J-Channel) */}
        <div className={sectionCls}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Opening Trim — J-Channel</h3>
          <p className="text-xs text-slate-500 -mt-2">From Hover Summary → Openings table, Siding column</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <NumField label="Opening Qty" unit="ea" value={data.hover.openingQty}
              onChange={v => updateHover({ openingQty: v })} />
            <NumField label="Tops Length" unit="lf" value={data.hover.openingsTopsLf}
              onChange={v => updateOpeningsSide({ openingsTopsLf: v })} />
            <NumField label="Sills Length" unit="lf" value={data.hover.openingsSillsLf}
              onChange={v => updateOpeningsSide({ openingsSillsLf: v })} />
            <NumField label="Sides Length" unit="lf" value={data.hover.openingsSidesLf}
              onChange={v => updateOpeningsSide({ openingsSidesLf: v })} />
          </div>
          {data.hover.openingsPerimeterLf > 0 && (
            <div className="flex items-center gap-2 text-sm pt-1">
              <span className="text-slate-500">Total opening perimeter:</span>
              <span className="font-semibold text-white">{data.hover.openingsPerimeterLf.toFixed(0)} lf</span>
            </div>
          )}
        </div>

        {/* 5. Fascia & Soffit */}
        <div className={sectionCls}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Fascia &amp; Soffit</h3>
          <p className="text-xs text-slate-500 -mt-2">From Hover Summary → Roofline table</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <NumField label="Eaves Fascia" unit="lf" value={data.hover.eavesLf}
              onChange={v => updateHover({ eavesLf: v, fasciaLf: v + data.hover.rakesLf })} />
            <NumField label="Rakes Fascia" unit="lf" value={data.hover.rakesLf}
              onChange={v => updateHover({ rakesLf: v, fasciaLf: data.hover.eavesLf + v })} />
            <NumField label="Soffit Area" unit="sqft" value={data.hover.soffitArea}
              onChange={v => updateHover({ soffitArea: v })} hint="Level Frieze soffit" />
            <NumField label="Soffit Length" unit="lf" value={data.hover.soffitLf}
              onChange={v => updateHover({ soffitLf: v })} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
            <NumField label="Frieze Board" unit="lf" value={data.hover.friezeBoardLf}
              onChange={v => updateHover({ friezeBoardLf: v })} hint="Level Frieze Board LF" />
          </div>
        </div>

        {/* 6. Other Trim */}
        <div className={sectionCls}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Other Trim</h3>
          <p className="text-xs text-slate-500 -mt-2">From Hover Summary → Trim table, Siding column</p>
          <div className="grid grid-cols-2 gap-4">
            <NumField label="Vertical Trim" unit="lf" value={data.hover.verticalTrimLf}
              onChange={v => updateHover({ verticalTrimLf: v })} />
            <NumField label="Sloped Trim" unit="lf" value={data.hover.slopedTrimLf}
              onChange={v => updateHover({ slopedTrimLf: v })} />
          </div>
        </div>

      </>)}

      {/* ── MANUAL MODE ─────────────────────────────────────────────────────── */}
      {!isHover && (<>

        {/* Walls */}
        <div className={sectionCls}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Walls</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">Waste:</span>
              <div className="flex gap-1">
                {WASTE_OPTIONS.map(w => (
                  <button key={w} type="button" onClick={() => update("wasteFactor", w)}
                    className={["px-3 py-1 rounded-lg border text-xs font-semibold transition-colors",
                      data.wasteFactor === w
                        ? "border-blue-500 bg-blue-900/30 text-blue-300"
                        : "border-slate-600 text-slate-400 hover:border-slate-500"].join(" ")}>
                    {w}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_100px_100px_80px_32px_32px] gap-2 text-xs text-slate-500 font-medium px-1">
            <span>Label</span><span>Width (ft)</span><span>Height (ft)</span>
            <span className="text-right">Field sqf</span><span></span><span></span>
          </div>

          <div className="space-y-2">
            {data.walls.map((wall, idx) => {
              const fieldArea  = wall.width * wall.height;
              const openArea   = (wall.openings ?? []).reduce((s, o) => s + calcOpeningArea(o), 0);
              const wallWasted = fieldArea * (1 + data.wasteFactor / 100);
              const wallNet    = Math.max(wallWasted - openArea, 0);
              const isExp      = expanded.has(wall.id);
              return (
                <div key={wall.id} className="rounded-lg border border-slate-700 overflow-hidden">
                  <div className="grid grid-cols-[1fr_100px_100px_80px_32px_32px] gap-2 items-center px-3 py-2 bg-slate-700/30">
                    <input type="text" value={wall.label}
                      onChange={e => updateWall(wall.id, { label: e.target.value })}
                      placeholder={`Wall ${idx + 1}`} className={inputCls} />
                    <input type="number" value={wall.width === 0 ? "" : wall.width}
                      onChange={e => updateWall(wall.id, { width: Number(e.target.value) || 0 })}
                      placeholder="0" min="0" step="0.5" className={inputCls} />
                    <input type="number" value={wall.height === 0 ? "" : wall.height}
                      onChange={e => updateWall(wall.id, { height: Number(e.target.value) || 0 })}
                      placeholder="0" min="0" step="0.5" className={inputCls} />
                    <div className="text-right">
                      <span className="text-sm font-semibold text-white">{fieldArea > 0 ? fieldArea.toLocaleString() : "—"}</span>
                      {openArea > 0 && <div className="text-xs text-emerald-400">net {Math.round(wallNet)}</div>}
                    </div>
                    <button onClick={() => toggleExpand(wall.id)}
                      className={["flex items-center justify-center w-7 h-7 rounded-md border transition-all",
                        isExp ? "border-blue-500 bg-blue-600/20 text-blue-400"
                          : (wall.openings ?? []).length > 0
                          ? "border-emerald-600 bg-emerald-900/20 text-emerald-400"
                          : "border-slate-600 bg-slate-700 text-slate-400 hover:border-slate-500"].join(" ")}>
                      {(wall.openings ?? []).length > 0 && !isExp
                        ? <span className="text-xs font-bold">{(wall.openings ?? []).length}</span>
                        : <svg className={["w-3.5 h-3.5 transition-transform", isExp ? "rotate-180" : ""].join(" ")}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>}
                    </button>
                    <button onClick={() => removeWall(wall.id)} disabled={data.walls.length === 1}
                      className="flex items-center justify-center w-7 h-7 text-slate-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {isExp && (
                    <div className="border-t border-slate-700 bg-slate-900/40 px-4 py-3 space-y-3">
                      {(wall.openings ?? []).length > 0 && (
                        <div className="space-y-1">
                          <div className="grid grid-cols-[80px_1fr_180px_180px_60px_60px_32px] gap-2 text-xs text-slate-500 font-medium mb-1 px-1">
                            <span>Type</span><span>Label</span><span>Width</span><span>Height</span>
                            <span className="text-center">Count</span><span className="text-right">sqf</span><span></span>
                          </div>
                          {(wall.openings ?? []).map(o => {
                            const area = calcOpeningArea(o);
                            return (
                              <div key={o.id} className="grid grid-cols-[80px_1fr_180px_180px_60px_60px_32px] gap-2 items-center">
                                <button onClick={() => updateOpening(wall.id, o.id, { type: o.type === "door" ? "window" : "door" })}
                                  className={["text-xs font-semibold px-2 py-1 rounded-md border transition-all",
                                    o.type === "door" ? "bg-amber-900/30 border-amber-700 text-amber-400"
                                                      : "bg-sky-900/30 border-sky-700 text-sky-400"].join(" ")}>
                                  {o.type === "door" ? "Door" : "Window"}
                                </button>
                                <input type="text" value={o.label}
                                  onChange={e => updateOpening(wall.id, o.id, { label: e.target.value })}
                                  placeholder={o.type === "door" ? "Entry, Garage…" : "DH, Casement…"} className={inputCls} />
                                <FtIn ft={o.widthFt} inches={o.widthIn}
                                  onFt={v => updateOpening(wall.id, o.id, { widthFt: v })}
                                  onIn={v => updateOpening(wall.id, o.id, { widthIn: v })} />
                                <FtIn ft={o.heightFt} inches={o.heightIn}
                                  onFt={v => updateOpening(wall.id, o.id, { heightFt: v })}
                                  onIn={v => updateOpening(wall.id, o.id, { heightIn: v })} />
                                <input type="number" value={o.count === 1 ? "" : o.count}
                                  onChange={e => updateOpening(wall.id, o.id, { count: Math.max(1, Number(e.target.value) || 1) })}
                                  placeholder="1" min="1" className={inputCls + " text-center"} />
                                <div className="text-right text-sm font-medium text-slate-300">{area > 0 ? area.toFixed(1) : "—"}</div>
                                <button onClick={() => removeOpening(wall.id, o.id)}
                                  className="flex items-center justify-center text-slate-600 hover:text-red-400 transition-colors">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex items-center gap-3 pt-1">
                        <button onClick={() => addOpening(wall.id, "door")}
                          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          Add Door
                        </button>
                        <span className="text-slate-700">|</span>
                        <button onClick={() => addOpening(wall.id, "window")}
                          className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          Add Window
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={addWall} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 pt-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Wall
          </button>

          {totalFieldArea > 0 && (
            <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-4 py-2.5 flex flex-wrap items-center gap-4 text-sm">
              <span className="text-slate-400">{totalWallArea.toLocaleString()} sqf walls</span>
              {totalGableArea > 0 && <span className="text-slate-400">+ {totalGableArea.toFixed(0)} gables</span>}
              <span className="text-slate-600">+{data.wasteFactor}% →</span>
              {totalOpeningArea > 0 && <span className="text-red-400">− {totalOpeningArea.toFixed(0)} openings</span>}
              <span className="text-blue-300 font-bold">{netSidingArea.toLocaleString()} sqf net</span>
            </div>
          )}
        </div>

        {/* Gable Ends */}
        <div className={sectionCls}>
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Gable Ends</h3>
            <p className="text-xs text-slate-500 mt-0.5">Area = ½ × width × rise — added to total field area</p>
          </div>
          {data.gables.length > 0 && (
            <>
              <div className="grid grid-cols-[1fr_110px_110px_90px_32px] gap-2 text-xs text-slate-500 font-medium px-1">
                <span>Label</span><span>Width (ft)</span><span>Rise (ft)</span><span className="text-right">Area sqf</span><span></span>
              </div>
              <div className="space-y-2">
                {data.gables.map((g, idx) => {
                  const area = calcGableArea(g);
                  return (
                    <div key={g.id} className="grid grid-cols-[1fr_110px_110px_90px_32px] gap-2 items-center px-3 py-2 rounded-lg border border-slate-700 bg-slate-700/30">
                      <input type="text" value={g.label}
                        onChange={e => updateGable(g.id, { label: e.target.value })}
                        placeholder={`Gable ${idx + 1}`} className={inputCls} />
                      <input type="number" value={g.width === 0 ? "" : g.width}
                        onChange={e => updateGable(g.id, { width: Number(e.target.value) || 0 })}
                        placeholder="0" min="0" step="0.5" className={inputCls} />
                      <input type="number" value={g.rise === 0 ? "" : g.rise}
                        onChange={e => updateGable(g.id, { rise: Number(e.target.value) || 0 })}
                        placeholder="0" min="0" step="0.5" className={inputCls} />
                      <div className="text-right"><span className="text-sm font-semibold text-white">{area > 0 ? area.toFixed(1) : "—"}</span></div>
                      <button onClick={() => removeGable(g.id)}
                        className="flex items-center justify-center w-7 h-7 text-slate-600 hover:text-red-400 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          <button onClick={addGable} className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 pt-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Gable End
          </button>
        </div>

        {/* Soffit & Fascia */}
        <div className={sectionCls}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Soffit &amp; Fascia</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <NumField label="Soffit Area" unit="sqft" value={data.soffitArea} onChange={v => update("soffitArea", v)} />
            <NumField label="Soffit Length" unit="lf" value={data.soffitLf} onChange={v => update("soffitLf", v)} />
            <NumField label="Fascia" unit="lf" value={data.fasciaLf} onChange={v => update("fasciaLf", v)} />
          </div>
        </div>

        {/* Manual trim & perimeter */}
        <div className={sectionCls}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Trim &amp; Perimeter</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <NumField label="Perimeter" unit="lf" value={data.perimeterLf} onChange={v => update("perimeterLf", v)} />
            <NumField label="J Channel" unit="lf" value={data.jChannelLfDirect} onChange={v => update("jChannelLfDirect", v)} />
            <NumField label="Finish Trim" unit="lf" value={data.finishTrimLf} onChange={v => update("finishTrimLf", v)} />
            <NumField label="Inside Corners" unit="lf" value={data.insideCorners} onChange={v => update("insideCorners", v)} />
            <NumField label="Outside Corners" unit="lf" value={data.outsideCorners} onChange={v => update("outsideCorners", v)} />
          </div>
        </div>

      </>)}

      {/* ── Accessories (both modes) ─────────────────────────────────────────── */}
      <div className={sectionCls}>
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Accessories</h3>
          <p className="text-xs text-slate-500 mt-1">Penetrations &amp; utility mounts</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([
            { key: "mountMasters"     as const, label: "Mount Masters"       },
            { key: "splitBlocks"      as const, label: "Split Blocks"        },
            { key: "exhaustVents"     as const, label: "Exhaust Vents",      hint: "Bath / dryer" },
            { key: "throughWallVents" as const, label: "Through Wall Vents", hint: "Microwave"    },
          ] as { key: keyof SidingData; label: string; hint?: string }[]).map(({ key, label, hint }) => (
            <div key={key}>
              <label className={labelCls}>{label}<span className="text-slate-500 ml-1">(ea)</span>{hint && <span className="text-slate-600 ml-1 text-[10px]">— {hint}</span>}</label>
              <div className="flex items-center gap-2">
                <button onClick={() => update(key, Math.max(0, (data[key] as number) - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 flex items-center justify-center text-lg font-bold flex-shrink-0 transition-colors">−</button>
                <input type="number" min="0" value={(data[key] as number) === 0 ? "" : (data[key] as number)}
                  onChange={e => update(key, Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0" className={inputCls + " text-center"} />
                <button onClick={() => update(key, (data[key] as number) + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 flex items-center justify-center text-lg font-bold flex-shrink-0 transition-colors">+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-700 pt-3">
          <p className="text-xs text-slate-500 mb-3">Aluminum Wraps</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {([
              { key: "windowWrapsSmall" as const, label: "Window Wrap Small" },
              { key: "windowWrapsLarge" as const, label: "Window Wrap Large" },
              { key: "doorWrapsSmall"   as const, label: "Door Wrap Small"   },
              { key: "doorWrapsLarge"   as const, label: "Door Wrap Large"   },
            ] as { key: keyof SidingData; label: string }[]).map(({ key, label }) => (
              <div key={key}>
                <label className={labelCls}>{label}<span className="text-slate-500 ml-1">(ea)</span></label>
                <div className="flex items-center gap-2">
                  <button onClick={() => update(key, Math.max(0, (data[key] as number) - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 flex items-center justify-center text-lg font-bold flex-shrink-0 transition-colors">−</button>
                  <input type="number" min="0" value={(data[key] as number) === 0 ? "" : (data[key] as number)}
                    onChange={e => update(key, Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0" className={inputCls + " text-center"} />
                  <button onClick={() => update(key, (data[key] as number) + 1)}
                    className="w-8 h-8 rounded-lg bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 flex items-center justify-center text-lg font-bold flex-shrink-0 transition-colors">+</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
