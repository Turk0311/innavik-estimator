// One set of job measurements, entered once on the Measurements tab and fed to every scope.
// Each scope keeps only its own choices (job type, waste, materials); derived values always win.

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
  // Roof edges — shared by Roofing, Gutters and Exterior Trim
  eaves: number
  rakes: number
  soffitOverhangIn: number
  // Gutters
  gutterLf: number        // 0 = same as eaves
  downspouts: number
  gutterCorners: number
  // Exterior trim
  cornerBoardsLf: number
  friezeLf: number
  fasciaLf: number
  waterTableLf: number
  bandBoardLf: number
  windowTrimLf: number
  doorTrimLf: number
  jChannelLf: number
}

export type JobSection = "roof" | "edges" | "gutters" | "trim"

export const LINKED_TABS = new Set(["Roofing", "Gutters", "Exterior Trim", "Exterior Trim Accessories"])

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
    cornerBoardsLf: 0, friezeLf: 0, fasciaLf: 0, waterTableLf: 0,
    bandBoardLf: 0, windowTrimLf: 0, doorTrimLf: 0, jChannelLf: 0,
  }
}

// Load the saved Job record, or build one from measurements entered on the old per-scope tabs
export function jobFromSaved(saved: Saved[]): JobMeasurements {
  const find = (t: string) => saved.find((m) => m.tradeType === t)?.data
  const job = find(JOB_TRADE_TYPE)
  if (job) return { ...emptyJob(), ...(job as Partial<JobMeasurements>) }

  const roof = find("Roofing") ?? {}
  const gut = find("Gutters") ?? {}
  const trim = find("Exterior Trim") ?? {}
  const base = emptyJob()
  const planes = Array.isArray(roof.planes) && roof.planes.length > 0 ? (roof.planes as PlaneEntry[]) : base.planes

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
    eaves: n(roof.eaves),
    rakes: n(roof.rakes) || n(trim.rakeLf),
    soffitOverhangIn: n(roof.soffitOverhangIn) || 12,
    gutterLf: n(gut.linearFt) === n(roof.eaves) ? 0 : n(gut.linearFt),
    downspouts: n(gut.downspouts), gutterCorners: n(gut.corners),
    cornerBoardsLf: n(trim.cornerBoardsLf), friezeLf: n(trim.friezeLf), fasciaLf: n(trim.fasciaLf),
    waterTableLf: n(trim.waterTableLf), bandBoardLf: n(trim.bandBoardLf),
    windowTrimLf: n(trim.windowTrimLf), doorTrimLf: n(trim.doorTrimLf), jChannelLf: n(trim.jChannelLf),
  }
}

// Which form sections the Measurements tab shows for the active scopes
export function sectionsForTabs(tabs: string[]): Set<JobSection> {
  const s = new Set<JobSection>()
  const has = (t: string) => tabs.includes(t)
  if (has("Roofing")) s.add("roof").add("edges")
  if (has("Gutters")) s.add("gutters").add("edges")
  if (has("Exterior Trim") || has("Exterior Trim Accessories")) s.add("trim").add("edges")
  return s
}

export function roofArea(job: JobMeasurements): number {
  return job.planes.reduce((sum, p) => sum + n(p.area), 0)
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
  if (tab === "Exterior Trim" || tab === "Exterior Trim Accessories") {
    return {
      rakeLf: job.rakes,
      cornerBoardsLf: job.cornerBoardsLf, friezeLf: job.friezeLf, fasciaLf: job.fasciaLf,
      waterTableLf: job.waterTableLf, bandBoardLf: job.bandBoardLf,
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
  } else if (tab === "Exterior Trim" || tab === "Exterior Trim Accessories") {
    add(job.cornerBoardsLf, "lf corners"); add(job.rakes, "lf rake"); add(job.friezeLf, "lf frieze")
    add(job.fasciaLf, "lf fascia"); add(job.waterTableLf, "lf level starter"); add(job.bandBoardLf, "lf band")
    add(job.windowTrimLf, "lf window trim"); add(job.doorTrimLf, "lf door trim"); add(job.jChannelLf, "lf J-channel")
  }
  return parts
}
