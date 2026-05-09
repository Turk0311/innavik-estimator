"use client";

import { useState } from "react";

export interface GutterData {
  linearFt: number
  downspouts: number
  corners: number
  guards: boolean
}

interface Props {
  initialData?: Partial<GutterData>;
  onChange: (data: GutterData) => void;
}

const inputCls = "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";

function Field({
  label, unit, value, onChange,
}: {
  label: string; unit?: string; value: number; onChange: (v: number) => void;
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
        className={inputCls}
      />
    </div>
  );
}

export default function GutterMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<GutterData>({
    linearFt: initialData?.linearFt ?? 0,
    downspouts: initialData?.downspouts ?? 0,
    corners: initialData?.corners ?? 0,
    guards: initialData?.guards ?? false,
  });

  function update<K extends keyof GutterData>(key: K, value: GutterData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Gutter Measurements</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Gutter Run" unit="lf" value={data.linearFt} onChange={(v) => update("linearFt", v)} />
          <Field label="Downspouts" unit="count" value={data.downspouts} onChange={(v) => update("downspouts", v)} />
          <Field label="Corners" unit="count" value={data.corners} onChange={(v) => update("corners", v)} />
        </div>

        {data.linearFt > 0 && (
          <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-4 py-2.5 text-sm text-blue-300">
            <span className="font-bold">{data.linearFt} lf</span> of gutters
            {data.downspouts > 0 && <span> · {data.downspouts} downspouts</span>}
            {data.corners > 0 && <span> · {data.corners} corners</span>}
          </div>
        )}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.guards}
            onChange={(e) => update("guards", e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
          />
          <div>
            <p className="text-sm font-medium text-white">Gutter guards / leaf protection</p>
            <p className="text-xs text-slate-500">Will add gutter guard material line item</p>
          </div>
        </label>
      </div>
    </div>
  );
}
