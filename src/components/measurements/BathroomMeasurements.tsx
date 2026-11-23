"use client";

import { useState } from "react";
import ProductPick from "./ProductPick";
import type { BathProductLists } from "@/lib/bathProducts";

// Fixture counts come from the Measurements tab; this tab picks the products.
// Each toilet and sink also gets its install parts and one Plumbing line from the Labor page.
export interface BathroomData {
  toiletProductId: string;
  vanityProductId: string;
  faucetProductId: string;
}

export default function BathroomMeasurements({ initialData, onChange, products, counts }: {
  initialData?: Partial<BathroomData>;
  onChange: (data: BathroomData) => void;
  products: BathProductLists;
  counts: { toilets: number; sinks: number };
}) {
  const [data, setData] = useState<BathroomData>({
    toiletProductId: initialData?.toiletProductId ?? "",
    vanityProductId: initialData?.vanityProductId ?? "",
    faucetProductId: initialData?.faucetProductId ?? "",
  });
  function set<K extends keyof BathroomData>(key: K, value: BathroomData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Fixtures</h3>
      {counts.toilets === 0 && counts.sinks === 0 && (
        <p className="text-sm text-slate-400">Enter toilets and sinks on the Measurements tab.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {counts.toilets > 0 && (
          <ProductPick label="Toilet" hint={`× ${counts.toilets}`} value={data.toiletProductId} options={products.toilets} onChange={(v) => set("toiletProductId", v)} />
        )}
        {counts.sinks > 0 && (
          <>
            <ProductPick label="Vanity / sink" hint={`× ${counts.sinks}`} value={data.vanityProductId} options={products.vanities} onChange={(v) => set("vanityProductId", v)} />
            <ProductPick label="Faucet" hint={`× ${counts.sinks}`} value={data.faucetProductId} options={products.faucets} onChange={(v) => set("faucetProductId", v)} />
          </>
        )}
      </div>
      {(counts.toilets > 0 || counts.sinks > 0) && (
        <p className="text-xs text-slate-500">
          Adds install parts (toilet kit and stop; angle stops, supply lines, P-trap and tail piece) and one Plumbing line per fixture.
        </p>
      )}
    </div>
  );
}
