"use client";

import { useState } from "react";

export interface RoomEntry { id: string; label: string; length: number; width: number; ceilingHeight: number }
export interface InteriorData {
  rooms: RoomEntry[]
  wasteFactor: number
  windows: number
  doors: number
}

interface Props {
  initialData?: Partial<InteriorData>;
  onChange: (data: InteriorData) => void;
}

const inputCls = "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";

function newRoom(): RoomEntry {
  return { id: String(Date.now() + Math.random()), label: "", length: 0, width: 0, ceilingHeight: 8 };
}

function wallArea(r: RoomEntry): number {
  if (r.length <= 0 || r.width <= 0) return 0;
  return 2 * (r.length + r.width) * r.ceilingHeight;
}

function SmallField({
  label, unit, value, onChange, step = "1",
}: {
  label: string; unit?: string; value: number; onChange: (v: number) => void; step?: string;
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
        step={step}
        className={inputCls}
      />
    </div>
  );
}

export default function InteriorMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<InteriorData>({
    rooms: initialData?.rooms ?? [newRoom()],
    wasteFactor: initialData?.wasteFactor ?? 10,
    windows: initialData?.windows ?? 0,
    doors: initialData?.doors ?? 0,
  });

  function update<K extends keyof InteriorData>(key: K, value: InteriorData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  function updateRoom(id: string, field: keyof RoomEntry, value: string | number) {
    const next = { ...data, rooms: data.rooms.map((r) => r.id === id ? { ...r, [field]: value } : r) };
    setData(next);
    onChange(next);
  }

  function addRoom() {
    const next = { ...data, rooms: [...data.rooms, newRoom()] };
    setData(next);
    onChange(next);
  }

  function removeRoom(id: string) {
    const next = { ...data, rooms: data.rooms.filter((r) => r.id !== id) };
    setData(next);
    onChange(next);
  }

  const totalWallArea = data.rooms.reduce((sum, r) => sum + wallArea(r), 0);
  const totalFloorArea = data.rooms.reduce((sum, r) => sum + (r.length || 0) * (r.width || 0), 0);
  const openingDeduction = data.windows * 15 + data.doors * 20;
  const netWallArea = totalWallArea > 0 ? Math.max(totalWallArea - openingDeduction, totalWallArea * 0.7) : 0;
  const adjustedNet = netWallArea * (1 + data.wasteFactor / 100);

  return (
    <div className="space-y-6">
      {/* Rooms */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Rooms</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                <th className="pb-2 pr-3 font-medium">Label</th>
                <th className="pb-2 pr-3 font-medium">Length (ft)</th>
                <th className="pb-2 pr-3 font-medium">Width (ft)</th>
                <th className="pb-2 pr-3 font-medium">Ceiling (ft)</th>
                <th className="pb-2 pr-3 font-medium text-right">Wall Area</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {data.rooms.map((room, idx) => {
                const wa = wallArea(room);
                return (
                  <tr key={room.id} className="group">
                    <td className="py-2 pr-3">
                      <input
                        type="text"
                        value={room.label}
                        onChange={(e) => updateRoom(room.id, "label", e.target.value)}
                        placeholder={`Room ${idx + 1}`}
                        className={inputCls}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        value={room.length === 0 ? "" : room.length}
                        onChange={(e) => updateRoom(room.id, "length", Number(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        step="0.5"
                        className={inputCls}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        value={room.width === 0 ? "" : room.width}
                        onChange={(e) => updateRoom(room.id, "width", Number(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        step="0.5"
                        className={inputCls}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        value={room.ceilingHeight === 0 ? "" : room.ceilingHeight}
                        onChange={(e) => updateRoom(room.id, "ceilingHeight", Number(e.target.value) || 8)}
                        placeholder="8"
                        min="6"
                        max="20"
                        step="0.5"
                        className={inputCls}
                      />
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <span className="text-slate-300 font-medium">{wa > 0 ? `${wa.toLocaleString()} sqf` : "—"}</span>
                    </td>
                    <td className="py-2">
                      {data.rooms.length > 1 && (
                        <button
                          onClick={() => removeRoom(room.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors p-1"
                          title="Remove room"
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
          onClick={addRoom}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Room
        </button>

        {totalWallArea > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2.5">
                <p className="text-xs text-slate-500 mb-0.5">Total Floor Area</p>
                <p className="text-sm font-semibold text-white">{totalFloorArea.toLocaleString()} sqf</p>
              </div>
              <div className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2.5">
                <p className="text-xs text-slate-500 mb-0.5">Gross Wall Area</p>
                <p className="text-sm font-semibold text-white">{totalWallArea.toLocaleString()} sqf</p>
              </div>
              <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-3 py-2.5">
                <p className="text-xs text-slate-500 mb-0.5">Net Wall Area (adj.)</p>
                <p className="text-sm font-semibold text-blue-300">{Math.ceil(adjustedNet).toLocaleString()} sqf</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Openings & Waste */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Openings &amp; Waste</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <SmallField label="Windows" unit="count" value={data.windows} onChange={(v) => update("windows", v)} />
          <SmallField label="Doors" unit="count" value={data.doors} onChange={(v) => update("doors", v)} />
          <SmallField label="Waste Factor" unit="%" value={data.wasteFactor} onChange={(v) => update("wasteFactor", v)} />
        </div>
      </div>
    </div>
  );
}
