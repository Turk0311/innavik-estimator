"use client";

import { useState } from "react";

export interface PlaneEntry { id: string; label: string; area: number }
export interface RoofingData {
  planes: PlaneEntry[]
  wasteFactor: number
  pitch: string
  layers: number
  ridge: number
  hip: number
  valleys: number
  rakes: number
  eaves: number
  chimneys: number
  skylights: number
  powerVents: number
}

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

const inputCls = "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";

function newPlane(): PlaneEntry {
  return { id: String(Date.now() + Math.random()), label: "", area: 0 };
}

function SmallField({
  label, unit, value, onChange, step = "1", min = "0",
}: {
  label: string; unit?: string; value: number; onChange: (v: number) => void; step?: string; min?: string;
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
        min={min}
        step={step}
        className={inputCls}
      />
    </div>
  );
}

export default function RoofingMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<RoofingData>({
    planes: initialData?.planes ?? [newPlane()],
    wasteFactor: initialData?.wasteFactor ?? 15,
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
  });

  function update<K extends keyof RoofingData>(key: K, value: RoofingData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  function updatePlane(id: string, field: keyof PlaneEntry, value: string | number) {
    const next = { ...data, planes: data.planes.map((p) => p.id === id ? { ...p, [field]: value } : p) };
    setData(next);
    onChange(next);
  }

  function addPlane() {
    const next = { ...data, planes: [...data.planes, newPlane()] };
    setData(next);
    onChange(next);
  }

  function removePlane(id: string) {
    const next = { ...data, planes: data.planes.filter((p) => p.id !== id) };
    setData(next);
    onChange(next);
  }

  const totalArea = data.planes.reduce((sum, p) => sum + (p.area || 0), 0);
  const adjustedArea = totalArea * (1 + data.wasteFactor / 100);
  const squares = totalArea > 0 ? Math.ceil(adjustedArea / 100) : 0;

  return (
    <div className="space-y-6">
      {/* Roof Planes */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Roof Planes</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                <th className="pb-2 pr-3 font-medium">Label</th>
                <th className="pb-2 pr-3 font-medium">Area (sqf)</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {data.planes.map((plane, idx) => (
                <tr key={plane.id} className="group">
                  <td className="py-2 pr-3">
                    <input
                      type="text"
                      value={plane.label}
                      onChange={(e) => updatePlane(plane.id, "label", e.target.value)}
                      placeholder={`Plane ${idx + 1}`}
                      className={inputCls}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      value={plane.area === 0 ? "" : plane.area}
                      onChange={(e) => updatePlane(plane.id, "area", Number(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      className={inputCls}
                    />
                  </td>
                  <td className="py-2">
                    {data.planes.length > 1 && (
                      <button
                        onClick={() => removePlane(plane.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors p-1"
                        title="Remove plane"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={addPlane}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Plane
        </button>

        {totalArea > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-400">Total area:</span>
              <span className="font-semibold text-white">{totalArea.toLocaleString()} sqf</span>
            </div>
            <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-4 py-2.5 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-blue-300">
                <span className="font-bold">{squares} squares</span> with {data.wasteFactor}% waste ({Math.ceil(adjustedArea).toLocaleString()} sqf adjusted)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pitch, Layers, Waste */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Roof Details</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Pitch</label>
            <select
              value={data.pitch}
              onChange={(e) => update("pitch", e.target.value)}
              className={inputCls}
            >
              {PITCH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <SmallField label="Layers" unit="tear-off" value={data.layers} onChange={(v) => update("layers", v)} min="1" />
          <SmallField label="Waste Factor" unit="%" value={data.wasteFactor} onChange={(v) => update("wasteFactor", v)} />
        </div>
      </div>

      {/* Linear feet */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Linear Feet</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <SmallField label="Ridge" unit="lf" value={data.ridge} onChange={(v) => update("ridge", v)} />
          <SmallField label="Hip" unit="lf" value={data.hip} onChange={(v) => update("hip", v)} />
          <SmallField label="Valleys" unit="lf" value={data.valleys} onChange={(v) => update("valleys", v)} />
          <SmallField label="Rakes" unit="lf" value={data.rakes} onChange={(v) => update("rakes", v)} />
          <SmallField label="Eaves" unit="lf" value={data.eaves} onChange={(v) => update("eaves", v)} />
        </div>
      </div>

      {/* Accessories */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Accessories</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <SmallField label="Chimneys" unit="count" value={data.chimneys} onChange={(v) => update("chimneys", v)} />
          <SmallField label="Skylights" unit="count" value={data.skylights} onChange={(v) => update("skylights", v)} />
          <SmallField label="Power Vents" unit="count" value={data.powerVents} onChange={(v) => update("powerVents", v)} />
        </div>
      </div>
    </div>
  );
}
