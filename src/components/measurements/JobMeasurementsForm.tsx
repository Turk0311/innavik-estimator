"use client";

import { type JobMeasurements, type JobSection, type PlaneEntry, roofArea } from "@/lib/jobMeasurements";
import SidingMeasurements, { type HoverData } from "@/components/measurements/SidingMeasurements";

interface Props {
  value: JobMeasurements;
  onChange: (next: JobMeasurements) => void;
  sections: Set<JobSection>;
}

const PITCH_OPTIONS = [
  { value: "up_to_6_12", label: "Up to 6/12" },
  { value: "7_8_12", label: "7–8/12" },
  { value: "9_10_12", label: "9–10/12" },
  { value: "11_12_12", label: "11–12/12" },
  { value: "mansard", label: "Mansard" },
  { value: "flat", label: "Flat" },
];

const inputCls = "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";
const cardCls = "bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4";
const headCls = "text-xs font-semibold text-slate-400 uppercase tracking-widest";

function Num({ label, unit, value, onChange, placeholder = "0", hint }: {
  label: string; unit?: string; value: number; onChange: (v: number) => void; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}{unit && <span className="text-slate-500 ml-1">({unit})</span>}
      </label>
      {hint && <p className="text-[10px] text-slate-600 mb-1">{hint}</p>}
      <input
        type="number"
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        placeholder={placeholder}
        min="0"
        step="any"
        className={inputCls}
      />
    </div>
  );
}

function newPlane(): PlaneEntry {
  return { id: String(Date.now() + Math.random()), label: "", area: 0 };
}

export default function JobMeasurementsForm({ value: job, onChange, sections }: Props) {
  function set<K extends keyof JobMeasurements>(key: K, v: JobMeasurements[K]) {
    onChange({ ...job, [key]: v });
  }
  function setPlane(id: string, field: keyof PlaneEntry, v: string | number) {
    set("planes", job.planes.map((p) => (p.id === id ? { ...p, [field]: v } : p)));
  }

  const area = roofArea(job);
  const siding = sections.has("siding");
  const trim = sections.has("trim");
  const autoSoffitArea = Math.round(job.soffitLf * (job.soffitOverhangIn / 12));

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        Enter the job&apos;s measurements once. Each scope tab uses these numbers. Open each tab to pick its options and confirm.
      </p>

      {sections.has("roof") && (
        <div className={cardCls}>
          <h3 className={headCls}>Roof</h3>
          <div className="space-y-2">
            {job.planes.map((p, idx) => (
              <div key={p.id} className="flex items-center gap-3">
                <input
                  type="text"
                  value={p.label}
                  onChange={(e) => setPlane(p.id, "label", e.target.value)}
                  placeholder={`Plane ${idx + 1}`}
                  className={`${inputCls} flex-1`}
                />
                <input
                  type="number"
                  value={p.area === 0 ? "" : p.area}
                  onChange={(e) => setPlane(p.id, "area", Number(e.target.value) || 0)}
                  placeholder="sqft"
                  min="0"
                  className={`${inputCls} w-32`}
                />
                <button
                  onClick={() => set("planes", job.planes.filter((x) => x.id !== p.id))}
                  disabled={job.planes.length === 1}
                  className="text-slate-600 hover:text-red-400 disabled:invisible p-1"
                  title="Remove plane"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between">
              <button
                onClick={() => set("planes", [...job.planes, newPlane()])}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                + Add Plane
              </button>
              {area > 0 && (
                <span className="text-sm text-slate-300">
                  <span className="font-semibold text-white">{area.toLocaleString()} sqft</span> · {Math.ceil(area / 100)} sq before waste
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Pitch</label>
              <select value={job.pitch} onChange={(e) => set("pitch", e.target.value)} className={inputCls}>
                {PITCH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <Num label="Ridge" unit="lf" value={job.ridge} onChange={(v) => set("ridge", v)} />
            <Num label="Hip" unit="lf" value={job.hip} onChange={(v) => set("hip", v)} />
            <Num label="Valleys" unit="lf" value={job.valleys} onChange={(v) => set("valleys", v)} />
            <Num label="Ridge Vent" unit="lf" value={job.ridgeVentLf} onChange={(v) => set("ridgeVentLf", v)} />
            <Num label="Roof to Wall" unit="lf" value={job.roofToWallLf} onChange={(v) => set("roofToWallLf", v)} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Num label="Chimneys" unit="count" value={job.chimneys} onChange={(v) => set("chimneys", v)} />
            <Num label="Skylights" unit="count" value={job.skylights} onChange={(v) => set("skylights", v)} />
            <Num label="Power Vents" unit="count" value={job.powerVents} onChange={(v) => set("powerVents", v)} />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-500 font-medium">Lead Stacks (by size)</p>
            <div className="grid grid-cols-4 gap-3">
              <Num label='3"' value={job.leadStacks3} onChange={(v) => set("leadStacks3", v)} />
              <Num label='4"' value={job.leadStacks4} onChange={(v) => set("leadStacks4", v)} />
              <Num label='5"' value={job.leadStacks5} onChange={(v) => set("leadStacks5", v)} />
              <Num label='6"' value={job.leadStacks6} onChange={(v) => set("leadStacks6", v)} />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-500 font-medium">Vents</p>
            <div className="grid grid-cols-3 gap-4">
              <Num label="Slant Back" unit="count" value={job.slantBackVents} onChange={(v) => set("slantBackVents", v)} />
              <Num label="Kitchen Broan 634" unit="count" value={job.kitchenVents} onChange={(v) => set("kitchenVents", v)} />
              <Num label="Bathroom Broan 636" unit="count" value={job.bathroomVents} onChange={(v) => set("bathroomVents", v)} />
            </div>
          </div>
        </div>
      )}

      {sections.has("edges") && (
        <div className={cardCls}>
          <h3 className={headCls}>Roof Edges</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Num label="Eaves" unit="lf" value={job.eaves} onChange={(v) => set("eaves", v)} hint="Gutter apron, starter, gutters" />
            <Num label="Rakes" unit="lf" value={job.rakes} onChange={(v) => set("rakes", v)} hint="Drip edge (ODE), rake board" />
            <Num label="Soffit Overhang" unit="in" value={job.soffitOverhangIn} onChange={(v) => set("soffitOverhangIn", v)} hint="Sets ice & water rows (24&quot; inside wall)" />
          </div>
        </div>
      )}

      {sections.has("gutters") && (
        <div className={cardCls}>
          <h3 className={headCls}>Gutters</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Num
              label="Gutter Run" unit="lf" value={job.gutterLf} onChange={(v) => set("gutterLf", v)}
              placeholder={job.eaves > 0 ? `${job.eaves} (eaves)` : "0"} hint="Leave blank to use eaves"
            />
            <Num label="Downspouts" unit="count" value={job.downspouts} onChange={(v) => set("downspouts", v)} />
            <Num label="Corners" unit="count" value={job.gutterCorners} onChange={(v) => set("gutterCorners", v)} />
          </div>
        </div>
      )}

      {siding && (
        <div className="space-y-2">
          <h3 className={`${headCls} px-1`}>Exterior Walls</h3>
          <SidingMeasurements
            part="measure"
            initialData={{
              measurementSource: job.sidingSource,
              walls: job.walls,
              gables: job.gables,
              hover: {
                facadesSqft: job.hoverFacadesSqft, openingsSqft: job.hoverOpeningsSqft,
                openingQty: job.hoverOpeningQty,
                openingsTopsLf: job.hoverOpeningsTopsLf, openingsSillsLf: job.hoverOpeningsSillsLf,
                openingsSidesLf: job.hoverOpeningsSidesLf,
                openingsPerimeterLf: job.hoverOpeningsTopsLf + job.hoverOpeningsSillsLf + job.hoverOpeningsSidesLf,
                verticalTrimLf: job.hoverVerticalTrimLf, slopedTrimLf: job.hoverSlopedTrimLf,
              } as HoverData,
            }}
            onChange={(d) => onChange({
              ...job,
              sidingSource: d.measurementSource,
              walls: d.walls,
              gables: d.gables,
              hoverFacadesSqft: d.hover.facadesSqft,
              hoverOpeningsSqft: d.hover.openingsSqft,
              hoverOpeningQty: d.hover.openingQty,
              hoverOpeningsTopsLf: d.hover.openingsTopsLf,
              hoverOpeningsSillsLf: d.hover.openingsSillsLf,
              hoverOpeningsSidesLf: d.hover.openingsSidesLf,
              hoverVerticalTrimLf: d.hover.verticalTrimLf,
              hoverSlopedTrimLf: d.hover.slopedTrimLf,
            })}
          />
        </div>
      )}

      {(siding || trim) && (
        <div className={cardCls}>
          <h3 className={headCls}>Exterior Trim &amp; Soffit</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Num label="Outside Corners" unit="lf" value={job.cornerBoardsLf} onChange={(v) => set("cornerBoardsLf", v)} hint={trim ? "Also corner boards" : "All outside corners"} />
            {siding && <Num label="Inside Corners" unit="lf" value={job.insideCornersLf} onChange={(v) => set("insideCornersLf", v)} />}
            <Num label="Level Starter" unit="lf" value={job.waterTableLf} onChange={(v) => set("waterTableLf", v)} hint="Base of the walls" />
            <Num label="Fascia" unit="lf" value={job.fasciaLf} onChange={(v) => set("fasciaLf", v)} />
            {siding && <Num label="Soffit Length" unit="lf" value={job.soffitLf} onChange={(v) => set("soffitLf", v)} />}
            {siding && (
              <Num
                label="Soffit Area" unit="sqft" value={job.soffitArea} onChange={(v) => set("soffitArea", v)}
                placeholder={autoSoffitArea > 0 ? `${autoSoffitArea} (auto)` : "0"}
                hint={`Blank = length × ${job.soffitOverhangIn}" overhang`}
              />
            )}
            {trim && <Num label="Frieze Board" unit="lf" value={job.friezeLf} onChange={(v) => set("friezeLf", v)} />}
            <Num
              label="J-Channel" unit="lf" value={job.jChannelLf} onChange={(v) => set("jChannelLf", v)}
              hint={siding ? "Blank = from walls & openings" : undefined}
            />
            {siding && <Num label="Finish Trim" unit="lf" value={job.finishTrimLf} onChange={(v) => set("finishTrimLf", v)} />}
            {trim && <Num label="Band Board" unit="lf" value={job.bandBoardLf} onChange={(v) => set("bandBoardLf", v)} />}
            {trim && <Num label="Window Trim" unit="lf" value={job.windowTrimLf} onChange={(v) => set("windowTrimLf", v)} />}
            {trim && <Num label="Door Trim" unit="lf" value={job.doorTrimLf} onChange={(v) => set("doorTrimLf", v)} />}
          </div>
          {trim && <p className="text-[11px] text-slate-500">Rake board uses the Rakes length above.</p>}
        </div>
      )}
    </div>
  );
}
