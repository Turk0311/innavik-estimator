"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoomEntry {
  id: string;
  label?: string;   // optional room name
  width: number;
  length: number;
  height: number;
}

export interface LaborTask {
  id: string;
  label: string;
  hours: number;
  sqft?: number;        // total effective area (sum of all rooms); passed to assembly engine
  inputType?: "hours" | "sqft";
  rooms?: RoomEntry[];  // multi-room entries (sqft tasks)
  // Legacy single-room fields — preserved so saved data loads without migration
  width?: number;
  length?: number;
  height?: number;
}

export interface GeneralLaborData {
  tasks: LaborTask[];
}

type AssemblyPreviewItem = {
  productName: string;
  quantity: number;
  unit: string;
  coverageSqft: number | null;
};

type AssemblyPreview = {
  name: string;
  items: AssemblyPreviewItem[];
};

interface Props {
  initialData?: Partial<GeneralLaborData>;
  onChange: (data: GeneralLaborData) => void;
  assemblies?: AssemblyPreview[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const dimInput =
  "w-20 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-center";

function uid() {
  return String(Date.now() + Math.random());
}

function newTask(): LaborTask {
  return { id: uid(), label: "", hours: 0, inputType: "hours" };
}

function newRoom(): RoomEntry {
  return { id: uid(), label: "", width: 0, length: 0, height: 0 };
}

/**
 * Compute the effective sqft for a single room under a given task label.
 * - Room Protection: walls + ceiling
 * - All others: floor area only
 */
function computeRoomSqft(taskLabel: string, room: RoomEntry): number {
  const w = room.width  || 0;
  const l = room.length || 0;
  const h = room.height || 0;
  const floor = w * l;
  if (taskLabel.trim().toLowerCase() === "room protection") {
    return Math.round(floor + 2 * (w + l) * h);
  }
  return Math.round(floor);
}

/**
 * Normalize a task so it always has a `rooms` array (for sqft tasks).
 * Migrates legacy single-room fields (width/length/height) on first load.
 */
function normalizeTask(task: LaborTask): LaborTask {
  if (task.inputType !== "sqft") return task;
  if (task.rooms && task.rooms.length > 0) return task;
  // Migrate legacy single-room or start with one blank room
  const room = newRoom();
  room.width  = task.width  ?? 0;
  room.length = task.length ?? 0;
  room.height = task.height ?? 0;
  return { ...task, rooms: [room] };
}

function calcPreviewQty(item: AssemblyPreviewItem, sqft: number): number {
  if (item.coverageSqft && item.coverageSqft > 0) {
    return Math.ceil(sqft / item.coverageSqft);
  }
  return item.quantity;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GeneralLaborMeasurements({ initialData, onChange, assemblies = [] }: Props) {
  const [data, setData] = useState<GeneralLaborData>(() => {
    const raw = initialData?.tasks ?? [newTask()];
    return { tasks: raw.map(normalizeTask) };
  });

  const assemblyByName = new Map(assemblies.map((a) => [a.name.trim().toLowerCase(), a]));

  // ── Task-level operations ──────────────────────────────────────────────

  function addTask() {
    const next = { ...data, tasks: [...data.tasks, newTask()] };
    setData(next);
    onChange(next);
  }

  function removeTask(taskId: string) {
    const next = { ...data, tasks: data.tasks.filter((t) => t.id !== taskId) };
    setData(next);
    onChange(next);
  }

  function updateTaskHours(taskId: string, hours: number) {
    const next = {
      ...data,
      tasks: data.tasks.map((t) => (t.id !== taskId ? t : { ...t, hours })),
    };
    setData(next);
    onChange(next);
  }

  // ── Room-level operations ──────────────────────────────────────────────

  function addRoom(taskId: string) {
    const next = {
      ...data,
      tasks: data.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const updatedRooms = [...(t.rooms ?? []), newRoom()];
        return { ...t, rooms: updatedRooms };
      }),
    };
    setData(next);
    onChange(next);
  }

  function removeRoom(taskId: string, roomId: string) {
    const next = {
      ...data,
      tasks: data.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const updatedRooms = (t.rooms ?? []).filter((r) => r.id !== roomId);
        const totalSqft = updatedRooms.reduce(
          (sum, r) => sum + computeRoomSqft(t.label, r),
          0
        );
        return { ...t, rooms: updatedRooms, sqft: totalSqft };
      }),
    };
    setData(next);
    onChange(next);
  }

  function updateRoom(taskId: string, roomId: string, updates: Partial<RoomEntry>) {
    const next = {
      ...data,
      tasks: data.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const updatedRooms = (t.rooms ?? []).map((r) =>
          r.id !== roomId ? r : { ...r, ...updates }
        );
        const totalSqft = updatedRooms.reduce(
          (sum, r) => sum + computeRoomSqft(t.label, r),
          0
        );
        return { ...t, rooms: updatedRooms, sqft: totalSqft };
      }),
    };
    setData(next);
    onChange(next);
  }

  // ── Derived values ─────────────────────────────────────────────────────

  const totalHours = data.tasks
    .filter((t) => (t.inputType ?? "hours") === "hours")
    .reduce((sum, t) => sum + (t.hours || 0), 0);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {data.tasks.map((task) => {
        const isSqft = task.inputType === "sqft";
        const lcLabel = task.label.trim().toLowerCase();
        const isRoomProtection = lcLabel === "room protection";
        const rooms = task.rooms ?? [];
        const totalSqft = isSqft
          ? rooms.reduce((sum, r) => sum + computeRoomSqft(task.label, r), 0)
          : 0;

        const matchedAssembly = isSqft ? assemblyByName.get(lcLabel) : undefined;
        const previewItems =
          matchedAssembly && totalSqft > 0
            ? matchedAssembly.items.map((item) => ({
                ...item,
                calcQty: calcPreviewQty(item, totalSqft),
              }))
            : [];

        return (
          <div
            key={task.id}
            className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden"
          >
            {/* ── Task header ── */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-750 border-b border-slate-700">
              <span className="text-sm font-semibold text-white">{task.label || "Unnamed Task"}</span>
              {data.tasks.length > 1 && (
                <button
                  onClick={() => removeTask(task.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors p-0.5"
                  title="Remove task"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* ── Sqft task: room list ── */}
            {isSqft && (
              <div className="divide-y divide-slate-700/60">
                {rooms.map((room, roomIdx) => {
                  const w = room.width  || 0;
                  const l = room.length || 0;
                  const h = room.height || 0;
                  const floorSqft = Math.round(w * l);
                  const wallSqft  = Math.round(2 * (w + l) * h);
                  const roomSqft  = computeRoomSqft(task.label, room);

                  return (
                    <div key={room.id} className="px-4 py-3 space-y-2.5">
                      {/* Room name + remove */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={room.label ?? ""}
                          onChange={(e) =>
                            updateRoom(task.id, room.id, { label: e.target.value })
                          }
                          placeholder={`Room ${roomIdx + 1}`}
                          className="flex-1 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                        {rooms.length > 1 && (
                          <button
                            onClick={() => removeRoom(task.id, room.id)}
                            className="text-slate-600 hover:text-red-400 transition-colors p-0.5 flex-shrink-0"
                            title="Remove room"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* W × L × H */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500 w-6">W</span>
                          <input
                            type="number"
                            value={w === 0 ? "" : w}
                            onChange={(e) =>
                              updateRoom(task.id, room.id, { width: Number(e.target.value) || 0 })
                            }
                            placeholder="0"
                            min="0"
                            step="0.5"
                            className={dimInput}
                          />
                          <span className="text-xs text-slate-500">ft</span>
                        </div>

                        <span className="text-slate-600">×</span>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500 w-4">L</span>
                          <input
                            type="number"
                            value={l === 0 ? "" : l}
                            onChange={(e) =>
                              updateRoom(task.id, room.id, { length: Number(e.target.value) || 0 })
                            }
                            placeholder="0"
                            min="0"
                            step="0.5"
                            className={dimInput}
                          />
                          <span className="text-xs text-slate-500">ft</span>
                        </div>

                        <span className="text-slate-600">×</span>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500 w-4">H</span>
                          <input
                            type="number"
                            value={h === 0 ? "" : h}
                            onChange={(e) =>
                              updateRoom(task.id, room.id, { height: Number(e.target.value) || 0 })
                            }
                            placeholder="0"
                            min="0"
                            step="0.5"
                            className={dimInput}
                          />
                          <span className="text-xs text-slate-500">ft</span>
                        </div>
                      </div>

                      {/* Area summary */}
                      {floorSqft > 0 && (
                        <div className="flex items-center gap-3 flex-wrap text-xs">
                          <span className="text-slate-500">
                            Floor: <span className="text-slate-300 font-medium">{floorSqft} sqft</span>
                          </span>
                          {h > 0 && (
                            <>
                              <span className="text-slate-700">·</span>
                              <span className="text-slate-500">
                                Walls: <span className="text-slate-300 font-medium">{wallSqft} sqft</span>
                              </span>
                            </>
                          )}
                          <span className="text-slate-700">·</span>
                          {isRoomProtection ? (
                            <span className="text-slate-500">
                              Area:{" "}
                              <span className="text-blue-400 font-semibold">{roomSqft} sqft</span>
                              <span className="text-slate-600"> (walls + ceiling)</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              Area:{" "}
                              <span className="text-blue-400 font-semibold">{roomSqft} sqft</span>
                              <span className="text-slate-600"> (floor)</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Room button + total */}
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <button
                    onClick={() => addRoom(task.id)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Room
                  </button>

                  {rooms.length > 1 && totalSqft > 0 && (
                    <span className="text-xs text-slate-400">
                      Total:{" "}
                      <span className="font-semibold text-white">{totalSqft} sqft</span>
                      <span className="text-slate-600"> across {rooms.length} rooms</span>
                    </span>
                  )}
                </div>

                {/* Live item preview */}
                {previewItems.length > 0 && (
                  <div className="border-t border-slate-700 bg-slate-900/50 px-4 py-2.5">
                    <p className="text-xs text-slate-500 mb-2">
                      Items that will be added
                      {rooms.length > 1 && (
                        <span className="text-slate-600"> — based on {totalSqft} sqft total</span>
                      )}
                      :
                    </p>
                    <div className="space-y-1.5">
                      {previewItems.map((pi, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-400 truncate">{pi.productName}</span>
                          <span className="text-xs font-semibold text-white flex-shrink-0 tabular-nums">
                            {pi.calcQty}{" "}
                            <span className="text-slate-400 font-normal">{pi.unit}</span>
                            {pi.coverageSqft && pi.coverageSqft > 0 && (
                              <span className="text-slate-600 font-normal ml-1 text-[10px]">
                                ({pi.coverageSqft} sqft/unit)
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No-assembly hint */}
                {totalSqft > 0 && !matchedAssembly && assemblies.length > 0 && (
                  <div className="border-t border-slate-700 bg-slate-900/50 px-4 py-2">
                    <p className="text-xs text-slate-600 italic">
                      No assembly named &ldquo;{task.label}&rdquo; — configure one in Admin → Assemblies.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── Hours task ── */}
            {!isSqft && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={task.hours === 0 ? "" : task.hours}
                    onChange={(e) => updateTaskHours(task.id, Number(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    step="0.5"
                    className="w-28 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                  <span className="text-xs text-slate-500">hr</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add Task button */}
      <button
        onClick={addTask}
        className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 pt-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Task
      </button>

      {/* Hours total */}
      {totalHours > 0 && (
        <div className="rounded-lg bg-blue-900/20 border border-blue-800/50 px-4 py-2.5 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-blue-300">
            Total: <span className="font-bold">{totalHours} hours</span> estimated labor
          </span>
        </div>
      )}
    </div>
  );
}
