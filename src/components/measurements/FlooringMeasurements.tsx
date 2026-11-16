"use client";

import { useState } from "react";

export interface FloorRoom {
  id: string;
  label: string;
  length: number;
  width: number;
}

export interface FlooringData {
  rooms: FloorRoom[];
  directSqft: number;   // 0 = use rooms; >0 = skip room table
  wasteFactor: number;
  sqftPerCarton: number; // 0 = auto-detect from product name
  tMoldingLf: number;
  stairNoses: number;
  thresholds: number;
}

interface Props {
  initialData?: Partial<FlooringData>;
  onChange: (data: FlooringData) => void;
  linkedRooms?: FloorRoom[];
}

const inputCls =
  "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";

function newRoom(): FloorRoom {
  return { id: String(Date.now() + Math.random()), label: "", length: 0, width: 0 };
}

function SmallField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {unit && <span className="text-slate-500 ml-1">({unit})</span>}
      </label>
      <input
        type="number"
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        placeholder="0"
        min="0"
        className={inputCls}
      />
    </div>
  );
}

export default function FlooringMeasurements({ initialData, onChange, linkedRooms }: Props) {
  const [data, setData] = useState<FlooringData>({
    rooms: initialData?.rooms ?? [newRoom()],
    directSqft: initialData?.directSqft ?? 0,
    wasteFactor: initialData?.wasteFactor ?? 10,
    sqftPerCarton: initialData?.sqftPerCarton ?? 0,
    tMoldingLf: initialData?.tMoldingLf ?? 0,
    stairNoses: initialData?.stairNoses ?? 0,
    thresholds: initialData?.thresholds ?? 0,
  });

  const [mode, setModeState] = useState<"rooms" | "direct">(
    (initialData?.directSqft ?? 0) > 0 ? "direct" : "rooms"
  );

  function setMode(m: "rooms" | "direct") {
    setModeState(m);
    if (m === "rooms") {
      const next = { ...data, directSqft: 0 };
      setData(next);
      onChange(next);
    }
  }

  function update<K extends keyof FlooringData>(key: K, value: FlooringData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  function updateRoom(id: string, field: keyof FloorRoom, value: string | number) {
    const next = {
      ...data,
      rooms: data.rooms.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    };
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

  const roomSqf = (linkedRooms ?? data.rooms).reduce((sum, r) => sum + (r.length || 0) * (r.width || 0), 0);
  const totalSqf = mode === "direct" ? data.directSqft : roomSqf;
  const adjustedSqf = Math.ceil(totalSqf * (1 + data.wasteFactor / 100));
  const underlaymentRolls100 = Math.ceil(adjustedSqf / 100);
  const cartonPreview = data.sqftPerCarton > 0 ? Math.ceil(adjustedSqf / data.sqftPerCarton) : null;

  return (
    <div className="space-y-6">
      {/* Rooms / Direct */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Area</h3>
          <div className="flex rounded-lg border border-slate-600 overflow-hidden text-xs font-medium">
            <button
              onClick={() => setMode("rooms")}
              className={`px-3 py-1 transition-colors ${mode === "rooms" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Rooms
            </button>
            <button
              onClick={() => setMode("direct")}
              className={`px-3 py-1 transition-colors ${mode === "direct" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
            >
              Direct sqft
            </button>
          </div>
        </div>

        {mode === "direct" ? (
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Total Area <span className="text-slate-500">(sqft)</span></label>
              <input
                type="number"
                value={data.directSqft === 0 ? "" : data.directSqft}
                onChange={(e) => {
                  const v = e.target.value === "" ? 0 : Number(e.target.value);
                  const next = { ...data, directSqft: v };
                  setData(next); onChange(next);
                }}
                placeholder="0"
                min="0"
                className={inputCls}
              />
            </div>
          </div>
        ) : linkedRooms ? (
          <p className="text-sm text-slate-400">
            {linkedRooms.length > 0
              ? `Using ${linkedRooms.length} room${linkedRooms.length !== 1 ? "s" : ""} from the Measurements tab.`
              : "No flooring rooms on the Measurements tab yet."}
          </p>
        ) : (
        <>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-700">
                <th className="pb-2 pr-3 font-medium">Room</th>
                <th className="pb-2 pr-3 font-medium">Length (ft)</th>
                <th className="pb-2 pr-3 font-medium">Width (ft)</th>
                <th className="pb-2 pr-3 font-medium text-right">Area (sqf)</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {data.rooms.map((room, idx) => {
                const area = (room.length || 0) * (room.width || 0);
                return (
                  <tr key={room.id}>
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
                    <td className="py-2 pr-3 text-right">
                      <span className="text-slate-300 font-medium">
                        {area > 0 ? area.toLocaleString() : "—"}
                      </span>
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
        </>
        )}

        {totalSqf > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-6 text-sm">
              <span className="text-slate-400">Total area:</span>
              <span className="font-semibold text-white">{totalSqf.toLocaleString()} sqf</span>
            </div>
            <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm text-blue-300">
                With {data.wasteFactor}% waste:{" "}
                <span className="font-bold">{adjustedSqf.toLocaleString()} sqf</span>
              </span>
              <span className="text-xs text-blue-500">
                ~{underlaymentRolls100} underlayment rolls (100 sqf ea)
              </span>
            </div>
            {cartonPreview !== null && (
              <div className="rounded-lg bg-emerald-900/20 border border-emerald-800/50 px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm text-emerald-300">
                  Cartons needed:{" "}
                  <span className="font-bold">{cartonPreview} cartons</span>
                </span>
                <span className="text-xs text-emerald-600">
                  {data.sqftPerCarton} sqf/carton
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Options */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Transitions &amp; Accessories</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <SmallField
            label="Waste Factor"
            unit="%"
            value={data.wasteFactor}
            onChange={(v) => update("wasteFactor", v)}
          />
          <div>
            <label className={labelCls}>
              Sqft per Carton
              <span className="text-slate-500 ml-1">(sqf)</span>
            </label>
            <input
              type="number"
              value={data.sqftPerCarton === 0 ? "" : data.sqftPerCarton}
              onChange={(e) => update("sqftPerCarton", e.target.value === "" ? 0 : Number(e.target.value))}
              placeholder="auto"
              min="0"
              step="0.01"
              className={inputCls}
            />
            <p className="text-xs text-slate-500 mt-1">Leave blank to auto-detect from product name</p>
          </div>
          <SmallField
            label="T-Molding"
            unit="lf"
            value={data.tMoldingLf}
            onChange={(v) => update("tMoldingLf", v)}
          />
          <SmallField
            label="Stair Noses"
            unit="count"
            value={data.stairNoses}
            onChange={(v) => update("stairNoses", v)}
          />
          <SmallField
            label="Thresholds"
            unit="count"
            value={data.thresholds}
            onChange={(v) => update("thresholds", v)}
          />
        </div>
      </div>
    </div>
  );
}
