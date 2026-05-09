"use client";

import { useState } from "react";

export interface DemoArea { id: string; label: string; sqft: number; material: string }
export interface DemoData {
  areas: DemoArea[]
  dumpsterNeeded: boolean
}

interface Props {
  initialData?: Partial<DemoData>;
  onChange: (data: DemoData) => void;
}

const MATERIAL_OPTIONS = [
  { value: "drywall", label: "Drywall" },
  { value: "flooring", label: "Flooring" },
  { value: "tile", label: "Tile" },
  { value: "concrete", label: "Concrete" },
  { value: "roofing", label: "Roofing" },
  { value: "general", label: "General" },
];

const inputCls = "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

function newArea(): DemoArea {
  return { id: String(Date.now() + Math.random()), label: "", sqft: 0, material: "general" };
}

export default function DemoMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<DemoData>({
    areas: initialData?.areas ?? [newArea()],
    dumpsterNeeded: initialData?.dumpsterNeeded ?? false,
  });

  function update<K extends keyof DemoData>(key: K, value: DemoData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  function updateArea(id: string, field: keyof DemoArea, value: string | number) {
    const next = { ...data, areas: data.areas.map((a) => a.id === id ? { ...a, [field]: value } : a) };
    setData(next);
    onChange(next);
  }

  function addArea() {
    const next = { ...data, areas: [...data.areas, newArea()] };
    setData(next);
    onChange(next);
  }

  function removeArea(id: string) {
    const next = { ...data, areas: data.areas.filter((a) => a.id !== id) };
    setData(next);
    onChange(next);
  }

  const totalSqft = data.areas.reduce((sum, a) => sum + (a.sqft || 0), 0);

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Demo Areas</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                <th className="pb-2 pr-3 font-medium">Label</th>
                <th className="pb-2 pr-3 font-medium">Material</th>
                <th className="pb-2 pr-3 font-medium">Sq ft</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {data.areas.map((area, idx) => (
                <tr key={area.id}>
                  <td className="py-2 pr-3">
                    <input
                      type="text"
                      value={area.label}
                      onChange={(e) => updateArea(area.id, "label", e.target.value)}
                      placeholder={`Area ${idx + 1}`}
                      className={inputCls}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <select
                      value={area.material}
                      onChange={(e) => updateArea(area.id, "material", e.target.value)}
                      className={inputCls}
                    >
                      {MATERIAL_OPTIONS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <input
                      type="number"
                      value={area.sqft === 0 ? "" : area.sqft}
                      onChange={(e) => updateArea(area.id, "sqft", Number(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      className={inputCls}
                    />
                  </td>
                  <td className="py-2">
                    {data.areas.length > 1 && (
                      <button
                        onClick={() => removeArea(area.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors p-1"
                        title="Remove area"
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
          onClick={addArea}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Area
        </button>

        {totalSqft > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">Total demo area:</span>
            <span className="font-semibold text-white">{totalSqft.toLocaleString()} sqf</span>
          </div>
        )}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.dumpsterNeeded}
            onChange={(e) => update("dumpsterNeeded", e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
          />
          <div>
            <p className="text-sm font-medium text-white">Dumpster / Haul-away needed</p>
            <p className="text-xs text-slate-500">Will add dumpster rental line item to estimate</p>
          </div>
        </label>
      </div>
    </div>
  );
}
