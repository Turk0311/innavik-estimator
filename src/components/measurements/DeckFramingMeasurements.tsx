"use client";

import { useState } from "react";
import CarpentryHours from "./CarpentryHours";

export interface DeckFramingData {
  // Ledger
  ledgerFt: number;
  ledgerIn: number;
  ledgerSize: string;       // e.g. "2x8", "2x10", "2x12" — rep selects based on load
  // Beams
  beamFt: number;
  beamIn: number;
  beamSize: string;         // e.g. "2x10", "2x12"
  // Joists
  joistSpanFt: number;
  joistSpanIn: number;
  joistSpacingIn: number;   // 12, 16, or 24
  joistCount: number;       // 0 = auto-calculate from spacing (requires deck width)
  joistSize: string;        // e.g. "2x8", "2x10"
  // Posts
  postCount: number;
  postHeightFt: number;
  postHeightIn: number;
  postSize: string;         // e.g. "4x4", "6x6"
  // Piers
  pierType: "concrete" | "diamond" | "none";
  pierCount: number;
  tubeFormDiamIn: number;   // 8, 10, or 12 — concrete only
  tubeFormDepthFt: number;  // depth of hole (concrete only)
  concreteBags60lb: number; // 0 = auto-calculate from pier volume
  // Blocking
  blockingFt: number;
  blockingIn: number;
  // Labor — hourly carpentry
  leadCarpenterHours: number;
  carpenterHours: number;
}

interface Props {
  initialData?: Partial<DeckFramingData>;
  onChange: (data: DeckFramingData) => void;
  // Ledger, beam, joist span, posts, height and piers from the Measurements tab
  linkedValues?: Partial<DeckFramingData>;
}

const inputCls =
  "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";

const LUMBER_SIZES_LEDGER = ["2x8", "2x10", "2x12"];
const LUMBER_SIZES_FLAT   = ["2x6", "2x8", "2x10", "2x12"];
const LUMBER_SIZES_POST   = ["4x4", "6x6"];

function NumField({ label, unit, value, onChange, placeholder = "0", locked = false }: {
  label: string; unit?: string; value: number; onChange: (v: number) => void; placeholder?: string; locked?: boolean;
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
        disabled={locked}
        title={locked ? "Set on the Measurements tab" : undefined}
        className={`${inputCls} ${locked ? "opacity-60 cursor-not-allowed" : ""}`}
      />
    </div>
  );
}

function FtInRow({ label, ft, inches, onFt, onIn, locked = false }: {
  label: string;
  ft: number; inches: number;
  onFt: (v: number) => void; onIn: (v: number) => void;
  locked?: boolean;
}) {
  const cls = `${inputCls} ${locked ? "opacity-60 cursor-not-allowed" : ""}`;
  const title = locked ? "Set on the Measurements tab" : undefined;
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="number"
            value={ft === 0 ? "" : ft}
            onChange={(e) => onFt(e.target.value === "" ? 0 : Number(e.target.value))}
            placeholder="0"
            min="0"
            disabled={locked}
            title={title}
            className={cls}
          />
          <span className="text-xs text-slate-500 pl-1">ft</span>
        </div>
        <div className="flex-1">
          <input
            type="number"
            value={inches === 0 ? "" : inches}
            onChange={(e) => onIn(e.target.value === "" ? 0 : Math.min(11, Number(e.target.value)))}
            placeholder="0"
            min="0"
            max="11"
            disabled={locked}
            title={title}
            className={cls}
          />
          <span className="text-xs text-slate-500 pl-1">in</span>
        </div>
      </div>
    </div>
  );
}

function SizeSelect({ label, value, onChange, sizes }: {
  label: string; value: string; onChange: (v: string) => void; sizes: string[];
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      >
        {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}

export default function DeckFramingMeasurements({ initialData, onChange, linkedValues }: Props) {
  const [own, setData] = useState<DeckFramingData>({
    ledgerFt:       initialData?.ledgerFt ?? 0,
    ledgerIn:       initialData?.ledgerIn ?? 0,
    ledgerSize:     initialData?.ledgerSize ?? "2x10",
    beamFt:         initialData?.beamFt ?? 0,
    beamIn:         initialData?.beamIn ?? 0,
    beamSize:       initialData?.beamSize ?? "2x10",
    joistSpanFt:    initialData?.joistSpanFt ?? 0,
    joistSpanIn:    initialData?.joistSpanIn ?? 0,
    joistSpacingIn: initialData?.joistSpacingIn ?? 16,
    joistCount:     initialData?.joistCount ?? 0,
    joistSize:      initialData?.joistSize ?? "2x8",
    postCount:      initialData?.postCount ?? 0,
    postHeightFt:   initialData?.postHeightFt ?? 0,
    postHeightIn:   initialData?.postHeightIn ?? 0,
    postSize:       initialData?.postSize ?? "6x6",
    pierType:         (initialData?.pierType as DeckFramingData["pierType"]) ?? "none",
    pierCount:        initialData?.pierCount ?? 0,
    tubeFormDiamIn:   initialData?.tubeFormDiamIn ?? 10,
    tubeFormDepthFt:  initialData?.tubeFormDepthFt ?? 0,
    concreteBags60lb: initialData?.concreteBags60lb ?? 0,
    blockingFt:          initialData?.blockingFt ?? 0,
    blockingIn:          initialData?.blockingIn ?? 0,
    leadCarpenterHours:  initialData?.leadCarpenterHours ?? 0,
    carpenterHours:      initialData?.carpenterHours ?? 0,
  });

  const data: DeckFramingData = linkedValues ? { ...own, ...linkedValues } : own;
  const locked = !!linkedValues;

  function update<K extends keyof DeckFramingData>(key: K, value: DeckFramingData[K]) {
    const next = { ...own, [key]: value };
    setData(next);
    onChange(next);
  }

  const ledgerLf  = (data.ledgerFt || 0) + (data.ledgerIn || 0) / 12;
  const beamLf    = (data.beamFt || 0) + (data.beamIn || 0) / 12;
  const joistSpan = (data.joistSpanFt || 0) + (data.joistSpanIn || 0) / 12;
  const postHt    = (data.postHeightFt || 0) + (data.postHeightIn || 0) / 12;
  const blockingLf = (data.blockingFt || 0) + (data.blockingIn || 0) / 12;

  const totalJoistLf = data.joistCount > 0 && joistSpan > 0
    ? data.joistCount * joistSpan : 0;
  const totalPostLf  = data.postCount > 0 && postHt > 0
    ? data.postCount * postHt : 0;

  // Concrete auto-calc: volume of cylinder per pier (ft³), 60lb bag ≈ 0.45 ft³
  const pierRadiusFt   = (data.tubeFormDiamIn / 2) / 12;
  const pierVolFt3     = Math.PI * pierRadiusFt * pierRadiusFt * (data.tubeFormDepthFt || 0);
  const totalVolFt3    = (data.pierCount || 0) * pierVolFt3;
  const autoConcreteBags = data.pierType === "concrete" && totalVolFt3 > 0
    ? Math.ceil(totalVolFt3 / 0.45) : 0;
  const effectiveBags  = data.concreteBags60lb > 0 ? data.concreteBags60lb : autoConcreteBags;

  return (
    <div className="space-y-6">

      {/* Ledger */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Ledger Board</h3>
        <div className="grid grid-cols-2 gap-4">
          <FtInRow
            label="Ledger Length"
            locked={locked}
            ft={data.ledgerFt} inches={data.ledgerIn}
            onFt={(v) => update("ledgerFt", v)} onIn={(v) => update("ledgerIn", v)}
          />
          <SizeSelect label="Ledger Size" value={data.ledgerSize} onChange={(v) => update("ledgerSize", v)} sizes={LUMBER_SIZES_LEDGER} />
        </div>
        {ledgerLf > 0 && (
          <p className="text-xs text-slate-400">= <span className="font-semibold text-white">{ledgerLf.toFixed(2)} lf</span> of {data.ledgerSize}</p>
        )}
      </div>

      {/* Beams */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Beams</h3>
        <div className="grid grid-cols-2 gap-4">
          <FtInRow
            label="Total Beam Length"
            locked={locked}
            ft={data.beamFt} inches={data.beamIn}
            onFt={(v) => update("beamFt", v)} onIn={(v) => update("beamIn", v)}
          />
          <SizeSelect label="Beam Size" value={data.beamSize} onChange={(v) => update("beamSize", v)} sizes={LUMBER_SIZES_FLAT} />
        </div>
        {beamLf > 0 && (
          <p className="text-xs text-slate-400">= <span className="font-semibold text-white">{beamLf.toFixed(2)} lf</span> of {data.beamSize}</p>
        )}
      </div>

      {/* Joists */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Joists</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <FtInRow
            label="Joist Span"
            locked={locked}
            ft={data.joistSpanFt} inches={data.joistSpanIn}
            onFt={(v) => update("joistSpanFt", v)} onIn={(v) => update("joistSpanIn", v)}
          />
          <div>
            <label className={labelCls}>Spacing</label>
            <select value={data.joistSpacingIn} onChange={(e) => update("joistSpacingIn", Number(e.target.value))} className={inputCls}>
              <option value={12}>12&quot; o.c.</option>
              <option value={16}>16&quot; o.c.</option>
              <option value={24}>24&quot; o.c.</option>
            </select>
          </div>
          <NumField label="Joist Count" value={data.joistCount} onChange={(v) => update("joistCount", v)} />
          <SizeSelect label="Joist Size" value={data.joistSize} onChange={(v) => update("joistSize", v)} sizes={LUMBER_SIZES_FLAT} />
        </div>
        {totalJoistLf > 0 && (
          <div className="rounded-lg bg-slate-700/50 border border-slate-600 px-4 py-3 grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-xs text-slate-500 mb-0.5">Count</p><p className="font-semibold text-white">{data.joistCount} ea</p></div>
            <div><p className="text-xs text-slate-500 mb-0.5">Span</p><p className="font-semibold text-white">{joistSpan.toFixed(2)} lf ea</p></div>
            <div><p className="text-xs text-slate-500 mb-0.5">Total LF</p><p className="font-semibold text-white">{totalJoistLf.toFixed(2)} lf of {data.joistSize}</p></div>
          </div>
        )}
      </div>

      {/* Posts */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Posts</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <NumField label="Post Count" value={data.postCount} onChange={(v) => update("postCount", v)} locked={locked} />
          <FtInRow
            label="Post Height"
            locked={locked}
            ft={data.postHeightFt} inches={data.postHeightIn}
            onFt={(v) => update("postHeightFt", v)} onIn={(v) => update("postHeightIn", v)}
          />
          <SizeSelect label="Post Size" value={data.postSize} onChange={(v) => update("postSize", v)} sizes={LUMBER_SIZES_POST} />
        </div>
        {totalPostLf > 0 && (
          <p className="text-xs text-slate-400">
            Total: <span className="font-semibold text-white">{totalPostLf.toFixed(2)} lf</span> of {data.postSize}
          </p>
        )}
      </div>

      {/* Piers */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Piers &amp; Footings</h3>

        {/* Pier type toggle */}
        <div>
          <label className={labelCls}>Pier Type</label>
          <div className="flex gap-2">
            {(["none", "concrete", "diamond"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => update("pierType", t)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                  data.pierType === t
                    ? "border-blue-500 bg-blue-900/25 text-blue-300"
                    : "border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                }`}
              >
                {t === "none" ? "None" : t === "concrete" ? "Concrete Piers" : "Diamond Piers"}
              </button>
            ))}
          </div>
        </div>

        {data.pierType !== "none" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <NumField
                label="Pier Count"
                value={data.pierCount}
                onChange={(v) => update("pierCount", v)}
                locked={locked}
              />

              {/* Concrete-only fields */}
              {data.pierType === "concrete" && (
                <>
                  <div>
                    <label className={labelCls}>Tube Form Diameter</label>
                    <div className="flex gap-2">
                      {[8, 10, 12].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => update("tubeFormDiamIn", d)}
                          className={`flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                            data.tubeFormDiamIn === d
                              ? "border-blue-500 bg-blue-900/25 text-blue-300"
                              : "border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                          }`}
                        >
                          {d}&quot;
                        </button>
                      ))}
                    </div>
                  </div>
                  <NumField
                    label="Depth"
                    unit="ft"
                    value={data.tubeFormDepthFt}
                    onChange={(v) => update("tubeFormDepthFt", v)}
                    placeholder="4"
                  />
                </>
              )}
            </div>

            {/* Concrete summary + bag override */}
            {data.pierType === "concrete" && data.pierCount > 0 && (
              <div className="space-y-3">
                {autoConcreteBags > 0 && (
                  <p className="text-xs text-slate-400">
                    Volume: <span className="font-semibold text-white">{totalVolFt3.toFixed(2)} ft³</span>
                    {" "}→ <span className="font-semibold text-white">{autoConcreteBags} bags</span>
                    <span className="text-slate-500 ml-1">(60 lb · 0.45 ft³ each · auto)</span>
                  </p>
                )}
                <div>
                  <label className={labelCls}>
                    60 lb Concrete Bags
                    <span className="text-slate-500 ml-1">(0 = auto)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={data.concreteBags60lb === 0 ? "" : data.concreteBags60lb}
                    onChange={(e) => update("concreteBags60lb", e.target.value === "" ? 0 : Number(e.target.value))}
                    placeholder={autoConcreteBags > 0 ? `auto (${autoConcreteBags})` : "0"}
                    className={inputCls}
                  />
                  {effectiveBags > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      <span className="font-semibold text-white">{effectiveBags} bags</span>
                      {data.concreteBags60lb === 0 && <span className="text-slate-500 ml-1">(auto)</span>}
                    </p>
                  )}
                </div>
              </div>
            )}

            {data.pierType === "diamond" && data.pierCount > 0 && (
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-white">{data.pierCount}</span> Diamond Pier{data.pierCount !== 1 ? "s" : ""}
                <span className="text-slate-500 ml-1">— no concrete required</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Blocking */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Blocking</h3>
        <FtInRow
          label="Blocking Length"
          ft={data.blockingFt} inches={data.blockingIn}
          onFt={(v) => update("blockingFt", v)} onIn={(v) => update("blockingIn", v)}
        />
        {blockingLf > 0 && (
          <p className="text-xs text-slate-400">= <span className="font-semibold text-white">{blockingLf.toFixed(2)} lf</span></p>
        )}
      </div>

      <CarpentryHours
          fields={[
            { key: "leadCarpenterHours", label: "Lead Carpenter", value: data.leadCarpenterHours },
            { key: "carpenterHours", label: "Carpenter", value: data.carpenterHours },
          ]}
          onChange={(k, v) => update(k as "leadCarpenterHours" | "carpenterHours", v)}
          boxed
        />
    </div>
  );
}
