"use client";

import { useState, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface WallSection {
  id: string;
  label: string;
  length: number;
  height: number;
}

export interface ClosetNook {
  id: string;
  label: string;
  widthFt: number;
  widthIn: number;
  depthFt: number;   // 0 ft + 0 in = open nook (no back wall)
  depthIn: number;
  heightFt: number;
  heightIn: number;
  openingFt: number; // doorway opening subtracted from front wall
  openingIn: number;
}

export interface WallDoorEntry {
  id: string;
  label: string;
  widthFt: number;
  widthIn: number;
  heightFt: number;
  heightIn: number;
  count: number;
  type: "interior" | "exterior";
}

export interface WallWindowEntry {
  id: string;
  label: string;
  widthFt: number;
  widthIn: number;
  heightFt: number;
  heightIn: number;
  count: number;
}

export interface WallCeilingSection {
  id: string;
  label: string;
  length: number; // ft
  width: number;  // ft
}

export interface WallAssemblyData {
  walls: WallSection[];
  closets: ClosetNook[];
  doors: WallDoorEntry[];
  windows: WallWindowEntry[];
  ceilingSections: WallCeilingSection[];
  studSize: "2x4" | "2x6";
  studSpacing: 16 | 24;
  corners: number;
  // Accessories (rep-selected)
  redHeadAnchors: boolean;  // 1 anchor every 24" of bottom plate
  studShoes: boolean;       // 1 stud shoe per stud
  pipeGuards: boolean;      // nail protection plates (qty entered by rep)
  pipeGuardsQty: number;
}

interface Props {
  initialData?: Partial<WallAssemblyData>;
  onChange: (data: WallAssemblyData) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";

const DOOR_PRESETS = [
  { label: "2/0×6/8", wFt: 2, wIn: 0, hFt: 6, hIn: 8 },
  { label: "2/4×6/8", wFt: 2, wIn: 4, hFt: 6, hIn: 8 },
  { label: "2/6×6/8", wFt: 2, wIn: 6, hFt: 6, hIn: 8 },
  { label: "2/8×6/8", wFt: 2, wIn: 8, hFt: 6, hIn: 8 },
  { label: "3/0×6/8", wFt: 3, wIn: 0, hFt: 6, hIn: 8 },
  { label: "3/0×8/0", wFt: 3, wIn: 0, hFt: 8, hIn: 0 },
  { label: "6/0×6/8", wFt: 6, wIn: 0, hFt: 6, hIn: 8 },
];

const WINDOW_PRESETS = [
  { label: "2/0×3/0", wFt: 2, wIn: 0, hFt: 3, hIn: 0 },
  { label: "2/6×3/6", wFt: 2, wIn: 6, hFt: 3, hIn: 6 },
  { label: "3/0×4/0", wFt: 3, wIn: 0, hFt: 4, hIn: 0 },
  { label: "3/6×4/0", wFt: 3, wIn: 6, hFt: 4, hIn: 0 },
  { label: "4/0×4/0", wFt: 4, wIn: 0, hFt: 4, hIn: 0 },
  { label: "4/0×5/0", wFt: 4, wIn: 0, hFt: 5, hIn: 0 },
  { label: "5/0×4/0", wFt: 5, wIn: 0, hFt: 4, hIn: 0 },
  { label: "6/0×4/0", wFt: 6, wIn: 0, hFt: 4, hIn: 0 },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function newWall(): WallSection {
  return { id: uid(), label: "", length: 0, height: 8 };
}
function newCloset(): ClosetNook {
  return { id: uid(), label: "", widthFt: 0, widthIn: 0, depthFt: 0, depthIn: 0, heightFt: 8, heightIn: 0, openingFt: 3, openingIn: 0 };
}
function newDoor(): WallDoorEntry {
  return { id: uid(), label: "", widthFt: 0, widthIn: 0, heightFt: 0, heightIn: 0, count: 1, type: "interior" };
}
function newWindow(): WallWindowEntry {
  return { id: uid(), label: "", widthFt: 0, widthIn: 0, heightFt: 0, heightIn: 0, count: 1 };
}
function newCeiling(): WallCeilingSection {
  return { id: uid(), label: "", length: 0, width: 0 };
}
function uid() { return String(Date.now() + Math.random()); }

function totalIn(ft: number, inches: number): number { return ft * 12 + inches; }
function fmtFtIn(ft: number, inches: number): string {
  if (ft === 0 && inches === 0) return "—";
  return inches === 0 ? `${ft}'` : `${ft}' ${inches}"`;
}

function closetWallLf(c: ClosetNook): number {
  const w = (c.widthFt ?? 0) + (c.widthIn ?? 0) / 12;
  const d = (c.depthFt ?? 0) + (c.depthIn ?? 0) / 12;
  const opening = (c.openingFt ?? 3) + (c.openingIn ?? 0) / 12;
  if (w <= 0) return 0;
  if (d <= 0) return Math.max(0, w - opening);
  return Math.max(0, 2 * d + 2 * w - opening);
}

function headerSizeLabel(widthIn: number): string {
  if (widthIn <= 36) return "2×6";
  if (widthIn <= 60) return "2×8";
  if (widthIn <= 84) return "2×10";
  return "2×12";
}

// ── Ft + In input pair ─────────────────────────────────────────────────────
function FtInInput({
  label,
  ft,
  inches,
  onFt,
  onIn,
}: {
  label: string;
  ft: number;
  inches: number;
  onFt: (v: number) => void;
  onIn: (v: number) => void;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={ft || ""}
          onChange={(e) => onFt(Math.max(0, Number(e.target.value) || 0))}
          placeholder="0"
          min="0"
          className="w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <span className="text-slate-500 text-xs flex-shrink-0">ft</span>
        <input
          type="number"
          value={inches || ""}
          onChange={(e) => onIn(Math.min(11, Math.max(0, Number(e.target.value) || 0)))}
          placeholder="0"
          min="0"
          max="11"
          className="w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <span className="text-slate-500 text-xs flex-shrink-0">in</span>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-slate-600 hover:text-red-400 transition-colors p-1" title="Remove">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      {label}
    </button>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0}
          className="w-8 h-8 flex-shrink-0 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-bold flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed">−</button>
        <input type="number" value={value === 0 ? "" : value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          placeholder="0" min="0" className={inputCls + " text-center"} />
        <button type="button" onClick={() => onChange(value + 1)}
          className="w-8 h-8 flex-shrink-0 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-bold flex items-center justify-center transition-colors">+</button>
      </div>
    </div>
  );
}

function PresetBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="px-2 py-1 rounded bg-slate-600 hover:bg-slate-500 text-xs text-slate-300 hover:text-white border border-slate-600 hover:border-slate-500 transition-colors">
      {label}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function WallAssemblyMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<WallAssemblyData>({
    walls:           initialData?.walls           ?? [newWall()],
    closets:         initialData?.closets         ?? [],
    doors:           initialData?.doors           ?? [],
    windows:         initialData?.windows         ?? [],
    ceilingSections: initialData?.ceilingSections ?? [],
    studSize:        initialData?.studSize        ?? "2x4",
    studSpacing:     initialData?.studSpacing     ?? 16,
    corners:         initialData?.corners         ?? 0,
    redHeadAnchors:  initialData?.redHeadAnchors  ?? false,
    studShoes:       initialData?.studShoes       ?? false,
    pipeGuards:      initialData?.pipeGuards      ?? false,
    pipeGuardsQty:   initialData?.pipeGuardsQty   ?? 0,
  });
  const [roomL, setRoomL] = useState(0);
  const [roomW, setRoomW] = useState(0);
  const [roomH, setRoomH] = useState(8);

  // Emit initial state on mount so the parent's wallData is always current,
  // even when the user views the form without making any edits.
  useEffect(() => { onChange(data); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof WallAssemblyData>(key: K, value: WallAssemblyData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  /** Quick-add a rectangular room as 4 individual wall entries */
  function addRoom() {
    if (roomL <= 0 || roomW <= 0) return;
    const ht = roomH || 8;
    const four: WallSection[] = [
      { id: uid(), label: `${roomL}×${roomW} — Wall A`, length: roomL, height: ht },
      { id: uid(), label: `${roomL}×${roomW} — Wall B`, length: roomW, height: ht },
      { id: uid(), label: `${roomL}×${roomW} — Wall C`, length: roomL, height: ht },
      { id: uid(), label: `${roomL}×${roomW} — Wall D`, length: roomW, height: ht },
    ];
    // Drop the placeholder empty wall if it's the only one
    const existing = data.walls.filter((w) => w.length > 0);
    set("walls", [...existing, ...four]);
    setRoomL(0); setRoomW(0);
  }

  function patchWall(id: string, field: keyof WallSection, val: string | number) {
    set("walls", data.walls.map((w) => w.id === id ? { ...w, [field]: val } : w));
  }
  function patchCloset(id: string, field: keyof ClosetNook, val: string | number) {
    set("closets", data.closets.map((c) => c.id === id ? { ...c, [field]: val } : c));
  }
  function patchDoor(id: string, field: keyof WallDoorEntry, val: string | number) {
    set("doors", data.doors.map((d) => d.id === id ? { ...d, [field]: val } : d));
  }
  function patchWindow(id: string, field: keyof WallWindowEntry, val: string | number) {
    set("windows", data.windows.map((w) => w.id === id ? { ...w, [field]: val } : w));
  }
  function patchCeiling(id: string, field: keyof WallCeilingSection, val: string | number) {
    set("ceilingSections", data.ceilingSections.map((c) => c.id === id ? { ...c, [field]: val } : c));
  }

  // ── Derived totals ────────────────────────────────────────────────────────

  const wallLf    = data.walls.reduce((s, w) => s + (w.length || 0), 0);
  const closetLf  = data.closets.reduce((s, c) => s + closetWallLf(c), 0);
  const totalLf   = wallLf + closetLf;

  const totalDoors   = data.doors.reduce((s, d) => s + (d.count || 0), 0);
  const totalWindows = data.windows.reduce((s, w) => s + (w.count || 0), 0);

  // Stud count
  let studCount = 0;
  for (const w of data.walls) {
    if ((w.length || 0) > 0) studCount += Math.ceil((w.length * 12) / data.studSpacing) + 1;
  }
  for (const c of data.closets) {
    const lf = closetWallLf(c);
    if (lf > 0) studCount += Math.ceil((lf * 12) / data.studSpacing) + 1;
  }
  studCount += (totalDoors + totalWindows) * 2;
  studCount += data.corners * 2;
  studCount += data.closets.filter((c) => closetWallLf(c) > 0).length * 4;

  const plateLf    = Math.ceil(totalLf * 3);
  const headerCount = totalDoors + totalWindows;

  // Accessory counts (for preview only — engine calculates authoritatively)
  const anchorCount   = data.redHeadAnchors ? Math.ceil(totalLf / 2) : 0;   // 1 per 24"
  const shoeCount     = data.studShoes      ? studCount : 0;                  // 1 per stud
  const pgCount       = data.pipeGuards     ? data.pipeGuardsQty : 0;

  // Avg height for stud label
  const heights = [
    ...data.walls.filter((w) => w.height > 0).map((w) => w.height),
    ...data.closets.map((c) => (c.heightFt ?? 0) + (c.heightIn ?? 0) / 12).filter((h) => h > 0),
  ];
  const avgHeight = heights.length ? heights.reduce((s, h) => s + h, 0) / heights.length : 8;
  const studLenLabel = avgHeight <= 8.1 ? "8'" : avgHeight <= 9.1 ? "9'" : "10'";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Wall Sections ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Wall Sections</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                <th className="pb-2 pr-3 font-medium">Label</th>
                <th className="pb-2 pr-3 font-medium">Length (ft)</th>
                <th className="pb-2 pr-3 font-medium">Height (ft)</th>
                <th className="pb-2 pr-3 font-medium text-right">Area (sqf)</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {data.walls.map((wall, idx) => {
                const area = (wall.length || 0) * (wall.height || 0);
                return (
                  <tr key={wall.id}>
                    <td className="py-2 pr-3">
                      <input type="text" value={wall.label}
                        onChange={(e) => patchWall(wall.id, "label", e.target.value)}
                        placeholder={`Wall ${idx + 1}`} className={inputCls} />
                    </td>
                    <td className="py-2 pr-3">
                      <input type="number" value={wall.length === 0 ? "" : wall.length}
                        onChange={(e) => patchWall(wall.id, "length", Number(e.target.value) || 0)}
                        placeholder="0" min="0" step="0.5" className={inputCls} />
                    </td>
                    <td className="py-2 pr-3">
                      <input type="number" value={wall.height === 0 ? "" : wall.height}
                        onChange={(e) => patchWall(wall.id, "height", Number(e.target.value) || 0)}
                        placeholder="8" min="0" step="0.5" className={inputCls} />
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <span className="text-slate-300 font-medium">{area > 0 ? area.toLocaleString() : "—"}</span>
                    </td>
                    <td className="py-2">
                      {data.walls.length > 1 && <RemoveBtn onClick={() => set("walls", data.walls.filter((w) => w.id !== wall.id))} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-end gap-3 pt-1">
          <AddBtn onClick={() => set("walls", [...data.walls, newWall()])} label="Add Wall" />
          <span className="text-slate-600 text-xs">or</span>
          {/* Quick Room Entry */}
          <div className="flex items-end gap-1.5">
            <div>
              <label className="block text-xs text-slate-500 mb-1">L (ft)</label>
              <input type="number" value={roomL || ""} onChange={(e) => setRoomL(Number(e.target.value) || 0)}
                placeholder="0" min="0" step="0.5"
                className="w-16 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
            </div>
            <span className="text-slate-500 text-sm pb-2">×</span>
            <div>
              <label className="block text-xs text-slate-500 mb-1">W (ft)</label>
              <input type="number" value={roomW || ""} onChange={(e) => setRoomW(Number(e.target.value) || 0)}
                placeholder="0" min="0" step="0.5"
                className="w-16 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">H (ft)</label>
              <input type="number" value={roomH || ""} onChange={(e) => setRoomH(Number(e.target.value) || 0)}
                placeholder="8" min="0" step="0.5"
                className="w-16 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
            </div>
            <button type="button" onClick={addRoom} disabled={roomL <= 0 || roomW <= 0}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors">
              Add Room
            </button>
          </div>
        </div>
        {wallLf > 0 && <p className="text-xs text-slate-500">{wallLf} lf · {data.walls.reduce((s, w) => s + (w.length || 0) * (w.height || 0), 0).toLocaleString()} sqf</p>}
      </div>

      {/* ── Closets & Nooks ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Closets &amp; Nooks</h3>
            <p className="text-xs text-slate-500 mt-0.5">Leave Depth at 0 for an open nook (no back wall). Opening = doorway width cut from the front plate.</p>
          </div>
          {closetLf > 0 && <span className="text-xs text-slate-500">{closetLf.toFixed(1)} lf</span>}
        </div>

        <div className="space-y-3">
          {data.closets.map((c, idx) => {
            const lf  = closetWallLf(c);
            const isNook = (c.depthFt ?? 0) === 0 && (c.depthIn ?? 0) === 0;
            return (
              <div key={c.id} className="rounded-lg bg-slate-700/40 border border-slate-700 p-4 space-y-3">
                {/* header row */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium w-5">{idx + 1}</span>
                  <input type="text" value={c.label}
                    onChange={(e) => patchCloset(c.id, "label", e.target.value)}
                    placeholder={`Closet ${idx + 1}`}
                    className="flex-1 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${isNook ? "text-amber-300 bg-amber-900/20 border-amber-700/40" : "text-emerald-300 bg-emerald-900/20 border-emerald-700/40"}`}>
                    {isNook ? "Open nook" : "Full closet"}
                  </span>
                  <RemoveBtn onClick={() => set("closets", data.closets.filter((x) => x.id !== c.id))} />
                </div>

                {/* dimension inputs */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <FtInInput label="Width"
                    ft={c.widthFt} inches={c.widthIn}
                    onFt={(v) => patchCloset(c.id, "widthFt", v)}
                    onIn={(v) => patchCloset(c.id, "widthIn", v)} />
                  <FtInInput label="Depth (0 = open nook)"
                    ft={c.depthFt} inches={c.depthIn}
                    onFt={(v) => patchCloset(c.id, "depthFt", v)}
                    onIn={(v) => patchCloset(c.id, "depthIn", v)} />
                  <FtInInput label="Height"
                    ft={c.heightFt} inches={c.heightIn}
                    onFt={(v) => patchCloset(c.id, "heightFt", v)}
                    onIn={(v) => patchCloset(c.id, "heightIn", v)} />
                  <FtInInput label="Opening width"
                    ft={c.openingFt} inches={c.openingIn}
                    onFt={(v) => patchCloset(c.id, "openingFt", v)}
                    onIn={(v) => patchCloset(c.id, "openingIn", v)} />
                </div>

                {/* summary */}
                {lf > 0 && (
                  <p className="text-xs text-slate-500">
                    {lf.toFixed(1)} lf of framing
                    {!isNook && ` · back ${(c.widthFt ?? 0) + (c.widthIn ?? 0) / 12 > 0 ? fmtFtIn(c.widthFt, c.widthIn) : "—"} · sides ${fmtFtIn(c.depthFt, c.depthIn)} × 2`}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <AddBtn onClick={() => set("closets", [...data.closets, newCloset()])} label="Add Closet / Nook" />
      </div>

      {/* ── Doors ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Door Openings</h3>
          {totalDoors > 0 && (
            <span className="text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-700/50 px-2.5 py-1 rounded-full">
              {totalDoors} door{totalDoors !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {data.doors.length === 0 && (
          <p className="text-xs text-slate-500">No doors added — jack studs and headers won&apos;t be calculated.</p>
        )}

        <div className="space-y-4">
          {data.doors.map((door, idx) => (
            <div key={door.id} className="rounded-lg bg-slate-700/40 border border-slate-700 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium w-5">{idx + 1}</span>
                <input type="text" value={door.label}
                  onChange={(e) => patchDoor(door.id, "label", e.target.value)}
                  placeholder={`Door ${idx + 1} — e.g. "Master Bed"`}
                  className={inputCls + " flex-1"} />
                <RemoveBtn onClick={() => set("doors", data.doors.filter((d) => d.id !== door.id))} />
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1.5">Quick size:</p>
                <div className="flex flex-wrap gap-1.5">
                  {DOOR_PRESETS.map((p) => (
                    <PresetBtn key={p.label} label={p.label}
                      onClick={() => set("doors", data.doors.map((d) => d.id === door.id
                        ? { ...d, widthFt: p.wFt, widthIn: p.wIn, heightFt: p.hFt, heightIn: p.hIn }
                        : d))} />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <FtInInput label="Width"
                  ft={door.widthFt} inches={door.widthIn}
                  onFt={(v) => patchDoor(door.id, "widthFt", v)}
                  onIn={(v) => patchDoor(door.id, "widthIn", v)} />
                <FtInInput label="Height"
                  ft={door.heightFt} inches={door.heightIn}
                  onFt={(v) => patchDoor(door.id, "heightFt", v)}
                  onIn={(v) => patchDoor(door.id, "heightIn", v)} />
                <div className="space-y-3">
                  <div>
                    <label className={labelCls}>Count</label>
                    <input type="number" value={door.count === 0 ? "" : door.count}
                      onChange={(e) => patchDoor(door.id, "count", Math.max(1, Number(e.target.value) || 1))}
                      placeholder="1" min="1" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Type</label>
                    <div className="flex gap-1">
                      {(["interior", "exterior"] as const).map((t) => (
                        <button key={t} type="button" onClick={() => patchDoor(door.id, "type", t)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                            door.type === t ? "bg-blue-600 border-blue-600 text-white" : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500"
                          }`}>
                          {t === "interior" ? "Interior" : "Exterior"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {(door.widthFt > 0 || door.widthIn > 0) && (
                <p className="text-xs text-slate-400">
                  Size: <span className="text-white">{fmtFtIn(door.widthFt, door.widthIn)} × {fmtFtIn(door.heightFt, door.heightIn)}</span>
                  {" · "}RO: {totalIn(door.widthFt, door.widthIn) + 2}&quot; wide
                  {" · "}header: <span className="text-white font-medium">{headerSizeLabel(totalIn(door.widthFt, door.widthIn))}</span>
                  {door.count > 1 && ` × ${door.count}`}
                </p>
              )}
            </div>
          ))}
        </div>
        <AddBtn onClick={() => set("doors", [...data.doors, newDoor()])} label="Add Door" />
      </div>

      {/* ── Windows ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Window Openings</h3>
          {totalWindows > 0 && (
            <span className="text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-700/50 px-2.5 py-1 rounded-full">
              {totalWindows} window{totalWindows !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {data.windows.length === 0 && (
          <p className="text-xs text-slate-500">No windows added — jack studs and headers won&apos;t be calculated.</p>
        )}

        <div className="space-y-4">
          {data.windows.map((win, idx) => (
            <div key={win.id} className="rounded-lg bg-slate-700/40 border border-slate-700 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium w-5">{idx + 1}</span>
                <input type="text" value={win.label}
                  onChange={(e) => patchWindow(win.id, "label", e.target.value)}
                  placeholder={`Window ${idx + 1} — e.g. "Living room"`}
                  className={inputCls + " flex-1"} />
                <RemoveBtn onClick={() => set("windows", data.windows.filter((w) => w.id !== win.id))} />
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1.5">Quick size:</p>
                <div className="flex flex-wrap gap-1.5">
                  {WINDOW_PRESETS.map((p) => (
                    <PresetBtn key={p.label} label={p.label}
                      onClick={() => set("windows", data.windows.map((w) => w.id === win.id
                        ? { ...w, widthFt: p.wFt, widthIn: p.wIn, heightFt: p.hFt, heightIn: p.hIn }
                        : w))} />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FtInInput label="Width"
                  ft={win.widthFt} inches={win.widthIn}
                  onFt={(v) => patchWindow(win.id, "widthFt", v)}
                  onIn={(v) => patchWindow(win.id, "widthIn", v)} />
                <FtInInput label="Height"
                  ft={win.heightFt} inches={win.heightIn}
                  onFt={(v) => patchWindow(win.id, "heightFt", v)}
                  onIn={(v) => patchWindow(win.id, "heightIn", v)} />
                <div>
                  <label className={labelCls}>Count</label>
                  <input type="number" value={win.count === 0 ? "" : win.count}
                    onChange={(e) => patchWindow(win.id, "count", Math.max(1, Number(e.target.value) || 1))}
                    placeholder="1" min="1" className={inputCls} />
                </div>
              </div>

              {(win.widthFt > 0 || win.widthIn > 0) && (
                <p className="text-xs text-slate-400">
                  Size: <span className="text-white">{fmtFtIn(win.widthFt, win.widthIn)} × {fmtFtIn(win.heightFt, win.heightIn)}</span>
                  {" · "}RO: {totalIn(win.widthFt, win.widthIn) + 1}&quot; wide
                  {" · "}header: <span className="text-white font-medium">{headerSizeLabel(totalIn(win.widthFt, win.widthIn))}</span>
                  {win.count > 1 && ` × ${win.count}`}
                </p>
              )}
            </div>
          ))}
        </div>
        <AddBtn onClick={() => set("windows", [...data.windows, newWindow()])} label="Add Window" />
      </div>

      {/* ── Ceiling Sections ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Ceiling Sections</h3>
            <p className="text-xs text-slate-500 mt-0.5">Rooms where ceiling work is needed — drop ceiling, joist work, etc.</p>
          </div>
          {data.ceilingSections.length > 0 && (
            <span className="text-xs font-semibold bg-teal-600/20 text-teal-300 border border-teal-700/50 px-2.5 py-1 rounded-full flex-shrink-0">
              {data.ceilingSections.reduce((s, c) => s + c.length * c.width, 0).toFixed(0)} sqft
            </span>
          )}
        </div>

        {data.ceilingSections.length === 0 && (
          <p className="text-xs text-slate-500">No ceiling sections added.</p>
        )}

        <div className="space-y-3">
          {data.ceilingSections.map((c, idx) => {
            const area = c.length * c.width;
            return (
              <div key={c.id} className="rounded-lg bg-slate-700/40 border border-slate-700 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium w-5">{idx + 1}</span>
                  <input type="text" value={c.label}
                    onChange={(e) => patchCeiling(c.id, "label", e.target.value)}
                    placeholder={`Room ${idx + 1} — e.g. "Living Room"`}
                    className={inputCls + " flex-1"} />
                  <RemoveBtn onClick={() => set("ceilingSections", data.ceilingSections.filter((x) => x.id !== c.id))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Length (ft)</label>
                    <input type="number" min="0" step="0.5"
                      value={c.length || ""}
                      onChange={(e) => patchCeiling(c.id, "length", Number(e.target.value) || 0)}
                      placeholder="0" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Width (ft)</label>
                    <input type="number" min="0" step="0.5"
                      value={c.width || ""}
                      onChange={(e) => patchCeiling(c.id, "width", Number(e.target.value) || 0)}
                      placeholder="0" className={inputCls} />
                  </div>
                </div>
                {area > 0 && (
                  <p className="text-xs text-slate-400">
                    {c.length} × {c.width} = <span className="text-white font-medium">{area.toFixed(0)} sqft</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <AddBtn onClick={() => set("ceilingSections", [...data.ceilingSections, newCeiling()])} label="Add Ceiling Section" />
      </div>

      {/* ── Framing Options ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Framing Options</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className={labelCls}>Stud Size</label>
            <div className="flex gap-1">
              {(["2x4", "2x6"] as const).map((s) => (
                <button key={s} type="button" onClick={() => set("studSize", s)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    data.studSize === s ? "bg-blue-600 border-blue-600 text-white" : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500"
                  }`}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Spacing (OC)</label>
            <div className="flex gap-1">
              {([16, 24] as const).map((sp) => (
                <button key={sp} type="button" onClick={() => set("studSpacing", sp)}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    data.studSpacing === sp ? "bg-blue-600 border-blue-600 text-white" : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500"
                  }`}>{sp}&quot;</button>
              ))}
            </div>
          </div>
          <Stepper label="Corner Assemblies" value={data.corners} onChange={(v) => set("corners", v)} />
        </div>

        {/* ── Accessories (rep-selected) ── */}
        <div className="border-t border-slate-700 pt-4">
          <p className="text-xs font-medium text-slate-400 mb-3">Accessories</p>
          <div className="flex flex-wrap gap-2">

            {/* Red Head Anchors */}
            <button type="button" onClick={() => set("redHeadAnchors", !data.redHeadAnchors)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                data.redHeadAnchors
                  ? "bg-orange-600/20 border-orange-500 text-orange-300"
                  : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500"
              }`}>
              <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-xs ${
                data.redHeadAnchors ? "bg-orange-500 border-orange-500 text-white" : "border-slate-500"
              }`}>{data.redHeadAnchors ? "✓" : ""}</span>
              Red Head Anchors
              {data.redHeadAnchors && totalLf > 0 && (
                <span className="text-xs text-orange-400">({anchorCount} ea)</span>
              )}
            </button>

            {/* Stud Shoes */}
            <button type="button" onClick={() => set("studShoes", !data.studShoes)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                data.studShoes
                  ? "bg-orange-600/20 border-orange-500 text-orange-300"
                  : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500"
              }`}>
              <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-xs ${
                data.studShoes ? "bg-orange-500 border-orange-500 text-white" : "border-slate-500"
              }`}>{data.studShoes ? "✓" : ""}</span>
              Stud Shoes
              {data.studShoes && studCount > 0 && (
                <span className="text-xs text-orange-400">({shoeCount} ea)</span>
              )}
            </button>

            {/* Pipe Guards */}
            <button type="button" onClick={() => set("pipeGuards", !data.pipeGuards)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                data.pipeGuards
                  ? "bg-orange-600/20 border-orange-500 text-orange-300"
                  : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500"
              }`}>
              <span className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center text-xs ${
                data.pipeGuards ? "bg-orange-500 border-orange-500 text-white" : "border-slate-500"
              }`}>{data.pipeGuards ? "✓" : ""}</span>
              Pipe Guards
            </button>

          </div>

          {/* Pipe Guards qty input — only shown when toggled on */}
          {data.pipeGuards && (
            <div className="mt-3 flex items-center gap-3">
              <label className="text-xs text-slate-400 flex-shrink-0">Pipe guard qty:</label>
              <div className="flex items-center gap-1 w-40">
                <button type="button" onClick={() => set("pipeGuardsQty", Math.max(0, data.pipeGuardsQty - 1))}
                  className="w-7 h-7 flex-shrink-0 rounded bg-slate-600 hover:bg-slate-500 text-white font-bold flex items-center justify-center transition-colors">−</button>
                <input type="number" value={data.pipeGuardsQty === 0 ? "" : data.pipeGuardsQty}
                  onChange={(e) => set("pipeGuardsQty", Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0" min="0"
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                <button type="button" onClick={() => set("pipeGuardsQty", data.pipeGuardsQty + 1)}
                  className="w-7 h-7 flex-shrink-0 rounded bg-slate-600 hover:bg-slate-500 text-white font-bold flex items-center justify-center transition-colors">+</button>
              </div>
              {pgCount > 0 && <span className="text-xs text-orange-400">{pgCount} ea</span>}
            </div>
          )}
        </div>
      </div>

      {/* ── Material Estimate ── */}
      {totalLf > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Material Estimate</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Studs</p>
              <p className="text-lg font-bold text-white">{studCount}</p>
              <p className="text-xs text-slate-400">{data.studSize} × {studLenLabel}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Plate Material</p>
              <p className="text-lg font-bold text-white">{plateLf} lf</p>
              <p className="text-xs text-slate-400">bottom + dbl top</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Headers</p>
              <p className="text-lg font-bold text-white">{headerCount}</p>
              <p className="text-xs text-slate-400">
                {totalDoors > 0 && `${totalDoors}D`}
                {totalDoors > 0 && totalWindows > 0 && " · "}
                {totalWindows > 0 && `${totalWindows}W`}
              </p>
            </div>
            <div className="bg-slate-700/50 rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Total Wall LF</p>
              <p className="text-lg font-bold text-white">{totalLf.toFixed(1)}</p>
              <p className="text-xs text-slate-400">
                {wallLf} walls{closetLf > 0 ? ` · ${closetLf.toFixed(1)} closets` : ""}
              </p>
            </div>
          </div>

          {/* Accessories summary row */}
          {(anchorCount > 0 || shoeCount > 0 || pgCount > 0) && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-orange-900/20 border border-orange-800/40 px-4 py-2.5">
              <p className="text-xs text-orange-400 font-medium w-full mb-0.5">Accessories</p>
              {anchorCount > 0 && (
                <span className="text-xs text-slate-300">Red Head Anchors: <span className="text-white font-medium">{anchorCount} ea</span> <span className="text-slate-500">(24" OC)</span></span>
              )}
              {shoeCount > 0 && (
                <span className="text-xs text-slate-300">Stud Shoes: <span className="text-white font-medium">{shoeCount} ea</span></span>
              )}
              {pgCount > 0 && (
                <span className="text-xs text-slate-300">Pipe Guards: <span className="text-white font-medium">{pgCount} ea</span></span>
              )}
            </div>
          )}


          {/* Per-opening header breakdown */}
          {(totalDoors > 0 || totalWindows > 0) && (
            <div className="rounded-lg bg-slate-700/30 border border-slate-700 px-4 py-3">
              <p className="text-xs text-slate-500 mb-2">Header sizes by opening:</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {data.doors.filter((d) => d.widthFt > 0 || d.widthIn > 0).map((d, i) => (
                  <span key={d.id} className="text-xs text-slate-300">
                    {d.label || `Door ${i + 1}`} ({fmtFtIn(d.widthFt, d.widthIn)} × {fmtFtIn(d.heightFt, d.heightIn)}):
                    {" "}<span className="text-white font-medium">{headerSizeLabel(totalIn(d.widthFt, d.widthIn))} header</span>
                    {d.count > 1 ? ` × ${d.count}` : ""}
                  </span>
                ))}
                {data.windows.filter((w) => w.widthFt > 0 || w.widthIn > 0).map((w, i) => (
                  <span key={w.id} className="text-xs text-slate-300">
                    {w.label || `Window ${i + 1}`} ({fmtFtIn(w.widthFt, w.widthIn)} × {fmtFtIn(w.heightFt, w.heightIn)}):
                    {" "}<span className="text-white font-medium">{headerSizeLabel(totalIn(w.widthFt, w.widthIn))} header</span>
                    {w.count > 1 ? ` × ${w.count}` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
