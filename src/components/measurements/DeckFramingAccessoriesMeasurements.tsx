"use client";

import { useState } from "react";

type PostSize = "4x4" | "6x6";

const LAG_SCREW_SIZES = [
  '1/4" x 1-1/2"',
  '1/4" x 2"',
  '1/4" x 2-1/2"',
  '1/4" x 3"',
  '5/16" x 2-1/2"',
  '5/16" x 3"',
  '5/16" x 3-1/2"',
  '5/16" x 4"',
  '3/8" x 2-1/2"',
  '3/8" x 3"',
  '3/8" x 3-1/2"',
  '3/8" x 4"',
  '3/8" x 4-1/2"',
  '3/8" x 5"',
  '1/2" x 3"',
  '1/2" x 4"',
  '1/2" x 5"',
  '1/2" x 6"',
] as const;

export interface DeckFramingAccessoriesData {
  joistHangers: number;
  postAnchors: number;
  postAnchorSize: PostSize;
  beamBrackets: number;
  lagScrews: number;
  lagScrewSize: string;
  structuralScrewsLbs: number;
  carrageBolts: number;
}

interface Props {
  initialData?: Partial<DeckFramingAccessoriesData>;
  onChange: (data: DeckFramingAccessoriesData) => void;
  // Auto values derived from Deck Framing tab (shown as placeholders)
  autoJoistHangers?: number;
  autoPostAnchors?: number;
  autoBeamBrackets?: number;
  autoLagScrews?: number;
  autoCarriageBolts?: number;
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
        placeholder={placeholder}
        min="0"
        className={inputCls}
      />
    </div>
  );
}

const POST_SIZES: PostSize[] = ["4x4", "6x6"];

export default function DeckFramingAccessoriesMeasurements({
  initialData,
  onChange,
  autoJoistHangers = 0,
  autoPostAnchors = 0,
  autoBeamBrackets = 0,
  autoLagScrews = 0,
  autoCarriageBolts = 0,
}: Props) {
  const [data, setData] = useState<DeckFramingAccessoriesData>({
    joistHangers:        initialData?.joistHangers ?? 0,
    postAnchors:         initialData?.postAnchors ?? 0,
    postAnchorSize:      initialData?.postAnchorSize ?? "6x6",
    beamBrackets:        initialData?.beamBrackets ?? 0,
    lagScrews:           initialData?.lagScrews ?? 0,
    lagScrewSize:        initialData?.lagScrewSize ?? '5/16" x 3"',
    structuralScrewsLbs: initialData?.structuralScrewsLbs ?? 0,
    carrageBolts:        initialData?.carrageBolts ?? 0,
  });

  function update<K extends keyof DeckFramingAccessoriesData>(key: K, value: DeckFramingAccessoriesData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  const effectiveJoistHangers = data.joistHangers > 0 ? data.joistHangers : autoJoistHangers;
  const effectivePostAnchors  = data.postAnchors  > 0 ? data.postAnchors  : autoPostAnchors;
  const effectiveBeamBrackets = data.beamBrackets > 0 ? data.beamBrackets : autoBeamBrackets;

  return (
    <div className="space-y-6">

      {/* Hangers & Brackets */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Hangers &amp; Brackets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

          {/* Joist Hangers — auto from joist count */}
          <div>
            <label className={labelCls}>
              Joist Hangers <span className="text-slate-500 ml-1">(ea · 0 = auto)</span>
            </label>
            <input
              type="number"
              value={data.joistHangers === 0 ? "" : data.joistHangers}
              onChange={(e) => update("joistHangers", e.target.value === "" ? 0 : Number(e.target.value))}
              placeholder={autoJoistHangers > 0 ? `auto (${autoJoistHangers})` : "0"}
              min="0"
              className={inputCls}
            />
          </div>

          {/* Beam Brackets — auto from beam LF ÷ 3 */}
          <div>
            <label className={labelCls}>
              Beam Brackets <span className="text-slate-500 ml-1">(ea · 0 = auto)</span>
            </label>
            <input
              type="number"
              value={data.beamBrackets === 0 ? "" : data.beamBrackets}
              onChange={(e) => update("beamBrackets", e.target.value === "" ? 0 : Number(e.target.value))}
              placeholder={autoBeamBrackets > 0 ? `auto (${autoBeamBrackets})` : "0"}
              min="0"
              className={inputCls}
            />
          </div>

          {/* Spacer on larger screens */}
          <div className="hidden sm:block" />

          {/* Post Anchors — auto from post count, with size selector */}
          <div className="col-span-2 sm:col-span-3">
            <p className="text-xs font-medium text-slate-400 mb-2">Post Anchors</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>
                  Qty <span className="text-slate-500 ml-1">(0 = auto)</span>
                </label>
                <input
                  type="number"
                  value={data.postAnchors === 0 ? "" : data.postAnchors}
                  onChange={(e) => update("postAnchors", e.target.value === "" ? 0 : Number(e.target.value))}
                  placeholder={autoPostAnchors > 0 ? `auto (${autoPostAnchors})` : "0"}
                  min="0"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Size</label>
                <div className="flex gap-2">
                  {POST_SIZES.map((size) => {
                    const isSelected = data.postAnchorSize === size;
                    return (
                      <label
                        key={size}
                        className={`flex-1 flex items-center justify-center gap-2 cursor-pointer rounded-lg border px-3 py-2 transition-colors text-sm font-medium ${
                          isSelected
                            ? "border-blue-500 bg-blue-900/20 text-blue-300"
                            : "border-slate-600 bg-slate-700/40 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="postAnchorSize"
                          value={size}
                          checked={isSelected}
                          onChange={() => update("postAnchorSize", size)}
                          className="sr-only"
                        />
                        {size}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Auto-calc summary */}
        {(effectiveJoistHangers > 0 || effectivePostAnchors > 0 || effectiveBeamBrackets > 0) && (
          <div className="rounded-lg bg-slate-700/50 border border-slate-600 px-4 py-3 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Joist Hangers</p>
              <p className="font-semibold text-white">
                {effectiveJoistHangers} ea
                {data.joistHangers === 0 && autoJoistHangers > 0 && <span className="text-xs text-slate-500 ml-1">(auto)</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Post Anchors</p>
              <p className="font-semibold text-white">
                {effectivePostAnchors} ea {data.postAnchorSize}
                {data.postAnchors === 0 && autoPostAnchors > 0 && <span className="text-xs text-slate-500 ml-1">(auto)</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Beam Brackets</p>
              <p className="font-semibold text-white">
                {effectiveBeamBrackets} ea
                {data.beamBrackets === 0 && autoBeamBrackets > 0 && <span className="text-xs text-slate-500 ml-1">(auto)</span>}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fasteners */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Fasteners</h3>

        {/* Lag Screws / LedgerLocs — qty + size */}
        <div>
          <p className="text-xs font-medium text-slate-400 mb-2">Lag Screws / LedgerLocs</p>
          <div className="grid grid-cols-2 gap-4">
            <NumField label="Qty" unit="ea · 0 = auto" value={data.lagScrews} onChange={(v) => update("lagScrews", v)}
              placeholder={autoLagScrews > 0 ? `auto (${autoLagScrews})` : "0"} />
            <div>
              <label className={labelCls}>Size</label>
              <select
                value={data.lagScrewSize}
                onChange={(e) => update("lagScrewSize", e.target.value)}
                className={inputCls}
              >
                {LAG_SCREW_SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          {(data.lagScrews || autoLagScrews) > 0 && (
            <p className="text-xs text-slate-400 mt-2">
              = <span className="font-semibold text-white">{data.lagScrews || autoLagScrews} ea</span> @ {data.lagScrewSize}
              {!data.lagScrews && <span className="text-slate-500"> · 2 every 16&quot; of ledger</span>}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-700">
          <NumField label="Structural Screws" unit="lbs" value={data.structuralScrewsLbs} onChange={(v) => update("structuralScrewsLbs", v)} />
          <NumField label="Carriage Bolts" unit="ea · 0 = auto" value={data.carrageBolts} onChange={(v) => update("carrageBolts", v)}
            placeholder={autoCarriageBolts > 0 ? `auto (${autoCarriageBolts}) · 2 per post` : "0"} />
        </div>
      </div>
    </div>
  );
}
