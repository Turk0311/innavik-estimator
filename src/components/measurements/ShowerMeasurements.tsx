"use client";

import { useState } from "react";
import ProductPick from "./ProductPick";
import CarpentryHours from "./CarpentryHours";
import type { BathProductLists } from "@/lib/bathProducts";
import type { ShowerEntry } from "@/lib/bathShared";

// Showers (type, size, nooks, waterproofing) come from the Measurements tab; this tab picks products.
export interface ShowerData {
  valveProductId: string;
  doorProductId: string;
  showerTileProductId: string;
  surroundProductId: string;
  finishCarpenterHours?: number;  // surround install — 0 = suggested
  apprenticeHours?: number;
}

export default function ShowerMeasurements({ initialData, onChange, products, showers }: {
  initialData?: Partial<ShowerData>;
  onChange: (data: ShowerData) => void;
  products: BathProductLists;
  showers: ShowerEntry[];
}) {
  const [data, setData] = useState<ShowerData>({
    valveProductId: initialData?.valveProductId ?? "",
    doorProductId: initialData?.doorProductId ?? "",
    showerTileProductId: initialData?.showerTileProductId ?? "",
    surroundProductId: initialData?.surroundProductId ?? "",
    finishCarpenterHours: initialData?.finishCarpenterHours ?? 0,
    apprenticeHours: initialData?.apprenticeHours ?? 0,
  });
  function set<K extends keyof ShowerData>(key: K, value: ShowerData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  const tiled = showers.some((s) => s.type !== "surround");
  const surrounds = showers.filter((s) => s.type === "surround").length;

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Shower Products</h3>
        {showers.length === 0 && <p className="text-sm text-slate-400">Add showers on the Measurements tab.</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <ProductPick label="Valve & trim" hint="each shower" value={data.valveProductId} options={products.valves} onChange={(v) => set("valveProductId", v)} />
          <ProductPick label="Glass door" optional value={data.doorProductId} options={products.doors} onChange={(v) => set("doorProductId", v)} />
          {tiled && (
            <ProductPick label="Shower tile" hint="walls and base" value={data.showerTileProductId} options={products.tiles} onChange={(v) => set("showerTileProductId", v)} />
          )}
          {surrounds > 0 && (
            <ProductPick label="Surround" hint={`× ${surrounds}`} value={data.surroundProductId} options={products.surrounds} onChange={(v) => set("surroundProductId", v)} />
          )}
        </div>
        {tiled && (
          <p className="text-xs text-slate-500">
            Tiled showers add DensShield, waterproofing (Aqua Defense or Kerdi on walls, Aqua Defense on every base), pan liner, bed mud, drain and curb for large showers, thinset, grout, LASH, trim and silicone — plus the tile sub&apos;s Shower Tile and Nook lines and one Plumbing line per shower.
          </p>
        )}
      </div>

      {surrounds > 0 && (
        <CarpentryHours
          boxed
          fields={[
            { key: "finishCarpenterHours", label: "Carpenter", value: data.finishCarpenterHours },
            { key: "apprenticeHours", label: "Finish Apprentice", value: data.apprenticeHours },
          ]}
          onChange={(k, v) => set(k as "finishCarpenterHours" | "apprenticeHours", v)}
        />
      )}
    </div>
  );
}
