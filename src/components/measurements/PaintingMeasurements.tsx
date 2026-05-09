"use client";

import { useState } from "react";

export interface SurfaceEntry { id: string; label: string; length: number; width: number }
export interface PaintingData {
  surfaces: SurfaceEntry[]
  coats: number
  wasteFactor: number
  includesPrimer: boolean
  includesTrim: boolean
}

interface Props {
  initialData?: Partial<PaintingData>;
  onChange: (data: PaintingData) => void;
}

const inputCls = "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";

function newSurface(): SurfaceEntry {
  return { id: String(Date.now() + Math.random()), label: "", length: 0, width: 0 };
}

export default function PaintingMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<PaintingData>({
    surfaces: initialData?.surfaces ?? [newSurface()],
    coats: initialData?.coats ?? 2,
    wasteFactor: initialData?.wasteFactor ?? 10,
    includesPrimer: initialData?.includesPrimer ?? false,
    includesTrim: initialData?.includesTrim ?? false,
  });

  function update<K extends keyof PaintingData>(key: K, value: PaintingData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  function updateSurface(id: string, field: keyof SurfaceEntry, value: string | number) {
    const next = { ...data, surfaces: data.surfaces.map((s) => s.id === id ? { ...s, [field]: value } : s) };
    setData(next);
    onChange(next);
  }

  function addSurface() {
    const next = { ...data, surfaces: [...data.surfaces, newSurface()] };
    setData(next);
    onChange(next);
  }

  function removeSurface(id: string) {
    const next = { ...data, surfaces: data.surfaces.filter((s) => s.id !== id) };
    setData(next);
    onChange(next);
  }

  const totalSqf = data.surfaces.reduce((sum, s) => sum + (s.length || 0) * (s.width || 0), 0);
  const adjustedSqf = Math.ceil(totalSqf * (1 + data.wasteFactor / 100));

  return (
    <div className="space-y-6">
      {/* Surfaces */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Surfaces to Paint</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                <th className="pb-2 pr-3 font-medium">Label</th>
                <th className="pb-2 pr-3 font-medium">Length (ft)</th>
                <th className="pb-2 pr-3 font-medium">Width (ft)</th>
                <th className="pb-2 pr-3 font-medium text-right">Area (sqf)</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {data.surfaces.map((surface, idx) => {
                const area = (surface.length || 0) * (surface.width || 0);
                return (
                  <tr key={surface.id}>
                    <td className="py-2 pr-3">
                      <input
                        type="text"
                        value={surface.label}
                        onChange={(e) => updateSurface(surface.id, "label", e.target.value)}
                        placeholder={`Surface ${idx + 1}`}
                        className={inputCls}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        value={surface.length === 0 ? "" : surface.length}
                        onChange={(e) => updateSurface(surface.id, "length", Number(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        step="0.5"
                        className={inputCls}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        value={surface.width === 0 ? "" : surface.width}
                        onChange={(e) => updateSurface(surface.id, "width", Number(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        step="0.5"
                        className={inputCls}
                      />
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <span className="text-slate-300 font-medium">{area > 0 ? area.toLocaleString() : "—"}</span>
                    </td>
                    <td className="py-2">
                      {data.surfaces.length > 1 && (
                        <button
                          onClick={() => removeSurface(surface.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors p-1"
                          title="Remove surface"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          onClick={addSurface}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Surface
        </button>

        {totalSqf > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-400">Total surface area:</span>
              <span className="font-semibold text-white">{totalSqf.toLocaleString()} sqf</span>
            </div>
            <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-4 py-2.5 text-sm text-blue-300">
              With {data.wasteFactor}% waste: <span className="font-bold">{adjustedSqf.toLocaleString()} sqf</span>
            </div>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Paint Options</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Coats</label>
            <select
              value={data.coats}
              onChange={(e) => update("coats", Number(e.target.value))}
              className={inputCls}
            >
              <option value={1}>1 coat</option>
              <option value={2}>2 coats</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Waste Factor (%)</label>
            <input
              type="number"
              value={data.wasteFactor}
              onChange={(e) => update("wasteFactor", Number(e.target.value) || 10)}
              min="0"
              max="30"
              className={inputCls}
            />
          </div>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.includesPrimer}
              onChange={(e) => update("includesPrimer", e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-300">Includes primer coat</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.includesTrim}
              onChange={(e) => update("includesTrim", e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-300">Includes trim painting</span>
          </label>
        </div>
      </div>
    </div>
  );
}
