// Bathroom builds — fixtures (Toilet / Vanity / Faucet), tiled and surround showers, and tile
// outside showers. Labor comes from the Labor page by name: Plumbing per plumbed fixture,
// Shower Tile Small Tub / Shower Tile Large / Shower Nook for the tile sub, Tiler Labor per sqft.
// Innavik buys all shower materials.

import {
  type AssemblyItem, type MeasurementData, type Product,
  DEFAULT_MARKUP, num, pushCarpentry, interiorCrew,
} from "@/lib/assemblyEngine"

// ── Shared ───────────────────────────────────────────────────────────────────
export const AQUA_DEFENSE_SQFT_PER_GAL = 75
export const DENSSHIELD_SQFT = (32 * 60) / 144        // ½"×32"×60" sheet
export const KERDI_ROLL_SQFT = (39 / 12) * (16 + 5 / 12) // 3'3"×16'5" roll
export const THINSET_SQFT_PER_BAG = 50                  // Ultraflex LFT 50 lb
export const GROUT_SQFT_PER_BAG = 100                   // Ultracolor Plus FA 25 lb
export const LASH_SQFT_PER_PACK = 100                   // clips and wedges, each
export const MAPEGUARD_SQFT = 54                        // Mapeguard UM 35 roll
export const TILE_WASTE = 0.15
export const BED_MUD_SQFT_PER_BAG = 4
export const SURROUND_SUGGESTED_HRS = 8                 // per crew member, per surround

import { type ShowerEntry, showerAreas } from "@/lib/bathShared"
export { type ShowerEntry, type ShowerType, newShower, showerAreas } from "@/lib/bathShared"

const n = (v: unknown) => num(v)

function line(
  product: Product | undefined, fallback: string, quantity: number, fallbackCost: number,
  category: string, isLabor = false, unit = "ea",
): AssemblyItem {
  return {
    description: product?.name ?? fallback,
    quantity, unit: product?.unit ?? unit,
    cost: product?.cost ?? fallbackCost,
    markup: DEFAULT_MARKUP, tier: product?.tier ?? "GOOD",
    category, isLabor, productId: product?.id,
  }
}

const byName = (products: Product[], rx: RegExp, exclude?: RegExp) =>
  products.filter((p) => rx.test(p.name) && !(exclude && exclude.test(p.name)) && !p.category.toLowerCase().includes("labor"))
const cheapest = (list: Product[]) => [...list].sort((a, b) => a.cost - b.cost)[0]
const labor = (products: Product[], name: string) =>
  products.find((p) => p.category.toLowerCase().includes("labor") && p.name.trim().toLowerCase() === name.toLowerCase())
const pick = (products: Product[], id: unknown) => (typeof id === "string" && id ? products.find((p) => p.id === id) : undefined)

// Sqft one unit of tile covers, read from the name: "17 sqft per carton", ".80 sqft per tile", "15.52sqf";
// prices like "$1.59 sqft" are skipped; falls back to the tile size ("12"x24"")
export function tileCoverage(name: string): number {
  for (const m of name.matchAll(/(\d*\.?\d+)\s*(?:sq\s*ft|sqft|sqf)\b/gi)) {
    const at = m.index ?? 0
    if (name[at - 1] === "$") continue
    const v = Number(m[1])
    if (v > 0) return v
  }
  const dims = name.match(/(\d+(?:\.\d+)?)"\s*x\s*(\d+(?:\.\d+)?)"/i)
  return dims ? (Number(dims[1]) * Number(dims[2])) / 144 : 0
}

// Tile, thinset, grout and leveling clips for a tiled area
function tileSetting(products: Product[], tile: Product | undefined, sqft: number, category: string, waste = TILE_WASTE): AssemblyItem[] {
  if (sqft <= 0) return []
  const withWaste = sqft * (1 + waste)
  const cov = tile ? tileCoverage(tile.name) : 0
  const items: AssemblyItem[] = [
    tile
      ? line(tile, tile.name, cov > 0 ? Math.ceil(withWaste / cov) : Math.ceil(withWaste), tile.cost, category)
      : line(undefined, "Tile — pick a tile", Math.ceil(withWaste), 3.5, category, false, "sqft"),
    line(cheapest(byName(products, /ultraflex lft/i)), "Ultraflex LFT 50 lb thinset", Math.ceil(sqft / THINSET_SQFT_PER_BAG), 32, category),
    line(byName(products, /ultracolor plus fa grout 25/i)[0], "Ultracolor Plus FA grout 25 lb", Math.ceil(sqft / GROUT_SQFT_PER_BAG), 31, category),
    line(byName(products, /lash 1\/16" clip/i)[0], "LASH 1/16\" clips (300)", Math.ceil(sqft / LASH_SQFT_PER_PACK), 33, category),
    line(byName(products, /wedge part b/i)[0], "LASH wedges (300)", Math.ceil(sqft / LASH_SQFT_PER_PACK), 32, category),
  ]
  return items
}

// ── Toilet / Vanity / Faucet ─────────────────────────────────────────────────
export function calculateBathroomAssembly(m: MeasurementData, products: Product[]): AssemblyItem[] {
  const items: AssemblyItem[] = []
  const toilets = n(m.toilets)
  const sinks = n(m.sinks)
  const plumbing = labor(products, "Plumbing")

  if (toilets > 0) {
    const toilet = pick(products, m.toiletProductId) ?? cheapest(products.filter((p) => /^toilet$/i.test(p.category) && /toilet/i.test(p.name) && !/valve|flange|kit/i.test(p.name)))
    items.push(line(toilet, "Toilet — pick a toilet", toilets, 150, "Toilet"))
    items.push(line(byName(products, /harvey toilet kit/i)[0], "Toilet install kit", toilets, 25.5, "Toilet Assembly"))
    items.push(line(byName(products, /1\/4 turn straight valve/i)[0], "Toilet supply stop", toilets, 6.25, "Toilet Assembly"))
    items.push(line(plumbing, "Plumbing", toilets, 695, "Toilet Assembly", true))
  }

  if (sinks > 0) {
    const vanity = pick(products, m.vanityProductId)
    items.push(line(vanity, "Vanity / sink — pick one", sinks, 500, "Vanity"))
    const faucet = pick(products, m.faucetProductId)
    items.push(line(faucet, "Faucet — pick one", sinks, 95, "Faucet"))
    items.push(line(byName(products, /compression stop multi turn angle valve/i)[0], "Angle stop", sinks * 2, 10, "Vanity Assembly"))
    items.push(line(byName(products, /compression faucet line/i)[0], "Faucet supply line", sinks * 2, 6, "Vanity Assembly"))
    items.push(line(byName(products, /p-trap tubing/i)[0], "P-trap", sinks, 6, "Vanity Assembly"))
    items.push(line(byName(products, /6" plastic sink tail piece/i)[0], "Tail piece", sinks, 3, "Vanity Assembly"))
    items.push(line(byName(products, /plumbers putty/i)[0], "Plumber's putty", 1, 5, "Vanity Assembly"))
    items.push(line(plumbing, "Plumbing", sinks, 695, "Vanity Assembly", true))
  }
  return items
}

// ── Showers ──────────────────────────────────────────────────────────────────
// Cheapest mix of 1 / 3.5 / 5 gal pails to cover the gallons needed
function aquaDefense(products: Product[], gallons: number, category: string): AssemblyItem[] {
  if (gallons <= 0) return []
  const pail = (size: string) => byName(products, new RegExp(`aqua defen[cs]e ${size} gal`, "i"))[0]
  const p1 = pail("1"), p35 = pail("3-1\\/2"), p5 = pail("5")
  const c1 = p1?.cost ?? 53, c35 = p35?.cost ?? 145, c5 = p5?.cost ?? 222
  let best = { n5: 0, n35: 0, n1: Math.ceil(gallons), cost: Math.ceil(gallons) * c1 }
  for (let n5 = 0; n5 <= Math.ceil(gallons / 5); n5++) {
    for (let n35 = 0; n35 <= Math.ceil(gallons / 3.5); n35++) {
      const n1 = Math.max(0, Math.ceil(gallons - n5 * 5 - n35 * 3.5))
      const cost = n5 * c5 + n35 * c35 + n1 * c1
      if (cost < best.cost) best = { n5, n35, n1, cost }
    }
  }
  return [
    ...(best.n5 > 0 ? [line(p5, "Mapei Aqua Defense 5 gal", best.n5, c5, category)] : []),
    ...(best.n35 > 0 ? [line(p35, "Mapei Aqua Defense 3-1/2 gal", best.n35, c35, category)] : []),
    ...(best.n1 > 0 ? [line(p1, "Mapei Aqua Defense 1 gal", best.n1, c1, category)] : []),
  ]
}

export function calculateShowerAssembly(m: MeasurementData, products: Product[]): AssemblyItem[] {
  const showers = (Array.isArray(m.showers) ? m.showers : []) as ShowerEntry[]
  const items: AssemblyItem[] = []
  if (showers.length === 0) return items
  const A = "Shower Assembly"
  const plumbing = labor(products, "Plumbing")
  const valve = pick(products, m.valveProductId)
  const door = pick(products, m.doorProductId)
  const tile = pick(products, m.showerTileProductId)
  const surroundUnit = pick(products, m.surroundProductId)

  let surrounds = 0
  for (const s of showers) {
    const tag = s.label ? ` — ${s.label}` : ""
    items.push(line(valve, "Shower valve & trim — pick one", 1, 220, "Shower"))
    items.push(line(plumbing, "Plumbing", 1, 695, A, true))
    if (door) items.push(line(door, door.name, 1, door.cost, "Shower"))

    if (s.type === "surround") {
      surrounds++
      items.push(line(surroundUnit, `Shower surround — pick one${tag}`, 1, 780, "Shower"))
      continue
    }

    const { wall, base } = showerAreas(s)
    // Backer and wall waterproofing
    items.push(line(byName(products, /densshield/i)[0], "DensShield 1/2\"x32\"x60\"", Math.ceil((wall * 1.1) / DENSSHIELD_SQFT), 15.25, A))
    items.push(line(byName(products, /cement board screw/i)[0], "Cement board screws", 1, 35, A))
    items.push(line(byName(products, /cement board tape/i)[0], "Cement board tape", 1, 15.25, A))
    if (s.walls === "kerdi") {
      items.push(line(byName(products, /kerdi .*waterproofing membrane/i)[0], "Schluter Kerdi membrane roll", Math.ceil((wall * 1.1) / KERDI_ROLL_SQFT), 125, A))
    }
    // Aqua Defense: walls (unless Kerdi) and always the base
    items.push(...aquaDefense(products, ((s.walls === "kerdi" ? 0 : wall) + base) / AQUA_DEFENSE_SQFT_PER_GAL, A))

    if (s.type === "large") {
      items.push(line(byName(products, /shower pan liner/i)[0], "Oatey 6'x10' shower pan liner", 1, 95, A))
      items.push(line(byName(products, /bed mud/i)[0], "Mapei Bed Mud", Math.ceil(base / BED_MUD_SQFT_PER_BAG), 10.99, A))
      items.push(line(byName(products, /low profile drain/i)[0], "Shower drain", 1, 15, A))
      items.push(line(byName(products, /kerdi board sc curb/i)[0], "Schluter Kerdi curb", 1, 107, A))
      items.push(line(cheapest(byName(products, /curb 6"x74"/i, /kerdi/i)), "Stone curb cap", 1, 62, A))
    }

    items.push(...tileSetting(products, tile, wall + base, A).map((i, idx) => (idx === 0 ? { ...i, category: "Shower" } : i)))
    items.push(line(byName(products, /schluter edge trim/i)[0], "Schluter edge trim", s.type === "large" ? 3 : 2, 21.33, A))
    items.push(line(byName(products, /mapesil/i)[0], "Mapesil silicone", 2, 16, A))

    // Tile sub labor
    items.push(line(labor(products, s.type === "large" ? "Shower Tile Large" : "Shower Tile Small Tub"),
      s.type === "large" ? "Shower Tile Large" : "Shower Tile Small Tub", 1, s.type === "large" ? 2000 : 1500, A, true))
    if (n(s.nooks) > 0) items.push(line(labor(products, "Shower Nook"), "Shower Nook", n(s.nooks), 500, A, true))
  }

  // Surrounds are set by our carpenters
  if (surrounds > 0) {
    pushCarpentry(items, products, A, surrounds * SURROUND_SUGGESTED_HRS, interiorCrew(m))
  }
  return items
}

// ── Tile outside showers (floors, backsplash, wainscot) ─────────────────────
export function calculateTileAssembly(m: MeasurementData, products: Product[]): AssemblyItem[] {
  type Area = { length?: unknown; width?: unknown; kind?: unknown }
  const areas = (Array.isArray(m.areas) ? m.areas : []) as Area[]
  const sqftOf = (a: Area) => n(a.length) * n(a.width)
  const floorSqft = areas.filter((a) => a.kind !== "wall").reduce((t, a) => t + sqftOf(a), 0)
  const total = areas.reduce((t, a) => t + sqftOf(a), 0)
  if (total <= 0) return []

  const tile = pick(products, m.tileProductId)
  const items = tileSetting(products, tile, total, "Tile Accessories", num(m.wasteFactor, 15) / 100).map((i, idx) => (idx === 0 ? { ...i, category: "Tile" } : i))
  // Uncoupling membrane under floor tile
  if (m.includesBackerBoard !== false && floorSqft > 0) {
    items.push(line(byName(products, /mapeguard um 35/i)[0], "Mapeguard UM 35 (54 sqft)", Math.ceil((floorSqft * 1.1) / MAPEGUARD_SQFT), 89.95, "Tile Accessories"))
  }
  items.push(line(labor(products, "Tiler Labor"), "Tiler Labor", Math.ceil(total), 3.5, "Tile Accessories", true, "sqft"))
  return items
}
