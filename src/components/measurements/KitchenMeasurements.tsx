"use client";

import { useState } from "react";

export interface KitchenData {
  upperCabinetsLf: number
  lowerCabinetsLf: number
  countertopLf: number
  backsplashHeightIn: number   // height in inches; default 4"
  backsplashSqft: number       // computed: countertopLf × backsplashHeightIn / 12
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

function computeBacksplash(countertopLf: number, heightIn: number): number {
  if (!countertopLf || !heightIn) return 0;
  return Math.ceil((countertopLf * heightIn) / 12 * 10) / 10; // round to 1 decimal
}

export default function KitchenMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<KitchenData>(() => {
    const heightIn = initialData?.backsplashHeightIn ?? 4;
    const countertopLf = initialData?.countertopLf ?? 0;
    return {
      upperCabinetsLf: initialData?.upperCabinetsLf ?? 0,
      lowerCabinetsLf: initialData?.lowerCabinetsLf ?? 0,
      countertopLf,
      backsplashHeightIn: heightIn,
      backsplashSqft: initialData?.backsplashSqft ?? computeBacksplash(countertopLf, heightIn),
      appliances: initialData?.appliances ?? 0,
      sink: initialData?.sink ?? false,
      wasteFactor: initialData?.wasteFactor ?? 10,
    };
  });

  function update<K extends keyof KitchenData>(key: K, value: KitchenData[K]) {
    const next = { ...data, [key]: value };
    if (key === "countertopLf" || key === "backsplashHeightIn") {
      next.backsplashSqft = computeBacksplash(
        key === "countertopLf" ? (value as number) : data.countertopLf,
        key === "backsplashHeightIn" ? (value as number) : data.backsplashHeightIn,
      );
    }
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
          <Field
            label="Countertop"
            unit="lf"
            value={data.countertopLf}
            onChange={(v) => update("countertopLf", v)}
            step="0.5"
          />
          <Field
            label="Waste Factor"
            unit="%"
            value={data.wasteFactor}
            onChange={(v) => update("wasteFactor", v)}
          />
        </div>

        {/* Backsplash height + auto-computed sqft */}
        <div className="border-t border-slate-700 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Backsplash</span>
            {data.backsplashSqft > 0 && (
              <span className="text-xs text-slate-400">
                = <span className="text-white font-medium">{data.backsplashSqft} sqft</span>
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-end">
            {/* Height selector */}
            <div>
              <label className={labelCls}>
                Height <span className="text-slate-500 ml-1">(inches)</span>
              </label>
              <div className="flex gap-2">
                {/* Standard 4" quick-select */}
                <button
                  type="button"
                  onClick={() => update("backsplashHeightIn", 4)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                    data.backsplashHeightIn === 4
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  4″ std
                </button>
                {/* Custom height input */}
                <input
                  type="number"
                  value={data.backsplashHeightIn === 4 ? "" : data.backsplashHeightIn === 0 ? "" : data.backsplashHeightIn}
                  onChange={(e) => {
                    const v = e.target.value === "" ? 4 : Number(e.target.value);
                    update("backsplashHeightIn", v);
                  }}
                  placeholder="custom″"
                  min="1"
                  step="1"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Read-only computed sqft */}
            <div>
              <label className={labelCls}>
                Area <span className="text-slate-500 ml-1">(sqft — auto)</span>
              </label>
              <div className="w-full rounded-lg bg-slate-900 border border-slate-700 text-slate-300 px-3 py-1.5 text-sm">
                {data.backsplashSqft > 0 ? `${data.backsplashSqft} sqft` : "—"}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {data.countertopLf > 0
              ? `${data.countertopLf} lf × ${data.backsplashHeightIn}″ ÷ 12 = ${data.backsplashSqft} sqft`
              : "Enter countertop LF above to auto-calculate backsplash area."}
          </p>
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
