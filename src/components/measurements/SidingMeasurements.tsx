"use client";

import { useState } from "react";

export type SidingData = {
  wallArea: number;
  perimeter: number;
  openings: number;
  insideCorners: number;
  outsideCorners: number;
  soffitArea: number;
  fascia: number;
  wasteFactor: number;
};

interface Props {
  initialData?: Partial<SidingData>;
  onChange: (data: SidingData) => void;
}

function Field({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">
        {label}
        {unit && <span className="text-slate-600 ml-1">({unit})</span>}
      </label>
      <input
        type="number"
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        placeholder="0"
        min="0"
        className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      />
    </div>
  );
}

export default function SidingMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<SidingData>({
    wallArea: initialData?.wallArea ?? 0,
    perimeter: initialData?.perimeter ?? 0,
    openings: initialData?.openings ?? 0,
    insideCorners: initialData?.insideCorners ?? 0,
    outsideCorners: initialData?.outsideCorners ?? 0,
    soffitArea: initialData?.soffitArea ?? 0,
    fascia: initialData?.fascia ?? 0,
    wasteFactor: initialData?.wasteFactor ?? 10,
  });

  function update<K extends keyof SidingData>(key: K, value: SidingData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  const netArea =
    data.wallArea > 0
      ? Math.max(
          Math.ceil(data.wallArea * (1 + data.wasteFactor / 100) - data.openings * 20),
          Math.ceil(data.wallArea * 0.5)
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Main area */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Wall Area
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Wall Area" unit="sqf" value={data.wallArea} onChange={(v) => update("wallArea", v)} />
          <Field label="Perimeter" unit="lf" value={data.perimeter} onChange={(v) => update("perimeter", v)} />
          <Field
            label="Openings"
            unit="windows + doors"
            value={data.openings}
            onChange={(v) => update("openings", v)}
          />
        </div>

        {netArea > 0 && (
          <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-4 py-2.5 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-blue-300">
              <span className="font-bold">{netArea} sqf</span> net siding area (with {data.wasteFactor}% waste, less openings)
            </span>
          </div>
        )}
      </div>

      {/* Corners */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Corners &amp; Trim
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field
            label="Inside Corners"
            unit="count"
            value={data.insideCorners}
            onChange={(v) => update("insideCorners", v)}
          />
          <Field
            label="Outside Corners"
            unit="count"
            value={data.outsideCorners}
            onChange={(v) => update("outsideCorners", v)}
          />
          <Field label="Soffit Area" unit="sqf" value={data.soffitArea} onChange={(v) => update("soffitArea", v)} />
          <Field label="Fascia" unit="lf" value={data.fascia} onChange={(v) => update("fascia", v)} />
        </div>
      </div>

      {/* Waste */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Waste Factor <span className="text-slate-600">(%)</span>
            </label>
            <input
              type="number"
              value={data.wasteFactor}
              onChange={(e) => update("wasteFactor", Number(e.target.value) || 10)}
              min="0"
              max="30"
              className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
