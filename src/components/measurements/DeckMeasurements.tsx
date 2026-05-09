"use client";

import { useState } from "react";

export interface DeckSection { id: string; label: string; length: number; width: number }
export interface DeckData {
  sections: DeckSection[]
  wasteFactor: number
  railingLf: number
  stairs: number
}

interface Props {
  initialData?: Partial<DeckData>;
  onChange: (data: DeckData) => void;
}

const inputCls = "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";

function newSection(): DeckSection {
  return { id: String(Date.now() + Math.random()), label: "", length: 0, width: 0 };
}

function SmallField({
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

export default function DeckMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<DeckData>({
    sections: initialData?.sections ?? [newSection()],
    wasteFactor: initialData?.wasteFactor ?? 10,
    railingLf: initialData?.railingLf ?? 0,
    stairs: initialData?.stairs ?? 0,
  });

  function update<K extends keyof DeckData>(key: K, value: DeckData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  function updateSection(id: string, field: keyof DeckSection, value: string | number) {
    const next = { ...data, sections: data.sections.map((s) => s.id === id ? { ...s, [field]: value } : s) };
    setData(next);
    onChange(next);
  }

  function addSection() {
    const next = { ...data, sections: [...data.sections, newSection()] };
    setData(next);
    onChange(next);
  }

  function removeSection(id: string) {
    const next = { ...data, sections: data.sections.filter((s) => s.id !== id) };
    setData(next);
    onChange(next);
  }

  const totalArea = data.sections.reduce((sum, s) => sum + (s.length || 0) * (s.width || 0), 0);
  const adjustedArea = Math.ceil(totalArea * (1 + data.wasteFactor / 100));

  return (
    <div className="space-y-6">
      {/* Deck Sections */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Deck Sections</h3>

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
              {data.sections.map((section, idx) => {
                const area = (section.length || 0) * (section.width || 0);
                return (
                  <tr key={section.id}>
                    <td className="py-2 pr-3">
                      <input
                        type="text"
                        value={section.label}
                        onChange={(e) => updateSection(section.id, "label", e.target.value)}
                        placeholder={`Section ${idx + 1}`}
                        className={inputCls}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        value={section.length === 0 ? "" : section.length}
                        onChange={(e) => updateSection(section.id, "length", Number(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        step="0.5"
                        className={inputCls}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        value={section.width === 0 ? "" : section.width}
                        onChange={(e) => updateSection(section.id, "width", Number(e.target.value) || 0)}
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
                      {data.sections.length > 1 && (
                        <button
                          onClick={() => removeSection(section.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors p-1"
                          title="Remove section"
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
          onClick={addSection}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Section
        </button>

        {totalArea > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-400">Total deck area:</span>
              <span className="font-semibold text-white">{totalArea.toLocaleString()} sqf</span>
            </div>
            <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-4 py-2.5 text-sm text-blue-300">
              With {data.wasteFactor}% waste: <span className="font-bold">{adjustedArea.toLocaleString()} sqf</span>
            </div>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Accessories</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <SmallField label="Waste Factor" unit="%" value={data.wasteFactor} onChange={(v) => update("wasteFactor", v)} />
          <SmallField label="Railing" unit="lf" value={data.railingLf} onChange={(v) => update("railingLf", v)} />
          <SmallField label="Stair Sections" unit="count" value={data.stairs} onChange={(v) => update("stairs", v)} />
        </div>
      </div>
    </div>
  );
}
