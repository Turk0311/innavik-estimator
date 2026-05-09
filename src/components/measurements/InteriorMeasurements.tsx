"use client";

import { useState } from "react";

export type InteriorData = {
  roomLength: number;
  roomWidth: number;
  ceilingHeight: number;
  windows: number;
  doors: number;
  wasteFactor: number;
};

interface Props {
  initialData?: Partial<InteriorData>;
  onChange: (data: InteriorData) => void;
}

export default function InteriorMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<InteriorData>({
    roomLength: initialData?.roomLength ?? 0,
    roomWidth: initialData?.roomWidth ?? 0,
    ceilingHeight: initialData?.ceilingHeight ?? 8,
    windows: initialData?.windows ?? 0,
    doors: initialData?.doors ?? 0,
    wasteFactor: initialData?.wasteFactor ?? 10,
  });

  function update<K extends keyof InteriorData>(key: K, value: InteriorData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  const floorArea =
    data.roomLength > 0 && data.roomWidth > 0 ? data.roomLength * data.roomWidth : 0;
  const perimeter =
    data.roomLength > 0 && data.roomWidth > 0
      ? 2 * (data.roomLength + data.roomWidth)
      : 0;
  const grossWallArea = perimeter * data.ceilingHeight;
  const openingDeduction = data.windows * 15 + data.doors * 20;
  const netWallArea = grossWallArea > 0 ? Math.max(grossWallArea - openingDeduction, grossWallArea * 0.7) : 0;

  return (
    <div className="space-y-6">
      {/* Room dimensions */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Room Dimensions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Length <span className="text-slate-600">(ft)</span>
            </label>
            <input
              type="number"
              value={data.roomLength === 0 ? "" : data.roomLength}
              onChange={(e) => update("roomLength", Number(e.target.value) || 0)}
              placeholder="0"
              min="0"
              step="0.5"
              className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Width <span className="text-slate-600">(ft)</span>
            </label>
            <input
              type="number"
              value={data.roomWidth === 0 ? "" : data.roomWidth}
              onChange={(e) => update("roomWidth", Number(e.target.value) || 0)}
              placeholder="0"
              min="0"
              step="0.5"
              className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Ceiling Height <span className="text-slate-600">(ft)</span>
            </label>
            <input
              type="number"
              value={data.ceilingHeight}
              onChange={(e) => update("ceilingHeight", Number(e.target.value) || 8)}
              min="6"
              max="20"
              step="0.5"
              className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Auto-calculated summary */}
        {floorArea > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2.5">
              <p className="text-xs text-slate-500 mb-0.5">Floor Area</p>
              <p className="text-sm font-semibold text-white">{floorArea.toFixed(0)} sqf</p>
            </div>
            <div className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2.5">
              <p className="text-xs text-slate-500 mb-0.5">Gross Wall Area</p>
              <p className="text-sm font-semibold text-white">{grossWallArea.toFixed(0)} sqf</p>
            </div>
            <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-3 py-2.5">
              <p className="text-xs text-slate-500 mb-0.5">Net Wall Area</p>
              <p className="text-sm font-semibold text-blue-300">{Math.ceil(netWallArea)} sqf</p>
            </div>
          </div>
        )}
      </div>

      {/* Openings */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Openings &amp; Waste
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Windows <span className="text-slate-600">(count)</span>
            </label>
            <input
              type="number"
              value={data.windows === 0 ? "" : data.windows}
              onChange={(e) => update("windows", Number(e.target.value) || 0)}
              placeholder="0"
              min="0"
              className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Doors <span className="text-slate-600">(count)</span>
            </label>
            <input
              type="number"
              value={data.doors === 0 ? "" : data.doors}
              onChange={(e) => update("doors", Number(e.target.value) || 0)}
              placeholder="0"
              min="0"
              className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
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
