"use client";

import { useState } from "react";

// ConceLoc box sizes: sqft coverage per box
const CONCELOC_SIZES = [
  { id: "100",  label: "100 sqft",       sqftPerBox: 100,  note: "standard"  },
  { id: "500",  label: "500 sqft (gun)", sqftPerBox: 500,  note: "gun"       },
  { id: "1000", label: "1,000 sqft",     sqftPerBox: 1000, note: "bulk"      },
] as const;

// TopLoc box sizes: sqft coverage per box
const TOPLOC_SIZES = [
  { id: "100", label: "100 sqft", sqftPerBox: 100 },
  { id: "500", label: "500 sqft", sqftPerBox: 500 },
] as const;

type ConceLockSizeId = typeof CONCELOC_SIZES[number]["id"];
type TopLocSizeId    = typeof TOPLOC_SIZES[number]["id"];

const FASCIA_SIZES = ["1x6", "1x8", "1x10", "1x12"] as const;
type FasciaBoardSize = typeof FASCIA_SIZES[number];

export interface DeckingAccessoriesData {
  fasciaBoardsFt: number;
  fasciaBoardsIn: number;
  fasciaBoardSize: FasciaBoardSize;  // 1x6 | 1x8 | 1x10 | 1x12
  topLocFasciaCartons: number;  // 0 = auto from fascia LF (100 lf/carton)
  deckScrewsLbs: number;
  cortexKitCartons: number;  // screws + plugs sold together, 100 lf per carton
  // ConceLoc hidden fasteners
  conceLocSqft: number;
  conceLocSizeId: ConceLockSizeId | "";
  conceLocBoxes: number;
  // TopLoc hidden fasteners
  topLocSqft: number;
  topLocSizeId: TopLocSizeId | "";
  topLocBoxes: number;
}

interface DeckSectionDim {
  lengthFt: number; lengthIn: number; // parallel to house (ledger / front)
  widthFt:  number; widthIn:  number; // perpendicular to house (left / right sides)
}

interface Props {
  initialData?: Partial<DeckingAccessoriesData>;
  onChange: (data: DeckingAccessoriesData) => void;
  deckSections?: DeckSectionDim[]; // from Decking tab — used to auto-calc fascia
  autoDeckScrewsLbs?: number;       // suggested from deck sqft (wood decks)
  linkedValues?: Partial<DeckingAccessoriesData>; // fascia length from the Measurements tab
  // Board fasteners the build will add for each package (SQ → Cortex, GV → ConceaLoc)
  boardFastenerSuggestions?: { pkg: string; board: string; text: string }[];
}

const inputCls =
  "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";

function NumField({ label, unit, value, onChange, placeholder = "0" }: {
  label: string; unit?: string; value: number; onChange: (v: number) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}{unit && <span className="text-slate-500 ml-1">({unit})</span>}
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

function toFt(ft: number, inches: number) { return (ft || 0) + (inches || 0) / 12; }

export default function DeckingAccessoriesMeasurements({ initialData, onChange, deckSections, autoDeckScrewsLbs = 0, linkedValues, boardFastenerSuggestions = [] }: Props) {
  const [own, setData] = useState<DeckingAccessoriesData>({
    fasciaBoardsFt:      initialData?.fasciaBoardsFt ?? 0,
    fasciaBoardsIn:      initialData?.fasciaBoardsIn ?? 0,
    fasciaBoardSize:     (initialData?.fasciaBoardSize as FasciaBoardSize) ?? "1x8",
    topLocFasciaCartons: initialData?.topLocFasciaCartons ?? 0,
    deckScrewsLbs:       initialData?.deckScrewsLbs ?? 0,
    cortexKitCartons: initialData?.cortexKitCartons ?? 0,
    conceLocSqft:     initialData?.conceLocSqft ?? 0,
    conceLocSizeId:   initialData?.conceLocSizeId ?? "",
    conceLocBoxes:    initialData?.conceLocBoxes ?? 0,
    topLocSqft:       initialData?.topLocSqft ?? 0,
    topLocSizeId:     initialData?.topLocSizeId ?? "",
    topLocBoxes:      initialData?.topLocBoxes ?? 0,
  });

  const data: DeckingAccessoriesData = linkedValues ? { ...own, ...linkedValues } : own;
  const fasciaLocked = linkedValues?.fasciaBoardsFt !== undefined;

  function update<K extends keyof DeckingAccessoriesData>(key: K, value: DeckingAccessoriesData[K]) {
    const next = { ...own, [key]: value };
    setData(next);
    onChange(next);
  }

  const fasciaLf = (data.fasciaBoardsFt || 0) + (data.fasciaBoardsIn || 0) / 12;
  const fasciaAutoCartons = fasciaLf > 0 ? Math.ceil(fasciaLf / 100) : 0;
  const fasciaEffectiveCartons = data.topLocFasciaCartons > 0 ? data.topLocFasciaCartons : fasciaAutoCartons;

  // Auto-calc fascia from deck sections:
  // Front (= ledger length, parallel to house) + Left side + Right side (depth × 2)
  // Ledger side (against house) gets no fascia.
  const canAutoFascia = (deckSections ?? []).length > 0 &&
    toFt((deckSections![0].widthFt), (deckSections![0].widthIn)) > 0;
  function autoFascia() {
    if (!deckSections || deckSections.length === 0) return;
    const totalFrontFt = deckSections.reduce((s, sec) => s + toFt(sec.lengthFt, sec.lengthIn), 0);
    const depthFt      = toFt(deckSections[0].widthFt, deckSections[0].widthIn);
    const totalFt      = totalFrontFt + depthFt * 2;
    const ft  = Math.floor(totalFt);
    const inches = Math.round((totalFt - ft) * 12);
    const next = { ...data, fasciaBoardsFt: ft, fasciaBoardsIn: inches };
    setData(next); onChange(next);
  }

  // ConceLoc auto-calc
  const conceLocSize   = CONCELOC_SIZES.find((s) => s.id === data.conceLocSizeId);
  const conceAutoBoxes = conceLocSize && data.conceLocSqft > 0
    ? Math.ceil(data.conceLocSqft / conceLocSize.sqftPerBox)
    : 0;
  const conceEffective = data.conceLocBoxes > 0 ? data.conceLocBoxes : conceAutoBoxes;

  // TopLoc auto-calc
  const topLocSize     = TOPLOC_SIZES.find((s) => s.id === data.topLocSizeId);
  const topAutoBoxes   = topLocSize && data.topLocSqft > 0
    ? Math.ceil(data.topLocSqft / topLocSize.sqftPerBox)
    : 0;
  const topEffective   = data.topLocBoxes > 0 ? data.topLocBoxes : topAutoBoxes;

  return (
    <div className="space-y-6">

      {/* Fascia & Trim */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Fascia &amp; Trim Boards</h3>

        {/* Board size — 1×6 / 1×8 / 1×10 / 1×12 */}
        <div>
          <label className={labelCls}>Board Width <span className="text-slate-500">(PT Green · CedarTone PT · TT uses color-matched panels)</span></label>
          <div className="flex gap-2 flex-wrap">
            {FASCIA_SIZES.map((size) => {
              const isSelected = data.fasciaBoardSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => update("fasciaBoardSize", size)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-blue-500 bg-blue-900/25 text-blue-300"
                      : "border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelCls + " mb-0"}>Total Fascia Length{fasciaLocked && <span className="text-slate-500 ml-1">(front + both sides, from Measurements)</span>}</label>
            {!fasciaLocked && <button
              type="button"
              onClick={autoFascia}
              disabled={!canAutoFascia}
              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Auto
            </button>}
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                value={data.fasciaBoardsFt === 0 ? "" : data.fasciaBoardsFt}
                onChange={(e) => update("fasciaBoardsFt", e.target.value === "" ? 0 : Number(e.target.value))}
                placeholder="0"
                min="0"
                disabled={fasciaLocked}
                className={`${inputCls} ${fasciaLocked ? "opacity-60 cursor-not-allowed" : ""}`}
              />
              <span className="text-xs text-slate-500 pl-1">ft</span>
            </div>
            <div className="flex-1">
              <input
                type="number"
                value={data.fasciaBoardsIn === 0 ? "" : data.fasciaBoardsIn}
                onChange={(e) => update("fasciaBoardsIn", e.target.value === "" ? 0 : Math.min(11, Number(e.target.value)))}
                placeholder="0"
                min="0"
                max="11"
                disabled={fasciaLocked}
                className={`${inputCls} ${fasciaLocked ? "opacity-60 cursor-not-allowed" : ""}`}
              />
              <span className="text-xs text-slate-500 pl-1">in</span>
            </div>
          </div>
          {fasciaLf > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              = <span className="font-semibold text-white">{fasciaLf.toFixed(2)} lf</span>
            </p>
          )}
        </div>

        {/* TopLoc Composite Fasteners for fascia */}
        <div>
          <label className={labelCls}>
            TopLoc Composite Fasteners
            <span className="text-slate-500 ml-1">(cartons · 100 lf each · 0 = auto)</span>
          </label>
          <input
            type="number"
            value={data.topLocFasciaCartons === 0 ? "" : data.topLocFasciaCartons}
            onChange={(e) => update("topLocFasciaCartons", e.target.value === "" ? 0 : Number(e.target.value))}
            placeholder={fasciaAutoCartons > 0 ? `auto (${fasciaAutoCartons})` : "0"}
            min="0"
            className={inputCls}
          />
          {fasciaEffectiveCartons > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              <span className="font-semibold text-white">{fasciaEffectiveCartons} carton{fasciaEffectiveCartons !== 1 ? "s" : ""}</span>
              {" "}— covers {fasciaEffectiveCartons * 100} lf
              {data.topLocFasciaCartons === 0 && fasciaAutoCartons > 0 && (
                <span className="text-slate-500 ml-1">(auto)</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* ConceLoc Hidden Fasteners */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">ConceLoc Hidden Fasteners</h3>
          {data.conceLocSizeId && (
            <span className="text-xs text-emerald-400 font-medium">
              {conceEffective} box{conceEffective !== 1 ? "es" : ""}
              {data.conceLocBoxes === 0 && conceAutoBoxes > 0 && (
                <span className="text-slate-500 ml-1">(auto)</span>
              )}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <p className={labelCls}>Box size</p>
          <div className="flex flex-col sm:flex-row gap-2">
            {CONCELOC_SIZES.map((size) => {
              const isSelected = data.conceLocSizeId === size.id;
              return (
                <label
                  key={size.id}
                  className={`flex items-center gap-2.5 cursor-pointer rounded-lg border px-4 py-2.5 transition-colors ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-900/20 text-emerald-300"
                      : "border-slate-600 bg-slate-700/40 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => update("conceLocSizeId", isSelected ? "" : size.id)}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-medium">{size.label}</span>
                    {size.note !== "standard" && (
                      <span className="text-xs ml-1.5 opacity-60">{size.note}</span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {data.conceLocSizeId && (
          <div className="grid grid-cols-2 gap-4 pt-1">
            <NumField
              label="Deck Area"
              unit="sqft"
              value={data.conceLocSqft}
              onChange={(v) => update("conceLocSqft", v)}
            />
            <div>
              <label className={labelCls}>
                Boxes <span className="text-slate-500 ml-1">(0 = auto)</span>
              </label>
              <input
                type="number"
                value={data.conceLocBoxes === 0 ? "" : data.conceLocBoxes}
                onChange={(e) => update("conceLocBoxes", e.target.value === "" ? 0 : Number(e.target.value))}
                placeholder={conceAutoBoxes > 0 ? `auto (${conceAutoBoxes})` : "0"}
                min="0"
                className={inputCls}
              />
            </div>
          </div>
        )}

        {data.conceLocSizeId && conceEffective > 0 && (
          <div className="rounded-lg bg-emerald-900/20 border border-emerald-800/40 px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-emerald-300">
              {conceEffective} × {conceLocSize?.label} box{conceEffective !== 1 ? "es" : ""}
            </span>
            {data.conceLocSqft > 0 && (
              <span className="text-xs text-emerald-600">
                covers {conceEffective * (conceLocSize?.sqftPerBox ?? 0)} sqft
                {conceEffective * (conceLocSize?.sqftPerBox ?? 0) >= data.conceLocSqft && (
                  <span className="text-emerald-500 ml-1">✓</span>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* TopLoc Hidden Fasteners */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">TopLoc Hidden Fasteners</h3>
          {data.topLocSizeId && (
            <span className="text-xs text-amber-400 font-medium">
              {topEffective} box{topEffective !== 1 ? "es" : ""}
              {data.topLocBoxes === 0 && topAutoBoxes > 0 && (
                <span className="text-slate-500 ml-1">(auto)</span>
              )}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <p className={labelCls}>Box size</p>
          <div className="flex flex-col sm:flex-row gap-2">
            {TOPLOC_SIZES.map((size) => {
              const isSelected = data.topLocSizeId === size.id;
              return (
                <label
                  key={size.id}
                  className={`flex items-center gap-2.5 cursor-pointer rounded-lg border px-4 py-2.5 transition-colors ${
                    isSelected
                      ? "border-amber-500 bg-amber-900/20 text-amber-300"
                      : "border-slate-600 bg-slate-700/40 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => update("topLocSizeId", isSelected ? "" : size.id)}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span className="text-sm font-medium">{size.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {data.topLocSizeId && (
          <div className="grid grid-cols-2 gap-4 pt-1">
            <NumField
              label="Deck Area"
              unit="sqft"
              value={data.topLocSqft}
              onChange={(v) => update("topLocSqft", v)}
            />
            <div>
              <label className={labelCls}>
                Boxes <span className="text-slate-500 ml-1">(0 = auto)</span>
              </label>
              <input
                type="number"
                value={data.topLocBoxes === 0 ? "" : data.topLocBoxes}
                onChange={(e) => update("topLocBoxes", e.target.value === "" ? 0 : Number(e.target.value))}
                placeholder={topAutoBoxes > 0 ? `auto (${topAutoBoxes})` : "0"}
                min="0"
                className={inputCls}
              />
            </div>
          </div>
        )}

        {data.topLocSizeId && topEffective > 0 && (
          <div className="rounded-lg bg-amber-900/20 border border-amber-800/40 px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-amber-300">
              {topEffective} × {topLocSize?.label} box{topEffective !== 1 ? "es" : ""}
            </span>
            {data.topLocSqft > 0 && (
              <span className="text-xs text-amber-600">
                covers {topEffective * (topLocSize?.sqftPerBox ?? 0)} sqft
                {topEffective * (topLocSize?.sqftPerBox ?? 0) >= data.topLocSqft && (
                  <span className="text-amber-500 ml-1">✓</span>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Fasteners */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Fasteners</h3>
        <div className="grid grid-cols-2 gap-4">
          <NumField
            label="Deck Screws"
            unit="lbs · 0 = auto"
            value={data.deckScrewsLbs}
            onChange={(v) => update("deckScrewsLbs", v)}
            placeholder={autoDeckScrewsLbs > 0 ? `auto (${autoDeckScrewsLbs}) · 5 lb per 100 sqft` : "0"}
          />
          <NumField
            label="Cortex Screws & Plugs"
            unit="carton · 0 = auto: SQ boards → Cortex, GV → ConceaLoc"
            value={data.cortexKitCartons}
            onChange={(v) => update("cortexKitCartons", v)}
          />
        </div>

        {/* What the build adds on its own */}
        {(() => {
          const typed = data.cortexKitCartons > 0 || data.conceLocBoxes > 0 || data.topLocBoxes > 0;
          const screws = data.deckScrewsLbs > 0 ? data.deckScrewsLbs : autoDeckScrewsLbs;
          if (boardFastenerSuggestions.length === 0 && screws === 0) return null;
          return (
            <div className="rounded-lg bg-slate-700/40 border border-slate-600 px-4 py-3 space-y-1.5">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Suggested</p>
              {screws > 0 && (
                <p className="text-sm text-slate-300">
                  Deck screws: <span className="font-semibold text-white">{screws} lb</span>
                  <span className="text-slate-500"> ({Math.ceil(screws / 5)} × 5 lb box)</span>
                </p>
              )}
              {typed ? (
                boardFastenerSuggestions.length > 0 && (
                  <p className="text-xs text-amber-400">Board fasteners typed in above are used instead of the suggestion.</p>
                )
              ) : boardFastenerSuggestions.map((s) => (
                <p key={s.pkg} className="text-sm text-slate-300">
                  <span className="text-slate-500">{s.pkg} · {s.board}:</span>{" "}
                  <span className="font-semibold text-white">{s.text}</span>
                </p>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
