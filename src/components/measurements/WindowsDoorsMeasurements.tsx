"use client";

import { useState } from "react";

export interface DoorEntry {
  id: string;
  label: string;
  widthFt: number;
  widthIn: number;
  heightFt: number;
  heightIn: number;
  count: number;
  type: "interior" | "exterior";
  style: "prehung" | "slab";
}

export interface WindowEntry {
  id: string;
  label: string;
  widthFt: number;
  widthIn: number;
  heightFt: number;
  heightIn: number;
  count: number;
}

export interface WindowsDoorData {
  doors: DoorEntry[];
  windows: WindowEntry[];
}

interface Props {
  initialData?: Partial<WindowsDoorData>;
  onChange: (data: WindowsDoorData) => void;
}

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

function uid() { return String(Date.now() + Math.random()); }
function totalIn(ft: number, inches: number) { return ft * 12 + inches; }
function fmtFtIn(ft: number, inches: number): string {
  if (ft === 0 && inches === 0) return "—";
  return inches === 0 ? `${ft}'` : `${ft}' ${inches}"`;
}

function newDoor(): DoorEntry {
  return { id: uid(), label: "", widthFt: 0, widthIn: 0, heightFt: 0, heightIn: 0, count: 1, type: "interior", style: "prehung" };
}
function newWindow(): WindowEntry {
  return { id: uid(), label: "", widthFt: 0, widthIn: 0, heightFt: 0, heightIn: 0, count: 1 };
}

// Casing LF estimate: perimeter × 2 sides, in inches converted to lf
function casingLf(wFt: number, wIn: number, hFt: number, hIn: number): number {
  const wTotal = totalIn(wFt, wIn) / 12;
  const hTotal = totalIn(hFt, hIn) / 12;
  if (wTotal <= 0 || hTotal <= 0) return 0;
  return Math.ceil((2 * hTotal + wTotal) * 2);
}

function PresetBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 hover:text-white border border-slate-600 hover:border-slate-500 transition-colors">
      {label}
    </button>
  );
}

function FtInInput({ label, ft, inches, onFt, onIn }: {
  label: string; ft: number; inches: number;
  onFt: (v: number) => void; onIn: (v: number) => void;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-1">
        <input type="number" value={ft || ""}
          onChange={(e) => onFt(Math.max(0, Number(e.target.value) || 0))}
          placeholder="0" min="0"
          className="w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
        <span className="text-slate-500 text-xs flex-shrink-0">ft</span>
        <input type="number" value={inches || ""}
          onChange={(e) => onIn(Math.min(11, Math.max(0, Number(e.target.value) || 0)))}
          placeholder="0" min="0" max="11"
          className="w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
        <span className="text-slate-500 text-xs flex-shrink-0">in</span>
      </div>
    </div>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-slate-600 hover:text-red-400 transition-colors p-1" title="Remove">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}

export default function WindowsDoorsMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<WindowsDoorData>({
    doors: initialData?.doors ?? [newDoor()],
    windows: initialData?.windows ?? [newWindow()],
  });

  function patchDoor(id: string, patch: Partial<DoorEntry>) {
    const next = { ...data, doors: data.doors.map((d) => d.id === id ? { ...d, ...patch } : d) };
    setData(next); onChange(next);
  }
  function patchWindow(id: string, patch: Partial<WindowEntry>) {
    const next = { ...data, windows: data.windows.map((w) => w.id === id ? { ...w, ...patch } : w) };
    setData(next); onChange(next);
  }
  function addDoor() { const next = { ...data, doors: [...data.doors, newDoor()] }; setData(next); onChange(next); }
  function removeDoor(id: string) { const next = { ...data, doors: data.doors.filter((d) => d.id !== id) }; setData(next); onChange(next); }
  function addWindow() { const next = { ...data, windows: [...data.windows, newWindow()] }; setData(next); onChange(next); }
  function removeWindow(id: string) { const next = { ...data, windows: data.windows.filter((w) => w.id !== id) }; setData(next); onChange(next); }

  const totalDoors   = data.doors.reduce((s, d) => s + (d.count || 0), 0);
  const totalWindows = data.windows.reduce((s, w) => s + (w.count || 0), 0);
  const totalCasingLf = [
    ...data.doors.map((d) => casingLf(d.widthFt, d.widthIn, d.heightFt, d.heightIn) * (d.count || 0)),
    ...data.windows.map((w) => casingLf(w.widthFt, w.widthIn, w.heightFt, w.heightIn) * (w.count || 0)),
  ].reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-6">

      {/* ── Doors ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Doors</h3>
          {totalDoors > 0 && (
            <span className="text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-700/50 px-2.5 py-1 rounded-full">
              {totalDoors} total
            </span>
          )}
        </div>

        <div className="space-y-4">
          {data.doors.map((door, idx) => (
            <div key={door.id} className="rounded-lg bg-slate-700/40 border border-slate-700 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium w-5">{idx + 1}</span>
                <input type="text" value={door.label}
                  onChange={(e) => patchDoor(door.id, { label: e.target.value })}
                  placeholder={`Door ${idx + 1} — e.g. "Master bedroom"`}
                  className={inputCls + " flex-1"} />
                {data.doors.length > 1 && <RemoveBtn onClick={() => removeDoor(door.id)} />}
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1.5">Quick size:</p>
                <div className="flex flex-wrap gap-1.5">
                  {DOOR_PRESETS.map((p) => (
                    <PresetBtn key={p.label} label={p.label}
                      onClick={() => patchDoor(door.id, { widthFt: p.wFt, widthIn: p.wIn, heightFt: p.hFt, heightIn: p.hIn })} />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <FtInInput label="Width"
                  ft={door.widthFt} inches={door.widthIn}
                  onFt={(v) => patchDoor(door.id, { widthFt: v })}
                  onIn={(v) => patchDoor(door.id, { widthIn: v })} />
                <FtInInput label="Height"
                  ft={door.heightFt} inches={door.heightIn}
                  onFt={(v) => patchDoor(door.id, { heightFt: v })}
                  onIn={(v) => patchDoor(door.id, { heightIn: v })} />
                <div>
                  <label className={labelCls}>Count</label>
                  <input type="number" value={door.count === 0 ? "" : door.count}
                    onChange={(e) => patchDoor(door.id, { count: Math.max(1, Number(e.target.value) || 1) })}
                    placeholder="1" min="1" className={inputCls} />
                </div>
                <div className="space-y-2">
                  <div>
                    <label className={labelCls}>Type</label>
                    <div className="flex gap-1">
                      {(["interior", "exterior"] as const).map((t) => (
                        <button key={t} type="button" onClick={() => patchDoor(door.id, { type: t })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${door.type === t ? "bg-blue-600 border-blue-600 text-white" : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500"}`}>
                          {t === "interior" ? "Int" : "Ext"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Style</label>
                    <div className="flex gap-1">
                      {(["prehung", "slab"] as const).map((s) => (
                        <button key={s} type="button" onClick={() => patchDoor(door.id, { style: s })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${door.style === s ? "bg-blue-600 border-blue-600 text-white" : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500"}`}>
                          {s === "prehung" ? "Pre" : "Slab"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {(door.widthFt > 0 || door.widthIn > 0) && (
                <p className="text-xs text-slate-400">
                  <span className="text-white">{fmtFtIn(door.widthFt, door.widthIn)} × {fmtFtIn(door.heightFt, door.heightIn)}</span>
                  {" · "}RO: {totalIn(door.widthFt, door.widthIn) + 2}&quot; wide
                  {" · "}casing ~{casingLf(door.widthFt, door.widthIn, door.heightFt, door.heightIn)} lf/door
                  {door.count > 1 && ` × ${door.count}`}
                </p>
              )}
            </div>
          ))}
        </div>

        <button onClick={addDoor}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Door Size
        </button>
      </div>

      {/* ── Windows ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Windows</h3>
          {totalWindows > 0 && (
            <span className="text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-700/50 px-2.5 py-1 rounded-full">
              {totalWindows} total
            </span>
          )}
        </div>

        <div className="space-y-4">
          {data.windows.map((win, idx) => (
            <div key={win.id} className="rounded-lg bg-slate-700/40 border border-slate-700 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium w-5">{idx + 1}</span>
                <input type="text" value={win.label}
                  onChange={(e) => patchWindow(win.id, { label: e.target.value })}
                  placeholder={`Window ${idx + 1} — e.g. "Living room"`}
                  className={inputCls + " flex-1"} />
                {data.windows.length > 1 && <RemoveBtn onClick={() => removeWindow(win.id)} />}
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1.5">Quick size:</p>
                <div className="flex flex-wrap gap-1.5">
                  {WINDOW_PRESETS.map((p) => (
                    <PresetBtn key={p.label} label={p.label}
                      onClick={() => patchWindow(win.id, { widthFt: p.wFt, widthIn: p.wIn, heightFt: p.hFt, heightIn: p.hIn })} />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <FtInInput label="Width"
                  ft={win.widthFt} inches={win.widthIn}
                  onFt={(v) => patchWindow(win.id, { widthFt: v })}
                  onIn={(v) => patchWindow(win.id, { widthIn: v })} />
                <FtInInput label="Height"
                  ft={win.heightFt} inches={win.heightIn}
                  onFt={(v) => patchWindow(win.id, { heightFt: v })}
                  onIn={(v) => patchWindow(win.id, { heightIn: v })} />
                <div>
                  <label className={labelCls}>Count</label>
                  <input type="number" value={win.count === 0 ? "" : win.count}
                    onChange={(e) => patchWindow(win.id, { count: Math.max(1, Number(e.target.value) || 1) })}
                    placeholder="1" min="1" className={inputCls} />
                </div>
              </div>

              {(win.widthFt > 0 || win.widthIn > 0) && (
                <p className="text-xs text-slate-400">
                  <span className="text-white">{fmtFtIn(win.widthFt, win.widthIn)} × {fmtFtIn(win.heightFt, win.heightIn)}</span>
                  {" · "}RO: {totalIn(win.widthFt, win.widthIn) + 1}&quot; wide
                  {" · "}casing ~{casingLf(win.widthFt, win.widthIn, win.heightFt, win.heightIn)} lf/window
                  {win.count > 1 && ` × ${win.count}`}
                </p>
              )}
            </div>
          ))}
        </div>

        <button onClick={addWindow}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Window Size
        </button>
      </div>

      {/* ── Summary ── */}
      {(totalDoors > 0 || totalWindows > 0) && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Interior Doors</p>
              <p className="text-lg font-bold text-white">
                {data.doors.filter((d) => d.type === "interior").reduce((s, d) => s + (d.count || 0), 0)}
              </p>
            </div>
            <div className="bg-slate-700/50 rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Exterior Doors</p>
              <p className="text-lg font-bold text-white">
                {data.doors.filter((d) => d.type === "exterior").reduce((s, d) => s + (d.count || 0), 0)}
              </p>
            </div>
            <div className="bg-slate-700/50 rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Windows</p>
              <p className="text-lg font-bold text-white">{totalWindows}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">Casing (est.)</p>
              <p className="text-lg font-bold text-white">{totalCasingLf} lf</p>
              <p className="text-xs text-slate-400">both sides, all openings</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
