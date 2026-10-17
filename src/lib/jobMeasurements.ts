// One set of job measurements, entered once on the Measurements tab and fed to every scope.
// Each scope keeps only its own choices (job type, waste, materials); derived values always win.

import type { WallEntry, GableEntry, MeasurementSource } from "@/components/measurements/SidingMeasurements"

export interface PlaneEntry { id: string; label: string; area: number }

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
  gutterCorners: number
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
}

export type JobSection = "roof" | "edges" | "gutters" | "siding" | "trim"

export const LINKED_TABS = new Set(["Roofing", "Gutters", "Siding", "Exterior Trim", "Exterior Trim Accessories"])

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
    gutterLf: 0, downspouts: 0, gutterCorners: 0,
    sidingSource: "manual",
    walls: [{ id: String(Date.now() + 1), label: "", width: 0, height: 0, openings: [] }],
    gables: [],
    hoverFacadesSqft: 0, hoverOpeningsSqft: 0, hoverOpeningQty: 0,
    hoverOpeningsTopsLf: 0, hoverOpeningsSillsLf: 0, hoverOpeningsSidesLf: 0,
    hoverVerticalTrimLf: 0, hoverSlopedTrimLf: 0,
    cornerBoardsLf: 0, insideCornersLf: 0, starterLf: 0, fasciaLf: 0, friezeLf: 0,
    soffitLf: 0, soffitArea: 0, jChannelLf: 0, finishTrimLf: 0,
    bandBoardLf: 0, windowTrimLf: 0, doorTrimLf: 0,
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
    downspouts: n(gut.downspouts), gutterCorners: n(gut.corners),
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
  }
}

// Load the saved Job record; fields it doesn't have yet (e.g. siding added later) come from the old tabs
export function jobFromSaved(saved: Saved[]): JobMeasurements {
  const job = saved.find((m) => m.tradeType === JOB_TRADE_TYPE)?.data as (Partial<JobMeasurements> & { waterTableLf?: number }) | undefined
  const merged = { ...jobFromScopes(saved), ...(job ?? {}) }
  // Older saved jobs called the level starter waterTableLf
  if (job && job.starterLf === undefined && job.waterTableLf) merged.starterLf = job.waterTableLf
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
  return s
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
export function deriveForTab(tab: string, job: JobMeasurements): Record<string, unknown> | null {
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
    return { linearFt: job.gutterLf || job.eaves, downspouts: job.downspouts, corners: job.gutterCorners }
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
  return null
}

const PITCH_LABELS: Record<string, string> = {
  up_to_6_12: "up to 6/12", "7_8_12": "7–8/12", "9_10_12": "9–10/12",
  "11_12_12": "11–12/12", mansard: "Mansard", flat: "Flat",
}

// Short "what this scope will use" lines for the confirm banner
export function summaryForTab(tab: string, job: JobMeasurements): string[] {
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
    add(job.downspouts, "downspout(s)"); add(job.gutterCorners, "corner(s)")
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
  }
  return parts
}
