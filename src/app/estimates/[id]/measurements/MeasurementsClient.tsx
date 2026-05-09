"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RoofingMeasurements, { type RoofingData } from "@/components/measurements/RoofingMeasurements";
import SidingMeasurements, { type SidingData } from "@/components/measurements/SidingMeasurements";
import InteriorMeasurements, { type InteriorData } from "@/components/measurements/InteriorMeasurements";
import PlumbingElectricalMeasurements, { type PlumbingElectricalData } from "@/components/measurements/PlumbingElectricalMeasurements";
import PaintingMeasurements, { type PaintingData } from "@/components/measurements/PaintingMeasurements";
import DemoMeasurements, { type DemoData } from "@/components/measurements/DemoMeasurements";
import GeneralLaborMeasurements, { type GeneralLaborData } from "@/components/measurements/GeneralLaborMeasurements";
import KitchenMeasurements, { type KitchenData } from "@/components/measurements/KitchenMeasurements";
import DeckMeasurements, { type DeckData } from "@/components/measurements/DeckMeasurements";
import GutterMeasurements, { type GutterData } from "@/components/measurements/GutterMeasurements";

type MeasurementRecord = {
  id: string;
  tradeType: string;
  data: Record<string, unknown>;
};

interface Props {
  estimateId: string;
  scopes: string[];
  savedMeasurements: MeasurementRecord[];
}

function normalizeTrade(scope: string): string {
  const s = scope.toLowerCase();
  if (s.includes("roof")) return "Roofing";
  if (s.includes("sid")) return "Siding";
  if (s.includes("interior")) return "Interior";
  if (s.includes("plumb") || s.includes("electric")) return "Plumbing/Electrical";
  if (s.includes("demo") || s.includes("demolition")) return "Demo";
  if (s.includes("paint")) return "Painting";
  if (s.includes("kitchen")) return "Kitchen";
  if (s.includes("general labor") || s === "labor") return "General Labor";
  if (s.includes("deck") || s.includes("decking") || s.includes("framing")) return "Deck";
  if (s.includes("gutter")) return "Gutters";
  if (s.includes("window") || s.includes("door")) return "Windows/Doors";
  return scope;
}

function savedAs<T>(savedMeasurements: MeasurementRecord[], tradeType: string): T | undefined {
  const found = savedMeasurements.find((m) => m.tradeType === tradeType);
  return found?.data as T | undefined;
}

export default function MeasurementsClient({ estimateId, scopes, savedMeasurements }: Props) {
  const router = useRouter();

  const normalizedTabs = [...new Set(scopes.map(normalizeTrade))];
  const [activeTab, setActiveTab] = useState<string>(normalizedTabs[0] ?? "");

  // Form state per trade
  const [roofingData, setRoofingData] = useState<RoofingData>(
    () => savedAs<RoofingData>(savedMeasurements, "Roofing") ?? {} as RoofingData
  );
  const [sidingData, setSidingData] = useState<SidingData>(
    () => savedAs<SidingData>(savedMeasurements, "Siding") ?? {} as SidingData
  );
  const [interiorData, setInteriorData] = useState<InteriorData>(
    () => savedAs<InteriorData>(savedMeasurements, "Interior") ?? {} as InteriorData
  );
  const [peData, setPeData] = useState<PlumbingElectricalData>(
    () => savedAs<PlumbingElectricalData>(savedMeasurements, "Plumbing/Electrical") ?? {} as PlumbingElectricalData
  );
  const [paintingData, setPaintingData] = useState<PaintingData>(
    () => savedAs<PaintingData>(savedMeasurements, "Painting") ?? {} as PaintingData
  );
  const [demoData, setDemoData] = useState<DemoData>(
    () => savedAs<DemoData>(savedMeasurements, "Demo") ?? {} as DemoData
  );
  const [laborData, setLaborData] = useState<GeneralLaborData>(
    () => savedAs<GeneralLaborData>(savedMeasurements, "General Labor") ?? {} as GeneralLaborData
  );
  const [kitchenData, setKitchenData] = useState<KitchenData>(
    () => savedAs<KitchenData>(savedMeasurements, "Kitchen") ?? {} as KitchenData
  );
  const [deckData, setDeckData] = useState<DeckData>(
    () => savedAs<DeckData>(savedMeasurements, "Deck") ?? {} as DeckData
  );
  const [gutterData, setGutterData] = useState<GutterData>(
    () => savedAs<GutterData>(savedMeasurements, "Gutters") ?? {} as GutterData
  );

  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  function getDataForTrade(tradeType: string): Record<string, unknown> {
    switch (tradeType) {
      case "Roofing": return roofingData as unknown as Record<string, unknown>;
      case "Siding": return sidingData as unknown as Record<string, unknown>;
      case "Interior": return interiorData as unknown as Record<string, unknown>;
      case "Plumbing/Electrical": return peData as unknown as Record<string, unknown>;
      case "Painting": return paintingData as unknown as Record<string, unknown>;
      case "Demo": return demoData as unknown as Record<string, unknown>;
      case "General Labor": return laborData as unknown as Record<string, unknown>;
      case "Kitchen": return kitchenData as unknown as Record<string, unknown>;
      case "Deck": return deckData as unknown as Record<string, unknown>;
      case "Gutters": return gutterData as unknown as Record<string, unknown>;
      default: return {};
    }
  }

  async function applyAssembly(tradeType: string) {
    setApplying(tradeType);
    setErrors((prev) => ({ ...prev, [tradeType]: "" }));
    const data = getDataForTrade(tradeType);

    try {
      const res = await fetch(`/api/estimates/${estimateId}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeType, data, applyAssembly: true }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to apply assembly");
      }

      setApplied((prev) => new Set([...prev, tradeType]));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [tradeType]: err instanceof Error ? err.message : "Something went wrong",
      }));
    } finally {
      setApplying(null);
    }
  }

  async function saveMeasurement(tradeType: string) {
    const data = getDataForTrade(tradeType);
    await fetch(`/api/estimates/${estimateId}/measurements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeType, data, applyAssembly: false }),
    });
  }

  function handleDone() {
    router.push(`/estimates/${estimateId}`);
  }

  if (normalizedTabs.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-8 py-16 text-center">
        <p className="text-slate-400 text-sm mb-4">No scopes found for this estimate.</p>
        <button
          onClick={handleDone}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          Go to Estimate Builder
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      <div className="flex items-center gap-1 flex-wrap">
        {normalizedTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700"
            }`}
          >
            {tab}
            {applied.has(tab) && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" title="Applied" />
            )}
          </button>
        ))}
      </div>

      {/* Form content */}
      <div>
        {activeTab === "Roofing" && (
          <RoofingMeasurements initialData={roofingData} onChange={setRoofingData} />
        )}
        {activeTab === "Siding" && (
          <SidingMeasurements initialData={sidingData} onChange={setSidingData} />
        )}
        {activeTab === "Interior" && (
          <InteriorMeasurements initialData={interiorData} onChange={setInteriorData} />
        )}
        {activeTab === "Plumbing/Electrical" && (
          <PlumbingElectricalMeasurements initialData={peData} onChange={setPeData} />
        )}
        {activeTab === "Painting" && (
          <PaintingMeasurements initialData={paintingData} onChange={setPaintingData} />
        )}
        {activeTab === "Demo" && (
          <DemoMeasurements initialData={demoData} onChange={setDemoData} />
        )}
        {activeTab === "General Labor" && (
          <GeneralLaborMeasurements initialData={laborData} onChange={setLaborData} />
        )}
        {activeTab === "Kitchen" && (
          <KitchenMeasurements initialData={kitchenData} onChange={setKitchenData} />
        )}
        {activeTab === "Deck" && (
          <DeckMeasurements initialData={deckData} onChange={setDeckData} />
        )}
        {activeTab === "Gutters" && (
          <GutterMeasurements initialData={gutterData} onChange={setGutterData} />
        )}
        {activeTab === "Windows/Doors" && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl px-8 py-12 text-center">
            <p className="text-slate-400 text-sm">Windows/Doors measurements are entered as counts in the Interior or Siding forms.</p>
          </div>
        )}
      </div>

      {/* Error message */}
      {errors[activeTab] && (
        <div className="rounded-lg bg-red-900/30 border border-red-700 px-4 py-3 text-sm text-red-300">
          {errors[activeTab]}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handleDone}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors"
        >
          Skip — go to builder
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => saveMeasurement(activeTab)}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => applyAssembly(activeTab)}
            disabled={!!applying}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            {applying === activeTab ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Calculating...
              </>
            ) : applied.has(activeTab) ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Re-calculate &amp; Apply
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Calculate &amp; Apply
              </>
            )}
          </button>
        </div>
      </div>

      {/* Done prompt if all applied */}
      {normalizedTabs.every((t) => applied.has(t)) && (
        <div className="rounded-lg bg-emerald-900/20 border border-emerald-700 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-emerald-300 font-medium">
              All trades calculated. Line items have been added to the estimate.
            </span>
          </div>
          <button
            onClick={handleDone}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors flex-shrink-0"
          >
            Open Builder
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
