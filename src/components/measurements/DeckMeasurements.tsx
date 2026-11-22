"use client";

import { useState } from "react";
import CarpentryHours from "./CarpentryHours";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeckSection {
  id: string;
  label: string;
  lengthFt: number;
  lengthIn: number;
  widthFt: number;
  widthIn: number;
}

export interface DeckRailRun {
  id: string;
  label: string;
  lengthFt: number;
  lengthIn: number;
  type: "section" | "ledger" | "gate";  // section = railing needed; ledger = no rail; gate = railing + gate hardware
}

export interface DeckData {
  sections: DeckSection[];
  wasteFactor: number;
  deckMaterials: string[]; // legacy — kept for backward compat; unused for new estimates
  deckProductIds: string[]; // selected catalog product IDs — each becomes its own line item
  // Board layout
  boardDirection: "along_length" | "along_width"; // which dimension the boards run along
  boardWidthIn: number;   // actual board face width in inches (5.5 for 5/4×6, 5.25 for composite, etc.)
  borderStyle: "none" | "single" | "double" | "double_no_breaker"; // none = no border; single = 1 picture-frame board; double = outer + breaker board; double_no_breaker = 2 rows no breaker
  // Labor — hourly carpentry rates
  leadCarpenterHours: number;  // Lead Carpenter hours @ $57.50/hr
  carpenterHours: number;      // Carpenter hours @ $25.00/hr
  // Deck railing (straight / level runs)
  railingType: "wood" | "harmony" | "advantage";
  railingColor: "white" | "black" | "espresso" | "";
  deckRailRuns: DeckRailRun[];
  railingPostSpacing: number;     // ft between posts (default 6)
  railingPosts: number;           // 0 = auto
  postCaps: number;               // 0 = auto from effective post count
  railingBalusterSpacing: number; // inches o.c. (default 4)
  // Auto-build railing settings
  stairGapFt: number;   // width of stair opening cut out of front rail
  stairGapIn: number;
  // Stair railing (along the rake)
  stairRailRuns: DeckRailRun[];
  // Stairs
  stairs: number;
  stairRisers: number;
  stairWidthFt: number;
  stairWidthIn: number;
  stairStringers: number;
  stairStringerLengthFt: number; // diagonal cut length of each stringer
  stairStringerLengthIn: number;
  // Pool deck
  poolDeckEnabled: boolean;
  poolShape: "round" | "oval" | "rectangular";
  poolCoverage: "full" | "horseshoe" | "two_legs";
  // Full surround — pool dimensions
  poolDiameterFt: number;
  poolDiameterIn: number;
  poolLengthFt: number;
  poolLengthIn: number;
  poolWidthFt: number;
  poolWidthIn: number;
  deckAroundWidthFt: number;
  deckAroundWidthIn: number;
  // Horseshoe / two-legs section inputs
  poolLeftLegLengthFt: number;
  poolLeftLegLengthIn: number;
  poolLeftLegWidthFt: number;
  poolLeftLegWidthIn: number;
  poolHeaderLengthFt: number;
  poolHeaderLengthIn: number;
  poolHeaderWidthFt: number;
  poolHeaderWidthIn: number;
  poolRightLegLengthFt: number;
  poolRightLegLengthIn: number;
  poolRightLegWidthFt: number;
  poolRightLegWidthIn: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";

function uid() { return String(Date.now() + Math.random()); }

// ---------------------------------------------------------------------------
// Material options (legacy fallback when no catalog products are provided)
// ---------------------------------------------------------------------------

const MATERIAL_GROUPS: { label: string; accent: string; options: string[] }[] = [
  {
    label: "Wood",
    accent: "amber",
    options: ["CedarTone", "Pressure Treated"],
  },
  {
    label: "TimberTech",
    accent: "blue",
    options: [
      "TimberTech Vintage",
      "TimberTech Landmark",
      "TimberTech Harvest+",
      "TimberTech Harvest",
      "TimberTech Legacy",
      "TimberTech Reserve",
      "TimberTech Terrain+",
      "TimberTech Terrain",
      "TimberTech Prime+",
      "TimberTech Premier",
      "TimberTech Prime",
    ],
  },
];

const TIER_SEQUENCE = ['GOOD', 'BETTER', 'BEST', 'GOOD_PLUS', 'BETTER_PLUS', 'BEST_PLUS'] as const;

// ---------------------------------------------------------------------------
// Catalog product helpers
// ---------------------------------------------------------------------------

const NON_BOARD_PATTERN = /FASCIA|RISER|TAPE|FLASHING|JOIST|FASTENER|HIDDEN|CONCEALOC|SCREW|SPAX|GRIP\s*FAST|STAR\s*DRIVE|\bNAIL\b|\bBOLT\b/i;

// Only these material names appear as Wood pills in the deck material selector.
// Add new entries here if you add more wood deck board product lines.
const WOOD_DECK_MATERIALS = ["PT Green", "CedarTone PT", "CedarTone"];

/** Returns true if this product is a deck board (not fascia, riser, tape, etc.) */
function isBoard(name: string): boolean {
  return !NON_BOARD_PATTERN.test(name);
}

/**
 * Extracts the color name from a board product name.
 * "TT HARVEST 12' BROWNSTONE GV"              → "BROWNSTONE"
 * "TT HARVEST 12' SLATE GREY GV"              → "SLATE GREY"
 * "TT HARVEST 20' (MAX) 2\" X 6\" SLATE GREY SQ" → "SLATE GREY"
 * "TT 16' DARK TEAK PRIME GV SCALLOPED"       → "DARK TEAK"
 * "TT 12' PREMIER DARK TEAK GV SCALLOPED"     → "DARK TEAK"
 * "TT 16' COCONUT HUSK PRIME+ GV - SCALLOPED" → "COCONUT HUSK"
 */
// Collection / profile tokens that are NOT part of the color name.
// Use letter-only lookahead/lookbehind so PRIME+ (with '+') is handled correctly.
const TT_NOISE_TOKENS = /(?<![A-Za-z])(PRIME\+|PRIME|PREMIER|SCALLOPED)(?![A-Za-z])/gi;

function extractBoardColor(name: string): string | null {
  if (!isBoard(name)) return null;
  // Strip everything up to (and including) the first length marker (e.g. 12')
  const afterLength = name.replace(/^.*?\d+['"]\s*/i, "");
  // Remove parenthetical qualifiers like (MAX) or (WIDE 7-1/4)
  const cleaned = afterLength
    .replace(/\([^)]*\)\s*/g, "")
    // Remove inline dimension specs like 2" X 6"
    .replace(/\d+['"]\s*[Xx]\s*\d+['"]\s*/gi, "");
  // Use \b instead of \s*$ so SCALLOPED (and dashes) after GV/SQ are ignored
  const m = cleaned.match(/^(.+?)\s+(GV|SQ)\b/i);
  if (!m) return null;
  // Strip collection-name tokens that leaked into the color segment
  const color = m[1]
    .trim()
    .toUpperCase()
    .replace(TT_NOISE_TOKENS, "")
    .replace(/\s+/g, " ")
    .trim();
  return color.length > 0 ? color : null;
}

/** Lower score = more preferred as the canonical representative for a color/material */
function canonicalScore(name: string): number {
  const profileScore  = /\bGV\b/.test(name) ? 0 : 1;   // TimberTech: GV preferred over SQ
  const deckBdScore   = /5\/4/.test(name)   ? 0 : 5;   // Wood: 5/4 deck board preferred
  const lengthScore   = /16'/.test(name)    ? 0 : /12'/.test(name) ? 1 : 2; // 16' preferred
  return deckBdScore + lengthScore * 2 + profileScore;
}

/**
 * Extracts the material/brand name from a wood product (non-collection).
 *
 * Product names are often dimension-prefixed, e.g.:
 *   "1"x6"x12' PT Green"    → "PT Green"
 *   "5/4"x6"x16' PT Green"  → "PT Green"
 *   "2"x4"x12' CedarTone PT"→ "CedarTone PT"
 *
 * Strips the leading dimension block (handles both integer and fraction widths),
 * then takes the remaining text up to any trailing digits.
 */
function extractWoodMaterial(name: string): string {
  // Strip leading dimension block: e.g. "5/4"x6"x16' " or "1"x6"x12' " or "2"x4"x8' "
  // Pattern: (optional fraction) number + optional quote + x + number + optional quote + x + number+foot + space
  const afterDim = name
    .replace(/^\d+\/\d+["']?x\d+["']?x[\d/']+\s*/i, "") // fraction width: 5/4"x6"x16'
    .replace(/^\d+["']?x\d+["']?x[\d/']+\s*/i, "")       // integer width:  2"x4"x12'
    .trim();

  const src = afterDim.length > 0 && /^[A-Za-z]/.test(afterDim) ? afterDim : name;

  // Take all letters/spaces until the first digit, paren, or end of string
  const m = src.match(/^([A-Za-z][A-Za-z\s]*?)(?=\s*[\d(/]|$)/);
  return m ? m[1].trim() : src.split(/\s+/).slice(0, 2).join(" ");
}

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function toFt(ft: number, inches: number): number {
  return (ft || 0) + (inches || 0) / 12;
}

function fmtFtIn(ft: number, inches: number): string {
  if (ft === 0 && inches === 0) return "—";
  return inches === 0 ? `${ft}'` : `${ft}' ${inches}"`;
}

function newSection(): DeckSection {
  return { id: uid(), label: "", lengthFt: 0, lengthIn: 0, widthFt: 0, widthIn: 0 };
}
function newRailRun(label = ""): DeckRailRun {
  return { id: uid(), label, lengthFt: 0, lengthIn: 0, type: "section" };
}
function newLedgerRun(): DeckRailRun {
  return { id: uid(), label: "House side (ledger)", lengthFt: 0, lengthIn: 0, type: "ledger" };
}
function newGateRun(): DeckRailRun {
  return { id: uid(), label: "Gate", lengthFt: 0, lengthIn: 0, type: "gate" };
}

interface Props {
  initialData?: Partial<DeckData>;
  onChange: (data: DeckData) => void;
  products?: { id: string; name: string; cost: number; unit: string; subCategory: string | null }[];
  // Deck sections, stairs and railing runs from the Measurements tab
  linkedValues?: Partial<DeckData>;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FtInPair({
  ft, inches, onFt, onIn,
}: {
  ft: number; inches: number;
  onFt: (v: number) => void; onIn: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      <div className="flex-1">
        <input
          type="number"
          value={ft === 0 ? "" : ft}
          onChange={(e) => onFt(e.target.value === "" ? 0 : Number(e.target.value))}
          placeholder="0"
          min="0"
          className={inputCls}
        />
        <span className="text-xs text-slate-500 pl-1">ft</span>
      </div>
      <div className="flex-1">
        <input
          type="number"
          value={inches === 0 ? "" : inches}
          onChange={(e) => onIn(e.target.value === "" ? 0 : Math.min(11, Number(e.target.value)))}
          placeholder="0"
          min="0"
          max="11"
          className={inputCls}
        />
        <span className="text-xs text-slate-500 pl-1">in</span>
      </div>
    </div>
  );
}

function NumField({
  label, unit, value, onChange, placeholder = "0", step,
}: {
  label: string; unit?: string; value: number; onChange: (v: number) => void;
  placeholder?: string; step?: number;
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
        placeholder={placeholder}
        min="0"
        step={step}
        className={inputCls}
      />
    </div>
  );
}

// Rail runs table (reused for deck and stair railing)
function RailRunsTable({
  runs,
  onUpdate,
  onAdd,
  onAddLedger,
  onAddGate,
  onRemove,
  addLabel,
}: {
  runs: DeckRailRun[];
  onUpdate: (id: string, field: keyof DeckRailRun, value: string | number) => void;
  onAdd: () => void;
  onAddLedger?: () => void;
  onAddGate?: () => void;
  onRemove: (id: string) => void;
  addLabel: string;
}) {
  const ledgers    = runs.filter(r => r.type === "ledger");
  const gates      = runs.filter(r => r.type === "gate");
  const totalActiveLf = runs.filter(r => r.type !== "ledger").reduce((s, r) => s + toFt(r.lengthFt, r.lengthIn), 0);
  const hasExcluded = ledgers.length > 0;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
              <th className="pb-2 pr-2 font-medium w-20">Type</th>
              <th className="pb-2 pr-3 font-medium">Label</th>
              <th className="pb-2 pr-3 font-medium" colSpan={2}>Length</th>
              <th className="pb-2 pr-3 font-medium text-right">LF</th>
              <th className="pb-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {runs.map((run, idx) => {
              const isLedger = run.type === "ledger";
              const isGate   = run.type === "gate";
              const lf       = toFt(run.lengthFt, run.lengthIn);
              // 3-way cycle: section → ledger → gate → section
              const nextType = isLedger ? "gate" : isGate ? "section" : "ledger";
              const typeTitle = isLedger
                ? "Ledger — attached to house, no railing. Click → Gate."
                : isGate
                ? "Gate — railing + gate hardware. Click → Section."
                : "Section — railing required. Click → Ledger.";
              return (
                <tr key={run.id} className={isLedger ? "opacity-75" : ""}>
                  {/* Type toggle */}
                  <td className="py-2 pr-2">
                    <button
                      type="button"
                      onClick={() => onUpdate(run.id, "type", nextType)}
                      title={typeTitle}
                      className={[
                        "text-[10px] font-semibold px-2 py-1 rounded border transition-colors whitespace-nowrap",
                        isLedger
                          ? "bg-slate-700/60 border-slate-600 text-slate-400 hover:bg-slate-700"
                          : isGate
                          ? "bg-green-900/20 border-green-800 text-green-400 hover:bg-green-900/40"
                          : "bg-blue-900/20 border-blue-800 text-blue-400 hover:bg-blue-900/40",
                      ].join(" ")}
                    >
                      {isLedger ? "Ledger" : isGate ? "Gate" : "Section"}
                    </button>
                  </td>
                  <td className="py-2 pr-3 w-32">
                    <input
                      type="text"
                      value={run.label}
                      onChange={(e) => onUpdate(run.id, "label", e.target.value)}
                      placeholder={isLedger ? "House side (ledger)" : isGate ? "Gate" : `Run ${idx + 1}`}
                      className={isLedger ? `${inputCls} opacity-60` : inputCls}
                    />
                  </td>
                  <td className="py-2 pr-1 w-24">
                    <input
                      type="number"
                      value={run.lengthFt === 0 ? "" : run.lengthFt}
                      onChange={(e) => onUpdate(run.id, "lengthFt", e.target.value === "" ? 0 : Number(e.target.value))}
                      placeholder="0"
                      min="0"
                      className={inputCls}
                    />
                    <span className="text-xs text-slate-500 pl-1">ft</span>
                  </td>
                  <td className="py-2 pr-3 w-20">
                    <input
                      type="number"
                      value={run.lengthIn === 0 ? "" : run.lengthIn}
                      onChange={(e) => onUpdate(run.id, "lengthIn", e.target.value === "" ? 0 : Math.min(11, Number(e.target.value)))}
                      placeholder="0"
                      min="0"
                      max="11"
                      className={inputCls}
                    />
                    <span className="text-xs text-slate-500 pl-1">in</span>
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <span className={isLedger ? "text-slate-500 font-medium line-through" : isGate ? "text-green-400 font-medium" : "text-slate-300 font-medium"}>
                      {lf > 0 ? lf.toFixed(2) : "—"}
                    </span>
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => onRemove(run.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary when ledger sides are present */}
      {hasExcluded && (
        <div className="flex items-center gap-2 text-xs text-slate-500 px-1 flex-wrap">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Ledger sides excluded —</span>
          <span className="font-semibold text-white">{totalActiveLf.toFixed(2)} lf railing needed</span>
          {gates.length > 0 && (
            <span className="text-green-400 font-medium">· {gates.length} gate{gates.length > 1 ? "s" : ""}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={onAdd}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {addLabel}
        </button>
        {onAddLedger && (
          <button
            onClick={onAddLedger}
            className="text-xs text-slate-400 hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add ledger side
          </button>
        )}
        {onAddGate && (
          <button
            onClick={onAddGate}
            className="text-xs text-green-400 hover:text-green-300 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add gate
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DeckMeasurements({ initialData, onChange, products, linkedValues }: Props) {
  const [own, setData] = useState<DeckData>({
    sections:              initialData?.sections ?? [newSection()],
    wasteFactor:           initialData?.wasteFactor ?? 10,
    deckMaterials:         initialData?.deckMaterials ?? [],
    deckProductIds:        initialData?.deckProductIds ?? [],
    boardDirection:        initialData?.boardDirection ?? "along_width",
    boardWidthIn:          initialData?.boardWidthIn ?? 5.5,
    borderStyle:           (initialData?.borderStyle as DeckData["borderStyle"]) ?? "none",
    leadCarpenterHours:    initialData?.leadCarpenterHours ?? 0,
    carpenterHours:        initialData?.carpenterHours ?? 0,
    railingType:           (initialData?.railingType as DeckData["railingType"]) ?? "wood",
    railingColor:          (initialData?.railingColor as DeckData["railingColor"]) ?? "",
    deckRailRuns:          initialData?.deckRailRuns ?? [newRailRun()],
    railingPostSpacing:    initialData?.railingPostSpacing ?? 6,
    railingPosts:          initialData?.railingPosts ?? 0,
    postCaps:              initialData?.postCaps ?? 0,
    railingBalusterSpacing: initialData?.railingBalusterSpacing ?? 4,
    stairGapFt:            initialData?.stairGapFt ?? 0,
    stairGapIn:            initialData?.stairGapIn ?? 0,
    stairRailRuns:         initialData?.stairRailRuns ?? [],
    stairs:                initialData?.stairs ?? 0,
    stairRisers:           initialData?.stairRisers ?? 7,
    stairWidthFt:          initialData?.stairWidthFt ?? 3,
    stairWidthIn:          initialData?.stairWidthIn ?? 0,
    stairStringers:            initialData?.stairStringers ?? 3,
    stairStringerLengthFt:     initialData?.stairStringerLengthFt ?? 0,
    stairStringerLengthIn:     initialData?.stairStringerLengthIn ?? 0,
    // Pool deck
    poolDeckEnabled:       initialData?.poolDeckEnabled ?? false,
    poolShape:             (initialData?.poolShape as DeckData["poolShape"]) ?? "rectangular",
    poolCoverage:          (initialData?.poolCoverage as DeckData["poolCoverage"]) ?? "full",
    poolDiameterFt:        initialData?.poolDiameterFt ?? 0,
    poolDiameterIn:        initialData?.poolDiameterIn ?? 0,
    poolLengthFt:          initialData?.poolLengthFt ?? 0,
    poolLengthIn:          initialData?.poolLengthIn ?? 0,
    poolWidthFt:           initialData?.poolWidthFt ?? 0,
    poolWidthIn:           initialData?.poolWidthIn ?? 0,
    deckAroundWidthFt:     initialData?.deckAroundWidthFt ?? 0,
    deckAroundWidthIn:     initialData?.deckAroundWidthIn ?? 0,
    poolLeftLegLengthFt:   initialData?.poolLeftLegLengthFt ?? 0,
    poolLeftLegLengthIn:   initialData?.poolLeftLegLengthIn ?? 0,
    poolLeftLegWidthFt:    initialData?.poolLeftLegWidthFt ?? 0,
    poolLeftLegWidthIn:    initialData?.poolLeftLegWidthIn ?? 0,
    poolHeaderLengthFt:    initialData?.poolHeaderLengthFt ?? 0,
    poolHeaderLengthIn:    initialData?.poolHeaderLengthIn ?? 0,
    poolHeaderWidthFt:     initialData?.poolHeaderWidthFt ?? 0,
    poolHeaderWidthIn:     initialData?.poolHeaderWidthIn ?? 0,
    poolRightLegLengthFt:  initialData?.poolRightLegLengthFt ?? 0,
    poolRightLegLengthIn:  initialData?.poolRightLegLengthIn ?? 0,
    poolRightLegWidthFt:   initialData?.poolRightLegWidthFt ?? 0,
    poolRightLegWidthIn:   initialData?.poolRightLegWidthIn ?? 0,
  });

  const data: DeckData = linkedValues ? { ...own, ...linkedValues } : own;

  function update<K extends keyof DeckData>(key: K, value: DeckData[K]) {
    const next = { ...own, [key]: value };
    setData(next);
    onChange(next);
  }

  // Deck sections
  function updateSection(id: string, field: keyof DeckSection, value: string | number) {
    const updatedSections = data.sections.map((s) => s.id === id ? { ...s, [field]: value } : s);
    let next: DeckData = { ...data, sections: updatedSections };

    // Auto-build railing the first time a section gets both length AND width.
    // "First time" = all current runs are empty (no lengths entered yet).
    const runsAreEmpty = data.deckRailRuns.every(r => r.lengthFt === 0 && r.lengthIn === 0);
    if (runsAreEmpty) {
      const runs = buildRailingRuns(next);
      if (runs) next = { ...next, deckRailRuns: runs };
    }

    setData(next); onChange(next);
  }
  function addSection() {
    const next = { ...data, sections: [...data.sections, newSection()] };
    setData(next); onChange(next);
  }
  function removeSection(id: string) {
    const next = { ...data, sections: data.sections.filter((s) => s.id !== id) };
    setData(next); onChange(next);
  }

  // Deck rail runs
  function updateDeckRail(id: string, field: keyof DeckRailRun, value: string | number) {
    const next = { ...data, deckRailRuns: data.deckRailRuns.map((r) => r.id === id ? { ...r, [field]: value } : r) };
    setData(next); onChange(next);
  }
  function addDeckRail() {
    const next = { ...data, deckRailRuns: [...data.deckRailRuns, newRailRun()] };
    setData(next); onChange(next);
  }
  function addDeckLedger() {
    const next = { ...data, deckRailRuns: [...data.deckRailRuns, newLedgerRun()] };
    setData(next); onChange(next);
  }
  function addDeckGate() {
    const next = { ...data, deckRailRuns: [...data.deckRailRuns, newGateRun()] };
    setData(next); onChange(next);
  }
  function removeDeckRail(id: string) {
    const next = { ...data, deckRailRuns: data.deckRailRuns.filter((r) => r.id !== id) };
    setData(next); onChange(next);
  }

  // Pure function — compute railing runs from any DeckData snapshot.
  // Returns null when dimensions aren't valid yet.
  function buildRailingRuns(d: DeckData): DeckRailRun[] | null {
    if (d.sections.length === 0) return null;
    const totalLedgerFt = d.sections.reduce((s, sec) => s + toFt(sec.lengthFt, sec.lengthIn), 0);
    const depthFt = toFt(d.sections[0].widthFt, d.sections[0].widthIn);
    if (totalLedgerFt === 0 || depthFt === 0) return null;
    const gapFt   = toFt(d.stairGapFt, d.stairGapIn);
    const frontFt = Math.max(0, totalLedgerFt - gapFt);
    const lf = (ft: number) => ({ lengthFt: Math.floor(ft), lengthIn: Math.round((ft % 1) * 12) });
    const runs: DeckRailRun[] = [
      { id: uid(), label: "House side (ledger)", type: "ledger"  as const, ...lf(totalLedgerFt) },
      { id: uid(), label: "Left side",            type: "section" as const, ...lf(depthFt) },
      { id: uid(), label: "Front",                type: "section" as const, ...lf(frontFt) },
      ...(gapFt > 0 ? [{ id: uid(), label: "Gate", type: "gate" as const, ...lf(gapFt) }] : []),
      { id: uid(), label: "Right side",           type: "section" as const, ...lf(depthFt) },
    ];
    return runs;
  }

  // Triggered by the Auto Build button — always rebuilds from current deck dimensions.
  function autoBuildRailing() {
    const runs = buildRailingRuns(data);
    if (!runs) return;
    const next = { ...data, deckRailRuns: runs };
    setData(next); onChange(next);
  }

  // Stair rail runs
  function updateStairRail(id: string, field: keyof DeckRailRun, value: string | number) {
    const next = { ...data, stairRailRuns: data.stairRailRuns.map((r) => r.id === id ? { ...r, [field]: value } : r) };
    setData(next); onChange(next);
  }
  function addStairRail() {
    const next = { ...data, stairRailRuns: [...data.stairRailRuns, newRailRun()] };
    setData(next); onChange(next);
  }
  function addStairLedger() {
    const next = { ...data, stairRailRuns: [...data.stairRailRuns, newLedgerRun()] };
    setData(next); onChange(next);
  }
  function addStairGate() {
    const next = { ...data, stairRailRuns: [...data.stairRailRuns, newGateRun()] };
    setData(next); onChange(next);
  }
  function removeStairRail(id: string) {
    const next = { ...data, stairRailRuns: data.stairRailRuns.filter((r) => r.id !== id) };
    setData(next); onChange(next);
  }

  // Computed values
  const sectionsArea = data.sections.reduce((sum, s) => sum + toFt(s.lengthFt, s.lengthIn) * toFt(s.widthFt, s.widthIn), 0);

  // Pool deck area (computed separately so the sections panel can display its own subtotal)
  const poolDeckArea = (() => {
    if (!data.poolDeckEnabled) return 0;
    if (data.poolCoverage === "full") {
      const dw = toFt(data.deckAroundWidthFt, data.deckAroundWidthIn);
      if (data.poolShape === "round") {
        const r = toFt(data.poolDiameterFt, data.poolDiameterIn) / 2;
        return r > 0 && dw > 0 ? Math.PI * dw * (dw + 2 * r) : 0;
      } else if (data.poolShape === "oval") {
        const a = toFt(data.poolLengthFt, data.poolLengthIn) / 2;
        const b = toFt(data.poolWidthFt, data.poolWidthIn) / 2;
        return a > 0 && b > 0 && dw > 0 ? Math.PI * ((a + dw) * (b + dw) - a * b) : 0;
      } else {
        const pl = toFt(data.poolLengthFt, data.poolLengthIn);
        const pw = toFt(data.poolWidthFt, data.poolWidthIn);
        return pl > 0 && pw > 0 && dw > 0 ? (pl + 2 * dw) * (pw + 2 * dw) - pl * pw : 0;
      }
    }
    // horseshoe / two_legs
    const left  = toFt(data.poolLeftLegLengthFt,  data.poolLeftLegLengthIn)  * toFt(data.poolLeftLegWidthFt,  data.poolLeftLegWidthIn);
    const right  = toFt(data.poolRightLegLengthFt, data.poolRightLegLengthIn) * toFt(data.poolRightLegWidthFt, data.poolRightLegWidthIn);
    const header = data.poolCoverage === "horseshoe"
      ? toFt(data.poolHeaderLengthFt, data.poolHeaderLengthIn) * toFt(data.poolHeaderWidthFt, data.poolHeaderWidthIn)
      : 0;
    return left + header + right;
  })();

  const totalArea = sectionsArea + poolDeckArea;
  const adjustedArea = Math.ceil(totalArea * (1 + data.wasteFactor / 100));

  // Board count calculation
  // boardDirection "along_width"  → boards run along the width dimension; coverage = length
  // boardDirection "along_length" → boards run along the length dimension; coverage = width
  const bwIn = data.boardWidthIn > 0 ? data.boardWidthIn : 5.5;
  // For horseshoe/two-legs pool sections, treat each leg as an additional section for board count.
  const poolLegSections: Array<{ lengthFt: number; lengthIn: number; widthFt: number; widthIn: number }> =
    data.poolDeckEnabled && data.poolCoverage !== "full"
      ? [
          { lengthFt: data.poolLeftLegLengthFt,  lengthIn: data.poolLeftLegLengthIn,  widthFt: data.poolLeftLegWidthFt,  widthIn: data.poolLeftLegWidthIn },
          { lengthFt: data.poolRightLegLengthFt, lengthIn: data.poolRightLegLengthIn, widthFt: data.poolRightLegWidthFt, widthIn: data.poolRightLegWidthIn },
          ...(data.poolCoverage === "horseshoe" ? [{ lengthFt: data.poolHeaderLengthFt, lengthIn: data.poolHeaderLengthIn, widthFt: data.poolHeaderWidthFt, widthIn: data.poolHeaderWidthIn }] : []),
        ]
      : [];
  const surfaceBoardCount = [...data.sections, ...poolLegSections].reduce((sum, s) => {
    const coverage = data.boardDirection === "along_width"
      ? toFt(s.lengthFt, s.lengthIn)
      : toFt(s.widthFt, s.widthIn);
    return sum + Math.ceil((coverage * 12) / bwIn);
  }, 0);
  const adjustedBoardCount = Math.ceil(surfaceBoardCount * (1 + data.wasteFactor / 100));
  const stairBoardCount = data.stairs > 0 ? data.stairs * data.stairRisers * 2 : 0;
  const totalBoardCount = adjustedBoardCount + stairBoardCount;

  const deckRailLf = data.deckRailRuns.reduce((sum, r) => {
    if (r.type === "ledger") return sum;
    return sum + toFt(r.lengthFt, r.lengthIn);
  }, 0);
  const stairRailLf = data.stairRailRuns.reduce((sum, r) => {
    if (r.type === "ledger") return sum;
    return sum + toFt(r.lengthFt, r.lengthIn);
  }, 0);
  const totalRailLf = deckRailLf + stairRailLf;

  const autoPosts = deckRailLf > 0 && data.railingPostSpacing > 0
    ? Math.ceil(deckRailLf / data.railingPostSpacing) + 1
    : 0;
  const effectivePosts = data.railingPosts > 0 ? data.railingPosts : autoPosts;

  const autoBalusters = totalRailLf > 0 && data.railingBalusterSpacing > 0
    ? Math.ceil((totalRailLf * 12) / data.railingBalusterSpacing)
    : 0;

  const stairTreads = data.stairs > 0 ? data.stairs * data.stairRisers : 0;
  const stairStringerCt = data.stairs > 0 ? data.stairs * data.stairStringers : 0;

  return (
    <div className="space-y-6">

      {/* ── Material Selection ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest pt-0.5">Deck Material</h3>
          {(products && products.length > 0 ? data.deckProductIds : data.deckMaterials).length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-end">
              {products && products.length > 0
                ? data.deckProductIds.map((id, i) => {
                    const p = products.find((p) => p.id === id);
                    if (!p) return null;
                    const isCollection = p.subCategory?.toLowerCase().includes("collection");
                    const color = isCollection ? extractBoardColor(p.name) : null;
                    const label = color
                      ? `${p.subCategory?.replace(" Collection", "") ?? ""} – ${toTitleCase(color)}`
                      : (p.subCategory ?? p.name);
                    return (
                      <span key={id} className="text-xs font-medium px-2 py-0.5 rounded-full border border-blue-700/60 bg-blue-900/30 text-blue-300">
                        {i + 1}. {label}
                      </span>
                    );
                  })
                : data.deckMaterials.map((m, i) => (
                    <span key={m} className="text-xs font-medium px-2 py-0.5 rounded-full border border-blue-700/60 bg-blue-900/30 text-blue-300">
                      {i + 1}. {m.startsWith("TimberTech ") ? m.replace("TimberTech ", "") : m}
                    </span>
                  ))
              }
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500 -mt-2">
          Select one or more — each becomes its own priced line item on the estimate.
        </p>

        {/* ── Catalog product selector (when products are provided) ── */}
        {products && products.length > 0 ? (() => {
          // ── Build color groups ──
          // For "Collection" subCategories: deduplicate to one pill per color.
          // For other subCategories (PT, CedarTone, etc.): one pill per product.
          type ColorEntry = { canonical: (typeof products)[number]; color: string };
          const collectionGroups = new Map<string, Map<string, ColorEntry>>();
          // Non-collection groups (PT Green, CedarTone, etc.) → one canonical product per subCategory
          const otherCanonicals = new Map<string, (typeof products)[number]>();

          for (const p of products) {
            // Skip non-board products (fasteners, fascia, tape, etc.)
            if (!isBoard(p.name)) continue;

            const sub = p.subCategory ?? "Other";
            if (sub.toLowerCase().includes("collection")) {
              const color = extractBoardColor(p.name);
              if (!color) continue; // skip if we can't parse a color (fascia within a collection, etc.)
              if (!collectionGroups.has(sub)) collectionGroups.set(sub, new Map());
              const colorMap = collectionGroups.get(sub)!;
              const existing = colorMap.get(color);
              // Keep the best canonical representative (16' GV preferred)
              if (!existing || canonicalScore(p.name) < canonicalScore(existing.canonical.name)) {
                colorMap.set(color, { canonical: p, color });
              }
            } else {
              // One canonical product per material type — only show known deck board materials
              const materialKey = extractWoodMaterial(p.name);
              if (!WOOD_DECK_MATERIALS.includes(materialKey)) continue;
              const existing = otherCanonicals.get(materialKey);
              if (!existing || canonicalScore(p.name) < canonicalScore(existing.name)) {
                otherCanonicals.set(materialKey, p);
              }
            }
          }

          const sortedCollections = Array.from(collectionGroups.entries()).sort(([a], [b]) => a.localeCompare(b));
          const sortedOthers = Array.from(otherCanonicals.entries()).sort(([a], [b]) => a.localeCompare(b));

          return (
            <div className="space-y-5">
              {/* ── Collection groups: one pill per color ── */}
              {sortedCollections.map(([collectionName, colorMap]) => {
                const colors = Array.from(colorMap.values()).sort((a, b) => a.color.localeCompare(b.color));
                return (
                  <div key={collectionName} className="space-y-2">
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">{collectionName}</p>
                    <div className="flex flex-wrap gap-2">
                      {colors.map(({ canonical, color }) => {
                        const isSelected = data.deckProductIds.includes(canonical.id);
                        const selIdx = data.deckProductIds.indexOf(canonical.id);
                        return (
                          <button
                            key={canonical.id}
                            type="button"
                            onClick={() => {
                              const next = isSelected
                                ? data.deckProductIds.filter((id) => id !== canonical.id)
                                : [...data.deckProductIds, canonical.id];
                              update("deckProductIds", next);
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                              isSelected
                                ? "border-blue-500 bg-blue-900/25 text-blue-300"
                                : "border-slate-600 text-slate-400 hover:border-blue-700 hover:text-blue-400"
                            }`}
                          >
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-300">
                                {selIdx + 1}
                              </span>
                            )}
                            {toTitleCase(color)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* ── Other groups (PT Green, CedarTone): one pill per subCategory ── */}
              {sortedOthers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Wood</p>
                  <div className="flex flex-wrap gap-2">
                    {sortedOthers.map(([groupName, canonical]) => {
                      const isSelected = data.deckProductIds.includes(canonical.id);
                      const selIdx = data.deckProductIds.indexOf(canonical.id);
                      return (
                        <button
                          key={canonical.id}
                          type="button"
                          onClick={() => {
                            const next = isSelected
                              ? data.deckProductIds.filter((id) => id !== canonical.id)
                              : [...data.deckProductIds, canonical.id];
                            update("deckProductIds", next);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            isSelected
                              ? "border-amber-500 bg-amber-900/25 text-amber-300"
                              : "border-slate-600 text-slate-400 hover:border-amber-700 hover:text-amber-400"
                          }`}
                        >
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-amber-500/30 flex items-center justify-center text-[10px] font-bold text-amber-300">
                              {selIdx + 1}
                            </span>
                          )}
                          {groupName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Tier preview ── */}
              {data.deckProductIds.length > 0 && totalArea > 0 && (
                <div className="border-t border-slate-700 pt-4 space-y-1.5">
                  <p className="text-xs text-slate-500 font-medium">Line items that will be generated (sorted cheapest → premium):</p>
                  {[...data.deckProductIds]
                    .map((id) => products.find((p) => p.id === id))
                    .filter((p): p is NonNullable<typeof p> => !!p)
                    .sort((a, b) => a.cost - b.cost)
                    .map((p, i) => {
                      const isCollection = p.subCategory?.toLowerCase().includes("collection");
                      const color = isCollection ? extractBoardColor(p.name) : null;
                      const displayName = color
                        ? `${p.subCategory?.replace(" Collection", "") ?? ""} – ${toTitleCase(color)}`
                        : (p.subCategory ?? p.name);
                      const boardQtyLabel = totalBoardCount > 0
                        ? `${totalBoardCount} ea${stairBoardCount > 0 ? ` (${adjustedBoardCount} deck + ${stairBoardCount} stair)` : ""}`
                        : `${adjustedArea} sqf`;
                      return (
                        <div key={p.id} className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="text-slate-500 w-16 flex-shrink-0">{TIER_SEQUENCE[i] ?? "BEST_PLUS"}</span>
                          <span className="text-white font-medium">{displayName}</span>
                          <span className="text-slate-600">—</span>
                          <span>{boardQtyLabel}</span>
                        </div>
                      );
                    })
                  }
                </div>
              )}
            </div>
          );
        })() : (
          /* ── Legacy material name pill selector (fallback) ── */
          <>
            {MATERIAL_GROUPS.map((group) => {
              const isAmber = group.accent === "amber";
              return (
                <div key={group.label} className="space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{group.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((option) => {
                      const isSelected = data.deckMaterials.includes(option);
                      const activeClass = isAmber
                        ? "border-amber-500 bg-amber-900/25 text-amber-300"
                        : "border-blue-500 bg-blue-900/25 text-blue-300";
                      const idleClass = isAmber
                        ? "border-slate-600 text-slate-400 hover:border-amber-700 hover:text-amber-400"
                        : "border-slate-600 text-slate-400 hover:border-blue-700 hover:text-blue-400";
                      const pillLabel = option.startsWith("TimberTech ")
                        ? option.replace("TimberTech ", "")
                        : option;
                      const selIdx = data.deckMaterials.indexOf(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            const next = isSelected
                              ? data.deckMaterials.filter((m) => m !== option)
                              : [...data.deckMaterials, option];
                            update("deckMaterials", next);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            isSelected ? activeClass : idleClass
                          }`}
                        >
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-bold opacity-80">
                              {selIdx + 1}
                            </span>
                          )}
                          {pillLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {data.deckMaterials.length > 0 && totalArea > 0 && (
              <div className="border-t border-slate-700 pt-4 space-y-1.5">
                <p className="text-xs text-slate-500 font-medium">Line items that will be generated:</p>
                {data.deckMaterials.map((m, i) => (
                  <div key={m} className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-slate-600">#{i + 1}</span>
                    <span className="text-white font-medium">
                      Deck boards ({m.startsWith("TimberTech ") ? m.replace("TimberTech ", "") : m})
                    </span>
                    <span className="text-slate-600">—</span>
                    <span>{totalBoardCount > 0 ? `${totalBoardCount} ea` : `${adjustedArea} sqf`}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {linkedValues ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 items-end">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Deck area (from Measurements)</p>
            <p className="text-lg font-semibold text-white">{Math.round(sectionsArea)} sqft</p>
          </div>
          <NumField label="Waste Factor" unit="%" value={data.wasteFactor} onChange={(v) => update("wasteFactor", v)} />
        </div>
      ) : (<>
      {/* ── Deck Sections ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Deck Sections</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                <th className="pb-2 pr-3 font-medium">Label</th>
                <th className="pb-2 pr-3 font-medium" colSpan={2}>Length</th>
                <th className="pb-2 pr-3 font-medium" colSpan={2}>Width</th>
                <th className="pb-2 pr-3 font-medium text-right">Area (sqf)</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {data.sections.map((section, idx) => {
                const l = toFt(section.lengthFt, section.lengthIn);
                const w = toFt(section.widthFt, section.widthIn);
                const area = l * w;
                return (
                  <tr key={section.id}>
                    <td className="py-2 pr-3 w-28">
                      <input
                        type="text"
                        value={section.label}
                        onChange={(e) => updateSection(section.id, "label", e.target.value)}
                        placeholder={`Section ${idx + 1}`}
                        className={inputCls}
                      />
                    </td>
                    {/* Length ft */}
                    <td className="py-2 pr-1 w-20">
                      <input
                        type="number"
                        value={section.lengthFt === 0 ? "" : section.lengthFt}
                        onChange={(e) => updateSection(section.id, "lengthFt", e.target.value === "" ? 0 : Number(e.target.value))}
                        placeholder="0" min="0"
                        className={inputCls}
                      />
                      <span className="text-xs text-slate-500 pl-1">ft</span>
                    </td>
                    {/* Length in */}
                    <td className="py-2 pr-3 w-16">
                      <input
                        type="number"
                        value={section.lengthIn === 0 ? "" : section.lengthIn}
                        onChange={(e) => updateSection(section.id, "lengthIn", e.target.value === "" ? 0 : Math.min(11, Number(e.target.value)))}
                        placeholder="0" min="0" max="11"
                        className={inputCls}
                      />
                      <span className="text-xs text-slate-500 pl-1">in</span>
                    </td>
                    {/* Width ft */}
                    <td className="py-2 pr-1 w-20">
                      <input
                        type="number"
                        value={section.widthFt === 0 ? "" : section.widthFt}
                        onChange={(e) => updateSection(section.id, "widthFt", e.target.value === "" ? 0 : Number(e.target.value))}
                        placeholder="0" min="0"
                        className={inputCls}
                      />
                      <span className="text-xs text-slate-500 pl-1">ft</span>
                    </td>
                    {/* Width in */}
                    <td className="py-2 pr-3 w-16">
                      <input
                        type="number"
                        value={section.widthIn === 0 ? "" : section.widthIn}
                        onChange={(e) => updateSection(section.id, "widthIn", e.target.value === "" ? 0 : Math.min(11, Number(e.target.value)))}
                        placeholder="0" min="0" max="11"
                        className={inputCls}
                      />
                      <span className="text-xs text-slate-500 pl-1">in</span>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <span className="text-slate-300 font-medium">
                        {area > 0 ? area.toFixed(1) : "—"}
                      </span>
                    </td>
                    <td className="py-2">
                      {data.sections.length > 1 && (
                        <button
                          onClick={() => removeSection(section.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors p-1"
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

        <button onClick={addSection} className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Section
        </button>

        {sectionsArea > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-400">{data.poolDeckEnabled && poolDeckArea > 0 ? "Sections area:" : "Total deck area:"}</span>
              <span className="font-semibold text-white">{sectionsArea.toFixed(1)} sqf</span>
            </div>
            <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-4 py-2.5 flex items-center justify-between text-sm">
              <span className="text-blue-300">
                With {data.wasteFactor}% waste:{" "}
                <span className="font-bold">{adjustedArea} sqf</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Waste %</span>
                <input
                  type="number"
                  value={data.wasteFactor === 0 ? "" : data.wasteFactor}
                  onChange={(e) => update("wasteFactor", e.target.value === "" ? 0 : Number(e.target.value))}
                  min="0" max="50"
                  className="w-16 rounded bg-slate-700 border border-slate-600 text-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {sectionsArea === 0 && (
          <NumField label="Waste Factor" unit="%" value={data.wasteFactor} onChange={(v) => update("wasteFactor", v)} />
        )}
      </div>

            </>)}

      {/* ── Pool Deck ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Pool Deck</h3>
            <p className="text-xs text-slate-500 mt-0.5">Add measurements for deck area around a pool.</p>
          </div>
          <button
            type="button"
            onClick={() => update("poolDeckEnabled", !data.poolDeckEnabled)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
              data.poolDeckEnabled ? "bg-blue-600" : "bg-slate-600"
            }`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              data.poolDeckEnabled ? "translate-x-[18px]" : "translate-x-0.5"
            }`} />
          </button>
        </div>

        {data.poolDeckEnabled && (
          <div className="space-y-5 pt-1 border-t border-slate-700">
            {/* Shape + Coverage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
              <div>
                <label className={labelCls}>Pool Shape</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {(["round", "oval", "rectangular"] as const).map((shape) => (
                    <button key={shape} type="button"
                      onClick={() => update("poolShape", shape)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors capitalize ${
                        data.poolShape === shape
                          ? "border-blue-500 bg-blue-900/25 text-blue-300"
                          : "border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                      }`}
                    >{shape}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Coverage Type</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {([
                    { value: "full",      label: "Full Surround" },
                    { value: "horseshoe", label: "Horseshoe (3 sides)" },
                    { value: "two_legs",  label: "Two Legs" },
                  ] as const).map(({ value, label }) => (
                    <button key={value} type="button"
                      onClick={() => update("poolCoverage", value)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        data.poolCoverage === value
                          ? "border-blue-500 bg-blue-900/25 text-blue-300"
                          : "border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                      }`}
                    >{label}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Layout diagram */}
            <div className="flex justify-center">
              {data.poolCoverage === "full" && (
                <svg viewBox="0 0 180 130" className="w-44 h-32 text-slate-300">
                  <rect x="10" y="10" width="160" height="110" rx="4" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.5)" strokeWidth="1.5"/>
                  <rect x="40" y="35" width="100" height="60" rx="2" fill="rgba(147,197,253,0.2)" stroke="rgba(147,197,253,0.5)" strokeWidth="1"/>
                  <text x="90" y="69" textAnchor="middle" fontSize="11" fill="rgba(147,197,253,0.8)">POOL</text>
                  <text x="90" y="22" textAnchor="middle" fontSize="8" fill="rgba(148,163,184,0.9)">deck</text>
                  <text x="90" y="120" textAnchor="middle" fontSize="8" fill="rgba(148,163,184,0.9)">deck</text>
                  <text x="22" y="69" textAnchor="middle" fontSize="8" fill="rgba(148,163,184,0.9)" transform="rotate(-90 22 69)">deck</text>
                  <text x="158" y="69" textAnchor="middle" fontSize="8" fill="rgba(148,163,184,0.9)" transform="rotate(90 158 69)">deck</text>
                </svg>
              )}
              {data.poolCoverage === "horseshoe" && (
                <svg viewBox="0 0 200 140" className="w-48 h-36 text-slate-300">
                  {/* Left leg */}
                  <rect x="10" y="15" width="45" height="110" rx="3" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.5)" strokeWidth="1.5"/>
                  <text x="32" y="72" textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.9)">Left</text>
                  <text x="32" y="83" textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.9)">Leg</text>
                  {/* Right leg */}
                  <rect x="145" y="15" width="45" height="110" rx="3" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.5)" strokeWidth="1.5"/>
                  <text x="167" y="72" textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.9)">Right</text>
                  <text x="167" y="83" textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.9)">Leg</text>
                  {/* Header */}
                  <rect x="55" y="95" width="90" height="30" rx="3" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.5)" strokeWidth="1.5"/>
                  <text x="100" y="115" textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.9)">Header</text>
                  {/* Pool area */}
                  <rect x="55" y="15" width="90" height="80" rx="2" fill="rgba(147,197,253,0.12)" stroke="rgba(147,197,253,0.3)" strokeWidth="1" strokeDasharray="4 3"/>
                  <text x="100" y="59" textAnchor="middle" fontSize="10" fill="rgba(147,197,253,0.6)">POOL</text>
                  {/* Open top indicator */}
                  <text x="100" y="11" textAnchor="middle" fontSize="8" fill="rgba(100,116,139,0.7)">← open →</text>
                </svg>
              )}
              {data.poolCoverage === "two_legs" && (
                <svg viewBox="0 0 200 140" className="w-48 h-36 text-slate-300">
                  {/* Left leg */}
                  <rect x="10" y="15" width="45" height="110" rx="3" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.5)" strokeWidth="1.5"/>
                  <text x="32" y="72" textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.9)">Left</text>
                  <text x="32" y="83" textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.9)">Leg</text>
                  {/* Right leg */}
                  <rect x="145" y="15" width="45" height="110" rx="3" fill="rgba(59,130,246,0.15)" stroke="rgba(59,130,246,0.5)" strokeWidth="1.5"/>
                  <text x="167" y="72" textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.9)">Right</text>
                  <text x="167" y="83" textAnchor="middle" fontSize="9" fill="rgba(148,163,184,0.9)">Leg</text>
                  {/* Pool area */}
                  <rect x="55" y="15" width="90" height="110" rx="2" fill="rgba(147,197,253,0.12)" stroke="rgba(147,197,253,0.3)" strokeWidth="1" strokeDasharray="4 3"/>
                  <text x="100" y="76" textAnchor="middle" fontSize="10" fill="rgba(147,197,253,0.6)">POOL</text>
                </svg>
              )}
            </div>

            {/* Full Surround inputs */}
            {data.poolCoverage === "full" && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Enter pool dimensions and deck width — the system calculates the deck area (outer footprint minus pool).
                </p>
                {data.poolShape === "round" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Pool Diameter</label>
                      <div className="flex gap-2 items-center">
                        <input type="number" min="0"
                          value={data.poolDiameterFt === 0 ? "" : data.poolDiameterFt}
                          onChange={(e) => update("poolDiameterFt", e.target.value === "" ? 0 : Number(e.target.value))}
                          placeholder="0" className={inputCls} />
                        <span className="text-xs text-slate-500 flex-shrink-0">ft</span>
                        <input type="number" min="0" max="11"
                          value={data.poolDiameterIn === 0 ? "" : data.poolDiameterIn}
                          onChange={(e) => update("poolDiameterIn", e.target.value === "" ? 0 : Math.min(11, Number(e.target.value)))}
                          placeholder="0" className={inputCls} />
                        <span className="text-xs text-slate-500 flex-shrink-0">in</span>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Deck Width Around Pool</label>
                      <div className="flex gap-2 items-center">
                        <input type="number" min="0"
                          value={data.deckAroundWidthFt === 0 ? "" : data.deckAroundWidthFt}
                          onChange={(e) => update("deckAroundWidthFt", e.target.value === "" ? 0 : Number(e.target.value))}
                          placeholder="0" className={inputCls} />
                        <span className="text-xs text-slate-500 flex-shrink-0">ft</span>
                        <input type="number" min="0" max="11"
                          value={data.deckAroundWidthIn === 0 ? "" : data.deckAroundWidthIn}
                          onChange={(e) => update("deckAroundWidthIn", e.target.value === "" ? 0 : Math.min(11, Number(e.target.value)))}
                          placeholder="0" className={inputCls} />
                        <span className="text-xs text-slate-500 flex-shrink-0">in</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <label className={labelCls}>{data.poolShape === "oval" ? "Pool Length (major axis)" : "Pool Length"}</label>
                      <div className="flex gap-2 items-center">
                        <input type="number" min="0"
                          value={data.poolLengthFt === 0 ? "" : data.poolLengthFt}
                          onChange={(e) => update("poolLengthFt", e.target.value === "" ? 0 : Number(e.target.value))}
                          placeholder="0" className={inputCls} />
                        <span className="text-xs text-slate-500 flex-shrink-0">ft</span>
                        <input type="number" min="0" max="11"
                          value={data.poolLengthIn === 0 ? "" : data.poolLengthIn}
                          onChange={(e) => update("poolLengthIn", e.target.value === "" ? 0 : Math.min(11, Number(e.target.value)))}
                          placeholder="0" className={inputCls} />
                        <span className="text-xs text-slate-500 flex-shrink-0">in</span>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>{data.poolShape === "oval" ? "Pool Width (minor axis)" : "Pool Width"}</label>
                      <div className="flex gap-2 items-center">
                        <input type="number" min="0"
                          value={data.poolWidthFt === 0 ? "" : data.poolWidthFt}
                          onChange={(e) => update("poolWidthFt", e.target.value === "" ? 0 : Number(e.target.value))}
                          placeholder="0" className={inputCls} />
                        <span className="text-xs text-slate-500 flex-shrink-0">ft</span>
                        <input type="number" min="0" max="11"
                          value={data.poolWidthIn === 0 ? "" : data.poolWidthIn}
                          onChange={(e) => update("poolWidthIn", e.target.value === "" ? 0 : Math.min(11, Number(e.target.value)))}
                          placeholder="0" className={inputCls} />
                        <span className="text-xs text-slate-500 flex-shrink-0">in</span>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Deck Width Around Pool</label>
                      <div className="flex gap-2 items-center">
                        <input type="number" min="0"
                          value={data.deckAroundWidthFt === 0 ? "" : data.deckAroundWidthFt}
                          onChange={(e) => update("deckAroundWidthFt", e.target.value === "" ? 0 : Number(e.target.value))}
                          placeholder="0" className={inputCls} />
                        <span className="text-xs text-slate-500 flex-shrink-0">ft</span>
                        <input type="number" min="0" max="11"
                          value={data.deckAroundWidthIn === 0 ? "" : data.deckAroundWidthIn}
                          onChange={(e) => update("deckAroundWidthIn", e.target.value === "" ? 0 : Math.min(11, Number(e.target.value)))}
                          placeholder="0" className={inputCls} />
                        <span className="text-xs text-slate-500 flex-shrink-0">in</span>
                      </div>
                    </div>
                  </div>
                )}
                {poolDeckArea > 0 && (
                  <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-4 py-2.5 text-sm">
                    <span className="text-blue-300">
                      Pool surround area:{" "}
                      <span className="font-bold">{poolDeckArea.toFixed(1)} sqf</span>
                      {data.poolShape !== "rectangular" && (
                        <span className="text-xs text-slate-500 ml-2">(elliptical calculation)</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Horseshoe / Two legs inputs */}
            {(data.poolCoverage === "horseshoe" || data.poolCoverage === "two_legs") && (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                        <th className="pb-2 pr-3 font-medium w-24">Section</th>
                        <th className="pb-2 pr-3 font-medium" colSpan={2}>Length</th>
                        <th className="pb-2 pr-3 font-medium" colSpan={2}>Width</th>
                        <th className="pb-2 font-medium text-right">Area (sqf)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {([
                        { label: "Left Leg",  lFt: "poolLeftLegLengthFt",  lIn: "poolLeftLegLengthIn",  wFt: "poolLeftLegWidthFt",  wIn: "poolLeftLegWidthIn",  fv: data.poolLeftLegLengthFt,  fi: data.poolLeftLegLengthIn,  wv: data.poolLeftLegWidthFt,  wi: data.poolLeftLegWidthIn  },
                         ...(data.poolCoverage === "horseshoe" ? [{ label: "Header", lFt: "poolHeaderLengthFt", lIn: "poolHeaderLengthIn", wFt: "poolHeaderWidthFt", wIn: "poolHeaderWidthIn", fv: data.poolHeaderLengthFt, fi: data.poolHeaderLengthIn, wv: data.poolHeaderWidthFt, wi: data.poolHeaderWidthIn }] : []),
                         { label: "Right Leg", lFt: "poolRightLegLengthFt", lIn: "poolRightLegLengthIn", wFt: "poolRightLegWidthFt", wIn: "poolRightLegWidthIn", fv: data.poolRightLegLengthFt, fi: data.poolRightLegLengthIn, wv: data.poolRightLegWidthFt, wi: data.poolRightLegWidthIn },
                        ] as Array<{ label: string; lFt: keyof DeckData; lIn: keyof DeckData; wFt: keyof DeckData; wIn: keyof DeckData; fv: number; fi: number; wv: number; wi: number }>
                      ).map((row) => {
                        const area = toFt(row.fv, row.fi) * toFt(row.wv, row.wi);
                        return (
                          <tr key={row.label}>
                            <td className="py-2 pr-3 text-xs font-medium text-slate-300 w-24">{row.label}</td>
                            <td className="py-2 pr-1 w-20">
                              <input type="number" min="0" value={row.fv === 0 ? "" : row.fv}
                                onChange={(e) => update(row.lFt, e.target.value === "" ? 0 : Number(e.target.value) as DeckData[typeof row.lFt])}
                                placeholder="0" className={inputCls} />
                            </td>
                            <td className="py-2 pr-3 w-16">
                              <div className="flex items-center gap-1">
                                <input type="number" min="0" max="11" value={row.fi === 0 ? "" : row.fi}
                                  onChange={(e) => update(row.lIn, e.target.value === "" ? 0 : Math.min(11, Number(e.target.value)) as DeckData[typeof row.lIn])}
                                  placeholder="0" className={inputCls} />
                                <span className="text-xs text-slate-500 flex-shrink-0">ft/in</span>
                              </div>
                            </td>
                            <td className="py-2 pr-1 w-20">
                              <input type="number" min="0" value={row.wv === 0 ? "" : row.wv}
                                onChange={(e) => update(row.wFt, e.target.value === "" ? 0 : Number(e.target.value) as DeckData[typeof row.wFt])}
                                placeholder="0" className={inputCls} />
                            </td>
                            <td className="py-2 pr-3 w-16">
                              <div className="flex items-center gap-1">
                                <input type="number" min="0" max="11" value={row.wi === 0 ? "" : row.wi}
                                  onChange={(e) => update(row.wIn, e.target.value === "" ? 0 : Math.min(11, Number(e.target.value)) as DeckData[typeof row.wIn])}
                                  placeholder="0" className={inputCls} />
                                <span className="text-xs text-slate-500 flex-shrink-0">ft/in</span>
                              </div>
                            </td>
                            <td className="py-2 text-right">
                              <span className="text-slate-300 font-medium text-sm">
                                {area > 0 ? area.toFixed(1) : "—"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {poolDeckArea > 0 && (
                  <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-4 py-2.5 text-sm">
                    <span className="text-blue-300">
                      Pool deck area: <span className="font-bold">{poolDeckArea.toFixed(1)} sqf</span>
                      <span className="text-slate-500 ml-2 text-xs">
                        ({data.poolCoverage === "horseshoe" ? "left leg + header + right leg" : "left leg + right leg"})
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Combined area summary */}
            {poolDeckArea > 0 && sectionsArea > 0 && (
              <div className="rounded-lg bg-slate-700/50 border border-slate-600 px-4 py-2.5 text-sm flex items-center justify-between">
                <span className="text-slate-400">Total including pool deck:</span>
                <span className="font-bold text-white">{totalArea.toFixed(1)} sqf</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Board Layout ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Board Layout</h3>
        <p className="text-xs text-slate-500">Which direction do the deck boards run? This determines board count.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Direction toggle */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Boards run along…</label>
            <div className="flex gap-2">
              {(["along_width", "along_length"] as const).map((dir) => {
                const isSelected = data.boardDirection === dir;
                const label = dir === "along_width" ? "Width (ledger side)" : "Length (joist direction)";
                return (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => update("boardDirection", dir)}
                    className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-900/25 text-blue-300"
                        : "border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Board face width */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Board Face Width <span className="text-slate-500">(in)</span>
            </label>
            <div className="flex gap-2">
              {[{ label: '5/4×6 (5.5")', value: 5.5 }, { label: 'Composite (5.25")', value: 5.25 }, { label: '2×6 (5.5")', value: 5.5 }].filter((o, i, arr) => arr.findIndex(x => x.value === o.value && x.label === o.label) === i).map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => update("boardWidthIn", opt.value)}
                  className={`flex-1 text-xs font-medium px-2 py-2 rounded-lg border transition-colors ${
                    data.boardWidthIn === opt.value
                      ? "border-blue-500 bg-blue-900/25 text-blue-300"
                      : "border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <div className="w-20 flex-shrink-0">
                <input
                  type="number"
                  value={data.boardWidthIn === 0 ? "" : data.boardWidthIn}
                  onChange={(e) => update("boardWidthIn", e.target.value === "" ? 5.5 : Number(e.target.value))}
                  placeholder="5.5"
                  min="3"
                  max="12"
                  step="0.25"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Border / Picture Frame */}
        <div className="pt-4 border-t border-slate-700 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Border Style
              <span className="text-slate-500 ml-1">— ledger side excluded</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {([
                { value: "none",             label: "No Border" },
                { value: "single",           label: "Single" },
                { value: "double_no_breaker", label: "Double" },
                { value: "double",           label: "Double + Breaker" },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update("borderStyle", value)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    data.borderStyle === value
                      ? "border-blue-500 bg-blue-900/25 text-blue-300"
                      : "border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {data.borderStyle !== "none" && data.sections.length > 0 && (() => {
              const totalLenFt = data.sections.reduce((s, sec) => s + toFt(sec.lengthFt, sec.lengthIn), 0);
              const depthFt    = toFt(data.sections[0].widthFt, data.sections[0].widthIn);
              const perimFt    = totalLenFt + depthFt * 2; // ledger excluded
              const isDouble   = data.borderStyle === "double" || data.borderStyle === "double_no_breaker";
              const totalBorderLf = perimFt * (isDouble ? 2 : 1);
              return (
                <p className="text-xs text-slate-400 mt-2">
                  Border perimeter: <span className="font-semibold text-white">{perimFt.toFixed(1)} lf</span>
                  {isDouble && (
                    <> × 2 = <span className="font-semibold text-white">{totalBorderLf.toFixed(1)} lf</span> total</>
                  )}
                  <span className="text-slate-500 ml-1">(front + 2 sides)</span>
                </p>
              );
            })()}
          </div>
        </div>

        <CarpentryHours
          fields={[
            { key: "leadCarpenterHours", label: "Lead Carpenter", value: data.leadCarpenterHours },
            { key: "carpenterHours", label: "Carpenter", value: data.carpenterHours },
          ]}
          onChange={(k, v) => update(k as "leadCarpenterHours" | "carpenterHours", v)}
        />

        {/* Board count summary */}
        {totalArea > 0 && (
          <div className="rounded-lg bg-emerald-900/20 border border-emerald-800/50 px-4 py-3 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-emerald-300 font-medium">Deck surface</span>
              <span className="text-white font-bold">{adjustedBoardCount} boards</span>
            </div>
            {stairBoardCount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-300 font-medium">Stair treads ({data.stairs} flight{data.stairs !== 1 ? "s" : ""} × {data.stairRisers} steps × 2)</span>
                <span className="text-white font-bold">{stairBoardCount} boards</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm border-t border-emerald-800/40 pt-1 mt-1">
              <span className="text-emerald-400 font-semibold">Total boards needed</span>
              <span className="text-emerald-300 font-bold text-base">{totalBoardCount} ea</span>
            </div>
            <p className="text-xs text-slate-500">
              Math: {data.sections.map(s => {
                const coverage = data.boardDirection === "along_width" ? toFt(s.lengthFt, s.lengthIn) : toFt(s.widthFt, s.widthIn);
                const cnt = Math.ceil((coverage * 12) / bwIn);
                return `${fmtFtIn(s.lengthFt, s.lengthIn)} × ${fmtFtIn(s.widthFt, s.widthIn)} → ${cnt} boards`;
              }).join(" + ")} + {data.wasteFactor}% waste
            </p>
          </div>
        )}
      </div>

      {/* ── Stairs ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Stairs</h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
{!linkedValues && (<>
                    <NumField
            label="Stair Flights"
            unit="count"
            value={data.stairs}
            onChange={(v) => update("stairs", v)}
          />
          <NumField
            label="Risers per Flight"
            value={data.stairRisers}
            onChange={(v) => update("stairRisers", v)}
            placeholder="7"
          />
          <div>
            <label className={labelCls}>Stair Width</label>
            <FtInPair
              ft={data.stairWidthFt}
              inches={data.stairWidthIn}
              onFt={(v) => update("stairWidthFt", v)}
              onIn={(v) => update("stairWidthIn", v)}
            />
          </div>
          </>)}
                    <NumField
            label="Stringers per Flight"
            value={data.stairStringers}
            onChange={(v) => update("stairStringers", v)}
            placeholder="3"
          />
        </div>

        {/* Stringer length — diagonal cut length determines 2×12 board count */}
        <div>
          <label className={labelCls}>
            Stringer Length <span className="text-slate-500">(diagonal cut length of each stringer)</span>
          </label>
          <FtInPair
            ft={data.stairStringerLengthFt}
            inches={data.stairStringerLengthIn}
            onFt={(v) => update("stairStringerLengthFt", v)}
            onIn={(v) => update("stairStringerLengthIn", v)}
          />
          {data.stairStringerLengthFt > 0 && (() => {
            const sLf = toFt(data.stairStringerLengthFt, data.stairStringerLengthIn);
            const STD_LENS = [8, 10, 12, 14, 16, 18, 20];
            const boardLen = STD_LENS.find(l => l >= sLf) ?? 20;
            const perBoard = Math.floor(boardLen / sLf);
            const boardCount = perBoard > 1
              ? Math.ceil(stairStringerCt / perBoard)
              : stairStringerCt;
            return (
              <p className="text-xs text-slate-400 mt-1">
                {stairStringerCt} stringers @ {sLf.toFixed(2)} lf → 2×12×{boardLen}&#39; boards needed:{" "}
                <span className="font-semibold text-white">{boardCount} ea</span>
                {perBoard > 1 && <span className="text-slate-500 ml-1">({perBoard} cuts per board)</span>}
              </p>
            );
          })()}
        </div>

        {data.stairs > 0 && (
          <div className="rounded-lg bg-slate-700/50 border border-slate-600 px-4 py-3 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Flights</p>
              <p className="font-semibold text-white">{data.stairs}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Treads total</p>
              <p className="font-semibold text-white">{stairTreads} ea</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Stringers total</p>
              <p className="font-semibold text-white">{stairStringerCt} ea</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Railing ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest pt-0.5">Railing</h3>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              {(["wood", "harmony", "advantage"] as const).map((type) => {
                const label = type === "wood" ? "Wood" : type === "harmony" ? "Harmony" : "TT Advantage";
                const isSelected = data.railingType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => update("railingType", type)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      isSelected
                        ? "border-blue-500 bg-blue-900/25 text-blue-300"
                        : "border-slate-600 text-slate-400 hover:border-blue-700 hover:text-blue-400"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {data.railingType === "advantage" && (
              <div className="flex gap-2">
                {(["white", "black", "espresso"] as const).map((color) => {
                  const isSelected = data.railingColor === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => update("railingColor", isSelected ? "" : color)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
                        isSelected
                          ? "border-amber-500 bg-amber-900/25 text-amber-300"
                          : "border-slate-600 text-slate-400 hover:border-amber-700 hover:text-amber-400"
                      }`}
                    >
                      {color.charAt(0).toUpperCase() + color.slice(1)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {linkedValues ? (
          <p className="text-sm text-slate-300">
            Railing: <span className="font-semibold text-white">{totalRailLf.toFixed(1)} lf</span>
            <span className="text-xs text-slate-500 ml-1">— sides, gates and stair opening are set on the Measurements tab; stair rail is worked out from the stairs</span>
          </p>
        ) : (<>
        {/* Deck railing runs */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-300">
            Deck Railing{" "}
            <span className="text-xs font-normal text-slate-500">straight / level sections</span>
          </p>

          <RailRunsTable
            runs={data.deckRailRuns}
            onUpdate={updateDeckRail}
            onAdd={addDeckRail}
            onAddLedger={addDeckLedger}
            onAddGate={addDeckGate}
            onRemove={removeDeckRail}
            addLabel="Add section"
          />
          {deckRailLf > 0 && (
            <p className="text-xs text-slate-400">
              Total deck railing: <span className="font-semibold text-white">{deckRailLf.toFixed(2)} lf</span>
            </p>
          )}
        </div>

        {/* Stair railing runs */}
        <div className="space-y-3 border-t border-slate-700 pt-5">
          <p className="text-sm font-medium text-slate-300">Stair Railing <span className="text-xs font-normal text-slate-500 ml-1">measured along the rake</span></p>
          {data.stairRailRuns.length === 0 ? (
            <button
              onClick={addStairRail}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add stair railing run
            </button>
          ) : (
            <>
              <RailRunsTable
                runs={data.stairRailRuns}
                onUpdate={updateStairRail}
                onAdd={addStairRail}
                onAddLedger={addStairLedger}
                onAddGate={addStairGate}
                onRemove={removeStairRail}
                addLabel="Add stair section"
              />
              {stairRailLf > 0 && (
                <p className="text-xs text-slate-400">
                  Total stair railing: <span className="font-semibold text-white">{stairRailLf.toFixed(2)} lf</span>
                </p>
              )}
            </>
          )}
        </div>

                </>)}

        {/* Post / baluster config */}
        {totalRailLf > 0 && (
          <div className="border-t border-slate-700 pt-5 space-y-4">
            <p className="text-sm font-medium text-slate-300">Post &amp; Baluster Layout</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <NumField
                label="Post Spacing"
                unit="ft"
                value={data.railingPostSpacing}
                onChange={(v) => update("railingPostSpacing", v)}
                placeholder="6"
                step={0.5}
              />
              <div>
                <label className={labelCls}>
                  Posts <span className="text-slate-500 ml-1">(0 = auto)</span>
                </label>
                <input
                  type="number"
                  value={data.railingPosts === 0 ? "" : data.railingPosts}
                  onChange={(e) => update("railingPosts", e.target.value === "" ? 0 : Number(e.target.value))}
                  placeholder={autoPosts > 0 ? `auto (${autoPosts})` : "0"}
                  min="0"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>
                  Post Caps <span className="text-slate-500 ml-1">(0 = auto)</span>
                </label>
                <input
                  type="number"
                  value={data.postCaps === 0 ? "" : data.postCaps}
                  onChange={(e) => update("postCaps", e.target.value === "" ? 0 : Number(e.target.value))}
                  placeholder={effectivePosts > 0 ? `auto (${effectivePosts})` : "0"}
                  min="0"
                  className={inputCls}
                />
              </div>
              <NumField
                label="Baluster Spacing"
                unit="in"
                value={data.railingBalusterSpacing}
                onChange={(v) => update("railingBalusterSpacing", v)}
                placeholder="4"
              />
            </div>

            <div className="rounded-lg bg-slate-700/50 border border-slate-600 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Deck railing</p>
                <p className="font-semibold text-white">{deckRailLf.toFixed(2)} lf</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Stair railing</p>
                <p className="font-semibold text-white">{stairRailLf.toFixed(2)} lf</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Posts</p>
                <p className="font-semibold text-white">
                  {effectivePosts} ea
                  {data.railingPosts === 0 && autoPosts > 0 && (
                    <span className="text-xs text-slate-500 ml-1">@ {data.railingPostSpacing} ft</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Balusters</p>
                <p className="font-semibold text-white">
                  {autoBalusters} ea
                  <span className="text-xs text-slate-500 ml-1">@ {data.railingBalusterSpacing}&quot;</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
