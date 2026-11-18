"use client";

import { useState } from "react";

// Door count comes from the Measurements tab (Int doors); this tab only picks the slab
export interface InteriorDoorsData {
  doorCore: "hc" | "sc";
}

const CORES: { value: InteriorDoorsData["doorCore"]; label: string; note: string }[] = [
  { value: "hc", label: "Hollow Core", note: "Interior HC Doors" },
  { value: "sc", label: "Solid Core", note: "Interior SC Doors" },
];

export default function InteriorDoorsMeasurements({
  initialData,
  onChange,
}: {
  initialData?: Partial<InteriorDoorsData>;
  onChange: (data: InteriorDoorsData) => void;
}) {
  const [data, setData] = useState<InteriorDoorsData>({ doorCore: initialData?.doorCore ?? "hc" });

  function setCore(doorCore: InteriorDoorsData["doorCore"]) {
    const next = { ...data, doorCore };
    setData(next);
    onChange(next);
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Door Type</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          One door per interior door on the Measurements tab. Setting the doors is in the carpenter hours on Interior Trim.
        </p>
      </div>
      <div className="flex gap-2">
        {CORES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCore(c.value)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left ${
              data.doorCore === c.value
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500"
            }`}
          >
            {c.label}
            <span className="block text-xs font-normal opacity-70">{c.note}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
