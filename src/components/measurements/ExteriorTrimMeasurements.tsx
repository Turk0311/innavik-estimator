"use client";

import { useState } from "react";

export type TrimMaterial = 'standard' | 'lp_smart_trim'
export type LpSmartTrimThickness = '4/4' | '5/4'

export interface ExteriorTrimData {
  // Trim material selection
  trimMaterial: TrimMaterial
  lpSmartTrimThickness: LpSmartTrimThickness  // only relevant when trimMaterial === 'lp_smart_trim'
  // Linear feet per trim type
  cornerBoardsLf: number
  friezeLf: number
  rakeLf: number
  waterTableLf: number
  bandBoardLf: number
  windowTrimLf: number
  doorTrimLf: number
  fasciaLf: number
  friezeExposureIn: number  // Frieze face width in inches; bent from aluminum coil on-site
  // Fascia coil — aluminum bent on-site; exposure drives coil yield
  fasciaExposureIn: number  // face width in inches (e.g. 6); return is always 1.25"
  // J-Channel — 12' sticks; around windows/doors, at soffit line, at wall corners
  jChannelLf: number
  // Stick info
  stickLengthFt: number
  wasteFactor: number
}

interface Props {
  initialData?: Partial<ExteriorTrimData>;
  onChange: (data: ExteriorTrimData) => void;
}

const inputCls = "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";

function LfField({ label, value, onChange, hint }: {
  label: string; value: number; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <div>
      <label className={labelCls}>
        {label} <span className="text-slate-500">(lf)</span>
      </label>
      {hint && <p className="text-[10px] text-slate-600 mb-1">{hint}</p>}
      <input
        type="number"
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        placeholder="0"
        min="0"
        step="0.5"
        className={inputCls}
      />
    </div>
  );
}

export default function ExteriorTrimMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<ExteriorTrimData>({
    trimMaterial:         (initialData?.trimMaterial as TrimMaterial) ?? 'standard',
    lpSmartTrimThickness: (initialData?.lpSmartTrimThickness as LpSmartTrimThickness) ?? '4/4',
    cornerBoardsLf: initialData?.cornerBoardsLf ?? 0,
    friezeLf:       initialData?.friezeLf       ?? 0,
    rakeLf:         initialData?.rakeLf         ?? 0,
    waterTableLf:   initialData?.waterTableLf   ?? 0,
    bandBoardLf:    initialData?.bandBoardLf    ?? 0,
    windowTrimLf:   initialData?.windowTrimLf   ?? 0,
    doorTrimLf:     initialData?.doorTrimLf     ?? 0,
    fasciaLf:          initialData?.fasciaLf          ?? 0,
    friezeExposureIn:  initialData?.friezeExposureIn  ?? 4,
    fasciaExposureIn:  initialData?.fasciaExposureIn  ?? 6,
    jChannelLf:       initialData?.jChannelLf       ?? 0,
    stickLengthFt:  initialData?.stickLengthFt  ?? 16,
    wasteFactor:    initialData?.wasteFactor    ?? 10,
  });

  function push(next: ExteriorTrimData) { setData(next); onChange(next); }
  function update<K extends keyof ExteriorTrimData>(key: K, value: ExteriorTrimData[K]) {
    push({ ...data, [key]: value });
  }

  const totalLf =
    data.cornerBoardsLf + data.friezeLf + data.rakeLf +
    data.waterTableLf + data.bandBoardLf + data.windowTrimLf +
    data.doorTrimLf + data.fasciaLf;
  const adjustedLf = Math.ceil(totalLf * (1 + data.wasteFactor / 100));
  // LP sticks are always 16ft; aluminum 10ft — frieze & fascia excluded (they're coil)
  const lpOnlyLf = Math.ceil((data.cornerBoardsLf + data.rakeLf + data.waterTableLf + data.bandBoardLf + data.windowTrimLf + data.doorTrimLf) * (1 + data.wasteFactor / 100));
  const stickCount = Math.ceil(lpOnlyLf / 16);

  // Coil yield helper: 24"×50' coil, strips cut to (exposure + 1.25" return) width
  function coilLfPer(exposureIn: number) {
    return exposureIn > 0 ? Math.floor(24 / (exposureIn + 1.25)) * 50 : 0;
  }
  function coilsNeededFor(lf: number, exposureIn: number) {
    const lfPer = coilLfPer(exposureIn);
    return (lfPer > 0 && lf > 0) ? Math.ceil(lf * (1 + data.wasteFactor / 100) / lfPer) : 0;
  }

  const fasciaLfPerCoil    = coilLfPer(data.fasciaExposureIn);
  const fasciaCoilsNeeded  = coilsNeededFor(data.fasciaLf, data.fasciaExposureIn);
  const friezeLfPerCoil    = coilLfPer(data.friezeExposureIn);
  const friezeCoilsNeeded  = coilsNeededFor(data.friezeLf, data.friezeExposureIn);

  return (
    <div className="space-y-6">

      {/* Trim Types */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">

        {/* Trim Material Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Trim Material</span>
          <div className="flex rounded-lg overflow-hidden border border-slate-600 text-sm">
            {(['standard', 'lp_smart_trim'] as TrimMaterial[]).map(m => (
              <button
                key={m}
                onClick={() => update('trimMaterial', m)}
                className={`px-3 py-1.5 transition ${data.trimMaterial === m ? 'bg-blue-600 text-white font-semibold' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
              >
                {m === 'standard' ? 'Standard (Alum / LP)' : 'LP Smart Trim'}
              </button>
            ))}
          </div>
          {data.trimMaterial === 'lp_smart_trim' && (
            <div className="flex rounded-lg overflow-hidden border border-slate-600 text-sm">
              {(['4/4', '5/4'] as LpSmartTrimThickness[]).map(t => (
                <button
                  key={t}
                  onClick={() => update('lpSmartTrimThickness', t)}
                  className={`px-3 py-1.5 transition ${data.lpSmartTrimThickness === t ? 'bg-emerald-700 text-white font-semibold' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Trim Linear Feet</h3>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500 leading-relaxed">
              {data.trimMaterial === 'lp_smart_trim'
                ? <><span className="text-emerald-400 font-medium">LP Smart Trim {data.lpSmartTrimThickness}</span> = 16ft sticks</>
                : <><span className="text-slate-400 font-medium">LP</span> = 16ft &nbsp;·&nbsp; <span className="text-slate-400 font-medium">Aluminum</span> = 10ft</>
              }
            </div>
            <div className="w-24">
              <label className={labelCls}>Waste %</label>
              <input
                type="number"
                value={data.wasteFactor === 0 ? "" : data.wasteFactor}
                onChange={(e) => update("wasteFactor", Number(e.target.value) || 0)}
                placeholder="10"
                min="0"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <LfField label="Corner Boards" value={data.cornerBoardsLf} onChange={(v) => update("cornerBoardsLf", v)}
            hint="All corners combined" />
          <LfField label="Rake Board" value={data.rakeLf} onChange={(v) => update("rakeLf", v)}
            hint="Gable ends" />
        </div>

        {/* Frieze Board — aluminum coil */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <LfField label="Frieze Board" value={data.friezeLf} onChange={(v) => update("friezeLf", v)}
            hint="Bent from aluminum coil on-site" />
          <div>
            <label className={labelCls}>Frieze Exposure <span className="text-slate-500">(in)</span></label>
            <p className="text-[10px] text-slate-600 mb-1">Face width; return = 1¼″</p>
            <input
              type="number"
              value={data.friezeExposureIn === 0 ? "" : data.friezeExposureIn}
              onChange={(e) => update("friezeExposureIn", Number(e.target.value) || 4)}
              placeholder="4"
              min="2" max="20" step="0.5"
              className={inputCls}
            />
          </div>
          {data.friezeLf > 0 && friezeLfPerCoil > 0 && (
            <div className="col-span-2 flex items-end pb-1.5">
              <div className="rounded-lg bg-amber-900/20 border border-amber-800/50 px-3 py-2 flex items-center gap-2 text-sm w-full">
                <span className="text-amber-400 font-semibold">{friezeCoilsNeeded} coil{friezeCoilsNeeded !== 1 ? "s" : ""}</span>
                <span className="text-slate-400">24″×50′ coil</span>
                <span className="text-slate-500 text-xs">({friezeLfPerCoil} lf/coil at {data.friezeExposureIn}″)</span>
              </div>
            </div>
          )}
        </div>

        {/* Fascia — aluminum coil */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <LfField label="Fascia" value={data.fasciaLf} onChange={(v) => update("fasciaLf", v)}
            hint="Bent from aluminum coil on-site" />
          <div>
            <label className={labelCls}>Fascia Exposure <span className="text-slate-500">(in)</span></label>
            <p className="text-[10px] text-slate-600 mb-1">Face width; return = 1¼″</p>
            <input
              type="number"
              value={data.fasciaExposureIn === 0 ? "" : data.fasciaExposureIn}
              onChange={(e) => update("fasciaExposureIn", Number(e.target.value) || 6)}
              placeholder="6"
              min="2" max="20" step="0.5"
              className={inputCls}
            />
          </div>
          {data.fasciaLf > 0 && fasciaLfPerCoil > 0 && (
            <div className="col-span-2 flex items-end pb-1.5">
              <div className="rounded-lg bg-amber-900/20 border border-amber-800/50 px-3 py-2 flex items-center gap-2 text-sm w-full">
                <span className="text-amber-400 font-semibold">{fasciaCoilsNeeded} coil{fasciaCoilsNeeded !== 1 ? "s" : ""}</span>
                <span className="text-slate-400">24″×50′ coil</span>
                <span className="text-slate-500 text-xs">({fasciaLfPerCoil} lf/coil at {data.fasciaExposureIn}″)</span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <LfField label="Level Starter" value={data.waterTableLf} onChange={(v) => update("waterTableLf", v)}
            hint="Foundation transition" />
          <LfField label="Band Board" value={data.bandBoardLf} onChange={(v) => update("bandBoardLf", v)}
            hint="Floor-line belt course" />
          <LfField label="Window Trim" value={data.windowTrimLf} onChange={(v) => update("windowTrimLf", v)}
            hint="Head + side casing" />
          <LfField label="Door Trim" value={data.doorTrimLf} onChange={(v) => update("doorTrimLf", v)}
            hint="Head + side casing" />
        </div>

        {/* J-Channel — separate product (12' sticks), not in stick total above */}
        <div className="border-t border-slate-700 pt-4">
          <div className="flex items-end gap-4">
            <div className="w-48">
              <LfField label="J-Channel" value={data.jChannelLf} onChange={(v) => update("jChannelLf", v)}
                hint="Around windows/doors, at soffit & corners" />
            </div>
            {data.jChannelLf > 0 && (
              <div className="pb-1.5 text-sm text-slate-400">
                → <span className="text-white font-semibold">{Math.ceil(data.jChannelLf / 12)} sticks</span>
                <span className="text-slate-500 ml-1">of 12′</span>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {totalLf > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-slate-700">
            <div className="flex items-center gap-6 text-sm flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Total LF:</span>
                <span className="font-semibold text-white">{totalLf.toLocaleString()} lf</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">+ {data.wasteFactor}% waste:</span>
                <span className="font-semibold text-white">{adjustedLf.toLocaleString()} lf</span>
              </div>
            </div>
            {stickCount > 0 && (
              <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-4 py-2.5 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span className="text-sm text-blue-300">
                  <span className="font-bold">{stickCount} sticks</span> of {data.stickLengthFt}′ trim to order
                  <span className="text-slate-400 ml-2">({adjustedLf} lf adjusted)</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Breakdown by type */}
      {totalLf > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-2">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Breakdown by Type</h3>
          <div className="space-y-1.5">
            {[
              { label: "Corner Boards", lf: data.cornerBoardsLf },
              { label: "Frieze Board",  lf: data.friezeLf },
              { label: "Rake Board",    lf: data.rakeLf },
              { label: "Fascia",        lf: data.fasciaLf },
              { label: "Level Starter", lf: data.waterTableLf },
              { label: "Band Board",    lf: data.bandBoardLf },
              { label: "Window Trim",   lf: data.windowTrimLf },
              { label: "Door Trim",     lf: data.doorTrimLf },
            ].filter((r) => r.lf > 0).map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{row.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-white">{row.lf} lf</span>
                  <span className="text-slate-500 text-xs w-16 text-right">
                    {data.stickLengthFt > 0 ? `${Math.ceil(row.lf * (1 + data.wasteFactor / 100) / data.stickLengthFt)} sticks` : ""}
                  </span>
                </div>
              </div>
            ))}
            {data.jChannelLf > 0 && (
              <div className="flex items-center justify-between text-sm border-t border-slate-700/50 pt-1.5 mt-1">
                <span className="text-slate-400">J-Channel <span className="text-slate-600 text-xs">(12′ sticks)</span></span>
                <div className="flex items-center gap-3">
                  <span className="text-white">{data.jChannelLf} lf</span>
                  <span className="text-slate-500 text-xs w-16 text-right">{Math.ceil(data.jChannelLf / 12)} sticks</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
