"use client";

import { useState } from "react";

export interface BathroomData {
  vanities: number;
  toilets: number;
  showers: number;
  mirrors: number;
  towelBars: number;
  tpHolders: number;
  faucets: number;
}

interface Props {
  initialData?: Partial<BathroomData>;
  onChange: (data: BathroomData) => void;
}

const inputCls =
  "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";

interface CountField {
  key: keyof BathroomData;
  label: string;
  icon: string;
}

const FIELDS: CountField[] = [
  { key: "vanities",   label: "Vanities",           icon: "🪞" },
  { key: "toilets",    label: "Toilets",             icon: "🚽" },
  { key: "showers",    label: "Shower / Tub Units",  icon: "🚿" },
  { key: "faucets",    label: "Faucets",             icon: "🚰" },
  { key: "mirrors",    label: "Mirrors",             icon: "🪟" },
  { key: "towelBars",  label: "Towel Bars",          icon: "🏷️" },
  { key: "tpHolders",  label: "TP Holders",          icon: "🧻" },
];

export default function BathroomMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<BathroomData>({
    vanities:   initialData?.vanities   ?? 0,
    toilets:    initialData?.toilets    ?? 0,
    showers:    initialData?.showers    ?? 0,
    mirrors:    initialData?.mirrors    ?? 0,
    towelBars:  initialData?.towelBars  ?? 0,
    tpHolders:  initialData?.tpHolders  ?? 0,
    faucets:    initialData?.faucets    ?? 0,
  });

  function update(key: keyof BathroomData, value: number) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  const totalItems = Object.values(data).reduce((sum, v) => sum + v, 0);

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Fixture &amp; Accessory Counts
          </h3>
          {totalItems > 0 && (
            <span className="text-xs font-semibold bg-sky-600/20 text-sky-300 border border-sky-700/50 px-2.5 py-1 rounded-full">
              {totalItems} items
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {FIELDS.map(({ key, label, icon }) => (
            <div key={key}>
              <label className={labelCls}>
                <span className="mr-1">{icon}</span>
                {label}
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => update(key, Math.max(0, data[key] - 1))}
                  className="w-8 h-8 flex-shrink-0 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-lg font-bold flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={data[key] === 0}
                >
                  −
                </button>
                <input
                  type="number"
                  value={data[key] === 0 ? "" : data[key]}
                  onChange={(e) => update(key, Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  min="0"
                  className={inputCls + " text-center"}
                />
                <button
                  type="button"
                  onClick={() => update(key, data[key] + 1)}
                  className="w-8 h-8 flex-shrink-0 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-lg font-bold flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {totalItems > 0 && (
          <div className="rounded-lg bg-sky-900/20 border border-sky-800/50 px-4 py-3 mt-2">
            <p className="text-xs text-sky-400 font-medium mb-1.5">Summary</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-sky-300/80">
              {FIELDS.filter(({ key }) => data[key] > 0).map(({ key, label }) => (
                <span key={key}>
                  {data[key]}× {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
