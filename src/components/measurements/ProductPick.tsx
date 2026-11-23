"use client";

import type { PickProduct } from "@/lib/bathProducts";

// One catalog pick — the build uses this product; "none" is offered only where the item is optional
export default function ProductPick({ label, value, options, onChange, optional = false, hint }: {
  label: string;
  value: string | undefined;
  options: PickProduct[];
  onChange: (id: string) => void;
  optional?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">
        {label}{hint && <span className="text-slate-500 ml-1">({hint})</span>}
      </label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-slate-700 border border-slate-600 text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">{optional ? "None" : options.length ? "— Pick one —" : "Nothing in catalog"}</option>
        {options.map((p) => (
          <option key={p.id} value={p.id}>{p.name} — ${p.cost.toFixed(2)}</option>
        ))}
      </select>
    </div>
  );
}
