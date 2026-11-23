// Shower entries shared by the Measurements tab and the shower build (no engine imports)

const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : Number(v) || 0)

export type ShowerType = "small" | "large" | "surround"
export interface ShowerEntry {
  id: string
  label: string
  type: ShowerType
  lengthIn: number   // back wall
  depthIn: number    // side walls
  heightIn: number   // tile height
  nooks: number
  walls: "aqua" | "kerdi"   // wall waterproofing; the base always gets Aqua Defense
}

export function newShower(): ShowerEntry {
  return { id: String(Date.now() + Math.random()), label: "", type: "small", lengthIn: 60, depthIn: 36, heightIn: 72, nooks: 0, walls: "aqua" }
}

// Three tiled walls; large showers also tile the base
export function showerAreas(s: ShowerEntry) {
  const wall = ((num(s.lengthIn) + 2 * num(s.depthIn)) * num(s.heightIn)) / 144
  const base = s.type === "large" ? (num(s.lengthIn) * num(s.depthIn)) / 144 : 0
  return { wall, base }
}

