"use client";

import { useEffect, useState } from "react";
import JobMeasurementsForm from "@/components/measurements/JobMeasurementsForm";
import {
  type JobMeasurements, JOB_TRADE_TYPE, LINKED_TABS,
  jobFromSaved, sectionsForTabs, deriveForTab, summaryForTab, stripRoomEntries, interiorPaintSqft, DECK_TABS,
} from "@/lib/jobMeasurements";
import { useRouter } from "next/navigation";
import RoofingMeasurements, { type RoofingData } from "@/components/measurements/RoofingMeasurements";
import SidingMeasurements, { type SidingData } from "@/components/measurements/SidingMeasurements";
import InteriorTrimMeasurements, { type InteriorTrimData } from "@/components/measurements/InteriorTrimMeasurements";
import PlumbingElectricalMeasurements, { type PlumbingElectricalData } from "@/components/measurements/PlumbingElectricalMeasurements";
import PaintingMeasurements, { type PaintingData } from "@/components/measurements/PaintingMeasurements";
import DemoMeasurements, { type DemoData } from "@/components/measurements/DemoMeasurements";
import GeneralLaborMeasurements, { type GeneralLaborData } from "@/components/measurements/GeneralLaborMeasurements";
import { SCOPE_CATEGORIES, MITIGATION_SCOPES, SQFT_MITIGATION_SCOPES } from "@/lib/scopeCategories";
import KitchenMeasurements, { type KitchenData } from "@/components/measurements/KitchenMeasurements";
import DeckMeasurements, { type DeckData } from "@/components/measurements/DeckMeasurements";
import DeckingAccessoriesMeasurements, { type DeckingAccessoriesData } from "@/components/measurements/DeckingAccessoriesMeasurements";
import DeckFramingMeasurements, { type DeckFramingData } from "@/components/measurements/DeckFramingMeasurements";
import DeckFramingAccessoriesMeasurements, { type DeckFramingAccessoriesData } from "@/components/measurements/DeckFramingAccessoriesMeasurements";
import GutterMeasurements, { type GutterData } from "@/components/measurements/GutterMeasurements";
import { boardFastenerPlan, describePlan } from "@/lib/deckFasteners";
import InteriorDoorsMeasurements, { type InteriorDoorsData } from "@/components/measurements/InteriorDoorsMeasurements";
import WallAssemblyMeasurements, { type WallAssemblyData } from "@/components/measurements/WallAssemblyMeasurements";
import InsulationMeasurements, { type InsulationData } from "@/components/measurements/InsulationMeasurements";
import InsulationAccessoriesMeasurements, { type InsulationAccessoriesData } from "@/components/measurements/InsulationAccessoriesMeasurements";
import DrywallMeasurements, { type DrywallData } from "@/components/measurements/DrywallMeasurements";
import DrywallAccessoriesMeasurements, { type DrywallAccessoriesData } from "@/components/measurements/DrywallAccessoriesMeasurements";
import WindowsDoorsMeasurements, { type WindowsDoorData } from "@/components/measurements/WindowsDoorsMeasurements";
import FlooringMeasurements, { type FlooringData, type FloorRoom } from "@/components/measurements/FlooringMeasurements";
import TileMeasurements, { type TileData } from "@/components/measurements/TileMeasurements";
import BathroomMeasurements, { type BathroomData } from "@/components/measurements/BathroomMeasurements";
import ExteriorTrimMeasurements, { type ExteriorTrimData } from "@/components/measurements/ExteriorTrimMeasurements";

type MeasurementRecord = {
  id: string;
  tradeType: string;
  data: Record<string, unknown>;
};

type LaborAssemblyPreview = {
  name: string;
  items: { productName: string; quantity: number; unit: string; coverageSqft: number | null }[];
};

interface Props {
  estimateId: string;
  scopes: string[];
  savedMeasurements: MeasurementRecord[];
  deckProducts: { id: string; name: string; cost: number; unit: string; subCategory: string | null }[];
  laborAssemblies?: LaborAssemblyPreview[];
}

function normalizeTrade(scope: string): string {
  const s = scope.toLowerCase();
  if (s === "floor protection" || s === "room protection" || s === "contents movement" || s === "mitigation") return "General Labor";
  if (s.includes("roof")) return "Roofing";
  if (s.includes("sid")) return "Siding";
  if (s.includes("kitchen")) return "Kitchen";
  if (s.includes("interior") && s.includes("trim") && s.includes("accessor")) return "Interior Trim Accessories";
  if (s.includes("interior") && s.includes("trim")) return "Interior Trim";
  if (s.includes("interior") && s.includes("door")) return s.includes("assembl") || s.includes("accessor") ? "Interior Door Assembly" : "Interior Doors";
  if (s.includes("interior")) return "Interior Trim";
  if (s.includes("exterior") && s.includes("trim") && s.includes("accessor")) return "Exterior Trim Accessories";
  if (s.includes("exterior") && s.includes("trim")) return "Exterior Trim";
  if (s.includes("plumb") || s.includes("electric")) return "Plumbing/Electrical";
  if (s.includes("demo") || s.includes("demolition")) return "Demo";
  if (s.includes("paint")) return "Painting";
  if (s.includes("general labor") || s === "labor") return "General Labor";
  if (s.includes("decking") && s.includes("accessor")) return "Decking Accessories";
  if (s.includes("deck") && s.includes("framing") && s.includes("accessor")) return "Deck Framing Accessories";
  if (s.includes("deck") && s.includes("framing")) return "Deck Framing";
  if (s === "decking" || s.includes("deck")) return "Decking";
  if (s.includes("gutter")) return "Gutters";
  if (s.startsWith("wall")) return "Wall Assembly";
  if (s.includes("floor")) return "Flooring";
  if (s.includes("tile")) return "Tile";
  if (s.includes("vanity") || s.includes("toilet") || s.includes("sink") || s.includes("faucet") || s.includes("shower")) return "Bathroom";
  if (s.includes("window") || s.includes("door")) return "Windows/Doors";
  if (s.includes("insul") && s.includes("accessor")) return "Insulation Accessories";
  if (s.includes("insul")) return "Insulation";
  if (s.includes("drywall") && s.includes("accessor")) return "Drywall Accessories";
  if (s.includes("drywall")) return "Drywall";
  return scope;
}

const MEASURE_TAB = "Measurements";

function savedAs<T>(savedMeasurements: MeasurementRecord[], tradeType: string): T | undefined {
  const found = savedMeasurements.find((m) => m.tradeType === tradeType);
  return found?.data as T | undefined;
}

export default function MeasurementsClient({ estimateId, scopes, savedMeasurements, deckProducts, laborAssemblies = [] }: Props) {
  const router = useRouter();

  const [activeScopes, setActiveScopes] = useState<string[]>(scopes);
  const [showScopeModal, setShowScopeModal] = useState(false);
  const normalizedTabs = [...new Set(activeScopes.map(normalizeTrade))];
  const jobSections = sectionsForTabs(normalizedTabs);
  const showJobTab = jobSections.size > 0;
  const linkedTabs = normalizedTabs.filter((t) => LINKED_TABS.has(t));
  const [activeTab, setActiveTab] = useState<string>(() =>
    sectionsForTabs(normalizedTabs).size > 0 ? MEASURE_TAB : normalizedTabs[0] ?? ""
  );
  const [job, setJob] = useState<JobMeasurements>(() => jobFromSaved(savedMeasurements));
  const [jobSaved, setJobSaved] = useState(true);

  // Form state per trade
  const [roofingData, setRoofingData] = useState<RoofingData>(
    () => savedAs<RoofingData>(savedMeasurements, "Roofing") ?? {} as RoofingData
  );
  const [sidingData, setSidingData] = useState<SidingData>(
    () => savedAs<SidingData>(savedMeasurements, "Siding") ?? {} as SidingData
  );
  const [interiorTrimData, setInteriorTrimData] = useState<InteriorTrimData>(
    () =>
      savedAs<InteriorTrimData>(savedMeasurements, "Interior Trim") ??
      savedAs<InteriorTrimData>(savedMeasurements, "Interior") ??
      ({} as InteriorTrimData)
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
  const [laborData, setLaborData] = useState<GeneralLaborData>(() => {
    const saved = savedAs<GeneralLaborData>(savedMeasurements, "General Labor");
    if (saved) return saved;
    // Pre-populate task rows for any selected Mitigation scopes
    const mitigationScopes = ["Floor Protection", "Room Protection", "Contents Movement", "Mitigation"];
    // Floor Protection, Room Protection, and Mitigation are measured by room size (sqft);
    // Contents Movement is measured in hours.
    const SQFT_TASKS = new Set(["Floor Protection", "Room Protection", "Mitigation"]);
    const tasks = scopes
      .filter((s) => mitigationScopes.includes(s))
      .map((label) => ({
        id: uid(),
        label,
        hours: 0,
        sqft: 0,
        inputType: SQFT_TASKS.has(label) ? ("sqft" as const) : ("hours" as const),
        rooms: SQFT_TASKS.has(label)
          ? [{ id: uid(), label: "", width: 0, length: 0, height: 0 }]
          : undefined,
      }));
    return tasks.length > 0 ? { tasks } : ({} as GeneralLaborData);
  });
  const [kitchenData, setKitchenData] = useState<KitchenData>(
    () => savedAs<KitchenData>(savedMeasurements, "Kitchen") ?? {} as KitchenData
  );
  const [deckData, setDeckData] = useState<DeckData>(
    () => savedAs<DeckData>(savedMeasurements, "Decking") ?? savedAs<DeckData>(savedMeasurements, "Deck") ?? {} as DeckData
  );
  const [deckAccData, setDeckAccData] = useState<DeckingAccessoriesData>(
    () => savedAs<DeckingAccessoriesData>(savedMeasurements, "Decking Accessories") ?? {} as DeckingAccessoriesData
  );
  const [deckFramingData, setDeckFramingData] = useState<DeckFramingData>(
    () => savedAs<DeckFramingData>(savedMeasurements, "Deck Framing") ?? {} as DeckFramingData
  );
  const [deckFramingAccData, setDeckFramingAccData] = useState<DeckFramingAccessoriesData>(
    () => savedAs<DeckFramingAccessoriesData>(savedMeasurements, "Deck Framing Accessories") ?? {} as DeckFramingAccessoriesData
  );
  const [gutterData, setGutterData] = useState<GutterData>(
    () => savedAs<GutterData>(savedMeasurements, "Gutters") ?? {} as GutterData
  );
  const [interiorDoorsData, setInteriorDoorsData] = useState<InteriorDoorsData>(
    () => savedAs<InteriorDoorsData>(savedMeasurements, "Interior Doors") ?? { doorCore: "hc" }
  );
  const [wallData, setWallData] = useState<WallAssemblyData>(() => {
    const saved = savedAs<WallAssemblyData>(savedMeasurements, "Wall Assembly");
    // Ensure arrays are always initialized so sync checks work even without visiting the tab
    return {
      walls:            saved?.walls            ?? [],
      closets:          saved?.closets          ?? [],
      doors:            saved?.doors            ?? [],
      windows:          saved?.windows          ?? [],
      ceilingSections:  saved?.ceilingSections  ?? [],
      studSize:         saved?.studSize         ?? "2x4",
      studSpacing:      saved?.studSpacing      ?? 16,
      corners:          saved?.corners          ?? 0,
      redHeadAnchors:   saved?.redHeadAnchors   ?? false,
      studShoes:        saved?.studShoes        ?? false,
      pipeGuards:       saved?.pipeGuards       ?? false,
      pipeGuardsQty:    saved?.pipeGuardsQty    ?? 0,
    };
  });
  const [windowsDoorData, setWindowsDoorData] = useState<WindowsDoorData>(
    () => savedAs<WindowsDoorData>(savedMeasurements, "Windows/Doors") ?? {} as WindowsDoorData
  );
  const [flooringData, setFlooringData] = useState<FlooringData>(
    () => savedAs<FlooringData>(savedMeasurements, "Flooring") ?? {} as FlooringData
  );
  const [tileData, setTileData] = useState<TileData>(
    () => savedAs<TileData>(savedMeasurements, "Tile") ?? {} as TileData
  );
  const [bathroomData, setBathroomData] = useState<BathroomData>(
    () => savedAs<BathroomData>(savedMeasurements, "Bathroom") ?? {} as BathroomData
  );
  const [insulationData, setInsulationData] = useState<InsulationData>(
    () => savedAs<InsulationData>(savedMeasurements, "Insulation") ?? {} as InsulationData
  );
  const [insulAccData, setInsulAccData] = useState<InsulationAccessoriesData>(
    () => savedAs<InsulationAccessoriesData>(savedMeasurements, "Insulation Accessories") ?? {} as InsulationAccessoriesData
  );
  const [drywallData, setDrywallData] = useState<DrywallData>(
    () => stripRoomEntries(savedAs<DrywallData>(savedMeasurements, "Drywall") ?? {} as DrywallData)
  );
  const [drywallAccData, setDrywallAccData] = useState<DrywallAccessoriesData>(
    () => savedAs<DrywallAccessoriesData>(savedMeasurements, "Drywall Accessories") ?? {} as DrywallAccessoriesData
  );
  const [exteriorTrimData, setExteriorTrimData] = useState<ExteriorTrimData>(
    () => savedAs<ExteriorTrimData>(savedMeasurements, "Exterior Trim") ?? {} as ExteriorTrimData
  );

  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Remount keys — incremented on sync so child components re-initialize from new initialData
  const [insulationKey,    setInsulationKey]    = useState(0);
  const [insulAccKey,      setInsulAccKey]      = useState(0);
  const [deckAccKey,        setDeckAccKey]        = useState(0);
  const [deckFramingKey,    setDeckFramingKey]    = useState(0);
  const [deckFramingAccKey, setDeckFramingAccKey] = useState(0);

  // Wall Assembly's own walls and ceilings feed the finish scopes when it's on the job
  const framing = normalizedTabs.includes("Wall Assembly")
    ? { walls: wallData.walls, ceilingSections: wallData.ceilingSections }
    : undefined;

  // Linked scopes always take their measurements from the Measurements tab
  function getDataForTrade(tradeType: string): Record<string, unknown> {
    const scopeData = getScopeData(tradeType);
    const linked = LINKED_TABS.has(tradeType) ? deriveForTab(tradeType, job, scopeData, framing) : null;
    return linked ? { ...scopeData, ...linked } : scopeData;
  }

  async function saveJob() {
    const res = await fetch(`/api/estimates/${estimateId}/measurements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeType: JOB_TRADE_TYPE, data: job, applyAssembly: false }),
    });
    if (res.ok) setJobSaved(true);
  }

  function updateJob(next: JobMeasurements) {
    setJob(next);
    setJobSaved(false);
  }

  function getScopeData(tradeType: string): Record<string, unknown> {
    switch (tradeType) {
      case "Roofing": return roofingData as unknown as Record<string, unknown>;
      case "Siding": return sidingData as unknown as Record<string, unknown>;
      case "Interior Trim": return interiorTrimData as unknown as Record<string, unknown>;
      case "Plumbing/Electrical": return peData as unknown as Record<string, unknown>;
      case "Painting": return paintingData as unknown as Record<string, unknown>;
      case "Demo": return demoData as unknown as Record<string, unknown>;
      case "General Labor": return laborData as unknown as Record<string, unknown>;
      case "Kitchen": return kitchenData as unknown as Record<string, unknown>;
      case "Decking": return deckData as unknown as Record<string, unknown>;
      case "Decking Accessories": {
        const selProductIds = deckData.deckProductIds ?? [];
        // Detect if any selected deck board is a TimberTech product (has "collection" subCategory)
        const isTimberTechDeck = selProductIds.some((pid) => {
          const p = deckProducts.find((dp) => dp.id === pid);
          return p?.subCategory?.toLowerCase().includes("collection");
        });
        // Inject the selected deck product IDs so fascia can be material-matched
        return {
          ...deckAccData as unknown as Record<string, unknown>,
          isTimberTechDeck,
          deckProductIds: selProductIds,
          autoDeckScrewsLbs: deckAutoScrewLbs,
          // Board fasteners (Cortex for SQ, ConceaLoc for GV) are sized from the deck area
          deckSqft: deckTotalSqft,
        };
      }
      case "Deck Framing": return deckFramingData as unknown as Record<string, unknown>;
      case "Deck Framing Accessories": return {
        ...deckFramingAccData as unknown as Record<string, unknown>,
        // Suggestions from Deck Framing — used wherever a quantity is left at 0
        autoJoistHangers: framingAutoJoistHangers,
        autoPostAnchors: framingAutoPostAnchors,
        autoBeamBrackets: framingAutoBeamBrackets,
        autoLagScrews: framingAutoLagScrews,
        autoCarriageBolts: framingAutoCarriageBolts,
        joistSize: deckFramingData.joistSize,
        beamSize: deckFramingData.beamSize,   // posts follow the beam's allowed span
      };
      case "Gutters": return gutterData as unknown as Record<string, unknown>;
      // Door Assembly shares the Interior Doors choices
      case "Interior Doors":
      case "Interior Door Assembly": return interiorDoorsData as unknown as Record<string, unknown>;
      case "Wall Assembly": return wallData as unknown as Record<string, unknown>;
      case "Windows/Doors": return windowsDoorData as unknown as Record<string, unknown>;
      case "Flooring": return flooringData as unknown as Record<string, unknown>;
      case "Tile": return tileData as unknown as Record<string, unknown>;
      case "Bathroom": return bathroomData as unknown as Record<string, unknown>;
      case "Insulation": return insulationData as unknown as Record<string, unknown>;
      case "Insulation Accessories": return insulAccData as unknown as Record<string, unknown>;
      case "Drywall": return drywallData as unknown as Record<string, unknown>;
      case "Drywall Accessories": return drywallAccData as unknown as Record<string, unknown>;
      case "Exterior Trim": return exteriorTrimData as unknown as Record<string, unknown>;
      // Accessories tabs share measurements with their parent trim tab
      case "Interior Trim Accessories": return interiorTrimData as unknown as Record<string, unknown>;
      case "Exterior Trim Accessories": return exteriorTrimData as unknown as Record<string, unknown>;
      default: return {};
    }
  }

  async function applyAssembly(tradeType: string) {
    setApplying(tradeType);
    setErrors((prev) => ({ ...prev, [tradeType]: "" }));
    const data = getDataForTrade(tradeType);

    try {
      if (LINKED_TABS.has(tradeType) && !jobSaved) await saveJob();
      const res = await fetch(`/api/estimates/${estimateId}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeType, data, applyAssembly: true }),
      });

      if (!res.ok) {
        let msg = `Failed to apply assembly (${res.status})`;
        try {
          const text = await res.text();
          if (text) {
            const json = JSON.parse(text);
            if (json?.error) msg = json.error;
          }
        } catch { /* body wasn't JSON */ }
        throw new Error(msg);
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

  // Sync pairs — apply both trades at once using shared measurement data
  const SYNC_PAIRS: Record<string, string[]> = {
    "Exterior Trim":             ["Exterior Trim", "Exterior Trim Accessories"],
    "Exterior Trim Accessories": ["Exterior Trim", "Exterior Trim Accessories"],
  };

  async function syncPair(tradeType: string) {
    const pair = SYNC_PAIRS[tradeType];
    if (!pair) return;
    for (const trade of pair) {
      await applyAssembly(trade);
    }
  }

  // Wall Assembly downstream tabs that should be re-synced and re-applied
  const WALL_DOWNSTREAM = [
    "Insulation", "Insulation Accessories",
  ];

  const [pendingApply, setPendingApply] = useState<string[] | null>(null);

  // Runs after the re-render so applyAssembly reads the freshly synced tab data
  useEffect(() => {
    if (!pendingApply) return;
    const tabs = pendingApply;
    setPendingApply(null);
    (async () => {
      for (const tab of tabs) await applyAssembly(tab);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingApply]);

  async function syncWallAssembly() {
    await applyAssembly("Wall Assembly");
    const activeTabs = new Set(activeScopes.map(normalizeTrade));
    const tabs = WALL_DOWNSTREAM.filter((t) => activeTabs.has(t));
    tabs.forEach(syncWallsToTab);
    setPendingApply(tabs);
  }

  async function saveMeasurement(tradeType: string) {
    if (tradeType === MEASURE_TAB) return saveJob();
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

  // ── Deck area sync ───────────────────────────────────────────────────────

  // Deck tabs take sections, stairs, railing and framing sizes from the Measurements tab
  const deckView = { ...deckData, ...(deriveForTab("Decking", job) ?? {}) } as DeckData;
  const framingView = { ...deckFramingData, ...(deriveForTab("Deck Framing", job, deckFramingData as unknown as Record<string, unknown>) ?? {}) } as DeckFramingData;

  const deckTotalSqft = Math.round(
    (deckView.sections ?? []).reduce((sum, s) => {
      const l = (s.lengthFt ?? 0) + (s.lengthIn ?? 0) / 12;
      const w = (s.widthFt  ?? 0) + (s.widthIn  ?? 0) / 12;
      return sum + l * w;
    }, 0)
  );

  // Deck screws: wood decks are face-screwed, ~5 lb per 100 sqft. TimberTech uses hidden fasteners.
  const deckIsTimberTech = (deckData.deckProductIds ?? []).some((pid) =>
    deckProducts.find((dp) => dp.id === pid)?.subCategory?.toLowerCase().includes("collection"));
  const deckAutoScrewLbs = deckTotalSqft > 0 && !deckIsTimberTech ? Math.ceil((deckTotalSqft / 100) * 5) : 0;

  // Board fasteners per package, in the same cheapest-first order the build uses
  const PKG_LABELS = ["Good", "Better", "Best", "Good+", "Better+", "Best+"];
  const boardFastenerSuggestions = (deckView.deckProductIds ?? [])
    .map((pid) => deckProducts.find((dp) => dp.id === pid))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .sort((a, b) => a.cost - b.cost)
    .map((p, idx) => ({ pkg: PKG_LABELS[idx] ?? `Option ${idx + 1}`, board: p.name, plan: boardFastenerPlan(p.name, deckTotalSqft) }))
    .filter((x) => x.plan)
    .map((x) => ({ pkg: x.pkg, board: x.board, text: describePlan(x.plan) }));

  // First deck section dims — used to seed Deck Framing (ledger = width, joist span = length)
  const firstDeckSection = (deckData.sections ?? [])[0];
  const deckSyncLedgerFt   = firstDeckSection?.widthFt  ?? 0;
  const deckSyncLedgerIn   = firstDeckSection?.widthIn  ?? 0;
  const deckSyncJoistSpanFt = firstDeckSection?.lengthFt ?? 0;
  const deckSyncJoistSpanIn = firstDeckSection?.lengthIn ?? 0;

  // ── Deck Framing → Framing Accessories auto values ───────────────────────

  const framingLedgerLf      = (framingView.ledgerFt ?? 0) + (framingView.ledgerIn ?? 0) / 12;
  const framingJoistSpacingIn = framingView.joistSpacingIn ?? 16;
  // When joistCount = 0 (auto), calculate from ledger length ÷ spacing
  const framingAutoJoistCount = framingLedgerLf > 0 && framingJoistSpacingIn > 0
    ? Math.ceil(framingLedgerLf / (framingJoistSpacingIn / 12)) + 1
    : 0;
  const framingEffectiveJoistCount = (framingView.joistCount ?? 0) > 0
    ? (framingView.joistCount ?? 0)
    : framingAutoJoistCount;

  const framingAutoJoistHangers = framingEffectiveJoistCount * 2;
  const framingAutoPostAnchors  = framingView.postCount  ?? 0;
  const framingBeamLf           = (framingView.beamFt ?? 0) + (framingView.beamIn ?? 0) / 12;
  const framingAutoBeamBrackets = framingBeamLf > 0 ? Math.ceil(framingBeamLf / 3) : 0;
  // LedgerLOKs: 2 every 16" along the ledger · carriage bolts: 2 per post (post-to-beam)
  const framingAutoLagScrews     = framingLedgerLf > 0 ? Math.ceil(framingLedgerLf / (16 / 12)) * 2 : 0;
  const framingAutoCarriageBolts = (framingView.postCount ?? 0) * 2;

  // ── Wall-section sync ────────────────────────────────────────────────────

  // Valid wall sections from Wall Assembly (non-zero length)
  const sourceWalls = (wallData.walls ?? []).filter((w) => (w.length ?? 0) > 0);

  // Valid ceiling sections from Wall Assembly (non-zero area) — synced to all downstream tabs
  const sourceCeilings = (wallData.ceilingSections ?? []).filter(
    (c) => (c.length ?? 0) > 0 && (c.width ?? 0) > 0
  );

  // Which tabs show the sync banner and what they'll receive
  type SyncInfo = { label: string };
  function getSyncInfo(tab: string): SyncInfo | null {
    // Deck tabs are fed from the Measurements tab now — nothing to sync by hand
    if (DECK_TABS.includes(tab)) return null;
    if (tab === "Decking Accessories") {
      if (deckTotalSqft === 0) return null;
      return { label: `${deckTotalSqft} sqft from Decking` };
    }
    if (tab === "Deck Framing") {
      if (deckSyncLedgerFt === 0 && deckSyncJoistSpanFt === 0) return null;
      const parts: string[] = [];
      if (deckSyncLedgerFt > 0) {
        const ledgerLabel = deckSyncLedgerIn > 0
          ? `${deckSyncLedgerFt}'${deckSyncLedgerIn}"`
          : `${deckSyncLedgerFt}'`;
        parts.push(`ledger ${ledgerLabel}`);
      }
      if (deckSyncJoistSpanFt > 0) {
        const spanLabel = deckSyncJoistSpanIn > 0
          ? `${deckSyncJoistSpanFt}'${deckSyncJoistSpanIn}"`
          : `${deckSyncJoistSpanFt}'`;
        parts.push(`joist span ${spanLabel}`);
      }
      return { label: parts.join(", ") + " from Decking" };
    }
    if (tab === "Deck Framing Accessories") {
      const parts: string[] = [];
      if (framingAutoJoistHangers > 0) parts.push(`${framingAutoJoistHangers} joist hangers`);
      if (framingAutoPostAnchors  > 0) parts.push(`${framingAutoPostAnchors} post anchors`);
      if (framingAutoBeamBrackets > 0) parts.push(`${framingAutoBeamBrackets} beam brackets`);
      if (parts.length === 0) return null;
      return { label: parts.join(", ") + " from Deck Framing" };
    }
    if (tab === "Insulation") {
      if (sourceWalls.length === 0 && sourceCeilings.length === 0) return null;
      const parts: string[] = [];
      if (sourceWalls.length > 0) parts.push(`${sourceWalls.length} wall${sourceWalls.length !== 1 ? "s" : ""}`);
      if (sourceCeilings.length > 0) parts.push(`${sourceCeilings.length} ceiling${sourceCeilings.length !== 1 ? "s" : ""}`);
      return { label: parts.join(" + ") + " from Wall Assembly" };
    }
    if (tab === "Insulation Accessories") {
      if (sourceCeilings.length === 0) return null;
      return { label: `${sourceCeilings.length} ceiling section${sourceCeilings.length !== 1 ? "s" : ""} from Wall Assembly` };
    }
    return null;
  }

  function uid() { return String(Date.now() + Math.random()); }

  async function removeScope(tab: string) {
    // Remove all raw scopes that normalize to this tab
    const newScopes = activeScopes.filter((s) => normalizeTrade(s) !== tab);
    const prevScopes = activeScopes;
    const prevTab = activeTab;

    // Optimistic update — switch away before the tab disappears
    setActiveScopes(newScopes);
    const remainingTabs = [...new Set(newScopes.map(normalizeTrade))];
    if (activeTab === tab) {
      setActiveTab(remainingTabs[0] ?? "");
    }

    try {
      const res = await fetch(`/api/estimates/${estimateId}/measurements?tab=${encodeURIComponent(tab)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove scope");
    } catch {
      setActiveScopes(prevScopes);
      setActiveTab(prevTab);
    }
  }

  async function addScope(scopeName: string) {
    const newScopesList = [...activeScopes, scopeName];
    const newTabName = normalizeTrade(scopeName);

    // Optimistic UI update
    setActiveScopes(newScopesList);
    setShowScopeModal(false);

    // If adding a General Labor (mitigation) scope, also add the task row
    if (MITIGATION_SCOPES.has(scopeName)) {
      setLaborData((prev) => {
        const prevTasks = prev.tasks ?? [];
        if (prevTasks.some((t) => t.label === scopeName)) return prev; // already exists
        const isSqftTask = SQFT_MITIGATION_SCOPES.has(scopeName);
        const newTask = {
          id: uid(),
          label: scopeName,
          hours: 0,
          sqft: 0,
          inputType: isSqftTask ? ("sqft" as const) : ("hours" as const),
          rooms: isSqftTask
            ? [{ id: uid(), label: "", width: 0, length: 0, height: 0 }]
            : undefined,
        };
        return { ...prev, tasks: [...prevTasks, newTask] };
      });
    }

    setActiveTab(newTabName);

    // Persist to server
    try {
      const res = await fetch(`/api/estimates/${estimateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopes: newScopesList }),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch {
      // Rollback on error
      setActiveScopes(activeScopes);
      setActiveTab(activeTab);
    }
  }

  function syncWallsToTab(tab: string) {
    const wallSections = sourceWalls.map((w) => ({
      id: uid(), label: w.label ?? "", length: w.length, height: w.height,
    }));

    if (tab === "Decking Accessories") {
      setDeckAccData((prev) => ({ ...prev, conceLocSqft: deckTotalSqft }));
      setDeckAccKey((k) => k + 1);

    } else if (tab === "Deck Framing") {
      // Seed ledger from deck width, joist span from deck length (first section)
      setDeckFramingData((prev) => ({
        ...prev,
        ...(deckSyncLedgerFt   > 0 ? { ledgerFt:    deckSyncLedgerFt,    ledgerIn:    deckSyncLedgerIn    } : {}),
        ...(deckSyncJoistSpanFt > 0 ? { joistSpanFt: deckSyncJoistSpanFt, joistSpanIn: deckSyncJoistSpanIn } : {}),
        ...(deckSyncLedgerFt   > 0 ? { beamFt: deckSyncLedgerFt, beamIn: deckSyncLedgerIn } : {}),
      }));
      setDeckFramingKey((k) => k + 1);

    } else if (tab === "Deck Framing Accessories") {
      setDeckFramingAccData((prev) => ({
        ...prev,
        joistHangers: framingAutoJoistHangers,
        postAnchors:  framingAutoPostAnchors,
        beamBrackets: framingAutoBeamBrackets,
      }));
      setDeckFramingAccKey((k) => k + 1);

    } else if (tab === "Insulation") {
      setInsulationData((prev) => ({
        ...prev,
        wallSections,
        studSize: (wallData.studSize ?? prev.studSize ?? "2x4") as "2x4" | "2x6",
      }));
      setInsulationKey((k) => k + 1);

    } else if (tab === "Insulation Accessories") {
      const ceilSections = sourceCeilings.map((c) => ({
        id: uid(), label: c.label ?? "", length: c.length, width: c.width,
      }));
      setInsulAccData((prev) => ({ ...prev, ceilingSections: ceilSections }));
      setInsulAccKey((k) => k + 1);

    }
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
        {showJobTab && (
          <button
            onClick={() => setActiveTab(MEASURE_TAB)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors mr-2 ${
              activeTab === MEASURE_TAB
                ? "bg-amber-500 text-slate-900"
                : "text-amber-400 hover:text-amber-300 border border-amber-600/60 hover:bg-amber-500/10"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" />
            </svg>
            {MEASURE_TAB}
            {!jobSaved && <span className="w-2 h-2 rounded-full bg-orange-300 flex-shrink-0" title="Unsaved changes" />}
          </button>
        )}
        {normalizedTabs.map((tab) => (
          <div key={tab} className="group relative inline-flex">
            <button
              onClick={() => setActiveTab(tab)}
              className={`inline-flex items-center gap-2 pl-4 pr-8 py-2 rounded-lg text-sm font-medium transition-colors ${
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
            <button
              onClick={(e) => { e.stopPropagation(); removeScope(tab); }}
              title={`Remove ${tab} scope`}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-red-400 hover:bg-red-400/10"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* Add Scope button */}
        <button
          onClick={() => setShowScopeModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white border border-dashed border-slate-600 hover:border-slate-400 transition-colors ml-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Scope
        </button>
      </div>

      {/* Add Scope modal */}
      {showScopeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.65)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowScopeModal(false); }}
        >
          <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-white">Add Scope</h2>
                <p className="text-xs text-slate-400 mt-0.5">Select a scope to add to this estimate</p>
              </div>
              <button
                onClick={() => setShowScopeModal(false)}
                className="text-slate-500 hover:text-white transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable category list */}
            <div className="overflow-y-auto flex-1">
              {SCOPE_CATEGORIES.map((cat) => (
                <div key={cat.label}>
                  {/* Category header */}
                  <div className={`px-5 py-2 border-b border-slate-700/50 border-l-4 ${cat.accent} ${cat.headerBg}`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${cat.headerText}`}>
                      {cat.label}
                    </span>
                  </div>

                  {/* Scope buttons */}
                  <div className="px-4 py-3 grid grid-cols-2 gap-2">
                    {cat.scopes.flatMap((scope) => {
                      const entries: string[] = [scope.name];
                      if (scope.accessory) entries.push(scope.accessory);
                      return entries.map((name) => {
                        const alreadyAdded = activeScopes.includes(name);
                        return (
                          <button
                            key={name}
                            disabled={alreadyAdded}
                            onClick={() => addScope(name)}
                            className={`text-left px-3 py-2 rounded-lg text-sm border transition-colors flex items-center justify-between gap-2 ${
                              alreadyAdded
                                ? "border-slate-700 text-slate-600 bg-slate-800/50 cursor-default"
                                : "border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500 hover:text-white"
                            }`}
                          >
                            <span className="truncate">{name}</span>
                            {alreadyAdded && (
                              <svg className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        );
                      });
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Linked scope: show the measurements this scope will use */}
      {LINKED_TABS.has(activeTab) && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-amber-700/50 bg-amber-950/20 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-1">From Measurements</p>
            <p className="text-sm text-slate-300">
              {summaryForTab(activeTab, job, framing, deckFramingData.beamSize).join(" · ") || "Nothing entered yet"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab(MEASURE_TAB)}
            className="flex-shrink-0 text-xs font-semibold text-amber-300 hover:text-white border border-amber-600/60 hover:border-amber-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            Edit measurements
          </button>
        </div>
      )}

      {/* Measurement sync banner */}
      {(() => {
        const info = getSyncInfo(activeTab);
        if (!info) return null;
        return (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-blue-800/50 bg-blue-950/30 px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-blue-300">
                <span className="font-semibold">{info.label}</span>
                {" "}available — sync to this tab?
              </p>
            </div>
            <button
              type="button"
              onClick={() => syncWallsToTab(activeTab)}
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync
            </button>
          </div>
        );
      })()}

      {/* Form content */}
      <div>
        {activeTab === MEASURE_TAB && (
          <JobMeasurementsForm value={job} onChange={updateJob} sections={jobSections} showFloor={normalizedTabs.includes("Flooring")} />
        )}
        {activeTab === "Roofing" && (
          <RoofingMeasurements initialData={roofingData} onChange={setRoofingData} linked />
        )}
        {activeTab === "Siding" && (
          <SidingMeasurements initialData={sidingData} onChange={setSidingData} part="options" />
        )}
        {activeTab === "Interior Trim" && (
          <InteriorTrimMeasurements
            initialData={interiorTrimData}
            onChange={setInteriorTrimData}
            linkedValues={deriveForTab("Interior Trim", job, {}, framing) as Partial<InteriorTrimData>}
          />
        )}
        {activeTab === "Plumbing/Electrical" && (
          <PlumbingElectricalMeasurements initialData={peData} onChange={setPeData} />
        )}
        {activeTab === "Painting" && (
          <PaintingMeasurements
            initialData={paintingData}
            onChange={setPaintingData}
            roomSqft={interiorPaintSqft(job, framing)}
            linkedValues={deriveForTab("Painting", job, {}, framing) as Partial<PaintingData>}
          />
        )}
        {activeTab === "Demo" && (
          <DemoMeasurements initialData={demoData} onChange={setDemoData} />
        )}
        {activeTab === "General Labor" && (
          <GeneralLaborMeasurements initialData={laborData} onChange={setLaborData} assemblies={laborAssemblies} />
        )}
        {activeTab === "Kitchen" && (
          <KitchenMeasurements initialData={kitchenData} onChange={setKitchenData} />
        )}
        {activeTab === "Decking" && (
          <DeckMeasurements initialData={deckData} onChange={setDeckData} products={deckProducts} linkedValues={deriveForTab("Decking", job) as Partial<DeckData>} />
        )}
        {activeTab === "Decking Accessories" && (
          <DeckingAccessoriesMeasurements key={deckAccKey} initialData={deckAccData} onChange={setDeckAccData} deckSections={deckView.sections} autoDeckScrewsLbs={deckAutoScrewLbs} boardFastenerSuggestions={boardFastenerSuggestions} linkedValues={deriveForTab("Decking Accessories", job) as Partial<DeckingAccessoriesData>} />
        )}
        {activeTab === "Deck Framing" && (
          <DeckFramingMeasurements key={deckFramingKey} initialData={deckFramingData} onChange={setDeckFramingData} linkedValues={deriveForTab("Deck Framing", job, deckFramingData as unknown as Record<string, unknown>) as Partial<DeckFramingData>} />
        )}
        {activeTab === "Deck Framing Accessories" && (
          <DeckFramingAccessoriesMeasurements
            key={deckFramingAccKey}
            initialData={deckFramingAccData}
            onChange={setDeckFramingAccData}
            autoJoistHangers={framingAutoJoistHangers}
            autoPostAnchors={framingAutoPostAnchors}
            autoBeamBrackets={framingAutoBeamBrackets}
            autoLagScrews={framingAutoLagScrews}
            autoCarriageBolts={framingAutoCarriageBolts}
          />
        )}
        {activeTab === "Interior Doors" && (
          <InteriorDoorsMeasurements initialData={interiorDoorsData} onChange={setInteriorDoorsData} />
        )}
        {activeTab === "Gutters" && (
          <GutterMeasurements initialData={gutterData} onChange={setGutterData} linked />
        )}
        {activeTab === "Wall Assembly" && (
          <WallAssemblyMeasurements
            initialData={{ ...wallData, doors: job.doors, windows: job.windows, corners: job.interiorCorners }}
            onChange={setWallData}
            linked
          />
        )}
        {activeTab === "Flooring" && (
          <FlooringMeasurements
            initialData={flooringData}
            onChange={setFlooringData}
            linkedRooms={deriveForTab("Flooring", job)?.rooms as FloorRoom[]}
          />
        )}
        {activeTab === "Tile" && (
          <TileMeasurements initialData={tileData} onChange={setTileData} />
        )}
        {activeTab === "Bathroom" && (
          <BathroomMeasurements initialData={bathroomData} onChange={setBathroomData} />
        )}
        {activeTab === "Windows/Doors" && (
          <WindowsDoorsMeasurements initialData={windowsDoorData} onChange={setWindowsDoorData} />
        )}
        {activeTab === "Insulation" && (
          <InsulationMeasurements key={insulationKey} initialData={insulationData} onChange={setInsulationData} />
        )}
        {activeTab === "Insulation Accessories" && (
          <InsulationAccessoriesMeasurements key={insulAccKey} initialData={insulAccData} onChange={setInsulAccData} />
        )}
        {activeTab === "Drywall" && (
          <DrywallMeasurements initialData={drywallData} onChange={setDrywallData} />
        )}
        {activeTab === "Drywall Accessories" && (
          <DrywallAccessoriesMeasurements
            initialData={drywallAccData}
            onChange={setDrywallAccData}
            linkedValues={deriveForTab("Drywall Accessories", job, {}, framing) as Partial<DrywallAccessoriesData>}
          />
        )}
        {activeTab === "Exterior Trim" && (
          <ExteriorTrimMeasurements
            initialData={exteriorTrimData}
            onChange={setExteriorTrimData}
            linkedValues={deriveForTab("Exterior Trim", job) as Partial<ExteriorTrimData>}
          />
        )}
        {activeTab === "Interior Trim Accessories" && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Interior Trim Accessories</h3>
            <p className="text-sm text-slate-300">
              Accessories (finish nails, caulk, installation labor) are automatically calculated from
              the measurements entered in the <span className="text-blue-400 font-medium">Interior Trim</span> tab.
            </p>
            <p className="text-xs text-slate-500">
              Enter your door and window casing in Interior Trim, then click <span className="font-medium text-slate-400">Calculate &amp; Apply</span> here
              to populate this section.
            </p>
          </div>
        )}
        {activeTab === "Exterior Trim Accessories" && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Exterior Trim Accessories</h3>
            <p className="text-sm text-slate-300">
              Accessories (caulk, primer, paint, nails, installation labor) are automatically calculated from
              the measurements entered in the <span className="text-blue-400 font-medium">Exterior Trim</span> tab.
            </p>
            <p className="text-xs text-slate-500">
              Enter your trim linear feet in Exterior Trim, then click <span className="font-medium text-slate-400">Calculate &amp; Apply</span> here
              to populate this section.
            </p>
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
          {SYNC_PAIRS[activeTab] && (
            <button
              onClick={() => syncPair(activeTab)}
              disabled={!!applying}
              className="inline-flex items-center gap-2 bg-violet-700 hover:bg-violet-600 disabled:bg-violet-900 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync Both
            </button>
          )}
          {activeTab === "Wall Assembly" && (
            <button
              onClick={syncWallAssembly}
              disabled={!!applying}
              className="inline-flex items-center gap-2 bg-violet-700 hover:bg-violet-600 disabled:bg-violet-900 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync All
            </button>
          )}
          {activeTab === MEASURE_TAB ? (
            <button
              onClick={async () => { await saveJob(); setActiveTab(linkedTabs[0] ?? normalizedTabs[0]); }}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              Next: {linkedTabs[0] ?? normalizedTabs[0]}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
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
                {LINKED_TABS.has(activeTab) ? "Confirm & Apply" : "Calculate & Apply"}
              </>
            )}
          </button>
          )}
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
