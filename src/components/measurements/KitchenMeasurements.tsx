"use client";

import { useState } from "react";

export interface KitchenData {
  upperCabinetsLf: number
  lowerCabinetsLf: number
  countertopLf: number
  backsplashSqft: number
  appliances: number
  sink: boolean
  wasteFactor: number
}

interface Props {
  initialData?: Partial<KitchenData>;
  onChange: (data: KitchenData) => void;
}

const inputCls = "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";

function Field({
  label, unit, value, onChange, step = "1",
}: {
  label: string; unit?: string; value: number; onChange: (v: number) => void; step?: string;
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
        min="0"
        step={step}
        className={inputCls}
      />
    </div>
  );
}

export default function KitchenMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<KitchenData>({
    upperCabinetsLf: initialData?.upperCabinetsLf ?? 0,
    lowerCabinetsLf: initialData?.lowerCabinetsLf ?? 0,
    countertopLf: initialData?.countertopLf ?? 0,
    backsplashSqft: initialData?.backsplashSqft ?? 0,
    appliances: initialData?.appliances ?? 0,
    sink: initialData?.sink ?? false,
    wasteFactor: initialData?.wasteFactor ?? 10,
  });

  function update<K extends keyof KitchenData>(key: K, value: KitchenData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  return (
    <div className="space-y-6">
      {/* Cabinets */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Cabinets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Upper Cabinets" unit="lf" value={data.upperCabinetsLf} onChange={(v) => update("upperCabinetsLf", v)} step="0.5" />
          <Field label="Lower Cabinets" unit="lf" value={data.lowerCabinetsLf} onChange={(v) => update("lowerCabinetsLf", v)} step="0.5" />
        </div>
      </div>

      {/* Countertop & Backsplash */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Countertop &amp; Backsplash</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Countertop" unit="lf" value={data.countertopLf} onChange={(v) => update("countertopLf", v)} step="0.5" />
          <Field label="Backsplash" unit="sqft" value={data.backsplashSqft} onChange={(v) => update("backsplashSqft", v)} />
          <Field label="Waste Factor" unit="%" value={data.wasteFactor} onChange={(v) => update("wasteFactor", v)} />
        </div>
      </div>

      {/* Appliances */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Appliances &amp; Fixtures</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Appliances" unit="count" value={data.appliances} onChange={(v) => update("appliances", v)} />
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.sink}
            onChange={(e) => update("sink", e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-300">Includes sink installation</span>
        </label>
      </div>
    </div>
  );
}
