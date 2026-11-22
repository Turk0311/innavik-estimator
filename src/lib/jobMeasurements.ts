// One set of job measurements, entered once on the Measurements tab and fed to every scope.
// Each scope keeps only its own choices (job type, waste, materials); derived values always win.

import type { WallEntry, GableEntry, MeasurementSource } from "@/components/measurements/SidingMeasurements"
import type { WallDoorEntry, WallWindowEntry } from "@/components/measurements/WallAssemblyMeasurements"
import type { DeckSection, DeckRailRun } from "@/components/measurements/DeckMeasurements"

export interface PlaneEntry { id: string; label: string; area: number }

export interface RoomEntry {
  id: string
  label: string
  length: number
  width: number
  height: number
  ceiling: boolean  // ceiling is part of the paint and drywall work
  floor: boolean    // room gets new flooring
}

export interface JobMeasurements {
  // Roof
  planes: PlaneEntry[]
  pitch: string
  ridge: number
  hip: number
  valleys: number
  ridgeVentLf: number
  roofToWallLf: number
  chimneys: number
  skylights: number
  powerVents: number
  leadStacks3: number
  leadStacks4: number
  leadStacks5: number
  leadStacks6: number
  slantBackVents: number
  kitchenVents: number
  bathroomVents: number
  // Roof edges — shared by Roofing, Gutters, Siding and Exterior Trim
  eaves: number
  rakes: number
  soffitOverhangIn: number
  // Gutters
  gutterLf: number        // 0 = same as eaves
  downspouts: number
  downspoutLf: number     // 0 = one 10' length per downspout
  insideMiters: number
  outsideMiters: number
  // Exterior walls (siding) — hand measured or copied from a Hover report
  sidingSource: MeasurementSource
  walls: WallEntry[]
  gables: GableEntry[]
  hoverFacadesSqft: number
  hoverOpeningsSqft: number
  hoverOpeningQty: number
  hoverOpeningsTopsLf: number
  hoverOpeningsSillsLf: number
  hoverOpeningsSidesLf: number
  hoverVerticalTrimLf: number
  hoverSlopedTrimLf: number
  // Exterior trim & soffit — shared by Siding and Exterior Trim
  cornerBoardsLf: number  // outside corners
  insideCornersLf: number
  starterLf: number       // level starter — siding starter strip (LP cut down / steel)
  fasciaLf: number
  friezeLf: number
  soffitLf: number
  soffitArea: number      // 0 = soffit length × overhang
  jChannelLf: number
  finishTrimLf: number
  bandBoardLf: number
  windowTrimLf: number
  doorTrimLf: number
  // Interior
  rooms: RoomEntry[]
  doors: WallDoorEntry[]
  windows: WallWindowEntry[]
  interiorCorners: number
  // Deck — length runs along the house, width goes out from it
  deckSections: DeckSection[]
  deckHeightFt: number
  deckHeightIn: number
  deckRailLeft: boolean
  deckRailFront: boolean
  deckRailRight: boolean
  deckGates: number
  deckStairs: number        // flights
  deckStairRisers: number
  deckStairWidthFt: number
  deckStairWidthIn: number
}

export type JobSection = "roof" | "edges" | "gutters" | "siding" | "trim" | "rooms" | "openings" | "corners" | "deck"

export const LINKED_TABS = new Set([
  "Roofing", "Gutters", "Siding", "Exterior Trim", "Exterior Trim Accessories",
  "Painting", "Drywall", "Drywall Accessories", "Interior Trim", "Interior Trim Accessories",
  "Flooring", "Wall Assembly", "Interior Doors", "Interior Door Assembly",
  "Decking", "Decking Accessories", "Deck Framing", "Deck Framing Accessories",
])

export const DECK_TABS = ["Decking", "Decking Accessories", "Deck Framing", "Deck Framing Accessories"]
export const DECK_POST_SPACING_FT = 8   // posts along the beam
export const DECK_GATE_WIDTH_FT = 4

export function newDeckSection(): DeckSection {
  return { id: String(Date.now() + Math.random()), label: "", lengthFt: 0, lengthIn: 0, widthFt: 0, widthIn: 0 }
}

// Wall and ceiling sections built from rooms carry this id prefix so they are never saved as hand-entered ones
const ROOM_ENTRY_PREFIX = "room:"

export function newRoom(): RoomEntry {
  return { id: String(Date.now() + Math.random()), label: "", length: 0, width: 0, height: 0, ceiling: false, floor: true }
}

export const JOB_TRADE_TYPE = "Job"

type Saved = { tradeType: string; data: Record<string, unknown> }

const n = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : Number(v) || 0)

export function emptyJob(): JobMeasurements {
  return {
    planes: [{ id: String(Date.now()), label: "", area: 0 }],
    pitch: "up_to_6_12",
    ridge: 0, hip: 0, valleys: 0, ridgeVentLf: 0, roofToWallLf: 0,
    chimneys: 0, skylights: 0, powerVents: 0,
    leadStacks3: 0, leadStacks4: 0, leadStacks5: 0, leadStacks6: 0,
    slantBackVents: 0, kitchenVents: 0, bathroomVents: 0,
    eaves: 0, rakes: 0, soffitOverhangIn: 12,
    gutterLf: 0, downspouts: 0, downspoutLf: 0, insideMiters: 0, outsideMiters: 0,
    sidingSource: "manual",
    walls: [{ id: String(Date.now() + 1), label: "", width: 0, height: 0, openings: [] }],
    gables: [],
    hoverFacadesSqft: 0, hoverOpeningsSqft: 0, hoverOpeningQty: 0,
    hoverOpeningsTopsLf: 0, hoverOpeningsSillsLf: 0, hoverOpeningsSidesLf: 0,
    hoverVerticalTrimLf: 0, hoverSlopedTrimLf: 0,
    cornerBoardsLf: 0, insideCornersLf: 0, starterLf: 0, fasciaLf: 0, friezeLf: 0,
    soffitLf: 0, soffitArea: 0, jChannelLf: 0, finishTrimLf: 0,
    bandBoardLf: 0, windowTrimLf: 0, doorTrimLf: 0,
    rooms: [newRoom()], doors: [], windows: [], interiorCorners: 0,
    deckSections: [newDeckSection()], deckHeightFt: 0, deckHeightIn: 0,
    deckRailLeft: true, deckRailFront: true, deckRailRight: true, deckGates: 0,
    deckStairs: 0, deckStairRisers: 7, deckStairWidthFt: 3, deckStairWidthIn: 0,
  }
}

// Build job measurements from what was entered on the old per-scope tabs
function jobFromScopes(saved: Saved[]): JobMeasurements {
  const find = (t: string) => saved.find((m) => m.tradeType === t)?.data
  const roof = find("Roofing") ?? {}
  const gut = find("Gutters") ?? {}
  const trim = find("Exterior Trim") ?? {}
  const sid = find("Siding") ?? {}
  const hov = (sid.hover ?? {}) as Record<string, unknown>
  const isHover = sid.measurementSource === "hover"
  const base = emptyJob()
  const planes = Array.isArray(roof.planes) && roof.planes.length > 0 ? (roof.planes as PlaneEntry[]) : base.planes
  const walls = Array.isArray(sid.walls) && sid.walls.length > 0 ? (sid.walls as WallEntry[]) : base.walls
  const pick = (manual: unknown, hover: unknown) => n(isHover ? hover : manual)
  const wa = find("Wall Assembly") ?? {}
  const deck = find("Decking") ?? find("Deck") ?? {}
  const frame = find("Deck Framing") ?? {}
  const deckRuns = Array.isArray(deck.deckRailRuns) ? (deck.deckRailRuns as DeckRailRun[]) : []
  const it = find("Interior Trim") ?? find("Interior") ?? {}
  const list = <T,>(...sources: unknown[]): T[] => {
    for (const src of sources) if (Array.isArray(src) && src.length > 0) return src as T[]
    return []
  }
  const paintRooms = list<Partial<RoomEntry>>(find("Painting")?.rooms)
    .filter((r) => n(r.length) > 0 || n(r.width) > 0)
  const floorRooms = list<Partial<RoomEntry>>(find("Flooring")?.rooms)
    .filter((r) => n(r.length) > 0 && n(r.width) > 0)
  const rooms: RoomEntry[] = paintRooms.length > 0
    ? paintRooms.map((r) => ({ ...newRoom(), ...r, floor: r.floor !== false }))
    : floorRooms.map((r) => ({ ...newRoom(), ...r, height: 0, ceiling: false, floor: true }))

  return {
    ...base,
    planes,
    pitch: typeof roof.pitch === "string" ? roof.pitch : base.pitch,
    ridge: n(roof.ridge), hip: n(roof.hip), valleys: n(roof.valleys),
    ridgeVentLf: n(roof.ridgeVentLf), roofToWallLf: n(roof.roofToWallLf),
    chimneys: n(roof.chimneys), skylights: n(roof.skylights), powerVents: n(roof.powerVents),
    leadStacks3: n(roof.leadStacks3), leadStacks4: n(roof.leadStacks4),
    leadStacks5: n(roof.leadStacks5), leadStacks6: n(roof.leadStacks6),
    slantBackVents: n(roof.slantBackVents), kitchenVents: n(roof.kitchenVents), bathroomVents: n(roof.bathroomVents),
    eaves: n(roof.eaves) || n(hov.eavesLf),
    rakes: n(roof.rakes) || n(trim.rakeLf) || n(hov.rakesLf),
    soffitOverhangIn: n(roof.soffitOverhangIn) || 12,
    gutterLf: n(gut.linearFt) === n(roof.eaves) ? 0 : n(gut.linearFt),
    downspouts: n(gut.downspouts), downspoutLf: n(gut.downspoutLf),
    insideMiters: n(gut.insideMiters), outsideMiters: n(gut.outsideMiters) || n(gut.corners),
    sidingSource: isHover ? "hover" : "manual",
    walls,
    gables: Array.isArray(sid.gables) ? (sid.gables as GableEntry[]) : [],
    hoverFacadesSqft: n(hov.facadesSqft), hoverOpeningsSqft: n(hov.openingsSqft), hoverOpeningQty: n(hov.openingQty),
    hoverOpeningsTopsLf: n(hov.openingsTopsLf), hoverOpeningsSillsLf: n(hov.openingsSillsLf),
    hoverOpeningsSidesLf: n(hov.openingsSidesLf),
    hoverVerticalTrimLf: n(hov.verticalTrimLf), hoverSlopedTrimLf: n(hov.slopedTrimLf),
    cornerBoardsLf: n(trim.cornerBoardsLf) || pick(sid.outsideCorners, hov.outsideCorners),
    insideCornersLf: pick(sid.insideCorners, hov.insideCorners),
    starterLf: pick(sid.perimeterLf, hov.starterStripLf) || n(trim.waterTableLf),
    fasciaLf: n(trim.fasciaLf) || pick(sid.fasciaLf, hov.fasciaLf),
    friezeLf: n(trim.friezeLf) || n(hov.friezeBoardLf),
    soffitLf: pick(sid.soffitLf, hov.soffitLf),
    soffitArea: pick(sid.soffitArea, hov.soffitArea),
    jChannelLf: n(trim.jChannelLf) || n(sid.jChannelLfDirect),
    finishTrimLf: n(sid.finishTrimLf),
    bandBoardLf: n(trim.bandBoardLf),
    windowTrimLf: n(trim.windowTrimLf), doorTrimLf: n(trim.doorTrimLf),
    rooms: rooms.length > 0 ? rooms : base.rooms,
    doors: list<WallDoorEntry>(wa.doors, it.doors),
    windows: list<WallWindowEntry>(wa.windows, it.windows),
    interiorCorners: n(wa.corners),
    deckSections: list<DeckSection>(deck.sections).length > 0 ? list<DeckSection>(deck.sections) : base.deckSections,
    deckHeightFt: n(frame.postHeightFt), deckHeightIn: n(frame.postHeightIn),
    deckGates: deckRuns.filter((r) => r.type === "gate").length,
    deckStairs: n(deck.stairs), deckStairRisers: n(deck.stairRisers) || 7,
    deckStairWidthFt: deck.stairWidthFt === undefined ? 3 : n(deck.stairWidthFt), deckStairWidthIn: n(deck.stairWidthIn),
  }
}

// Load the saved Job record; fields it doesn't have yet (e.g. siding added later) come from the old tabs
export function jobFromSaved(saved: Saved[]): JobMeasurements {
  const job = saved.find((m) => m.tradeType === JOB_TRADE_TYPE)?.data as (Partial<JobMeasurements> & { waterTableLf?: number }) | undefined
  const merged = { ...jobFromScopes(saved), ...(job ?? {}) }
  // Older saved jobs called the level starter waterTableLf
  if (job && job.starterLf === undefined && job.waterTableLf) merged.starterLf = job.waterTableLf
  // Older saved jobs had one "corners" count; treat those as outside miters
  const oldCorners = (job as { gutterCorners?: number } | undefined)?.gutterCorners
  if (job && job.outsideMiters === undefined && oldCorners) merged.outsideMiters = oldCorners
  delete (merged as { gutterCorners?: number }).gutterCorners
  delete (merged as { waterTableLf?: number }).waterTableLf
  return merged
}

// Which form sections the Measurements tab shows for the active scopes
export function sectionsForTabs(tabs: string[]): Set<JobSection> {
  const s = new Set<JobSection>()
  const has = (t: string) => tabs.includes(t)
  if (has("Roofing")) s.add("roof").add("edges")
  if (has("Gutters")) s.add("gutters").add("edges")
  if (has("Siding")) s.add("siding").add("edges")
  if (has("Exterior Trim") || has("Exterior Trim Accessories")) s.add("trim").add("edges")
  const trim = has("Interior Trim") || has("Interior Trim Accessories")
  if (has("Painting") || has("Drywall") || has("Drywall Accessories") || has("Flooring") || trim) s.add("rooms")
  const doors = has("Interior Doors") || has("Interior Door Assembly")
  if (has("Painting") || has("Drywall Accessories") || has("Wall Assembly") || trim || doors) s.add("openings")
  if (has("Drywall Accessories") || has("Wall Assembly")) s.add("corners")
  if (DECK_TABS.some(has)) s.add("deck")
  return s
}

// ── Deck geometry ───────────────────────────────────────────────────────────
const ftIn = (ft: unknown, inches: unknown) => n(ft) + n(inches) / 12
const splitFt = (ft: number) => {
  const whole = Math.floor(ft)
  const inches = Math.round((ft - whole) * 12)
  return inches === 12 ? { ft: whole + 1, inches: 0 } : { ft: whole, inches }
}

export function deckGeometry(job: JobMeasurements) {
  const sections = job.deckSections.filter((s) => ftIn(s.lengthFt, s.lengthIn) > 0 && ftIn(s.widthFt, s.widthIn) > 0)
  const alongHouse = sections.reduce((t, s) => t + ftIn(s.lengthFt, s.lengthIn), 0)
  const depth = sections.reduce((m, s) => Math.max(m, ftIn(s.widthFt, s.widthIn)), 0)
  const sqft = sections.reduce((t, s) => t + ftIn(s.lengthFt, s.lengthIn) * ftIn(s.widthFt, s.widthIn), 0)
  const stairGap = job.deckStairs > 0 ? ftIn(job.deckStairWidthFt, job.deckStairWidthIn) : 0
  const gateLf = job.deckGates * DECK_GATE_WIDTH_FT
  const frontRail = Math.max(0, alongHouse - stairGap - gateLf)
  const railLf = (job.deckRailLeft ? depth : 0) + (job.deckRailFront ? frontRail : 0) + (job.deckRailRight ? depth : 0) + gateLf
  const posts = alongHouse > 0 ? Math.ceil(alongHouse / DECK_POST_SPACING_FT) + 1 : 0
  return { sections, alongHouse, depth, sqft, stairGap, frontRail, gateLf, railLf, posts, height: ftIn(job.deckHeightFt, job.deckHeightIn) }
}

// Railing runs: no rail on the house side; left, front (less the stair opening and gates) and right as picked
function deckRailRuns(job: JobMeasurements, g: ReturnType<typeof deckGeometry>): DeckRailRun[] {
  if (g.alongHouse <= 0) return []
  const run = (label: string, ft: number, type: DeckRailRun["type"] = "section"): DeckRailRun => {
    const { ft: lengthFt, inches: lengthIn } = splitFt(ft)
    return { id: "deck:" + label, label, lengthFt, lengthIn, type }
  }
  const runs: DeckRailRun[] = [run("House side (ledger)", g.alongHouse, "ledger")]
  if (job.deckRailLeft && g.depth > 0) runs.push(run("Left side", g.depth))
  if (job.deckRailFront && g.frontRail > 0) runs.push(run("Front", g.frontRail))
  for (let i = 0; i < job.deckGates; i++) runs.push(run(`Gate ${i + 1}`, DECK_GATE_WIDTH_FT, "gate"))
  if (job.deckRailRight && g.depth > 0) runs.push(run("Right side", g.depth))
  return runs
}

function validRooms(job: JobMeasurements): RoomEntry[] {
  return job.rooms.filter((r) => n(r.length) > 0 && n(r.width) > 0)
}

export function roomWallLf(r: RoomEntry): number {
  return 2 * (n(r.length) + n(r.width))
}

export function roomPaintArea(r: RoomEntry): number {
  return roomWallLf(r) * n(r.height) + (r.ceiling ? n(r.length) * n(r.width) : 0)
}

const feet = (ft: number, inches: number) => n(ft) + n(inches) / 12

function doorCasingLf(job: JobMeasurements): number {
  return job.doors.reduce((s, d) => {
    const sides = (d.type ?? "interior") === "interior" ? 2 : 1
    return s + (2 * feet(d.heightFt, d.heightIn) + feet(d.widthFt, d.widthIn)) * sides * n(d.count)
  }, 0)
}

function doorEdgeLf(job: JobMeasurements): number {
  return job.doors.reduce((s, d) => s + (2 * feet(d.heightFt, d.heightIn) + feet(d.widthFt, d.widthIn)) * n(d.count), 0)
}

function windowPerimeterLf(job: JobMeasurements): number {
  return job.windows.reduce((s, w) => s + (2 * feet(w.heightFt, w.heightIn) + 2 * feet(w.widthFt, w.widthIn)) * n(w.count), 0)
}

// Wall Assembly's wall and ceiling lists, when that scope is on the job
export interface FramingSource {
  walls?: { id?: string; label?: string; length?: number; height?: number }[]
  ceilingSections?: { id?: string; label?: string; length?: number; width?: number }[]
}

interface InteriorSurfaces {
  walls: { id: string; label: string; length: number; height: number }[]
  ceilings: { id: string; label: string; length: number; width: number }[]
  wallSource: "wall assembly" | "rooms"
  ceilingSource: "wall assembly" | "rooms"
}

// Wall Assembly sections win when entered; rooms fill in whatever Wall Assembly doesn't have
export function interiorSurfaces(job: JobMeasurements, framing?: FramingSource): InteriorSurfaces {
  const rooms = validRooms(job)
  const framedWalls = (framing?.walls ?? []).filter((w) => n(w.length) > 0)
  const framedCeilings = (framing?.ceilingSections ?? []).filter((c) => n(c.length) > 0 && n(c.width) > 0)
  const walls = framedWalls.length > 0
    ? framedWalls.map((w, i) => ({
        id: ROOM_ENTRY_PREFIX + "wa-" + (w.id ?? i), label: w.label ?? "",
        length: n(w.length), height: n(w.height) || 8,
      }))
    : rooms.filter((r) => n(r.height) > 0).map((r) => ({
        id: ROOM_ENTRY_PREFIX + r.id, label: r.label, length: roomWallLf(r), height: n(r.height),
      }))
  const ceilings = framedCeilings.length > 0
    ? framedCeilings.map((c, i) => ({
        id: ROOM_ENTRY_PREFIX + "wa-" + (c.id ?? i), label: c.label ?? "", length: n(c.length), width: n(c.width),
      }))
    : rooms.filter((r) => r.ceiling).map((r) => ({
        id: ROOM_ENTRY_PREFIX + r.id, label: r.label, length: n(r.length), width: n(r.width),
      }))
  return {
    walls, ceilings,
    wallSource: framedWalls.length > 0 ? "wall assembly" : "rooms",
    ceilingSource: framedCeilings.length > 0 ? "wall assembly" : "rooms",
  }
}

function surfaceTotals(surf: InteriorSurfaces) {
  const wallLf = surf.walls.reduce((s, w) => s + w.length, 0)
  const wallSqft = surf.walls.reduce((s, w) => s + w.length * w.height, 0)
  const ceilingSqft = surf.ceilings.reduce((s, c) => s + c.length * c.width, 0)
  return { wallLf, wallSqft, ceilingSqft }
}

export function interiorPaintSqft(job: JobMeasurements, framing?: FramingSource): number {
  const t = surfaceTotals(interiorSurfaces(job, framing))
  return Math.round(t.wallSqft + t.ceilingSqft)
}

// Hand-entered sections only, with any room-built ones removed
export function stripRoomEntries<T>(data: T): T {
  const d = data as Record<string, unknown>
  const strip = (v: unknown) => (Array.isArray(v)
    ? v.filter((e) => !String((e as { id?: unknown }).id ?? "").startsWith(ROOM_ENTRY_PREFIX))
    : v)
  return {
    ...d,
    ...(d.wallSections !== undefined && { wallSections: strip(d.wallSections) }),
    ...(d.ceilingSections !== undefined && { ceilingSections: strip(d.ceilingSections) }),
  } as T
}

export function roofArea(job: JobMeasurements): number {
  return job.planes.reduce((sum, p) => sum + n(p.area), 0)
}

export function effectiveSoffitArea(job: JobMeasurements): number {
  return job.soffitArea || Math.round(job.soffitLf * (job.soffitOverhangIn / 12))
}

export function wallArea(job: JobMeasurements): number {
  if (job.sidingSource === "hover") return job.hoverFacadesSqft
  const walls = job.walls.reduce((s, w) => s + n(w.width) * n(w.height), 0)
  const gables = job.gables.reduce((s, g) => s + 0.5 * n(g.width) * n(g.rise), 0)
  return Math.round(walls + gables)
}

// The measurement fields a scope's assembly reads, in the shape that scope already uses
export function deriveForTab(
  tab: string,
  job: JobMeasurements,
  scopeData: Record<string, unknown> = {},
  framing?: FramingSource,
): Record<string, unknown> | null {
  if (tab === "Roofing") {
    return {
      planes: job.planes, pitch: job.pitch,
      ridge: job.ridge, hip: job.hip, valleys: job.valleys, rakes: job.rakes, eaves: job.eaves,
      soffitOverhangIn: job.soffitOverhangIn,
      ridgeVentLf: job.ridgeVentLf, roofToWallLf: job.roofToWallLf,
      chimneys: job.chimneys, skylights: job.skylights, powerVents: job.powerVents,
      leadStacks3: job.leadStacks3, leadStacks4: job.leadStacks4,
      leadStacks5: job.leadStacks5, leadStacks6: job.leadStacks6,
      slantBackVents: job.slantBackVents, kitchenVents: job.kitchenVents, bathroomVents: job.bathroomVents,
    }
  }
  if (tab === "Gutters") {
    return {
      linearFt: job.gutterLf || job.eaves, downspouts: job.downspouts, downspoutLf: job.downspoutLf,
      insideMiters: job.insideMiters, outsideMiters: job.outsideMiters, corners: 0,
    }
  }
  if (tab === "Siding") {
    const soffitArea = effectiveSoffitArea(job)
    const openingsPerimeterLf = job.hoverOpeningsTopsLf + job.hoverOpeningsSillsLf + job.hoverOpeningsSidesLf
    return {
      measurementSource: job.sidingSource,
      walls: job.walls, gables: job.gables,
      eavesLf: job.eaves,
      outsideCorners: job.cornerBoardsLf, insideCorners: job.insideCornersLf,
      perimeterLf: job.starterLf, jChannelLfDirect: job.jChannelLf, finishTrimLf: job.finishTrimLf,
      fasciaLf: job.fasciaLf, soffitLf: job.soffitLf, soffitArea,
      hover: {
        facadesSqft: job.hoverFacadesSqft, openingsSqft: job.hoverOpeningsSqft,
        starterStripLf: job.starterLf,
        outsideCorners: job.cornerBoardsLf, insideCorners: job.insideCornersLf,
        openingQty: job.hoverOpeningQty,
        openingsTopsLf: job.hoverOpeningsTopsLf, openingsSillsLf: job.hoverOpeningsSillsLf,
        openingsSidesLf: job.hoverOpeningsSidesLf, openingsPerimeterLf,
        eavesLf: job.eaves, rakesLf: job.rakes, fasciaLf: job.fasciaLf,
        soffitArea, soffitLf: job.soffitLf, friezeBoardLf: job.friezeLf,
        verticalTrimLf: job.hoverVerticalTrimLf, slopedTrimLf: job.hoverSlopedTrimLf,
      },
    }
  }
  if (tab === "Exterior Trim" || tab === "Exterior Trim Accessories") {
    return {
      rakeLf: job.rakes,
      cornerBoardsLf: job.cornerBoardsLf, friezeLf: job.friezeLf, fasciaLf: job.fasciaLf,
      bandBoardLf: job.bandBoardLf,
      windowTrimLf: job.windowTrimLf, doorTrimLf: job.doorTrimLf, jChannelLf: job.jChannelLf,
    }
  }

  const rooms = validRooms(job)
  const surf = interiorSurfaces(job, framing)
  const totals = surfaceTotals(surf)
  const perimeter = totals.wallLf
  if (tab === "Painting") {
    const doorWidths = job.doors.reduce((s, d) => s + feet(d.widthFt, d.widthIn) * n(d.count), 0)
    const baseLf = Math.max(0, Math.round(perimeter - doorWidths))
    const casingLf = Math.round(doorCasingLf(job) + windowPerimeterLf(job))
    return {
      rooms: [], wallSections: surf.walls, ceilingSections: surf.ceilings,
      ...(baseLf > 0 && { baseLf }), ...(casingLf > 0 && { casingLf }),
    }
  }
  if (tab === "Drywall") {
    const own = stripRoomEntries(scopeData)
    return {
      wallSections: [...surf.walls, ...((own.wallSections as unknown[]) ?? [])],
      ceilingSections: [...surf.ceilings, ...((own.ceilingSections as unknown[]) ?? [])],
    }
  }
  if (tab === "Drywall Accessories") {
    const heights = surf.walls.map((w) => w.height).filter((h) => h > 0)
    const avgHeight = heights.length > 0 ? heights.reduce((s, h) => s + h, 0) / heights.length : 8
    const cornerBeadLf = Math.round(job.interiorCorners * avgHeight)
    const jBeadLf = Math.round(doorEdgeLf(job) + windowPerimeterLf(job))
    const sqft = Math.round(totals.wallSqft + totals.ceilingSqft)
    return {
      ...(cornerBeadLf > 0 && { cornerBeadLf }),
      ...(jBeadLf > 0 && { jBeadLf }),
      ...(sqft > 0 && { primerSqft: sqft, textureSqft: sqft }),
    }
  }
  if (tab === "Interior Trim" || tab === "Interior Trim Accessories") {
    const doorCount = job.doors.reduce((s, d) => s + n(d.count), 0)
    return {
      ...(perimeter > 0 && { baseLf: Math.round(perimeter) }),
      ...(doorCount > 0 && { doorDeductions: doorCount }),
      doors: job.doors.map((d) => ({ ...d, type: d.type ?? "interior" })),
      windows: job.windows,
    }
  }
  if (tab === "Flooring") {
    return {
      rooms: rooms.filter((r) => r.floor !== false).map((r) => ({
        id: r.id, label: r.label, length: r.length, width: r.width,
      })),
    }
  }
  if (tab === "Wall Assembly") {
    return { doors: job.doors, windows: job.windows, corners: job.interiorCorners }
  }
  if (tab === "Interior Doors" || tab === "Interior Door Assembly") {
    return { doors: job.doors }
  }
  if (DECK_TABS.includes(tab)) {
    const g = deckGeometry(job)
    if (tab === "Decking") {
      const gap = splitFt(g.stairGap)
      return {
        sections: g.sections,
        deckRailRuns: deckRailRuns(job, g),
        stairRailRuns: [],   // the build works stair rail out from the stairs
        stairs: job.deckStairs, stairRisers: job.deckStairRisers,
        stairWidthFt: job.deckStairWidthFt, stairWidthIn: job.deckStairWidthIn,
        stairGapFt: gap.ft, stairGapIn: gap.inches,
      }
    }
    if (tab === "Decking Accessories") {
      // Fascia on the exposed sides: front + both ends
      const fascia = splitFt(g.alongHouse + g.depth * 2)
      return g.alongHouse > 0 ? { fasciaBoardsFt: fascia.ft, fasciaBoardsIn: fascia.inches } : {}
    }
    // Deck Framing (and its accessories, which read the same frame)
    const ledger = splitFt(g.alongHouse)
    const span = splitFt(g.depth)
    const height = splitFt(g.height)
    return {
      ...(g.alongHouse > 0 && { ledgerFt: ledger.ft, ledgerIn: ledger.inches, beamFt: ledger.ft, beamIn: ledger.inches }),
      ...(g.depth > 0 && { joistSpanFt: span.ft, joistSpanIn: span.inches }),
      ...(g.posts > 0 && { postCount: g.posts, pierCount: g.posts }),
      ...(g.height > 0 && { postHeightFt: height.ft, postHeightIn: height.inches }),
    }
  }
  return null
}

const PITCH_LABELS: Record<string, string> = {
  up_to_6_12: "up to 6/12", "7_8_12": "7–8/12", "9_10_12": "9–10/12",
  "11_12_12": "11–12/12", mansard: "Mansard", flat: "Flat",
}

// Short "what this scope will use" lines for the confirm banner
export function summaryForTab(tab: string, job: JobMeasurements, framing?: FramingSource): string[] {
  const parts: string[] = []
  const add = (v: number, label: string) => { if (v > 0) parts.push(`${v.toLocaleString()} ${label}`) }
  if (tab === "Roofing") {
    add(roofArea(job), "sqft")
    parts.push(PITCH_LABELS[job.pitch] ?? job.pitch)
    add(job.eaves, "lf eaves"); add(job.rakes, "lf rakes"); parts.push(`${job.soffitOverhangIn}" overhang`)
    add(job.ridge, "lf ridge"); add(job.hip, "lf hip"); add(job.valleys, "lf valleys")
    add(job.ridgeVentLf, "lf ridge vent"); add(job.roofToWallLf, "lf roof-to-wall")
    add(job.chimneys, "chimney(s)"); add(job.skylights, "skylight(s)"); add(job.powerVents, "power vent(s)")
    add(job.leadStacks3 + job.leadStacks4 + job.leadStacks5 + job.leadStacks6, "lead stack(s)")
    add(job.slantBackVents + job.kitchenVents + job.bathroomVents, "vent(s)")
  } else if (tab === "Gutters") {
    add(job.gutterLf || job.eaves, job.gutterLf ? "lf gutter" : "lf gutter (eaves)")
    add(job.downspouts, "downspout(s)"); add(job.downspoutLf || job.downspouts * 10, "lf downspout")
    add(job.insideMiters, "inside miter(s)"); add(job.outsideMiters, "outside miter(s)")
  } else if (tab === "Siding") {
    parts.push(job.sidingSource === "hover" ? "Hover report" : "Hand measured")
    add(wallArea(job), "sqft walls")
    if (job.sidingSource === "hover") add(job.hoverOpeningsSqft, "sqft openings")
    else add(job.walls.reduce((s, w) => s + (w.openings?.length ?? 0), 0), "opening(s)")
    add(job.cornerBoardsLf, "lf outside corners"); add(job.insideCornersLf, "lf inside corners")
    add(job.starterLf, "lf level starter"); add(job.fasciaLf, "lf fascia")
    add(job.soffitLf, "lf soffit"); add(effectiveSoffitArea(job), "sqft soffit")
    add(job.jChannelLf, "lf J-channel"); add(job.finishTrimLf, "lf finish trim")
  } else if (tab === "Exterior Trim" || tab === "Exterior Trim Accessories") {
    add(job.cornerBoardsLf, "lf corners"); add(job.rakes, "lf rake"); add(job.friezeLf, "lf frieze")
    add(job.fasciaLf, "lf fascia"); add(job.bandBoardLf, "lf band")
    add(job.windowTrimLf, "lf window trim"); add(job.doorTrimLf, "lf door trim"); add(job.jChannelLf, "lf J-channel")
  } else {
    const rooms = validRooms(job)
    const doorCount = job.doors.reduce((s, d) => s + n(d.count), 0)
    const windowCount = job.windows.reduce((s, w) => s + n(w.count), 0)
    const surf = interiorSurfaces(job, framing)
    const t = surfaceTotals(surf)
    const from = (src: string) => (src === "wall assembly" ? " (Wall Assembly)" : "")
    if (tab === "Painting" || tab === "Drywall") {
      if (surf.wallSource === "rooms" || surf.ceilingSource === "rooms") add(rooms.length, "room(s)")
      add(Math.round(t.wallSqft), "sqft walls" + from(surf.wallSource))
      add(Math.round(t.ceilingSqft), "sqft ceilings" + from(surf.ceilingSource))
      if (tab === "Painting") { add(doorCount, "door(s)"); add(windowCount, "window(s)") }
    } else if (tab === "Drywall Accessories") {
      add(Math.round(t.wallSqft + t.ceilingSqft), "sqft"); add(job.interiorCorners, "corner(s)")
      add(doorCount, "door(s)"); add(windowCount, "window(s)")
    } else if (tab === "Interior Trim" || tab === "Interior Trim Accessories") {
      add(Math.round(t.wallLf), "lf walls" + from(surf.wallSource))
      add(doorCount, "door(s)"); add(windowCount, "window(s)")
    } else if (tab === "Flooring") {
      const floors = rooms.filter((r) => r.floor !== false)
      add(floors.length, "room(s)")
      add(Math.round(floors.reduce((s, r) => s + n(r.length) * n(r.width), 0)), "sqft floor")
    } else if (tab === "Wall Assembly") {
      add(doorCount, "door(s)"); add(windowCount, "window(s)"); add(job.interiorCorners, "corner(s)")
    } else if (DECK_TABS.includes(tab)) {
      const g = deckGeometry(job)
      const lf = (v: number) => Math.round(v * 10) / 10
      if (tab === "Decking") {
        add(Math.round(g.sqft), "sqft deck"); add(lf(g.railLf), "lf railing")
        add(job.deckStairs, `stair flight(s) × ${job.deckStairRisers} risers`); add(job.deckGates, "gate(s)")
      } else if (tab === "Decking Accessories") {
        add(lf(g.alongHouse + g.depth * 2), "lf fascia"); add(Math.round(g.sqft), "sqft deck")
      } else {
        add(lf(g.alongHouse), "lf ledger & beam"); add(lf(g.depth), "ft joist span")
        add(g.posts, `post(s) @ ${DECK_POST_SPACING_FT}'`); add(lf(g.height), "ft high")
      }
    } else if (tab === "Interior Doors" || tab === "Interior Door Assembly") {
      add(job.doors.filter((d) => d.type !== "exterior").reduce((s, d) => s + n(d.count), 0), "interior door(s)")
    }
  }
  return parts
}
