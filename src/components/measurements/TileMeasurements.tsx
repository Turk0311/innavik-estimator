"use client";

import { useState } from "react";

export interface TileArea {
  id: string;
  label: string;
  length: number;
  width: number;
}

export interface TileData {
  areas: TileArea[];
  wasteFactor: number;
  groutJoints: "narrow" | "medium" | "wide";
  includesBackerBoard: boolean;
}

interface Props {
  initialData?: Partial<TileData>;
  onChange: (data: TileData) => void;
}

const inputCls =
  "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";

function newArea(): TileArea {
  return { id: String(Date.now() + Math.random()), label: "", length: 0, width: 0 };
}

const GROUT_COVERAGE: Record<TileData["groutJoints"], number> = {
  narrow: 80,
  medium: 50,
  wide: 35,
};

export default function TileMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<TileData>({
    areas: initialData?.areas ?? [newArea()],
    wasteFactor: initialData?.wasteFactor ?? 15,
    groutJoints: initialData?.groutJoints ?? "medium",
    includesBackerBoard: initialData?.includesBackerBoard ?? false,
  });

  function update<K extends keyof TileData>(key: K, value: TileData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  function updateArea(id: string, field: keyof TileArea, value: string | number) {
    const next = {
      ...data,
      areas: data.areas.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    };
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

  const totalSqf = data.areas.reduce((sum, a) => sum + (a.length || 0) * (a.width || 0), 0);
  const adjustedSqf = Math.ceil(totalSqf * (1 + data.wasteFactor / 100));
  const thinsetBags = Math.ceil(adjustedSqf / 50);
  const groutBags = Math.ceil(adjustedSqf / GROUT_COVERAGE[data.groutJoints]);
  const backerBoardSqf = data.includesBackerBoard ? adjustedSqf : 0;

  return (
    <div className="space-y-6">
      {/* Areas table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Tile Areas</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                <th className="pb-2 pr-3 font-medium">Area / Room</th>
                <th className="pb-2 pr-3 font-medium">Length (ft)</th>
                <th className="pb-2 pr-3 font-medium">Width (ft)</th>
                <th className="pb-2 pr-3 font-medium text-right">Area (sqf)</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {data.areas.map((area, idx) => {
                const sqf = (area.length || 0) * (area.width || 0);
                return (
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
                      <input
                        type="number"
                        value={area.length === 0 ? "" : area.length}
                        onChange={(e) => updateArea(area.id, "length", Number(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        step="0.5"
                        className={inputCls}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        value={area.width === 0 ? "" : area.width}
                        onChange={(e) => updateArea(area.id, "width", Number(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        step="0.5"
                        className={inputCls}
                      />
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <span className="text-slate-300 font-medium">
                        {sqf > 0 ? sqf.toLocaleString() : "—"}
                      </span>
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
                );
              })}
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

        {totalSqf > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-6 text-sm">
              <span className="text-slate-400">Total area:</span>
              <span className="font-semibold text-white">{totalSqf.toLocaleString()} sqf</span>
            </div>
            <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-4 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-300">
                  With {data.wasteFactor}% waste:{" "}
                  <span className="font-bold">{adjustedSqf.toLocaleString()} sqf</span>
                </span>
              </div>
              <div className="flex items-center gap-6 text-xs text-blue-400/80">
                <span>~{thinsetBags} thinset bags</span>
                <span>~{groutBags} grout bags ({data.groutJoints} joints)</span>
                {data.includesBackerBoard && <span>~{backerBoardSqf} sqf backer board</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Options</h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Waste Factor */}
          <div>
            <label className={labelCls}>
              Waste Factor <span className="text-slate-500 ml-1">(%)</span>
            </label>
            <input
              type="number"
              value={data.wasteFactor === 0 ? "" : data.wasteFactor}
              onChange={(e) => update("wasteFactor", e.target.value === "" ? 0 : Number(e.target.value))}
              placeholder="15"
              min="0"
              max="50"
              className={inputCls}
            />
          </div>

          {/* Grout Joints */}
          <div>
            <label className={labelCls}>Grout Joints</label>
            <select
              value={data.groutJoints}
              onChange={(e) => update("groutJoints", e.target.value as TileData["groutJoints"])}
              className={inputCls}
            >
              <option value="narrow">Narrow (1/16&quot;)</option>
              <option value="medium">Medium (1/8&quot;)</option>
              <option value="wide">Wide (3/16&quot;+)</option>
            </select>
          </div>

          {/* Backer Board */}
          <div className="flex flex-col">
            <label className={labelCls}>Backer Board</label>
            <button
              type="button"
              onClick={() => update("includesBackerBoard", !data.includesBackerBoard)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                data.includesBackerBoard
                  ? "bg-blue-600/20 border-blue-600 text-blue-300"
                  : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500"
              }`}
            >
              <div
                className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${
                  data.includesBackerBoard ? "bg-blue-500 border-blue-500" : "border-slate-500"
                }`}
              >
                {data.includesBackerBoard && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              Include backer board
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
