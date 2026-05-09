"use client";

import { useState } from "react";

export type RoofingData = {
  roofArea: number;
  pitch: string;
  layers: number;
  ridge: number;
  hip: number;
  valleys: number;
  rakes: number;
  eaves: number;
  chimneys: number;
  skylights: number;
  powerVents: number;
  wasteFactor: number;
};

interface Props {
  initialData?: Partial<RoofingData>;
  onChange: (data: RoofingData) => void;
}

const PITCH_OPTIONS = [
  { value: "up_to_6_12", label: "Up to 6/12" },
  { value: "7_8_12", label: "7–8/12" },
  { value: "9_10_12", label: "9–10/12" },
  { value: "11_12_12", label: "11–12/12" },
  { value: "mansard", label: "Mansard" },
  { value: "flat", label: "Flat" },
];

function Field({
  label,
  unit,
  value,
  onChange,
  step = "1",
  min = "0",
}: {
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
  min?: string;
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
        min={min}
        step={step}
        className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      />
    </div>
  );
}

export default function RoofingMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<RoofingData>({
    roofArea: initialData?.roofArea ?? 0,
    pitch: initialData?.pitch ?? "up_to_6_12",
    layers: initialData?.layers ?? 1,
    ridge: initialData?.ridge ?? 0,
    hip: initialData?.hip ?? 0,
    valleys: initialData?.valleys ?? 0,
    rakes: initialData?.rakes ?? 0,
    eaves: initialData?.eaves ?? 0,
    chimneys: initialData?.chimneys ?? 0,
    skylights: initialData?.skylights ?? 0,
    powerVents: initialData?.powerVents ?? 0,
    wasteFactor: initialData?.wasteFactor ?? 10,
  });

  function update<K extends keyof RoofingData>(key: K, value: RoofingData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  const squares = data.roofArea > 0 ? Math.ceil((data.roofArea * (1 + data.wasteFactor / 100)) / 100) : 0;

  return (
    <div className="space-y-6">
      {/* Main area + pitch */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Roof Area
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Roof Area <span className="text-slate-600">(sqf)</span>
            </label>
            <input
              type="number"
              value={data.roofArea === 0 ? "" : data.roofArea}
              onChange={(e) => update("roofArea", Number(e.target.value) || 0)}
              placeholder="0"
              min="0"
              className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Pitch</label>
            <select
              value={data.pitch}
              onChange={(e) => update("pitch", e.target.value)}
              className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              {PITCH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Number of Layers <span className="text-slate-600">(tear-off)</span>
            </label>
            <input
              type="number"
              value={data.layers}
              onChange={(e) => update("layers", Number(e.target.value) || 1)}
              min="1"
              max="4"
              className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {squares > 0 && (
          <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-4 py-2.5 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-blue-300">
              <span className="font-bold">{squares} squares</span> calculated (with {data.wasteFactor}% waste)
            </span>
          </div>
        )}
      </div>

      {/* Linear feet */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Linear Feet
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Ridge" unit="lf" value={data.ridge} onChange={(v) => update("ridge", v)} />
          <Field label="Hip" unit="lf" value={data.hip} onChange={(v) => update("hip", v)} />
          <Field label="Valleys" unit="lf" value={data.valleys} onChange={(v) => update("valleys", v)} />
          <Field label="Rakes" unit="lf" value={data.rakes} onChange={(v) => update("rakes", v)} />
          <Field label="Eaves" unit="lf" value={data.eaves} onChange={(v) => update("eaves", v)} />
        </div>
      </div>

      {/* Accessories */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Accessories
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label="Chimneys" unit="count" value={data.chimneys} onChange={(v) => update("chimneys", v)} />
          <Field label="Skylights" unit="count" value={data.skylights} onChange={(v) => update("skylights", v)} />
          <Field label="Power Vents" unit="count" value={data.powerVents} onChange={(v) => update("powerVents", v)} />
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
