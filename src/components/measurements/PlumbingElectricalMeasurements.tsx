"use client";

import { useState } from "react";

export type PlumbingElectricalData = {
  outlets: number;
  switches: number;
  fixtures: number;
  roughInPlumbing: number;
  plumbingFixtures: number;
};

interface Props {
  initialData?: Partial<PlumbingElectricalData>;
  onChange: (data: PlumbingElectricalData) => void;
}

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">
        {label}
        {hint && <span className="text-slate-600 ml-1">({hint})</span>}
      </label>
      <input
        type="number"
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        placeholder="0"
        min="0"
        className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      />
    </div>
  );
}

export default function PlumbingElectricalMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<PlumbingElectricalData>({
    outlets: initialData?.outlets ?? 0,
    switches: initialData?.switches ?? 0,
    fixtures: initialData?.fixtures ?? 0,
    roughInPlumbing: initialData?.roughInPlumbing ?? 0,
    plumbingFixtures: initialData?.plumbingFixtures ?? 0,
  });

  function update<K extends keyof PlumbingElectricalData>(key: K, value: PlumbingElectricalData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  const electricalHours = data.outlets * 1.5 + data.switches * 1.5 + data.fixtures * 2;
  const plumbingHours = data.roughInPlumbing * 4 + data.plumbingFixtures * 3;

  return (
    <div className="space-y-6">
      {/* Electrical */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Electrical
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Outlets" hint="count" value={data.outlets} onChange={(v) => update("outlets", v)} />
          <Field label="Switches" hint="count" value={data.switches} onChange={(v) => update("switches", v)} />
          <Field label="Fixtures / Lights" hint="count" value={data.fixtures} onChange={(v) => update("fixtures", v)} />
        </div>
        {electricalHours > 0 && (
          <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-4 py-2.5 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm text-blue-300">
              <span className="font-bold">{Math.ceil(electricalHours)} hours</span> estimated electrical labor
            </span>
          </div>
        )}
      </div>

      {/* Plumbing */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Plumbing
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field
            label="Rough-in Plumbing"
            hint="count"
            value={data.roughInPlumbing}
            onChange={(v) => update("roughInPlumbing", v)}
          />
          <Field
            label="Plumbing Fixtures"
            hint="count"
            value={data.plumbingFixtures}
            onChange={(v) => update("plumbingFixtures", v)}
          />
        </div>
        {plumbingHours > 0 && (
          <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-4 py-2.5 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707" />
            </svg>
            <span className="text-sm text-blue-300">
              <span className="font-bold">{Math.ceil(plumbingHours)} hours</span> estimated plumbing labor
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
