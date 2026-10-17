// Assembly calculation engine
// Takes raw field measurements and returns a list of pre-calculated estimate items

export type MeasurementData = Record<string, unknown>

export type AssemblyItem = {
  description: string
  quantity: number
  unit: string
  cost: number
  markup: number
  tier: 'GOOD' | 'GOOD_PLUS' | 'BETTER' | 'BETTER_PLUS' | 'BEST' | 'BEST_PLUS'
  packages?: string
  category: string
  isLabor: boolean
  productId?: string
  sku?: string | null
  supplier?: string | null
}

type Product = {
  id: string
  name: string
  cost: number
  unit: string
  category: string
  subCategory: string | null
  tier: 'GOOD' | 'GOOD_PLUS' | 'BETTER' | 'BETTER_PLUS' | 'BEST' | 'BEST_PLUS'
  packages?: string
  sku: string | null
  supplier: string | null
}

function resolvePackages(p: Product): string {
  if (p.packages && p.packages !== 'good,better,best') return p.packages
  if (p.tier === 'BEST' || p.tier === 'BEST_PLUS') return 'best'
  if (p.tier === 'BETTER' || p.tier === 'BETTER_PLUS') return 'better,best'
  return 'good,better,best'
}

// A curated Assembly + its line items, as loaded from the database.
// Used by trades (e.g. General Labor) that map a curated assembly's
// material list onto a specific named task/scope item.
export type AssemblyDef = {
  name: string
  items: { productId: string; quantity: number; unit: string; coverageSqft?: number | null }[]
}

// ---------------------------------------------------------------------------
// Roofing R&R labor rates (per square, includes tear-off + install)
// Source: Innavik pricing sheet — R&R column, cost basis
// ---------------------------------------------------------------------------
const ROOFING_RR_LABOR: Record<string, number> = {
  'up_to_6_12': 100,   // R&R Roofing up to 6/12
  '7_8_12':     110,   // R&R 7/12 to 8/12
  '9_10_12':    120,   // R&R 9/12 to 10/12
  '11_12_12':   130,   // R&R 11/12 to 12/12
  'mansard':    165,   // R&R Mansard
  'flat':       130,   // R&R Flat APP/SA
}
const ADDITIONAL_LAYER_LABOR = 20  // per sq per extra layer beyond first

// Roofing accessory labor costs (ea / lf)
const ROOFING_ACCESSORY_LABOR: Record<string, number> = {
  ode:              0.50,  // ODE (lf)
  gutterApron:      0.50,  // Gutter Apron (lf)
  roofToWall:       0.75,  // Roof to Wall (lf)
  hipRidge:         1.00,  // Hip and Ridge (lf)
  ridgeVent:        1.00,  // Ridge Vent (lf)
  cutInRidgeVent:   1.50,  // Cut in Ridge Vent (lf)
  chimneyHousing:  75.00,  // Chimney Housing (ea)
  chimneyFlashing: 150.00, // Chimney Flashing (ea)
  powerVentNew:    50.00,  // New Power Vent (ea)
  powerVentRepair: 150.00, // Repair Power Vent (ea)
  skylightNew:     110.00, // New Skylight (ea)
  skylightSteep:   125.00, // Skylight 8/12+ (ea)
  rrPlywood:        20.00, // R&R Plywood (ea)
  rrSpaceDecking:    1.50, // R&R 1x Space Decking (lf)
  rrWoodFascia:      3.00, // R&R Wood Fascia (lf)
  hourlyLabor:      55.00, // Hourly Labor (hr)
}

// New construction labor rates (per square)
const ROOFING_NC_LABOR: Record<string, number> = {
  'up_to_6_12': 70,
  '7_8_12':     80,
  '9_10_12':    90,
  '11_12_12':   100,
  'mansard':    120,
}

// Keep for backward compat — no longer used for pitch math
const PITCH_MULTIPLIERS: Record<string, number> = {
  'up_to_6_12': 1.0,
  '7_8_12': 1.1,
  '9_10_12': 1.25,
  '11_12_12': 1.4,
  'mansard': 1.5,
  'flat': 0.85,
}

// Default costs used when no product match is found
const DEFAULT_COSTS: Record<string, number> = {
  shingles: 32,        // per square
  underlayment: 28,    // per roll
  starterStrip: 45,    // per bundle
  ridgeCap: 52,        // per bundle
  dripEdge: 1.20,      // per lf
  iceWater: 85,        // per roll
  coilNails: 28,       // per box
  tearoffLabor: 0,     // included in R&R rate — see ROOFING_RR_LABOR
  installLabor: 100,   // R&R up to 6/12 — see ROOFING_RR_LABOR for pitch-specific
  // Siding
  siding: 2.50,            // per sqf (note: billed in sq = 100 sqf)
  jChannel: 1.10,          // per lf
  undersill: 0.85,         // per lf
  insideCorner: 1.40,      // per lf (8ft pieces assumed counted)
  outsideCorner: 1.40,     // per lf
  soffit: 1.80,            // per sqf
  fascia: 1.50,            // per lf
  housewrap: 65,           // per square (roll)
  fanfold: 52,             // per bundle (1 bdl = 2 sq)
  sidingStarterStrip: 0.90,// per lf
  sidingNails: 28,         // per box (1 box covers 15 sq)
  mountMaster: 15,         // per ea
  splitBlock: 17,          // per ea
  exhaustVent: 35,         // per ea
  sidingLabor: 85,         // per square
  // Interior
  drywall: 0.55,       // per sqf
  paint: 0.45,         // per sqf (paint + primer)
  tape: 12,            // per roll
  mudCompound: 18,     // per bucket
  interiorLabor: 1.20, // per sqf wall area
  // Plumbing / Electrical
  outlet: 22,
  switch: 18,
  fixture: 45,
  roughInPlumbing: 320,
  plumbingFixture: 285,
  electricalLabor: 95,  // per hr
  plumbingLabor: 110,   // per hr
  // Painting
  paintMaterial: 35,    // per gallon
  paintLabor: 0.75,     // per sqf
  // Demo
  demoLabor: 0.80,      // per sqf
  dumpster: 450,        // flat
  // Labor
  generalLabor: 75,     // per hr
  // Kitchen
  upperCabinet: 180,    // per lf
  lowerCabinet: 220,    // per lf
  countertop: 95,       // per lf
  backsplash: 8,        // per sqf
  appliance: 120,       // install per ea
  sinkInstall: 280,     // flat
  kitchenLabor: 85,     // per hr
  // Deck
  deckBoards: 3.50,     // per sqf
  deckLabor: 4.00,      // per sqf
  railing: 28,          // per lf
  stairs: 350,          // per section
  // Gutter
  gutter: 8,            // per lf
  downspout: 45,        // per ea
  gutterCorner: 12,     // per ea
  gutterGuard: 4,       // per lf
  gutterLabor: 3,       // per lf
  // Interior Trim
  baseMolding: 1.20,    // per lf (material only, sticks priced separately)
  crownMolding: 2.40,   // per lf
  doorCasing: 1.80,     // per lf
  windowCasing: 1.80,   // per lf
  finishNails: 9,       // per box (approx 200 lf coverage)
  caulk: 4,             // per tube (approx 100 lf coverage)
  trimLabor: 1.10,      // per lf installed
  trimPaintLabor: 1.50, // per lf painted (base / casing)
  // Exterior Trim
  exteriorTrimBoard: 2.80,  // per lf (stick material, cost ÷ stick length for per-stick price)
  exteriorCaulk: 6,         // per tube (~25 lf coverage)
  exteriorPrimer: 45,       // per gallon (~200 lf coverage)
  exteriorPaint: 55,        // per gallon (~100 lf per coat × 2 coats)
  exteriorTrimNails: 12,    // per box (~200 lf coverage)
  exteriorTrimLabor: 2.50,  // per lf installed
}

const DEFAULT_MARKUP = 30

// ---------------------------------------------------------------------------
// Helper: find a product by keyword in name or subCategory
// ---------------------------------------------------------------------------
function findProduct(products: Product[], ...keywords: string[]): Product | undefined {
  const lower = keywords.map((k) => k.toLowerCase())
  return products.find((p) =>
    lower.some(
      (kw) =>
        p.name.toLowerCase().includes(kw) ||
        (p.subCategory ?? '').toLowerCase().includes(kw)
    )
  )
}

/** Like findProduct but ALL keywords must be present (AND semantics). */
function findProductAnd(products: Product[], ...keywords: string[]): Product | undefined {
  const lower = keywords.map((k) => k.toLowerCase())
  return products.find((p) => {
    const hay = (p.name + ' ' + (p.subCategory ?? '')).toLowerCase()
    return lower.every((kw) => hay.includes(kw))
  })
}

function ceil(n: number): number {
  return Math.ceil(n)
}

/** Parse sqft-per-carton from a product name string.
 *  Tries "20.15 sqft per carton", "20.15sqf per carton", "20.15sqf" patterns.
 *  Returns 0 if nothing found.
 */
function parseCartonSqft(name: string): number {
  // Pattern 1: "20.15 sqft per carton" or "20.15sqf per carton"
  const m1 = name.match(/(\d+(?:\.\d+)?)\s*sqf(?:t)?\s*per\s*carton/i)
  if (m1) return parseFloat(m1[1])
  // Pattern 2: "25 sqft per" (e.g. "25 sqft per carton $1.29 per Sqft")
  const m2 = name.match(/(\d+(?:\.\d+)?)\s*sqf(?:t)?\s+per\b/i)
  if (m2) return parseFloat(m2[1])
  // Pattern 3: bare "20.15sqf" anywhere in name (last resort)
  const m3 = name.match(/(\d+(?:\.\d+)?)\s*sqf(?:t)?/i)
  if (m3) return parseFloat(m3[1])
  return 0
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return isNaN(n) ? fallback : n
}

// ---------------------------------------------------------------------------
// Roofing Assembly — supports planes array (new) or legacy roofArea (old)
// ---------------------------------------------------------------------------
// Steepest rise (per 12) in each pitch range — used for ice & water coverage up the slope
const PITCH_RISE: Record<string, number> = {
  'up_to_6_12': 6, '7_8_12': 8, '9_10_12': 10, '11_12_12': 12, 'mansard': 12, 'flat': 0,
}

// Pitch → exact line name on the admin Labor page
const ROOFING_RR_LABOR_NAME: Record<string, string> = {
  'up_to_6_12': 'R&R Roofing up to 6/12',
  '7_8_12':     'R&R 7/12 to 8/12',
  '9_10_12':    'R&R 9/12 to 10/12',
  '11_12_12':   'R&R 11/12 to 12/12',
  'mansard':    'R&R Mansard',
  'flat':       'R&R Flat APP/SA',
}
const ROOFING_NC_LABOR_NAME: Record<string, string> = {
  'up_to_6_12': 'New Con up to 6/12',
  '7_8_12':     'New Con 7/12 to 8/12',
  '9_10_12':    'New Con 9/12 to 10/12',
  '11_12_12':   'New Con 11/12 to 12/12',
  'mansard':    'New Con Mansard',
}
const ROOFING_LAYOVER_LABOR_NAME: Record<string, string> = {
  'up_to_6_12': 'Layover up to 6/12',
  '7_8_12':     'Layover 7/12 to 8/12',
  '9_10_12':    'Layover 9/12 to 10/12',
  '11_12_12':   'Layover 11/12 to 12/12',
  'mansard':    'Layover Mansard',
  'flat':       'Layover Flat',
}

export function calculateRoofingAssembly(
  measurements: MeasurementData,
  allProducts: Product[]
): AssemblyItem[] {
  // Labor lines come from the Labor page by exact name; material searches must never match them
  const isLaborProduct = (p: Product) => p.category.toLowerCase().includes('labor')
  const products = allProducts.filter(p => !isLaborProduct(p))
  const laborCatalog = allProducts.filter(isLaborProduct)
  let sqf = 0

  // New multi-plane format
  const planes = measurements.planes
  if (Array.isArray(planes) && planes.length > 0) {
    sqf = planes.reduce((sum: number, p: unknown) => {
      const plane = p as { area?: unknown }
      return sum + num(plane.area)
    }, 0)
  } else {
    // Legacy single-value format
    sqf = num(measurements.roofArea)
  }

  const wastePct = num(measurements.wasteFactor, 15)
  const pitch = String(measurements.pitch ?? 'up_to_6_12')
  const jobType = String(measurements.jobType ?? 'rr') as 'rr' | 'new' | 'layover'
  const layers = num(measurements.layers, 1)
  const ridgeLf = num(measurements.ridge)
  const hipLf = num(measurements.hip)
  const valleysLf = num(measurements.valleys)
  const rakesLf = num(measurements.rakes)
  const eavesLf = num(measurements.eaves)
  const ridgeVentLf = num(measurements.ridgeVentLf)
  const chimneys      = num(measurements.chimneys)
  const skylights     = num(measurements.skylights)
  const powerVents    = num(measurements.powerVents)
  const leadStacks3   = num(measurements.leadStacks3)
  const leadStacks4   = num(measurements.leadStacks4)
  const leadStacks5   = num(measurements.leadStacks5)
  const leadStacks6   = num(measurements.leadStacks6)
  const slantBackVents = num(measurements.slantBackVents)
  const kitchenVents  = num(measurements.kitchenVents)
  const bathroomVents = num(measurements.bathroomVents)
  const roofToWallLf  = num(measurements.roofToWallLf)
  const shingleRepairs = num(measurements.shingleRepairs)
  const miscQty       = num(measurements.miscQty)
  const miscCost      = num(measurements.miscCost, 100)
  const roofingCharge = num(measurements.roofingCharge, 500)
  const soffitOverhangIn = num(measurements.soffitOverhangIn, 12)
  const iceWaterRows  = num(measurements.iceWaterRows)
  const babytins      = num(measurements.babytins)
  const dormerFlashing = num(measurements.dormerFlashing)
  const caulkTubes    = num(measurements.caulkTubes)
  const stapleBoxes   = num(measurements.stapleBoxes)

  if (sqf <= 0) return []

  const adjustedSqf = sqf * (1 + wastePct / 100)
  const squares = ceil(adjustedSqf / 100)
  // Labor is on measured area + a flat 10%; the waste factor only drives materials
  const laborSquares = ceil(Math.round(sqf * 1.1) / 100)

  const items: AssemblyItem[] = []

  function pushLabor(name: string, quantity: number, unit: string, fallbackCost: number) {
    if (quantity <= 0) return
    const p = laborCatalog.find(l => l.name.toLowerCase() === name.toLowerCase())
    items.push({
      description: p?.name ?? name,
      quantity,
      unit: p?.unit ?? unit,
      cost: p?.cost || fallbackCost,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Roofing',
      isLabor: true,
      productId: p?.id,
    })
  }

  // ── Product search helpers (scoped to roofing assembly) ────────────────────
  const isTriBuilt = (p: Product) => {
    const n = p.name.toLowerCase()
    return n.includes('tri-built') || n.includes('tri built') || n.includes('tribuilt')
  }
  const isGAF = (p: Product) => p.name.toLowerCase().includes('gaf')

  // 2. Shingles — require shingle-specific terms; exclude tape/adhesive/flashing/seal
  const SHINGLE_EXCLUDE = ['tape', 'adhesive', 'flashing', 'seal', 'window', 'caulk', 'cement']
  const shingleProduct = products.find(p => {
    const n = p.name.toLowerCase()
    return (n.includes('timberline') || n.includes('hdz') || n.includes('shingle') ||
            n.includes('landmark') || n.includes('duration') || n.includes('oakridge')) &&
           !SHINGLE_EXCLUDE.some(ex => n.includes(ex))
  }) ?? products.find(p => {
    const n = p.name.toLowerCase()
    return n.includes('shingle') && !SHINGLE_EXCLUDE.some(ex => n.includes(ex))
  })
  items.push({
    description: shingleProduct?.name ?? 'GAF Timberline HDZ shingles',
    quantity: squares,
    unit: 'sq',
    cost: shingleProduct?.cost ?? DEFAULT_COSTS.shingles,
    markup: DEFAULT_MARKUP,
    tier: shingleProduct?.tier ?? 'GOOD',
    packages: 'good,better',
    category: 'Roofing',
    isLabor: false,
    productId: shingleProduct?.id,
  })

  // 2b. Best-tier shingles (UHDZ) — same quantity as standard shingles
  const shingleBest = products.find(p => p.name.toLowerCase().includes('uhdz'))
  if (shingleBest) {
    items.push({
      description: shingleBest.name,
      quantity: squares,
      unit: 'sq',
      cost: shingleBest.cost,
      markup: DEFAULT_MARKUP,
      tier: shingleBest.tier === 'GOOD' ? 'BEST' : shingleBest.tier,
      packages: 'best',
      category: 'Roofing',
      isLabor: false,
      productId: shingleBest.id,
    })
  }

  // 3. Underlayment — GOOD: Tri-Built synthetic  |  BETTER: GAF Feltbuster
  const underlayKeywords = ['felt', 'synthetic', 'underlayment']
  const underlayGood = products.find(p => isTriBuilt(p) && underlayKeywords.some(k => p.name.toLowerCase().includes(k)))
    ?? findProduct(products, 'underlayment', 'synthetic felt')
  items.push({
    description: underlayGood?.name ?? 'Tri-Built synthetic underlayment',
    quantity: ceil(squares / 10),
    unit: 'roll',
    cost: underlayGood?.cost ?? DEFAULT_COSTS.underlayment,
    markup: DEFAULT_MARKUP,
    tier: underlayGood?.tier ?? 'GOOD',
    packages: 'good',
    category: 'Roofing',
    isLabor: false,
    productId: underlayGood?.id,
  })
  const underlayBetter = products.find(p => p.name.toLowerCase().includes('feltbuster'))
    ?? products.find(p => isGAF(p) && underlayKeywords.some(k => p.name.toLowerCase().includes(k)))
  if (underlayBetter) {
    items.push({
      description: underlayBetter.name,
      quantity: ceil(squares / 10),
      unit: 'roll',
      cost: underlayBetter.cost,
      markup: DEFAULT_MARKUP,
      tier: underlayBetter.tier === 'GOOD' ? 'BETTER' : underlayBetter.tier,
      packages: 'better,best',
      category: 'Roofing',
      isLabor: false,
      productId: underlayBetter.id,
    })
  }

  // 4. Starter strip — GOOD: Tri-Built  |  BETTER: GAF ProStarter
  if (eavesLf > 0) {
    const starterGood = products.find(p => isTriBuilt(p) && p.name.toLowerCase().includes('starter'))
      ?? findProduct(products, 'starter', 'starter strip')
    items.push({
      description: starterGood?.name ?? 'Tri-Built starter strip',
      quantity: ceil(eavesLf / 120),
      unit: 'bundle',
      cost: starterGood?.cost ?? DEFAULT_COSTS.starterStrip,
      markup: DEFAULT_MARKUP,
      tier: starterGood?.tier ?? 'GOOD',
      packages: 'good',
      category: 'Roofing',
      isLabor: false,
      productId: starterGood?.id,
    })
    const starterBetter = products.find(p => p.name.toLowerCase().includes('prostarter'))
      ?? products.find(p => isGAF(p) && p.name.toLowerCase().includes('starter'))
    if (starterBetter) {
      items.push({
        description: starterBetter.name,
        quantity: ceil(eavesLf / 120),
        unit: 'bundle',
        cost: starterBetter.cost,
        markup: DEFAULT_MARKUP,
        tier: starterBetter.tier === 'GOOD' ? 'BETTER' : starterBetter.tier,
        packages: 'better,best',
        category: 'Roofing',
        isLabor: false,
        productId: starterBetter.id,
      })
    }
  }

  // 5. Ridge cap — GOOD+BETTER: GAF Seal-A-Ridge  |  BEST: GAF TimberTex
  // No TRI-BUILT ridge cap — GAF Seal-A-Ridge covers both Good and Better packages.
  if (ridgeLf + hipLf > 0) {
    const ridgeBetter = products.find(p => p.name.toLowerCase().includes('seal-a-ridge') || p.name.toLowerCase().includes('sealridge'))
      ?? products.find(p => isGAF(p) && (p.name.toLowerCase().includes('ridge') || p.name.toLowerCase().includes('cap')))
    if (ridgeBetter) {
      items.push({
        description: ridgeBetter.name,
        quantity: ceil((ridgeLf + hipLf) / 22),
        unit: 'bundle',
        cost: ridgeBetter.cost,
        markup: DEFAULT_MARKUP,
        tier: ridgeBetter.tier === 'GOOD' ? 'BETTER' : ridgeBetter.tier,
        packages: 'good,better',
        category: 'Roofing',
        isLabor: false,
        productId: ridgeBetter.id,
      })
    }

    // 5b. Best-tier ridge cap (TIMBERTEX) — same quantity as standard ridge cap
    const ridgeBest = products.find(p => p.name.toLowerCase().includes('timbertex'))
    if (ridgeBest) {
      items.push({
        description: ridgeBest.name,
        quantity: ceil((ridgeLf + hipLf) / 22),
        unit: 'bundle',
        cost: ridgeBest.cost,
        markup: DEFAULT_MARKUP,
        tier: ridgeBest.tier === 'GOOD' ? 'BEST' : ridgeBest.tier,
        packages: 'best',
        category: 'Roofing',
        isLabor: false,
        productId: ridgeBest.id,
      })
    }
  }

  // 5c. Ridge vent — uses separate ridgeVentLf input (not ridge length); sold in 20' sections
  if (ridgeVentLf > 0) {
    const ridgeVentProduct = products.find(p =>
      p.name.toLowerCase().includes('ridge vent') || p.name.toLowerCase().includes('ridge-vent')
    ) ?? products.find(p =>
      p.name.toLowerCase().includes('ridge') && p.name.toLowerCase().includes('vent')
    )
    if (ridgeVentProduct) {
      items.push({
        description: ridgeVentProduct.name,
        quantity: ceil(ridgeVentLf / 20),
        unit: ridgeVentProduct.unit ?? 'ea',
        cost: ridgeVentProduct.cost,
        markup: DEFAULT_MARKUP,
        tier: ridgeVentProduct.tier,
        packages: 'good,better,best',
        category: 'Roofing',
        isLabor: false,
        productId: ridgeVentProduct.id,
      })
    }
  }

  // 10' sticks after the roof waste factor
  const sticks10 = (lf: number) => ceil(Math.round(lf * (1 + wastePct / 100) * 100) / 1000)

  // 6. Drip edge — rakes only, sold in 10' sticks
  const dripProduct = findProduct(products, 'drip edge', 'drip')
  if (rakesLf > 0) {
    items.push({
      description: dripProduct?.name ?? 'Drip edge',
      quantity: sticks10(rakesLf),
      unit: dripProduct?.unit ?? 'ea',
      cost: dripProduct?.cost ?? DEFAULT_COSTS.dripEdge,
      markup: DEFAULT_MARKUP,
      tier: dripProduct?.tier ?? 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: dripProduct?.id,
    })
  }

  // 6b. Gutter apron — eaves, sold in 10' sticks
  if (eavesLf > 0) {
    const gutterApronProduct = products.find((p) => p.name.toLowerCase() === 'gutter apron')
      ?? findProduct(products, 'gutter apron', 'apron')
    items.push({
      description: gutterApronProduct?.name ?? 'Gutter apron',
      quantity: sticks10(eavesLf),
      unit: gutterApronProduct?.unit ?? 'ea',
      cost: gutterApronProduct?.cost ?? dripProduct?.cost ?? DEFAULT_COSTS.dripEdge * 10,
      markup: DEFAULT_MARKUP,
      tier: gutterApronProduct?.tier ?? 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: gutterApronProduct?.id,
    })
  }

  // 7. Ice & water shield — GOOD: Tri-Built  |  BETTER: GAF WeatherWatch
  // Must reach 24" inside the exterior wall: (overhang + 24") measured up the slope.
  // 36" roll, 3" lap → first row 36", each extra row 33". Sales can request more rows, never fewer.
  // Valleys get one full-length strip. Rolls are 66 lf (2 sq).
  if (eavesLf > 0 || valleysLf > 0) {
    const rise = PITCH_RISE[pitch] ?? 6
    const slopeIn = (soffitOverhangIn + 24) * Math.sqrt(1 + (rise / 12) ** 2)
    const codeRows = slopeIn <= 36 ? 1 : 1 + ceil((slopeIn - 36) / 33)
    const iceRows = Math.max(codeRows, iceWaterRows)
    const iceQty = ceil((eavesLf * iceRows + valleysLf) / 66)
    const iceKeywords = ['ice', 'water']
    const iceGood = products.find(p => isTriBuilt(p) && iceKeywords.some(k => p.name.toLowerCase().includes(k)))
      ?? findProduct(products, 'ice & water', 'ice and water')
    items.push({
      description: iceGood?.name ?? 'Tri-Built Ice & Water shield',
      quantity: iceQty,
      unit: 'roll',
      cost: iceGood?.cost ?? DEFAULT_COSTS.iceWater,
      markup: DEFAULT_MARKUP,
      tier: iceGood?.tier ?? 'GOOD',
      packages: 'good',
      category: 'Roofing',
      isLabor: false,
      productId: iceGood?.id,
    })
    const iceBetter = products.find(p => p.name.toLowerCase().includes('weatherwatch'))
      ?? products.find(p => isGAF(p) && iceKeywords.some(k => p.name.toLowerCase().includes(k)))
    if (iceBetter) {
      items.push({
        description: iceBetter.name,
        quantity: iceQty,
        unit: 'roll',
        cost: iceBetter.cost,
        markup: DEFAULT_MARKUP,
        tier: iceBetter.tier === 'GOOD' ? 'BETTER' : iceBetter.tier,
        packages: 'better,best',
        category: 'Roofing',
        isLabor: false,
        productId: iceBetter.id,
      })
    }
  }

  // 8. Coil nails
  const nailProduct = findProduct(products, 'coil nail', 'roofing nail', 'eg nail')
  items.push({
    description: nailProduct?.name ?? 'Coil nails',
    quantity: ceil(squares / 22),
    unit: 'box',
    cost: nailProduct?.cost ?? DEFAULT_COSTS.coilNails,
    markup: DEFAULT_MARKUP,
    tier: nailProduct?.tier ?? 'GOOD',
    category: 'Roofing',
    isLabor: false,
    productId: nailProduct?.id,
  })

  // 11. Skylight flashing
  if (skylights > 0) {
    const skylightProduct = findProduct(products, 'skylight', 'skylight flashing')
    items.push({
      description: skylightProduct?.name ?? 'Skylight flashing',
      quantity: skylights,
      unit: 'ea',
      cost: skylightProduct?.cost ?? ROOFING_ACCESSORY_LABOR.skylightNew,
      markup: DEFAULT_MARKUP,
      tier: skylightProduct?.tier ?? 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: skylightProduct?.id,
    })
  }

  // 12. Power vents — require "power" to avoid matching bath/kitchen vents
  if (powerVents > 0) {
    const ventProduct = products.find(p => {
      const n = p.name.toLowerCase()
      return (n.includes('power vent') || (n.includes('power') && n.includes('vent'))) &&
             !n.includes('bath') && !n.includes('kitchen') && !n.includes('exhaust')
    }) ?? products.find(p => {
      const n = p.name.toLowerCase()
      return n.includes('turbine') || n.includes('attic vent') || n.includes('ventilator')
    })
    items.push({
      description: ventProduct?.name ?? 'Power vents',
      quantity: powerVents,
      unit: 'ea',
      cost: ventProduct?.cost ?? ROOFING_ACCESSORY_LABOR.powerVentNew,
      markup: DEFAULT_MARKUP,
      tier: ventProduct?.tier ?? 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: ventProduct?.id,
    })
  }

  // 13. Lead stacks — one item per size, only when count > 0
  const leadStackSizes: [number, string][] = [
    [leadStacks3, '3"'], [leadStacks4, '4"'], [leadStacks5, '5"'], [leadStacks6, '6"'],
  ]
  for (const [qty, size] of leadStackSizes) {
    if (qty > 0) {
      const stackProduct = products.find(p => {
        const n = p.name.toLowerCase()
        return (n.includes('lead stack') || n.includes('lead pipe') || n.includes('lead boot') ||
                n.includes('pipe flashing')) && n.includes(size.replace('"', ''))
      }) ?? products.find(p => {
        const n = p.name.toLowerCase()
        return n.includes('lead stack') || n.includes('lead boot') || n.includes('pipe flashing')
      })
      items.push({
        description: stackProduct?.name ?? `Lead stack ${size}`,
        quantity: qty,
        unit: 'ea',
        cost: stackProduct?.cost ?? (size === '3"' ? 28 : size === '4"' ? 34 : size === '5"' ? 40 : 46),
        markup: DEFAULT_MARKUP,
        tier: stackProduct?.tier ?? 'GOOD',
        category: 'Roofing',
        isLabor: false,
        productId: stackProduct?.id,
      })
    }
  }

  // 14. Slant back vents
  if (slantBackVents > 0) {
    const slantProduct = products.find(p => {
      const n = p.name.toLowerCase()
      return n.includes('slant back') || n.includes('slant-back') || n.includes('slantback')
    })
    items.push({
      description: slantProduct?.name ?? 'Slant back vent',
      quantity: slantBackVents,
      unit: 'ea',
      cost: slantProduct?.cost ?? 42,
      markup: DEFAULT_MARKUP,
      tier: slantProduct?.tier ?? 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: slantProduct?.id,
    })
  }

  // 15. Kitchen Broan 634 vents
  if (kitchenVents > 0) {
    const kitchenVentProduct = products.find(p => {
      const n = p.name.toLowerCase()
      return n.includes('634') || (n.includes('kitchen') && n.includes('vent'))
    })
    items.push({
      description: kitchenVentProduct?.name ?? 'Broan 634 kitchen vent',
      quantity: kitchenVents,
      unit: 'ea',
      cost: kitchenVentProduct?.cost ?? 58,
      markup: DEFAULT_MARKUP,
      tier: kitchenVentProduct?.tier ?? 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: kitchenVentProduct?.id,
    })
  }

  // 16. Bathroom Broan 636 vents
  if (bathroomVents > 0) {
    const bathVentProduct = products.find(p => {
      const n = p.name.toLowerCase()
      return n.includes('636') || (n.includes('bathroom') && n.includes('vent')) ||
             (n.includes('bath') && n.includes('vent') && !n.includes('through wall'))
    })
    items.push({
      description: bathVentProduct?.name ?? 'Broan 636 bathroom vent',
      quantity: bathroomVents,
      unit: 'ea',
      cost: bathVentProduct?.cost ?? 48,
      markup: DEFAULT_MARKUP,
      tier: bathVentProduct?.tier ?? 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: bathVentProduct?.id,
    })
  }

  // 17. Misc allowance — optional per-job amount
  if (miscQty > 0) {
    items.push({
      description: 'Miscellaneous',
      quantity: miscQty,
      unit: 'ea',
      cost: miscCost,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Roofing',
      isLabor: false,
    })
  }

  // 17a. Accessories entered as quantities on the Roofing tab
  const accessories: [number, string, string, number][] = [
    [babytins,       'BABYTINS 8X8',                          'babytin',  49.46],
    [dormerFlashing, "Dormer Flashing 10'",                   'dormer',   20],
    [caulkTubes,     'OSI / NPC / TRI  CAULK (12TB PER BOX)', 'caulk',    8.68],
    [stapleBoxes,    'TRI-BUILT DUOFAST STAPLES 5/16"',       'staple',   7.79],
  ]
  for (const [qty, exactName, keyword, fallbackCost] of accessories) {
    if (qty <= 0) continue
    const p = products.find(x => x.name.toLowerCase() === exactName.toLowerCase())
      ?? findProduct(products, keyword)
    items.push({
      description: p?.name ?? exactName,
      quantity: qty,
      unit: p?.unit ?? 'ea',
      cost: p?.cost ?? fallbackCost,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      packages: 'good,better,best',
      category: 'Roofing Accessories',
      isLabor: false,
      productId: p?.id,
    })
  }

  // 17b. Roofing charge — flat per-job default, sold at 0.80 (20% margin)
  if (roofingCharge > 0) {
    items.push({
      description: 'Roofing Charge',
      quantity: 1,
      unit: 'ea',
      cost: roofingCharge,
      markup: 20,
      tier: 'GOOD',
      category: 'Roofing',
      isLabor: false,
    })
  }

  // 18. Labor — every line comes from the admin Labor page by exact name
  const steepPitch = ['9_10_12', '11_12_12', 'mansard'].includes(pitch)
  // No New Con line exists for flat, so flat new construction uses the flat R&R line
  const rrName = ROOFING_RR_LABOR_NAME[pitch] ?? ROOFING_RR_LABOR_NAME['up_to_6_12']
  const rrRate = ROOFING_RR_LABOR[pitch] ?? ROOFING_RR_LABOR['up_to_6_12']
  const ncName = ROOFING_NC_LABOR_NAME[pitch] ?? rrName
  const ncRate = ROOFING_NC_LABOR[pitch] ?? rrRate
  if (jobType === 'new') {
    pushLabor(ncName, laborSquares, 'sq', ncRate)
  } else if (jobType === 'layover') {
    // Until Layover lines exist on the Labor page, price at the New Con rate
    const ncProduct = laborCatalog.find(l => l.name.toLowerCase() === ncName.toLowerCase())
    pushLabor(ROOFING_LAYOVER_LABOR_NAME[pitch] ?? ROOFING_LAYOVER_LABOR_NAME['up_to_6_12'], laborSquares, 'sq',
      ncProduct?.cost || ncRate)
  } else {
    pushLabor(rrName, laborSquares, 'sq', rrRate)
    pushLabor(pitch === 'flat' ? 'Flat Additional Layer' : 'Additional Layers',
      laborSquares * Math.max(0, layers - 1), 'sq', ADDITIONAL_LAYER_LABOR)
  }
  pushLabor('Hip and Ridge', hipLf + ridgeLf, 'lf', ROOFING_ACCESSORY_LABOR.hipRidge)
  pushLabor('ODE', rakesLf, 'lf', ROOFING_ACCESSORY_LABOR.ode)
  pushLabor('Gutter Apron', eavesLf, 'lf', ROOFING_ACCESSORY_LABOR.gutterApron)
  pushLabor('Roof to Wall', roofToWallLf, 'lf', ROOFING_ACCESSORY_LABOR.roofToWall)
  pushLabor('Ridge Vent', ridgeVentLf, 'lf', ROOFING_ACCESSORY_LABOR.ridgeVent)
  pushLabor('Chimney Flashing', chimneys, 'ea', ROOFING_ACCESSORY_LABOR.chimneyFlashing)
  pushLabor(steepPitch ? 'Install Skylight 8/12 Up' : 'Install New Skylight', skylights, 'ea',
    steepPitch ? ROOFING_ACCESSORY_LABOR.skylightSteep : ROOFING_ACCESSORY_LABOR.skylightNew)
  pushLabor('New Power Vent', powerVents, 'ea', ROOFING_ACCESSORY_LABOR.powerVentNew)
  pushLabor('Shingle Repair <1 bdl', shingleRepairs, 'ea', 150)

  return items
}

// ---------------------------------------------------------------------------
// Siding Assembly — supports walls array (manual) or Hover Report mode
// ---------------------------------------------------------------------------
export function calculateSidingAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const isHoverMode = measurements.measurementSource === 'hover'
  const hover = (measurements.hover ?? {}) as Record<string, unknown>

  let wallArea = 0
  let totalOpeningAreaFromHover = 0

  if (isHoverMode) {
    // Hover Report: use summary-page totals directly
    wallArea = num(hover.facadesSqft)
    totalOpeningAreaFromHover = num(hover.openingsSqft)
  } else {
    // Direct-entry override takes precedence over wall-by-wall computation
    const directArea = num(measurements.wallAreaSqft)
    if (directArea > 0) {
      wallArea = directArea
    } else {
      // Manual mode: sum walls array (or legacy wallArea field)
      const walls = measurements.walls
      if (Array.isArray(walls) && walls.length > 0) {
        wallArea = (walls as Record<string, unknown>[]).reduce((sum, w) => {
          return sum + num(w.width) * num(w.height)
        }, 0)
      } else {
        wallArea = num(measurements.wallArea)
      }

      // Add gable end area: each gable is a triangle = 0.5 × width × rise
      const gables = measurements.gables
      if (Array.isArray(gables) && gables.length > 0) {
        for (const g of gables as Record<string, unknown>[]) {
          wallArea += 0.5 * num(g.width) * num(g.rise)
        }
      }
    }
  }

  const insideCorners  = isHoverMode ? num(hover.insideCorners)  : num(measurements.insideCorners)
  const outsideCorners = isHoverMode ? num(hover.outsideCorners) : num(measurements.outsideCorners)
  const soffitArea     = isHoverMode ? num(hover.soffitArea)     : num(measurements.soffitArea)
  const soffitLf       = isHoverMode ? num(hover.soffitLf)       : num(measurements.soffitLf)
  // fasciaLf = eaves + rakes combined — used for aluminum coil quantity
  // eavesLf  = eave line only — used for J-Channel & Undersill (no rakes/gable ends)
  const fasciaLf = isHoverMode
    ? num(hover.fasciaLf)
    : num(measurements.fasciaLf ?? measurements.fascia)
  const eavesLf = isHoverMode
    ? num(hover.eavesLf)
    : num(measurements.eavesLf) || fasciaLf  // without a separate eave length, fascia is the conservative estimate
  const wastePct = num(measurements.wasteFactor, 10)
  // Accessory counts
  const mountMasters     = num(measurements.mountMasters)
  const splitBlocks      = num(measurements.splitBlocks)
  const exhaustVents     = num(measurements.exhaustVents)
  const throughWallVents = num(measurements.throughWallVents)
  // Aluminum wrap counts — lf of coil per opening size
  const windowWrapsSmall = num(measurements.windowWrapsSmall)
  const windowWrapsLarge = num(measurements.windowWrapsLarge)
  const doorWrapsSmall   = num(measurements.doorWrapsSmall)
  const doorWrapsLarge   = num(measurements.doorWrapsLarge)
  // Total wrap coil lf: small window ≈ 20lf, large window ≈ 30lf, small door ≈ 25lf, large door ≈ 40lf
  const wrapCoilLf = (windowWrapsSmall * 20) + (windowWrapsLarge * 30) +
                     (doorWrapsSmall * 25)   + (doorWrapsLarge * 40)

  // ---------------------------------------------------------------------------
  // Compute derived dimensions from wall entries (skipped in Hover mode)
  // ---------------------------------------------------------------------------
  let totalOpeningArea = 0
  let perimeter        = 0   // sum of wall widths = house perimeter
  let jChannelLf       = 0   // top of each wall + 3 sides of each opening
  let undersillLf      = eavesLf  // undersill at soffit line; windows added below

  if (isHoverMode) {
    // Hover mode: exact values from the Hover Report PDF
    totalOpeningArea = totalOpeningAreaFromHover
    // Starter strip: use Level Starter LF from Hover Trim table
    perimeter = num(hover.starterStripLf)
    // J-channel: eave corner only (eavesLf — no rakes/gable ends) + around all windows & doors
    // Fall back to sqrt estimate for openings only if Total Perimeter field is 0
    const openingsPerimeterLf = num(hover.openingsPerimeterLf)
    const openingsPerimeter = openingsPerimeterLf > 0
      ? openingsPerimeterLf
      : (totalOpeningAreaFromHover > 0 ? Math.sqrt(totalOpeningAreaFromHover) * 4 : 0)
    jChannelLf = eavesLf + openingsPerimeter
    // Undersill: eave line only (eavesLf — no rakes/gable ends) + window sills
    const openingsSillsLf = num(hover.openingsSillsLf)
    undersillLf = eavesLf + openingsSillsLf
  } else {
    const walls = measurements.walls
    if (Array.isArray(walls) && walls.length > 0) {
      for (const w of walls as Record<string, unknown>[]) {
        const ww = num(w.width)
        perimeter   += ww
        jChannelLf  += ww   // J-channel at top of every wall

        const openings = Array.isArray(w.openings) ? (w.openings as Record<string, unknown>[]) : []
        for (const o of openings) {
          const ow  = num(o.widthFt)  + num(o.widthIn)  / 12
          const oh  = num(o.heightFt) + num(o.heightIn) / 12
          const cnt = Math.max(1, num(o.count))
          totalOpeningArea += ow * oh * cnt
          // J-channel: left side + right side + top of opening
          jChannelLf += (2 * oh + ow) * cnt
          // Undersill: under every window (width × count)
          if (String(o.type) === 'window') {
            undersillLf += ow * cnt
          }
        }
      }
      // Direct-entry fields override computed values when set
      if (num(measurements.perimeterLf) > 0)      perimeter  = num(measurements.perimeterLf)
      if (num(measurements.jChannelLfDirect) > 0)  jChannelLf = num(measurements.jChannelLfDirect)
    } else {
      // Legacy flat arrays fallback
      perimeter   = num(measurements.perimeterLf) || num(measurements.perimeter)
      jChannelLf  = num(measurements.jChannelLfDirect) || perimeter
      const doorsArr   = Array.isArray(measurements.doors)   ? (measurements.doors   as Record<string, unknown>[]) : []
      const windowsArr = Array.isArray(measurements.windows) ? (measurements.windows as Record<string, unknown>[]) : []
      totalOpeningArea = [...doorsArr, ...windowsArr].reduce((sum, o) => {
        const ow = num(o.widthFt) + num(o.widthIn) / 12
        const oh = num(o.heightFt) + num(o.heightIn) / 12
        return sum + ow * oh * Math.max(1, num(o.count))
      }, 0)
      // Legacy count fallback
      if (totalOpeningArea === 0) totalOpeningArea = num(measurements.openings) * 20
    }
  }

  if (wallArea <= 0) return []

  // Waste on field area only, then subtract exact openings
  const adjustedWallArea = wallArea * (1 + wastePct / 100)
  const netWallArea      = Math.max(adjustedWallArea - totalOpeningArea, adjustedWallArea * 0.5)
  const fieldSquares     = Math.ceil(wallArea / 100)
  const netSquares       = Math.ceil(netWallArea / 100)

  // Style selections from measurements
  const sidingMaterial   = String(measurements.sidingMaterial   ?? 'variform')
  const sidingGauge      = String(measurements.sidingGauge      ?? '')
  const sidingColorRange = String(measurements.sidingColorRange ?? 'standard')
  const gaugeStr         = sidingGauge.replace('.', '') // ".044" → "044"

  // Terms that disqualify a product from being a siding PANEL
  const SIDING_EXCLUDE = ['vent', 'corner', 'j-channel', 'j channel', 'soffit', 'fascia', 'post', 'labor', 'install', 'nail', 'wrap', 'bead', 'cap']
  const isSidingPanel = (p: Product) => {
    const n = p.name.toLowerCase()
    const hasSidingTerm = n.includes('siding') || n.includes('dutch lap') || n.includes('clapboard') ||
      n.includes('double 4') || n.includes('double 5') || n.includes('double 6') || n.includes('beaded') ||
      n.includes('smartside') || n.includes('smart side') || n.includes('variform')
    const excluded = SIDING_EXCLUDE.some(ex => n.includes(ex))
    return hasSidingTerm && !excluded
  }

  const items: AssemblyItem[] = []

  // 1. Siding panels — brand + gauge + color aware, strict exclusion of non-panels
  let sidingProduct: Product | undefined

  if (sidingMaterial === 'lp_smartside') {
    // LP SmartSide — search by brand name
    sidingProduct = products.find(p => {
      const n = p.name.toLowerCase()
      return (n.includes('smartside') || n.includes('smart side') || n.includes('lp smart') ||
              (n.includes('lp') && n.includes('panel'))) && isSidingPanel(p)
    }) ?? products.find(p => p.name.toLowerCase().includes('smartside'))
  } else {
    // Variform — try most-specific match first, progressively relax
    const colorTerm = sidingColorRange === 'dark' ? 'dark' : 'standard'

    // 1a. Variform + gauge + color
    if (gaugeStr) {
      sidingProduct = products.find(p => {
        const n = p.name.toLowerCase()
        return n.includes('variform') && (n.includes(gaugeStr) || n.includes(sidingGauge)) &&
               n.includes(colorTerm) && isSidingPanel(p)
      })
    }
    // 1b. Variform + color (any gauge)
    if (!sidingProduct) {
      sidingProduct = products.find(p => {
        const n = p.name.toLowerCase()
        return n.includes('variform') && n.includes(colorTerm) && isSidingPanel(p)
      })
    }
    // 1c. Variform (any color/gauge)
    if (!sidingProduct) {
      sidingProduct = products.find(p => p.name.toLowerCase().includes('variform') && isSidingPanel(p))
    }
    // 1d. Generic siding panel fallback
    if (!sidingProduct) {
      sidingProduct = products.find(isSidingPanel)
    }
  }

  const sidingFallbackDesc = sidingMaterial === 'lp_smartside'
    ? 'LP SmartSide panels'
    : `Variform ${sidingColorRange === 'dark' ? 'Dark Colors' : 'Standard Colors'}${sidingGauge ? ` (${sidingGauge})` : ''}`

  items.push({
    description: sidingProduct?.name ?? sidingFallbackDesc,
    quantity: Math.ceil(netWallArea / 100),
    unit: 'sq',
    cost: sidingProduct?.cost ?? DEFAULT_COSTS.siding,
    markup: DEFAULT_MARKUP,
    tier: sidingProduct?.tier ?? 'GOOD',
    category: 'Siding',
    isLabor: false,
    productId: sidingProduct?.id,
  })

  // 2. J-channel — top of every wall + 3 sides of every opening (12' sticks)
  if (jChannelLf > 0) {
    let jChannelProduct: Product | undefined
    if (sidingMaterial === 'lp_smartside') {
      // LP: use aluminum J-channel (never vinyl Variform)
      jChannelProduct = products.find(p => {
        const n = p.name.toLowerCase()
        return (n.includes('j-channel') || n.includes('j channel') || n.includes('j-trim'))
               && (n.includes('aluminum') || n.includes('aluminium') || n.includes('alum'))
               && !n.includes('3/8')  // 3/8" is soffit-edge only
      }) ?? products.find(p => {
        const n = p.name.toLowerCase()
        return (n.includes('j-channel') || n.includes('j channel') || n.includes('j-trim'))
               && (n.includes('aluminum') || n.includes('aluminium') || n.includes('alum'))
      })
    } else {
      // Vinyl: prefer non-aluminum j-channel
      jChannelProduct = products.find(p => {
        const n = p.name.toLowerCase()
        return (n.includes('j-channel') || n.includes('j channel') || n.includes('j-trim'))
               && !n.includes('aluminum') && !n.includes('aluminium') && !n.includes('alum')
      }) ?? products.find(p => {
        const n = p.name.toLowerCase()
        return n.includes('j-channel') || n.includes('j channel') || n.includes('j-trim')
      }) ?? findProduct(products, 'j channel', 'j-channel')
    }
    const jChannelSticks = Math.ceil(jChannelLf / 12)
    items.push({
      description: jChannelProduct?.name ?? 'J-channel',
      quantity: jChannelSticks,
      unit: 'ea',
      cost: jChannelProduct?.cost ?? DEFAULT_COSTS.jChannel,
      markup: DEFAULT_MARKUP,
      tier: jChannelProduct?.tier ?? 'GOOD',
      category: 'Siding Accessories',
      isLabor: false,
      productId: jChannelProduct?.id,
    })
  }

  // 2b. Undersill — under each window + at soffit line (12' sticks)
  // LP SmartSide has no undersill product — skip entirely for LP
  if (undersillLf > 0 && sidingMaterial !== 'lp_smartside') {
    const undersillProduct = products.find(p => {
      const n = p.name.toLowerCase()
      return n.includes('undersill') || n.includes('under sill') || n.includes('finish trim')
    })
    const undersillSticks = Math.ceil(undersillLf / 12)
    items.push({
      description: undersillProduct?.name ?? 'Undersill trim',
      quantity: undersillSticks,
      unit: 'ea',
      cost: undersillProduct?.cost ?? DEFAULT_COSTS.undersill,
      markup: DEFAULT_MARKUP,
      tier: undersillProduct?.tier ?? 'GOOD',
      category: 'Siding Accessories',
      isLabor: false,
      productId: undersillProduct?.id,
    })
  }

  // Thickness selection for LP SmartTrim corners (driven by siding measurement)
  const lpSmartTrimThickness = String(measurements.lpSmartTrimThickness ?? '4/4')

  // Helper: find LP SmartTrim board by width (and optionally thickness)
  // LP naming convention: 4/4 → product code "440", 5/4 → "540"
  // Width appears as " x {n}"" in the product name (e.g. " x 4"", " x 6"")
  function findSmartTrimBoard(widthIn: number, thickness?: string): Product | undefined {
    const thick = thickness ?? lpSmartTrimThickness
    const thickCode = thick === '5/4' ? '540' : '440'
    const widthStr  = ` x ${widthIn}"`  // leading space prevents matching "4/4" when widthIn=4
    const isLpTrim  = (p: Product) => {
      const n = p.name.toLowerCase()
      return n.includes('smarttrim') || n.includes('smart trim') || (n.includes('lp') && n.includes('trim'))
    }
    // 1st: exact thickness code + width
    const best = products.find(p => isLpTrim(p) && p.name.toLowerCase().includes(thickCode) && p.name.toLowerCase().includes(widthStr))
    if (best) return best
    // 2nd: any LP trim with matching width
    const byWidth = products.find(p => isLpTrim(p) && p.name.toLowerCase().includes(widthStr))
    if (byWidth) return byWidth
    // 3rd: any LP trim (last resort)
    return products.find(p => isLpTrim(p))
  }

  // 2b. Finish Trim — starter strip / finish trim boards (10' sticks)
  const finishTrimLf = num(measurements.finishTrimLf)
  if (finishTrimLf > 0) {
    const finishTrimProduct = products.find(p => {
      const n = p.name.toLowerCase()
      return n.includes('finish trim') || n.includes('starter') || n.includes('undersill trim')
    })
    items.push({
      description: finishTrimProduct?.name ?? 'Finish Trim',
      quantity: Math.ceil(finishTrimLf / 10),
      unit: 'ea',
      cost: finishTrimProduct?.cost ?? 12,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      packages: 'good,better,best',
      category: 'Siding Accessories',
      isLabor: false,
      productId: finishTrimProduct?.id,
    })
  }

  // 3. Inside corners
  if (insideCorners > 0) {
    if (sidingMaterial === 'lp_smartside') {
      // LP: 2× 4" LP SmartTrim boards per inside corner, 16ft sticks
      // (one board per side of the inside corner, thickness per lpSmartTrimThickness selection)
      const board4 = findSmartTrimBoard(4)
      const sticks = Math.ceil(insideCorners * (1 + wastePct / 100) / 16)
      // Push the same board twice (two boards make one inside corner post)
      for (let i = 0; i < 2; i++) {
        items.push({
          description: board4?.name ?? `LP SmartTrim 4" ${lpSmartTrimThickness} (inside corner)`,
          quantity: sticks,
          unit: 'ea',
          cost: board4?.cost ?? DEFAULT_COSTS.insideCorner,
          markup: DEFAULT_MARKUP,
          tier: board4?.tier ?? 'GOOD',
          category: 'Siding Accessories',
          isLabor: false,
          productId: board4?.id,
        })
      }
    } else {
      // Vinyl: 10' corner posts
      const insideCornerProduct = products.find(p => {
        const n = p.name.toLowerCase()
        return n.includes('inside') && n.includes('corner')
      }) ?? findProduct(products, 'inside corner post', 'inside corner')
      items.push({
        description: insideCornerProduct?.name ?? 'Inside corner posts',
        quantity: Math.ceil(insideCorners / 10),
        unit: 'ea',
        cost: insideCornerProduct?.cost ?? DEFAULT_COSTS.insideCorner,
        markup: DEFAULT_MARKUP,
        tier: insideCornerProduct?.tier ?? 'GOOD',
        category: 'Siding Accessories',
        isLabor: false,
        productId: insideCornerProduct?.id,
      })
    }
  }

  // 4. Outside corners
  if (outsideCorners > 0) {
    if (sidingMaterial === 'lp_smartside') {
      // LP: 1× 6" + 1× 4" LP SmartTrim boards, both 16ft sticks
      const sticks = Math.ceil(outsideCorners * (1 + wastePct / 100) / 16)
      const board6 = findSmartTrimBoard(6)
      const board4 = findSmartTrimBoard(4)
      items.push({
        description: board6?.name ?? 'LP SmartTrim 6" (outside corner — wide face)',
        quantity: sticks,
        unit: 'ea',
        cost: board6?.cost ?? DEFAULT_COSTS.outsideCorner,
        markup: DEFAULT_MARKUP,
        tier: board6?.tier ?? 'GOOD',
        category: 'Siding Accessories',
        isLabor: false,
        productId: board6?.id,
      })
      items.push({
        description: board4?.name ?? 'LP SmartTrim 4" (outside corner — narrow face)',
        quantity: sticks,
        unit: 'ea',
        cost: board4?.cost ?? DEFAULT_COSTS.outsideCorner,
        markup: DEFAULT_MARKUP,
        tier: board4?.tier ?? 'GOOD',
        category: 'Siding Accessories',
        isLabor: false,
        productId: board4?.id,
      })
    } else {
      // Vinyl: 10' corner posts
      const outsideCornerProduct = products.find(p => {
        const n = p.name.toLowerCase()
        return n.includes('outside') && n.includes('corner')
      }) ?? findProduct(products, 'outside corner post', 'outside corner')
      items.push({
        description: outsideCornerProduct?.name ?? 'Outside corner posts',
        quantity: Math.ceil(outsideCorners / 10),
        unit: 'ea',
        cost: outsideCornerProduct?.cost ?? DEFAULT_COSTS.outsideCorner,
        markup: DEFAULT_MARKUP,
        tier: outsideCornerProduct?.tier ?? 'GOOD',
        category: 'Siding Accessories',
        isLabor: false,
        productId: outsideCornerProduct?.id,
      })
    }
  }

  // 5. Soffit — must have "soffit" in name
  if (soffitArea > 0) {
    // GOOD: Aluminum soffit — also needs 3/8" J-channel and trim nails
    const aluminumSoffitProduct = products.find(p => {
      const n = p.name.toLowerCase()
      return n.includes('soffit') && (n.includes('aluminum') || n.includes('aluminium') || n.includes('alum'))
    })
    // Aluminum soffit: 12" wide × 12' long panels (12 sqf/panel) — ordered by the piece
    const aluminumSoffitPanels = Math.ceil(soffitArea / 12)
    items.push({
      description: aluminumSoffitProduct?.name ?? 'Aluminum Soffit',
      quantity: aluminumSoffitPanels,
      unit: 'ea',
      cost: aluminumSoffitProduct?.cost ?? DEFAULT_COSTS.soffit,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Siding Accessories',
      isLabor: false,
      productId: aluminumSoffitProduct?.id,
    })

    // 3/8" J-channel for aluminum soffit edges (GOOD tier accessory)
    const soffitJChannel = products.find(p => {
      const n = p.name.toLowerCase()
      return (n.includes('j-channel') || n.includes('j channel')) && n.includes('3/8')
    }) ?? products.find(p => {
      const n = p.name.toLowerCase()
      return n.includes('j-channel') || n.includes('j channel')
    })
    if (soffitJChannel) {
      // Use soffitLf if available; fall back to eavesLf as a proxy
      const soffitEdgeLf = soffitLf > 0 ? soffitLf : eavesLf
      const soffitJChannelSticks = Math.ceil(soffitEdgeLf / 12)
      items.push({
        description: `${soffitJChannel.name} (soffit edge)`,
        quantity: soffitJChannelSticks,
        unit: 'ea',
        cost: soffitJChannel.cost,
        markup: DEFAULT_MARKUP,
        tier: 'GOOD',
        category: 'Siding Accessories',
        isLabor: false,
        productId: soffitJChannel.id,
      })
    }

    // Trim nails for aluminum soffit + fascia (GOOD tier accessory)
    // Coverage: soffit length (soffitLf) + fascia runs eaves + rakes (fasciaLf)
    const trimNailsProduct = products.find(p => {
      const n = p.name.toLowerCase()
      return n.includes('nail') && (n.includes('trim') || n.includes('soffit') || n.includes('aluminum'))
        && !n.includes('nailer') && !n.includes('gun')
    })
    if (trimNailsProduct) {
      const soffitEdgeLf = soffitLf > 0 ? soffitLf : eavesLf
      const trimNailLf = soffitEdgeLf + fasciaLf
      const nailBoxes = Math.max(1, Math.ceil(trimNailLf / 200))
      items.push({
        description: trimNailsProduct.name,
        quantity: nailBoxes,
        unit: 'box',
        cost: trimNailsProduct.cost,
        markup: DEFAULT_MARKUP,
        tier: 'GOOD',
        category: 'Siding Accessories',
        isLabor: false,
        productId: trimNailsProduct.id,
      })
    }

    // BETTER: LP SmartSide soffit panel
    const lpSoffitProduct = products.find(p => {
      const n = p.name.toLowerCase()
      return n.includes('soffit') && (n.includes('lp') || n.includes('smartside') || n.includes('smart side'))
    })
    if (lpSoffitProduct) {
      // LP SmartSide soffit: 12" wide × 16' long panels (16 sqf/panel) — ordered by the piece
      const lpSoffitPanels = Math.ceil(soffitArea / 16)
      items.push({
        description: lpSoffitProduct.name,
        quantity: lpSoffitPanels,
        unit: 'ea',
        cost: lpSoffitProduct.cost,
        markup: DEFAULT_MARKUP,
        tier: 'BETTER',
        category: 'Siding Accessories',
        isLabor: false,
        productId: lpSoffitProduct.id,
      })
    }
  }

  // 6. Fascia — bent onsite from aluminum trim coil (24"×50' coil → 150 lf of 6" fascia)
  // Prefer coil products; fall back to 10' stick fascia if no coil found.
  if (fasciaLf > 0) {
    const coilProduct = products.find(p => {
      const n = p.name.toLowerCase()
      return (n.includes('coil') && (n.includes('aluminum') || n.includes('aluminium') || n.includes('alum'))) &&
             !n.includes('tape') && !n.includes('wrap')
    })
    if (coilProduct) {
      // 1 coil (24"×50') → 150 lf of 6" fascia
      const coilsNeeded = Math.ceil(fasciaLf / 150)
      items.push({
        description: coilProduct.name,
        quantity: coilsNeeded,
        unit: 'ea',
        cost: coilProduct.cost ?? DEFAULT_COSTS.fascia,
        markup: DEFAULT_MARKUP,
        tier: coilProduct.tier ?? 'GOOD',
        category: 'Siding Accessories',
        isLabor: false,
        productId: coilProduct.id,
      })
    } else {
      // Fallback: stick fascia (10' sticks)
      const fasciaProduct = products.find(p => p.name.toLowerCase().includes('fascia'))
      const sticksNeeded = Math.ceil(fasciaLf / 10)
      items.push({
        description: fasciaProduct?.name ?? 'Fascia',
        quantity: sticksNeeded,
        unit: 'ea',
        cost: fasciaProduct?.cost ?? DEFAULT_COSTS.fascia,
        markup: DEFAULT_MARKUP,
        tier: fasciaProduct?.tier ?? 'GOOD',
        category: 'Siding Accessories',
        isLabor: false,
        productId: fasciaProduct?.id,
      })
    }
  }

  // 6b. Aluminum wrap coil — for wrapping windows & doors; same coil product as fascia
  if (wrapCoilLf > 0) {
    const wrapCoilProduct = products.find(p => {
      const n = p.name.toLowerCase()
      return (n.includes('coil') && (n.includes('aluminum') || n.includes('alum'))) &&
             !n.includes('tape') && !n.includes('wrap tape')
    })
    const wrapCoilsNeeded = Math.ceil(wrapCoilLf / 150)
    items.push({
      description: wrapCoilProduct?.name ?? 'Aluminum coil (window/door wraps)',
      quantity: wrapCoilsNeeded,
      unit: 'ea',
      cost: wrapCoilProduct?.cost ?? DEFAULT_COSTS.fascia,
      markup: DEFAULT_MARKUP,
      tier: wrapCoilProduct?.tier ?? 'GOOD',
      category: 'Siding Accessories',
      isLabor: false,
      productId: wrapCoilProduct?.id,
    })
  }

  // 7. Housewrap — ordered in rolls; parse roll sqft from product name (e.g. "3'X150'" = 450 sqft)
  if (wallArea > 0) {
    const housewrapProduct = products.find(p => {
      const n = p.name.toLowerCase()
      return (n.includes('housewrap') || n.includes('house wrap') || n.includes('building wrap') ||
              (n.includes('wrap') && !n.includes('tape') && !n.includes('fanfold')))
    })
    // Parse roll coverage from product name: "3'X150'" → width=3, length=150 → 450 sqft/roll
    let rollSqft = 450 // default: 3'×150'
    if (housewrapProduct) {
      const match = housewrapProduct.name.match(/(\d+)['′]?\s*[xX×]\s*(\d+)/i)
      if (match) rollSqft = parseInt(match[1]) * parseInt(match[2])
    }
    const rolls = Math.ceil(wallArea / rollSqft)
    items.push({
      description: housewrapProduct?.name ?? 'House wrap',
      quantity: rolls,
      unit: 'roll',
      cost: housewrapProduct?.cost ?? DEFAULT_COSTS.housewrap,
      markup: DEFAULT_MARKUP,
      tier: housewrapProduct?.tier ?? 'GOOD',
      category: 'Siding',
      isLabor: false,
      productId: housewrapProduct?.id,
    })
  }

  // 8. Fanfold insulation — 1 bundle = 2 squares
  if (fieldSquares > 0) {
    const fanfoldProduct = products.find(p => p.name.toLowerCase().includes('fanfold'))
    items.push({
      description: fanfoldProduct?.name ?? 'XPS fanfold insulation',
      quantity: Math.ceil(fieldSquares / 2),
      unit: 'bdl',
      cost: fanfoldProduct?.cost ?? DEFAULT_COSTS.fanfold,
      markup: DEFAULT_MARKUP,
      tier: fanfoldProduct?.tier ?? 'GOOD',
      category: 'Siding',
      isLabor: false,
      productId: fanfoldProduct?.id,
    })
  }

  // 9. Level Starter / Starter strip — perimeter of house
  if (perimeter > 0) {
    if (sidingMaterial === 'lp_smartside') {
      // LP starter = same LP siding product, ordered in additional squares
      // 384 lf of starter strip coverage per square (from Hover Level Starter LF)
      const LP_STARTER_LF_PER_SQ = 384
      const starterSquares = Math.ceil(perimeter / LP_STARTER_LF_PER_SQ)
      items.push({
        description: sidingProduct?.name
          ? `${sidingProduct.name} (starter — ${perimeter.toFixed(0)} lf ÷ ${LP_STARTER_LF_PER_SQ})`
          : `LP SmartSide Starter (${perimeter.toFixed(0)} lf)`,
        quantity: starterSquares,
        unit: 'sq',
        cost: sidingProduct?.cost ?? DEFAULT_COSTS.siding,
        markup: DEFAULT_MARKUP,
        tier: 'GOOD',
        category: 'Siding',
        isLabor: false,
        productId: sidingProduct?.id,
      })
    } else {
      // Vinyl: steel starter strip ordered in lf — prefer CBM brand
      const starterProduct =
        products.find(p => {
          const n = p.name.toLowerCase()
          return n.includes('cbm') && (n.includes('starter') || n.includes('steel starter'))
        }) ??
        products.find(p => {
          const n = p.name.toLowerCase()
          return n.includes('steel starter') || n.includes('starter strip')
        }) ??
        products.find(p => {
          const n = p.name.toLowerCase()
          return n.includes('starter') && !n.includes('shingle') && !n.includes('roofing')
        })
      items.push({
        description: starterProduct?.name ?? 'Starter strip',
        quantity: Math.ceil(perimeter),
        unit: 'lf',
        cost: starterProduct?.cost ?? DEFAULT_COSTS.sidingStarterStrip,
        markup: DEFAULT_MARKUP,
        tier: starterProduct?.tier ?? 'GOOD',
        category: 'Siding',
        isLabor: false,
        productId: starterProduct?.id,
      })
    }
  }

  // 10. Nails — LP SmartSide uses NLS RS Coil 2-1/4" 4800ct; vinyl uses Tri Roof Nail 2" 30#
  if (netSquares > 0) {
    const nailsProduct = sidingMaterial === 'lp_smartside'
      ? // LP SmartSide: NLS RS Coil ring shank
        (products.find(p => {
          const n = p.name.toLowerCase()
          return n.includes('nls') && (n.includes('coil') || n.includes('rs'))
        }) ??
        products.find(p => {
          const n = p.name.toLowerCase()
          return n.includes('rs coil') || (n.includes('ring shank') && n.includes('coil'))
        }))
      : // Vinyl siding: Tri Roof Nail or any general siding nail
        (products.find(p => {
          const n = p.name.toLowerCase()
          return n.includes('nail') && !n.includes('nailer') && !n.includes('gun')
                 && !n.includes('trim') && !n.includes('finish')
        }))
    items.push({
      description: nailsProduct?.name ?? 'Siding nails',
      quantity: Math.ceil(netSquares / 15),
      unit: 'box',
      cost: nailsProduct?.cost ?? DEFAULT_COSTS.sidingNails,
      markup: DEFAULT_MARKUP,
      tier: nailsProduct?.tier ?? 'GOOD',
      category: 'Siding',
      isLabor: false,
      productId: nailsProduct?.id,
    })
  }

  // 11. Mount Masters — count from measurements
  if (mountMasters > 0) {
    const mountProduct = products.find(p => {
      const n = p.name.toLowerCase()
      return n.includes('mount master') || n.includes('mountmaster') || n.includes('mount-master')
    })
    items.push({
      description: mountProduct?.name ?? 'Mount Master',
      quantity: mountMasters,
      unit: 'ea',
      cost: mountProduct?.cost ?? DEFAULT_COSTS.mountMaster,
      markup: DEFAULT_MARKUP,
      tier: mountProduct?.tier ?? 'GOOD',
      category: 'Siding Accessories',
      isLabor: false,
      productId: mountProduct?.id,
    })
  }

  // 12. Split blocks — count from measurements
  if (splitBlocks > 0) {
    const splitBlockProduct = products.find(p => p.name.toLowerCase().includes('split block'))
    items.push({
      description: splitBlockProduct?.name ?? 'Split block',
      quantity: splitBlocks,
      unit: 'ea',
      cost: splitBlockProduct?.cost ?? DEFAULT_COSTS.splitBlock,
      markup: DEFAULT_MARKUP,
      tier: splitBlockProduct?.tier ?? 'GOOD',
      category: 'Siding Accessories',
      isLabor: false,
      productId: splitBlockProduct?.id,
    })
  }

  // 13. Exhaust vents — Tri-Built Exhaust Vent (bath fans, dryer vents)
  // NOT Broan Through Wall, which is the microwave vent used in kitchen scope
  if (exhaustVents > 0) {
    const ventProduct = products.find(p => {
      const n = p.name.toLowerCase()
      return n.includes('tri-built') && n.includes('exhaust vent')
    }) ?? products.find(p => {
      const n = p.name.toLowerCase()
      return n.includes('exhaust vent') && !n.includes('broan') && !n.includes('through wall')
    }) ?? products.find(p => p.name.toLowerCase().includes('exhaust vent'))
    items.push({
      description: ventProduct?.name ?? 'Exhaust vent',
      quantity: exhaustVents,
      unit: 'ea',
      cost: ventProduct?.cost ?? DEFAULT_COSTS.exhaustVent,
      markup: DEFAULT_MARKUP,
      tier: ventProduct?.tier ?? 'GOOD',
      category: 'Siding Accessories',
      isLabor: false,
      productId: ventProduct?.id,
    })
  }

  // 13a. Through-wall vents — Broan Through Wall (microwave vents vented through siding)
  if (throughWallVents > 0) {
    const throughWallProduct = products.find(p => {
      const n = p.name.toLowerCase()
      return n.includes('broan') || (n.includes('through wall') && n.includes('vent'))
    }) ?? products.find(p => {
      const n = p.name.toLowerCase()
      return n.includes('through wall') || (n.includes('microwave') && n.includes('vent'))
    })
    items.push({
      description: throughWallProduct?.name ?? 'Through wall vent (microwave)',
      quantity: throughWallVents,
      unit: 'ea',
      cost: throughWallProduct?.cost ?? 39,
      markup: DEFAULT_MARKUP,
      tier: throughWallProduct?.tier ?? 'GOOD',
      category: 'Siding Accessories',
      isLabor: false,
      productId: throughWallProduct?.id,
    })
  }

  // 13b. Caulk — only add if the specific OSI/NPC/TRI caulk is in the assembly product list
  // Do NOT fall back to generic catalog caulk (avoids matching DAP Dynaflex etc.)
  // Rate: 14 lf/tube (16 lf gross coverage with waste built in); 12 tubes/box
  // Cost in DB is per tube — multiply by 12 for per-box cost
  const caulkProduct = products.find(p => {
    const n = p.name.toLowerCase()
    return (n.includes('osi') || n.includes('npc') || n.includes('12tb') ||
            (n.includes('tri') && n.includes('caulk'))) && n.includes('caulk')
  })
  if (caulkProduct) {
    // Caulk runs the perimeter of every opening (J-channel line minus the eave portion)
    const caulkLf = jChannelLf > 0 ? jChannelLf : Math.sqrt(totalOpeningArea) * 4
    const tubesNeeded = Math.max(1, Math.ceil(caulkLf / 14))
    items.push({
      description: caulkProduct.name,
      quantity: tubesNeeded,
      unit: 'ea',
      cost: caulkProduct.cost ?? 8.68,
      markup: DEFAULT_MARKUP,
      tier: caulkProduct.tier ?? 'GOOD',
      category: 'Siding Accessories',
      isLabor: false,
      productId: caulkProduct.id,
    })
  }

  // 14. Installation labor — must have "siding" AND ("labor" or "install") in name
  const laborProduct = products.find(p => {
    const n = p.name.toLowerCase()
    return n.includes('siding') && (n.includes('labor') || n.includes('install'))
  }) ?? products.find(p => {
    const n = p.name.toLowerCase()
    return n.includes('siding labor') || n.includes('installation')
  })
  items.push({
    description: laborProduct?.name ?? 'Siding installation labor',
    quantity: netSquares,
    unit: 'sq',
    cost: laborProduct?.cost ?? DEFAULT_COSTS.sidingLabor,
    markup: DEFAULT_MARKUP,
    tier: laborProduct?.tier ?? 'GOOD',
    category: 'Siding',
    isLabor: true,
    productId: laborProduct?.id,
  })

  return items
}

// ---------------------------------------------------------------------------
// Interior Assembly — supports rooms array (new) or legacy fields (old)
// ---------------------------------------------------------------------------
export function calculateInteriorAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  let totalNetWallArea = 0
  let totalFloorArea = 0
  const windows = num(measurements.windows)
  const doors = num(measurements.doors)
  const wastePct = num(measurements.wasteFactor, 10)

  const rooms = measurements.rooms
  if (Array.isArray(rooms) && rooms.length > 0) {
    for (const r of rooms) {
      const room = r as { length?: unknown; width?: unknown; ceilingHeight?: unknown }
      const length = num(room.length)
      const width = num(room.width)
      const ceilingHeight = num(room.ceilingHeight, 8)
      if (length <= 0 || width <= 0) continue
      const floorArea = length * width
      const perimeter = 2 * (length + width)
      const grossWall = perimeter * ceilingHeight
      totalFloorArea += floorArea
      totalNetWallArea += grossWall
    }
  } else {
    // Legacy single-room format
    const roomLength = num(measurements.roomLength)
    const roomWidth = num(measurements.roomWidth)
    const ceilingHeight = num(measurements.ceilingHeight, 8)
    if (roomLength > 0 && roomWidth > 0) {
      totalFloorArea = roomLength * roomWidth
      totalNetWallArea = 2 * (roomLength + roomWidth) * ceilingHeight
    }
  }

  if (totalNetWallArea <= 0) return []

  // Deduct openings
  const openingDeduction = windows * 15 + doors * 20
  const netWallArea = Math.max(totalNetWallArea - openingDeduction, totalNetWallArea * 0.7)
  const ceilingArea = totalFloorArea
  const waste = 1 + wastePct / 100

  const items: AssemblyItem[] = []

  // 1. Drywall
  const drywallSqf = ceil((netWallArea + ceilingArea) * waste)
  const drywallProduct = findProduct(products, 'drywall', 'gypsum', 'gyp')
  items.push({
    description: drywallProduct?.name ?? 'Drywall',
    quantity: drywallSqf,
    unit: 'sqf',
    cost: drywallProduct?.cost ?? DEFAULT_COSTS.drywall,
    markup: DEFAULT_MARKUP,
    tier: drywallProduct?.tier ?? 'GOOD',
    category: 'Interior',
    isLabor: false,
    productId: drywallProduct?.id,
  })

  // 2. Joint tape — 1 roll per 500 sqf
  const tapeRolls = ceil(drywallSqf / 500)
  if (tapeRolls > 0) {
    const tapeProduct = findProduct(products, 'tape', 'joint tape', 'mesh tape')
    items.push({
      description: tapeProduct?.name ?? 'Joint tape',
      quantity: tapeRolls,
      unit: 'roll',
      cost: tapeProduct?.cost ?? DEFAULT_COSTS.tape,
      markup: DEFAULT_MARKUP,
      tier: tapeProduct?.tier ?? 'GOOD',
      category: 'Interior',
      isLabor: false,
      productId: tapeProduct?.id,
    })
  }

  // 3. Mud
  const mudBuckets = ceil(drywallSqf / 200)
  if (mudBuckets > 0) {
    const mudProduct = findProduct(products, 'mud', 'joint compound', 'compound')
    items.push({
      description: mudProduct?.name ?? 'Joint compound',
      quantity: mudBuckets,
      unit: 'pail',
      cost: mudProduct?.cost ?? DEFAULT_COSTS.mudCompound,
      markup: DEFAULT_MARKUP,
      tier: mudProduct?.tier ?? 'GOOD',
      category: 'Interior',
      isLabor: false,
      productId: mudProduct?.id,
    })
  }

  // 4. Paint — 2 coats, 1 gal per 350 sqf
  const paintArea = (netWallArea + ceilingArea) * 2
  const paintGallons = ceil(paintArea / 350)
  const paintProduct = findProduct(products, 'paint', 'interior paint')
  items.push({
    description: paintProduct?.name ?? 'Interior paint',
    quantity: paintGallons,
    unit: 'gal',
    cost: paintProduct?.cost ?? DEFAULT_COSTS.paint * 350,
    markup: DEFAULT_MARKUP,
    tier: paintProduct?.tier ?? 'GOOD',
    category: 'Interior',
    isLabor: false,
    productId: paintProduct?.id,
  })

  // 5. Labor
  const laborProduct = findProduct(products, 'interior labor', 'drywall labor', 'labor')
  items.push({
    description: laborProduct?.name ?? 'Interior drywall & paint labor',
    quantity: ceil(netWallArea),
    unit: 'sqf',
    cost: laborProduct?.cost ?? DEFAULT_COSTS.interiorLabor,
    markup: DEFAULT_MARKUP,
    tier: laborProduct?.tier ?? 'GOOD',
    category: 'Interior',
    isLabor: true,
    productId: laborProduct?.id,
  })

  return items
}

// ---------------------------------------------------------------------------
// Plumbing & Electrical Assembly
// ---------------------------------------------------------------------------
export function calculatePlumbingElectricalAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const outlets = num(measurements.outlets)
  const switches = num(measurements.switches)
  const fixtures = num(measurements.fixtures)
  const roughInPlumbing = num(measurements.roughInPlumbing)
  const plumbingFixtures = num(measurements.plumbingFixtures)

  const items: AssemblyItem[] = []

  if (outlets > 0) {
    const outletProduct = findProduct(products, 'outlet', 'receptacle')
    items.push({
      description: outletProduct?.name ?? 'Outlets / receptacles',
      quantity: outlets,
      unit: 'ea',
      cost: outletProduct?.cost ?? DEFAULT_COSTS.outlet,
      markup: DEFAULT_MARKUP,
      tier: outletProduct?.tier ?? 'GOOD',
      category: 'Electrical',
      isLabor: false,
      productId: outletProduct?.id,
    })
  }

  if (switches > 0) {
    const switchProduct = findProduct(products, 'switch', 'light switch')
    items.push({
      description: switchProduct?.name ?? 'Light switches',
      quantity: switches,
      unit: 'ea',
      cost: switchProduct?.cost ?? DEFAULT_COSTS.switch,
      markup: DEFAULT_MARKUP,
      tier: switchProduct?.tier ?? 'GOOD',
      category: 'Electrical',
      isLabor: false,
      productId: switchProduct?.id,
    })
  }

  if (fixtures > 0) {
    const fixtureProduct = findProduct(products, 'fixture', 'light fixture', 'lighting')
    items.push({
      description: fixtureProduct?.name ?? 'Light fixtures',
      quantity: fixtures,
      unit: 'ea',
      cost: fixtureProduct?.cost ?? DEFAULT_COSTS.fixture,
      markup: DEFAULT_MARKUP,
      tier: fixtureProduct?.tier ?? 'GOOD',
      category: 'Electrical',
      isLabor: false,
      productId: fixtureProduct?.id,
    })
  }

  const electricalHours = outlets * 1.5 + switches * 1.5 + fixtures * 2
  if (electricalHours > 0) {
    const elecLaborProduct = findProduct(products, 'electrical labor', 'electrician', 'labor')
    items.push({
      description: elecLaborProduct?.name ?? 'Electrical labor',
      quantity: ceil(electricalHours),
      unit: 'hr',
      cost: elecLaborProduct?.cost ?? DEFAULT_COSTS.electricalLabor,
      markup: DEFAULT_MARKUP,
      tier: elecLaborProduct?.tier ?? 'GOOD',
      category: 'Electrical',
      isLabor: true,
      productId: elecLaborProduct?.id,
    })
  }

  if (roughInPlumbing > 0) {
    const roughInProduct = findProduct(products, 'rough-in', 'plumbing rough', 'rough in')
    items.push({
      description: roughInProduct?.name ?? 'Plumbing rough-in',
      quantity: roughInPlumbing,
      unit: 'ea',
      cost: roughInProduct?.cost ?? DEFAULT_COSTS.roughInPlumbing,
      markup: DEFAULT_MARKUP,
      tier: roughInProduct?.tier ?? 'GOOD',
      category: 'Plumbing',
      isLabor: false,
      productId: roughInProduct?.id,
    })
  }

  if (plumbingFixtures > 0) {
    const plumbFixtureProduct = findProduct(products, 'plumbing fixture', 'fixture', 'faucet')
    items.push({
      description: plumbFixtureProduct?.name ?? 'Plumbing fixtures',
      quantity: plumbingFixtures,
      unit: 'ea',
      cost: plumbFixtureProduct?.cost ?? DEFAULT_COSTS.plumbingFixture,
      markup: DEFAULT_MARKUP,
      tier: plumbFixtureProduct?.tier ?? 'GOOD',
      category: 'Plumbing',
      isLabor: false,
      productId: plumbFixtureProduct?.id,
    })
  }

  const plumbingHours = roughInPlumbing * 4 + plumbingFixtures * 3
  if (plumbingHours > 0) {
    const plumbLaborProduct = findProduct(products, 'plumbing labor', 'plumber', 'labor')
    items.push({
      description: plumbLaborProduct?.name ?? 'Plumbing labor',
      quantity: ceil(plumbingHours),
      unit: 'hr',
      cost: plumbLaborProduct?.cost ?? DEFAULT_COSTS.plumbingLabor,
      markup: DEFAULT_MARKUP,
      tier: plumbLaborProduct?.tier ?? 'GOOD',
      category: 'Plumbing',
      isLabor: true,
      productId: plumbLaborProduct?.id,
    })
  }

  return items
}

// ---------------------------------------------------------------------------
// Painting Assembly
// ---------------------------------------------------------------------------
export function calculatePaintingAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const surfaces = measurements.surfaces
  let totalSqf = 0

  if (Array.isArray(surfaces) && surfaces.length > 0) {
    totalSqf = surfaces.reduce((sum: number, s: unknown) => {
      const surface = s as { length?: unknown; width?: unknown }
      return sum + num(surface.length) * num(surface.width)
    }, 0)
  }

  if (totalSqf <= 0) return []

  const coats = num(measurements.coats, 2)
  const wastePct = num(measurements.wasteFactor, 10)
  const includesPrimer = Boolean(measurements.includesPrimer)
  const includesTrim = Boolean(measurements.includesTrim)
  const adjustedSqf = ceil(totalSqf * (1 + wastePct / 100))
  const totalCoats = coats + (includesPrimer ? 1 : 0)
  const paintGallons = ceil((adjustedSqf * totalCoats) / 350)

  const items: AssemblyItem[] = []

  const paintProduct = findProduct(products, 'paint', 'interior paint', 'exterior paint')
  items.push({
    description: paintProduct?.name ?? `Paint (${coats} coat${coats > 1 ? 's' : ''}${includesPrimer ? ' + primer' : ''})`,
    quantity: paintGallons,
    unit: 'gal',
    cost: paintProduct?.cost ?? DEFAULT_COSTS.paintMaterial,
    markup: DEFAULT_MARKUP,
    tier: paintProduct?.tier ?? 'GOOD',
    category: 'Painting',
    isLabor: false,
    productId: paintProduct?.id,
  })

  const laborProduct = findProduct(products, 'paint labor', 'painting labor')
  items.push({
    description: laborProduct?.name ?? `Painting labor (${coats} coat${coats > 1 ? 's' : ''})`,
    quantity: adjustedSqf,
    unit: 'sqf',
    cost: laborProduct?.cost ?? DEFAULT_COSTS.paintLabor * coats,
    markup: DEFAULT_MARKUP,
    tier: laborProduct?.tier ?? 'GOOD',
    category: 'Painting',
    isLabor: true,
    productId: laborProduct?.id,
  })

  if (includesTrim) {
    const baseLf   = num(measurements.baseLf)
    const casingLf = num(measurements.casingLf)
    const trimLaborRate = DEFAULT_COSTS.trimPaintLabor ?? 1.50

    if (baseLf > 0) {
      items.push({
        description: 'Base molding painting (labor)',
        quantity: Math.ceil(baseLf),
        unit: 'lf',
        cost: trimLaborRate,
        markup: DEFAULT_MARKUP,
        tier: 'GOOD',
        category: 'Painting',
        isLabor: true,
      })
    }

    if (casingLf > 0) {
      items.push({
        description: 'Door & window casing painting (labor)',
        quantity: Math.ceil(casingLf),
        unit: 'lf',
        cost: trimLaborRate,
        markup: DEFAULT_MARKUP,
        tier: 'GOOD',
        category: 'Painting',
        isLabor: true,
      })
    }

    // Fallback lump-sum if no LF data entered
    if (baseLf === 0 && casingLf === 0) {
      items.push({
        description: 'Trim painting (labor)',
        quantity: 1,
        unit: 'ls',
        cost: 350,
        markup: DEFAULT_MARKUP,
        tier: 'GOOD',
        category: 'Painting',
        isLabor: true,
      })
    }
  }

  return items
}

// ---------------------------------------------------------------------------
// Demo Assembly
// ---------------------------------------------------------------------------
export function calculateDemoAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const areas = measurements.areas
  let totalSqft = 0

  if (Array.isArray(areas) && areas.length > 0) {
    totalSqft = areas.reduce((sum: number, a: unknown) => {
      const area = a as { sqft?: unknown }
      return sum + num(area.sqft)
    }, 0)
  }

  const dumpsterNeeded = Boolean(measurements.dumpsterNeeded)
  const items: AssemblyItem[] = []

  if (totalSqft > 0) {
    const laborProduct = findProduct(products, 'demo', 'demolition', 'demo labor')
    items.push({
      description: laborProduct?.name ?? 'Demolition labor',
      quantity: totalSqft,
      unit: 'sqf',
      cost: laborProduct?.cost ?? DEFAULT_COSTS.demoLabor,
      markup: DEFAULT_MARKUP,
      tier: laborProduct?.tier ?? 'GOOD',
      category: 'Demo',
      isLabor: true,
      productId: laborProduct?.id,
    })
  }

  if (dumpsterNeeded) {
    const dumpsterProduct = findProduct(products, 'dumpster', 'haul', 'disposal')
    items.push({
      description: dumpsterProduct?.name ?? 'Dumpster rental / haul-away',
      quantity: 1,
      unit: 'ea',
      cost: dumpsterProduct?.cost ?? DEFAULT_COSTS.dumpster,
      markup: DEFAULT_MARKUP,
      tier: dumpsterProduct?.tier ?? 'GOOD',
      category: 'Demo',
      isLabor: false,
      productId: dumpsterProduct?.id,
    })
  }

  return items
}

// ---------------------------------------------------------------------------
// General Labor Assembly
// ---------------------------------------------------------------------------
export function calculateGeneralLaborAssembly(
  measurements: MeasurementData,
  products: Product[],
  assemblies: AssemblyDef[] = []
): AssemblyItem[] {
  const tasks = measurements.tasks
  const items: AssemblyItem[] = []

  if (!Array.isArray(tasks) || tasks.length === 0) return items

  const laborProduct = findProduct(products, 'general labor', 'labor', 'hourly')
  const productById = new Map(products.map((p) => [p.id, p]))
  // Curated assemblies matched to tasks by name (case-insensitive).
  const assemblyByName = new Map(
    assemblies.map((a) => [a.name.trim().toLowerCase(), a.items])
  )
  function lookupAssembly(lcl: string) {
    return assemblyByName.get(lcl)
  }

  for (const t of tasks) {
    const task = t as { label?: unknown; hours?: unknown; sqft?: unknown; inputType?: unknown }
    const inputType = String(task.inputType ?? 'hours')
    const label = String(task.label || 'General labor')
    const lcLabel = label.trim().toLowerCase()

    if (inputType === 'sqft') {
      // Sqft-based tasks (Floor Protection, Room Protection, Cleaning):
      // no labor-hours item; pull material items from matching assembly.
      // If an assembly item unit is 'sqft', scale quantity by room size;
      // otherwise use the admin-configured fixed quantity as-is.
      const sqft = num(task.sqft)
      if (sqft <= 0) continue
      // Use the task label as the category so items appear under the matching
      // scope tab in the estimate builder (e.g. "Floor Protection" → Floor Protection tab)
      const sqftCategory = label
      const asmItems = lookupAssembly(lcLabel)
      if (asmItems) {
        for (const mi of asmItems) {
          const product = productById.get(mi.productId)
          if (!product) continue
          // coverageSqft: "1 unit covers X sqft" → qty = ceil(roomSqft / coverageSqft)
          // Falls back to fixed quantity when not set (e.g. door kit = 1 ea regardless of size)
          const qty = (mi.coverageSqft && mi.coverageSqft > 0)
            ? Math.ceil(sqft / mi.coverageSqft)
            : mi.quantity
          items.push({
            description: product.name,
            quantity: qty,
            unit: mi.unit || product.unit,
            cost: product.cost,
            markup: DEFAULT_MARKUP,
            tier: product.tier,
            category: sqftCategory,
            isLabor: false,
            productId: product.id,
            sku: product.sku,
            supplier: product.supplier,
          })
        }
      }
    } else {
      // Hours-based tasks (Contents Movement and any manually added tasks)
      const hours = num(task.hours)
      if (hours <= 0) continue
      // Use the task label as category so the labor item appears under the
      // correct scope tab (e.g. "Contents Movement") in the estimate builder.
      items.push({
        description: label,
        quantity: hours,
        unit: 'hr',
        cost: laborProduct?.cost ?? DEFAULT_COSTS.generalLabor,
        markup: DEFAULT_MARKUP,
        tier: laborProduct?.tier ?? 'GOOD',
        category: label,
        isLabor: true,
        productId: laborProduct?.id,
      })

      // Add any curated material line items attached to a matching assembly.
      // Use the task label as category so items land under the right scope tab.
      const asmItems = lookupAssembly(lcLabel)
      if (asmItems) {
        for (const mi of asmItems) {
          const product = productById.get(mi.productId)
          if (!product) continue
          items.push({
            description: product.name,
            quantity: mi.quantity,
            unit: mi.unit || product.unit,
            cost: product.cost,
            markup: DEFAULT_MARKUP,
            tier: product.tier,
            category: label,
            isLabor: false,
            productId: product.id,
            sku: product.sku,
            supplier: product.supplier,
          })
        }
      }
    }
  }

  return items
}

// ---------------------------------------------------------------------------
// Kitchen Assembly
// ---------------------------------------------------------------------------
export function calculateKitchenAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const upperCabinetsLf = num(measurements.upperCabinetsLf)
  const lowerCabinetsLf = num(measurements.lowerCabinetsLf)
  const countertopLf = num(measurements.countertopLf)
  const backsplashSqft = num(measurements.backsplashSqft)
  const appliances = num(measurements.appliances)
  const sink = Boolean(measurements.sink)
  const wastePct = num(measurements.wasteFactor, 10)
  const waste = 1 + wastePct / 100

  const items: AssemblyItem[] = []

  if (upperCabinetsLf > 0) {
    const product = findProduct(products, 'upper cabinet', 'cabinet', 'upper')
    items.push({
      description: product?.name ?? 'Upper cabinets',
      quantity: upperCabinetsLf,
      unit: 'lf',
      cost: product?.cost ?? DEFAULT_COSTS.upperCabinet,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Kitchen',
      isLabor: false,
      productId: product?.id,
    })
  }

  if (lowerCabinetsLf > 0) {
    const product = findProduct(products, 'lower cabinet', 'base cabinet', 'lower')
    items.push({
      description: product?.name ?? 'Lower / base cabinets',
      quantity: lowerCabinetsLf,
      unit: 'lf',
      cost: product?.cost ?? DEFAULT_COSTS.lowerCabinet,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Kitchen',
      isLabor: false,
      productId: product?.id,
    })
  }

  if (countertopLf > 0) {
    const product = findProduct(products, 'countertop', 'counter')
    items.push({
      description: product?.name ?? 'Countertop',
      quantity: ceil(countertopLf * waste),
      unit: 'lf',
      cost: product?.cost ?? DEFAULT_COSTS.countertop,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Kitchen',
      isLabor: false,
      productId: product?.id,
    })
  }

  if (backsplashSqft > 0) {
    const product = findProduct(products, 'backsplash', 'ceramic tile', 'porcelain tile', 'mosaic', 'ceramic', 'porcelain')
    items.push({
      description: product?.name ?? 'Backsplash tile',
      quantity: ceil(backsplashSqft * waste),
      unit: 'sqft',
      cost: product?.cost ?? DEFAULT_COSTS.backsplash,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Kitchen',
      isLabor: false,
      productId: product?.id,
    })
  }

  if (appliances > 0) {
    const product = findProduct(products, 'appliance', 'install')
    items.push({
      description: product?.name ?? 'Appliance installation',
      quantity: appliances,
      unit: 'ea',
      cost: product?.cost ?? DEFAULT_COSTS.appliance,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Kitchen',
      isLabor: true,
      productId: product?.id,
    })
  }

  if (sink) {
    const product = findProduct(products, 'sink', 'kitchen sink')
    items.push({
      description: product?.name ?? 'Sink installation',
      quantity: 1,
      unit: 'ea',
      cost: product?.cost ?? DEFAULT_COSTS.sinkInstall,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Kitchen',
      isLabor: true,
      productId: product?.id,
    })
  }

  // Cabinet installation labor
  const totalCabinetLf = upperCabinetsLf + lowerCabinetsLf
  if (totalCabinetLf > 0) {
    const laborProduct = findProduct(products, 'cabinet labor', 'kitchen labor', 'labor')
    const hours = ceil(totalCabinetLf * 0.75) // ~45 min per lf
    items.push({
      description: laborProduct?.name ?? 'Cabinet installation labor',
      quantity: hours,
      unit: 'hr',
      cost: laborProduct?.cost ?? DEFAULT_COSTS.kitchenLabor,
      markup: DEFAULT_MARKUP,
      tier: laborProduct?.tier ?? 'GOOD',
      category: 'Kitchen',
      isLabor: true,
      productId: laborProduct?.id,
    })
  }

  return items
}

// ---------------------------------------------------------------------------
// Shared lumber helpers (used by Deck Assembly and Deck Framing Assembly)
// ---------------------------------------------------------------------------

const STD_LUMBER_LENGTHS = [8, 10, 12, 14, 16, 18, 20]

/** Returns the smallest standard lumber length (ft) that is ≥ needed footage */
function nextStdLen(lf: number): number {
  return STD_LUMBER_LENGTHS.find(l => l >= lf) ?? 20
}

/**
 * Find a product by lumber size + preferred length.
 * Tries "size×length" match first (e.g. "2x10" and "16'"),
 * then falls back to any of the provided keyword matches.
 */
// Hardware/connector terms that should never match a lumber lookup
const LUMBER_EXCLUDE = ['hanger', 'anchor', 'bracket', 'connector', 'bolt', 'screw', 'nail', 'tie', 'strap', 'plate', 'pier', 'diamond']

function isLumber(name: string): boolean {
  const n = name.toLowerCase()
  return !LUMBER_EXCLUDE.some(kw => n.includes(kw))
}

function findLumber(
  products: Product[],
  size: string,
  lengthFt: number,
  ...fallbackKeywords: string[]
): Product | undefined {
  const sizeLow = size.toLowerCase()
  const lenStr  = `${lengthFt}'`
  const exact = products.find(p => {
    const n = p.name.toLowerCase()
    return isLumber(p.name) && n.includes(sizeLow) && n.includes(lenStr)
  })
  if (exact) return exact
  // Size-only fallback — lumber products only
  const sizeMatch = products.find(p => isLumber(p.name) && p.name.toLowerCase().includes(sizeLow))
  if (sizeMatch) return sizeMatch
  // Keyword fallback (e.g. 'post', 'joist') — lumber products only
  return products.find(p =>
    isLumber(p.name) && fallbackKeywords.some(kw => p.name.toLowerCase().includes(kw.toLowerCase()))
  )
}

// ---------------------------------------------------------------------------
// Fascia helpers
// ---------------------------------------------------------------------------

/**
 * Extract the color token from a TimberTech board name so we can find the
 * matching fascia panel.
 * "TT HARVEST 12' BROWNSTONE GV"              → "BROWNSTONE"
 * "TT HARVEST 12' SLATE GREY GV"              → "SLATE GREY"
 * "TT HARVEST 20' (MAX) 2" X 6" KONA SQ"     → "KONA"
 * "TT 16' DARK TEAK PRIME GV SCALLOPED"       → "DARK TEAK"
 * "TT 12' PREMIER DARK TEAK GV SCALLOPED"     → "DARK TEAK"
 * "TT 16' COCONUT HUSK PRIME+ GV - SCALLOPED" → "COCONUT HUSK"
 */
// Collection / profile tokens that are NOT part of the color name.
// Use letter-only lookahead/lookbehind so PRIME+ (with '+') is handled correctly.
const TT_COLOR_NOISE = /(?<![A-Za-z])(PRIME\+|PRIME|PREMIER|SCALLOPED)(?![A-Za-z])/gi

function extractTTColor(name: string): string | null {
  // Drop everything up to and including the first length marker (e.g. 12')
  const afterLen = name.replace(/^.*?\d+['"]\s*/i, '')
  // Remove parenthetical qualifiers and inline dimensions
  const cleaned = afterLen
    .replace(/\([^)]*\)\s*/g, '')
    .replace(/\d+['"]\s*[Xx]\s*\d+['"]\s*/gi, '')
  // Use \b so SCALLOPED (and dashes) after GV/SQ are ignored
  const m = cleaned.match(/^(.+?)\s+(GV|SQ)\b/i)
  if (!m) return null
  // Strip collection-name tokens that leaked into the color segment
  const color = m[1]
    .trim()
    .toUpperCase()
    .replace(TT_COLOR_NOISE, '')
    .replace(/\s+/g, ' ')
    .trim()
  return color.length > 0 ? color : null
}

/**
 * Find the color-matched TT fascia panel for a given board product.
 * Falls back to any TT fascia if no color match is found.
 */
function findTTFascia(products: Product[], boardProduct: Product): Product | undefined {
  const color = extractTTColor(boardProduct.name)
  if (color) {
    const exact = products.find(p =>
      p.category === 'TT Decking' &&
      p.name.toLowerCase().includes('fascia') &&
      p.name.toUpperCase().includes(color)
    )
    if (exact) return exact
  }
  // Fallback: any TT fascia from the same collection
  const sub = boardProduct.subCategory ?? ''
  if (sub) {
    const collMatch = products.find(p =>
      p.category === 'TT Decking' &&
      p.name.toLowerCase().includes('fascia') &&
      (p.subCategory ?? '') === sub
    )
    if (collMatch) return collMatch
  }
  return products.find(p => p.category === 'TT Decking' && p.name.toLowerCase().includes('fascia'))
}

/**
 * Find a PT Green or CedarTone fascia 1× board for the given width and length.
 * CedarTone catalog only has 1×8; PT Green has 1×6, 1×8, 1×10.
 * Tries exact size+length first, then size only.
 */
function findPTFascia(
  products: Product[],
  widthIn: number,    // 6, 8, 10, 12
  lengthFt: number,
  isCedarTone: boolean,
): Product | undefined {
  // Normalize quoted product names: "1"x8"x12'" → strip quotes for matching
  const norm = (n: string) => n.replace(/"/g, '').toLowerCase()
  const sizeKey = `1x${widthIn}`       // e.g. "1x8"
  const lenKey  = `${lengthFt}'`
  const cedar   = 'cedarton'
  const ptTerms = ['pt green', 'pressure treated', 'cedarton']

  // 1. Exact: material + size + length
  const exact = products.find(p => {
    const n = norm(p.name)
    if (isCedarTone && !n.includes(cedar)) return false
    if (!isCedarTone && n.includes(cedar)) return false
    return n.includes(sizeKey) && n.includes(lenKey) && ptTerms.some(t => n.includes(t))
  })
  if (exact) return exact

  // 2. Material + size (any length)
  const anyLen = products.find(p => {
    const n = norm(p.name)
    if (isCedarTone && !n.includes(cedar)) return false
    if (!isCedarTone && n.includes(cedar)) return false
    return n.includes(sizeKey) && ptTerms.some(t => n.includes(t))
  })
  return anyLen
}

// Pressure-treated terms used to identify outdoor-rated lumber
const PT_TERMS = ['pt green', 'pressure treated', 'cedarton', ' pt', 'pt ']

/**
 * Find outdoor (pressure-treated) lumber for a given size and length.
 * Search priority:
 *   1. PT + size + exact length
 *   2. PT + size (any length)
 *   3. size + exact length (any species — last resort)
 */
function findOutdoorLumber(
  products: Product[],
  size: string,
  lengthFt: number,
): Product | undefined {
  const sizeLow = size.toLowerCase()
  const lenStr  = `${lengthFt}'`
  const isPT    = (name: string) => PT_TERMS.some(t => name.includes(t))

  // 1. PT + size + length
  const best = products.find(p => {
    const n = p.name.toLowerCase()
    return n.includes(sizeLow) && n.includes(lenStr) && isPT(n)
  })
  if (best) return best

  // 2. PT + size (any length)
  const ptAny = products.find(p => {
    const n = p.name.toLowerCase()
    return n.includes(sizeLow) && isPT(n)
  })
  if (ptAny) return ptAny

  // 3. size + length (any species — fallback so line item still appears)
  return products.find(p => {
    const n = p.name.toLowerCase()
    return n.includes(sizeLow) && n.includes(lenStr)
  })
}

// ---------------------------------------------------------------------------
// Deck Assembly
// ---------------------------------------------------------------------------
export function calculateDeckAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  // Sections now store ft+in pairs
  const sections = measurements.sections
  let totalArea = 0
  if (Array.isArray(sections) && sections.length > 0) {
    totalArea = sections.reduce((sum: number, s: unknown) => {
      const sec = s as { lengthFt?: unknown; lengthIn?: unknown; widthFt?: unknown; widthIn?: unknown; length?: unknown; width?: unknown }
      // Support both new ft/in format and old decimal format
      const l = sec.lengthFt !== undefined
        ? num(sec.lengthFt) + num(sec.lengthIn) / 12
        : num(sec.length)
      const w = sec.widthFt !== undefined
        ? num(sec.widthFt) + num(sec.widthIn) / 12
        : num(sec.width)
      return sum + l * w
    }, 0)
  }

  // Pool deck area contribution
  const poolDeckEnabled = !!measurements.poolDeckEnabled
  const poolCoverage    = String(measurements.poolCoverage ?? 'full')
  const poolShape       = String(measurements.poolShape ?? 'rectangular')
  let poolDeckArea = 0
  // Virtual sections for horseshoe/two-legs (participate in board count)
  const poolDeckLegSections: Array<{ lengthFt: number; lengthIn: number; widthFt: number; widthIn: number }> = []
  if (poolDeckEnabled) {
    if (poolCoverage === 'full') {
      const dw = num(measurements.deckAroundWidthFt) + num(measurements.deckAroundWidthIn) / 12
      if (poolShape === 'round') {
        const r = (num(measurements.poolDiameterFt) + num(measurements.poolDiameterIn) / 12) / 2
        poolDeckArea = r > 0 && dw > 0 ? Math.PI * dw * (dw + 2 * r) : 0
      } else if (poolShape === 'oval') {
        const a = (num(measurements.poolLengthFt) + num(measurements.poolLengthIn) / 12) / 2
        const b = (num(measurements.poolWidthFt)  + num(measurements.poolWidthIn)  / 12) / 2
        poolDeckArea = a > 0 && b > 0 && dw > 0 ? Math.PI * ((a + dw) * (b + dw) - a * b) : 0
      } else {
        const pl = num(measurements.poolLengthFt) + num(measurements.poolLengthIn) / 12
        const pw = num(measurements.poolWidthFt)  + num(measurements.poolWidthIn)  / 12
        poolDeckArea = pl > 0 && pw > 0 && dw > 0 ? (pl + 2 * dw) * (pw + 2 * dw) - pl * pw : 0
      }
    } else {
      // horseshoe / two_legs — each leg is a rectangular section for board count
      const leftLeg  = { lengthFt: num(measurements.poolLeftLegLengthFt),  lengthIn: num(measurements.poolLeftLegLengthIn),  widthFt: num(measurements.poolLeftLegWidthFt),  widthIn: num(measurements.poolLeftLegWidthIn)  }
      const rightLeg = { lengthFt: num(measurements.poolRightLegLengthFt), lengthIn: num(measurements.poolRightLegLengthIn), widthFt: num(measurements.poolRightLegWidthFt), widthIn: num(measurements.poolRightLegWidthIn) }
      poolDeckLegSections.push(leftLeg, rightLeg)
      poolDeckArea += (leftLeg.lengthFt + leftLeg.lengthIn / 12) * (leftLeg.widthFt + leftLeg.widthIn / 12)
      poolDeckArea += (rightLeg.lengthFt + rightLeg.lengthIn / 12) * (rightLeg.widthFt + rightLeg.widthIn / 12)
      if (poolCoverage === 'horseshoe') {
        const header = { lengthFt: num(measurements.poolHeaderLengthFt), lengthIn: num(measurements.poolHeaderLengthIn), widthFt: num(measurements.poolHeaderWidthFt), widthIn: num(measurements.poolHeaderWidthIn) }
        poolDeckLegSections.push(header)
        poolDeckArea += (header.lengthFt + header.lengthIn / 12) * (header.widthFt + header.widthIn / 12)
      }
    }
  }
  totalArea += poolDeckArea

  if (totalArea <= 0) return []

  // Rail runs → total LF. Ledger runs (house-attached sides) are excluded entirely.
  // Gate runs count toward LF (they get railing kits) and also trigger gate hardware.
  function railRunsLf(runs: unknown): number {
    if (!Array.isArray(runs)) return 0
    return runs.reduce((sum: number, r: unknown) => {
      const run = r as { lengthFt?: unknown; lengthIn?: unknown; type?: unknown }
      if (run.type === 'ledger') return sum  // house side — no railing needed
      return sum + num(run.lengthFt) + num(run.lengthIn) / 12
    }, 0)
  }

  function gateRunCount(runs: unknown): number {
    if (!Array.isArray(runs)) return 0
    return (runs as Array<{ type?: unknown }>).filter(r => r.type === 'gate').length
  }

  const wastePct             = num(measurements.wasteFactor, 10)
  const stairs               = num(measurements.stairs)
  const stairRisers          = num(measurements.stairRisers, 7)
  const stairStringers       = num(measurements.stairStringers, 3)
  const stairStringerLengthFt = num(measurements.stairStringerLengthFt)
  const stairStringerLengthIn = num(measurements.stairStringerLengthIn)
  const stringerLengthFt     = stairStringerLengthFt + stairStringerLengthIn / 12
  const postSpacing          = num(measurements.railingPostSpacing, 6)
  const manualPosts     = num(measurements.railingPosts)
  const balusterSpacing = num(measurements.railingBalusterSpacing, 4)
  const adjustedArea    = ceil(totalArea * (1 + wastePct / 100))

  // Board count calculation (board-by-board, not sqf)
  const boardDirection = String(measurements.boardDirection ?? "along_width")
  const boardWidthIn   = num(measurements.boardWidthIn, 5.5) || 5.5
  // Combine regular sections + pool leg sections (horseshoe/two-legs)
  const allBoardCountSections = [
    ...(Array.isArray(sections) ? (sections as Array<Record<string, unknown>>) : []),
    ...poolDeckLegSections,
  ]
  const surfaceBoardCount = allBoardCountSections.reduce((sum, s) => {
    const lFt = num(s.lengthFt) + num(s.lengthIn) / 12
    const wFt = num(s.widthFt)  + num(s.widthIn)  / 12
    const coverage = boardDirection === "along_width" ? lFt : wFt
    return sum + Math.ceil((coverage * 12) / boardWidthIn)
  }, 0)
  const adjustedBoardCount = ceil(surfaceBoardCount * (1 + wastePct / 100))
  const stairBoardCount    = stairs > 0 ? stairs * stairRisers * 2 : 0
  const totalBoardCount    = adjustedBoardCount + stairBoardCount

  // Railing LF — new split format or legacy railingLf
  const deckRailLf  = railRunsLf(measurements.deckRailRuns) || num(measurements.railingLf)
  // Stair railing: use manually entered runs if present, otherwise auto-calculate.
  // Fallback 1: stringer diagonal length × flights × 2 sides (most accurate when entered).
  // Fallback 2: geometry estimate — 7" rise + 10" tread per riser → ~1.02 ft rake/riser × 2 sides.
  const stairRailLf = railRunsLf(measurements.stairRailRuns)
    || (stairs > 0 && stringerLengthFt > 0 ? stairs * stringerLengthFt * 2 : 0)
    || (stairs > 0 && stairRisers > 0
        ? stairs * Math.sqrt(Math.pow(stairRisers * 7 / 12, 2) + Math.pow(stairRisers * 10 / 12, 2)) * 2
        : 0)
  const totalRailLf = deckRailLf + stairRailLf

  // Derived counts
  const stairTreads      = stairs > 0 ? stairs * stairRisers : 0
  const stairStringerCt  = stairs > 0 ? stairs * stairStringers : 0
  const autoPosts        = deckRailLf > 0 && postSpacing > 0 ? ceil(deckRailLf / postSpacing) + 1 : 0
  const effectivePosts   = manualPosts > 0 ? manualPosts : autoPosts
  const balusters        = totalRailLf > 0 && balusterSpacing > 0
    ? ceil((totalRailLf * 12) / balusterSpacing) : 0

  // Support both new deckMaterials[] and legacy deckMaterial string
  const rawMaterials = measurements.deckMaterials
  const deckMaterials: string[] = Array.isArray(rawMaterials) && rawMaterials.length > 0
    ? rawMaterials as string[]
    : measurements.deckMaterial
      ? [String(measurements.deckMaterial)]
      : []

  // Catalog product IDs (new path — takes priority over deckMaterials keyword search)
  const deckProductIds: string[] = Array.isArray(measurements.deckProductIds)
    ? (measurements.deckProductIds as string[])
    : []

  // Primary steps hit GOOD / BETTER / BEST so that the common 3-material
  // selection (e.g. CedarTone, Pressure Treated, one TimberTech) maps cleanly
  // to the three main tiers.  _PLUS variants fill slots 4-6 for larger sets.
  const TIER_SEQUENCE: AssemblyItem['tier'][] = [
    'GOOD', 'BETTER', 'BEST', 'GOOD_PLUS', 'BETTER_PLUS', 'BEST_PLUS',
  ]

  const items: AssemblyItem[] = []

  // 1. Deck boards — one line item per selected product/material
  if (deckProductIds.length > 0) {
    // New path: exact catalog product lookup by ID, sorted cheapest → most expensive
    const resolved = deckProductIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => !!p)
      .sort((a, b) => a.cost - b.cost)

    resolved.forEach((product, idx) => {
      const tier = TIER_SEQUENCE[idx] ?? 'BEST_PLUS'
      const qty = totalBoardCount > 0 ? totalBoardCount : adjustedArea
      const unit = totalBoardCount > 0 ? 'ea' : 'sqf'
      items.push({
        description: product.name,
        quantity: qty,
        unit,
        cost: product.cost,
        markup: DEFAULT_MARKUP,
        tier,
        category: 'Decking',
        isLabor: false,
        productId: product.id,
      })
    })
  } else if (deckMaterials.length === 0) {
    // No material selected — use first assembly product found, name it properly
    const deckProduct = findProduct(products, 'deck board', 'decking', 'composite', 'pressure treated', 'cedar')
    const qty = totalBoardCount > 0 ? totalBoardCount : adjustedArea
    const unit = totalBoardCount > 0 ? 'ea' : 'sqf'
    items.push({
      description: deckProduct?.name ?? 'Deck boards',
      quantity: qty,
      unit,
      cost: deckProduct?.cost ?? DEFAULT_COSTS.deckBoards,
      markup: DEFAULT_MARKUP,
      tier: deckProduct?.tier ?? 'GOOD',
      category: 'Decking',
      isLabor: false,
      productId: deckProduct?.id,
    })
  } else {
    // Legacy path: resolve each material name via keyword search, sort cheapest → most expensive
    const resolved = deckMaterials.map((material) => {
      const keywords: string[] = [material.toLowerCase()]
      const lastWord = material.split(' ').pop()
      if (lastWord && lastWord.toLowerCase() !== material.toLowerCase()) {
        keywords.push(lastWord.toLowerCase())
      }
      keywords.push('deck board', 'decking', 'composite', 'pressure treated', 'cedar')
      const product = findProduct(products, ...keywords)
      const cost = product?.cost ?? DEFAULT_COSTS.deckBoards
      const pillLabel = material.startsWith('TimberTech ') ? material.replace('TimberTech ', '') : material
      return { material, pillLabel, product, cost }
    })

    // Sort cheapest → most expensive so Good = base, Best = premium
    resolved.sort((a, b) => a.cost - b.cost)

    resolved.forEach(({ pillLabel, product, cost }, idx) => {
      const tier = TIER_SEQUENCE[idx] ?? 'BEST_PLUS'
      const qty = totalBoardCount > 0 ? totalBoardCount : adjustedArea
      const unit = totalBoardCount > 0 ? 'ea' : 'sqf'
      items.push({
        description: `Deck boards — ${pillLabel}`,
        quantity: qty,
        unit,
        cost,
        markup: DEFAULT_MARKUP,
        tier,
        category: 'Decking',
        isLabor: false,
        productId: product?.id,
      })
    })
  }

  // 2. Border / picture-frame boards
  // Perimeter = front + left side + right side (ledger against house gets no border).
  // single = 1× perimeter, double_no_breaker = 2× perimeter (no breaker), double = 2× perimeter + breaker label.
  const borderStyle = String(measurements.borderStyle ?? 'none')
  if (borderStyle !== 'none' && Array.isArray(sections) && sections.length > 0) {
    const secArr = sections as Array<Record<string, unknown>>
    const totalLenFt = secArr.reduce((s, sec) => s + num(sec.lengthFt) + num(sec.lengthIn) / 12, 0)
    const depthFt    = num(secArr[0].widthFt) + num(secArr[0].widthIn) / 12
    const perimFt    = totalLenFt + depthFt * 2   // ledger side excluded
    const multiplier = (borderStyle === 'double' || borderStyle === 'double_no_breaker') ? 2 : 1
    const totalBorderLf = perimFt * multiplier

    // One line item per selected deck product (same material as field boards)
    // Use 12' or 16' boards depending on perimeter run length
    const borderBoardLen = perimFt > 12 ? 16 : 12
    const boardsPerRun   = Math.ceil(perimFt / borderBoardLen)
    const totalBorderBoards = boardsPerRun * multiplier

    const activeTierSeq = deckProductIds.length > 0
      ? deckProductIds
          .map(id => products.find(p => p.id === id))
          .filter((p): p is Product => !!p)
          .sort((a, b) => a.cost - b.cost)
      : []

    if (activeTierSeq.length > 0) {
      // One border line item per tier, same product as the field boards
      activeTierSeq.forEach((product, idx) => {
        const tier = TIER_SEQUENCE[idx] ?? 'BEST_PLUS'
        const label = borderStyle === 'double'
          ? `Border + Breaker boards (${product.name})`
          : borderStyle === 'double_no_breaker'
          ? `Double border boards (${product.name})`
          : `Border boards (${product.name})`
        items.push({
          description: label,
          quantity: totalBorderBoards,
          unit: 'ea',
          cost: product.cost,
          markup: DEFAULT_MARKUP,
          tier,
          category: 'Decking',
          isLabor: false,
          productId: product.id,
        })
      })
    } else {
      // Fallback — generic border entry
      const deckProduct = items.find(i => i.category === 'Decking' && !i.isLabor)
      const label = borderStyle === 'double' ? 'Border + Breaker boards'
        : borderStyle === 'double_no_breaker' ? 'Double border boards'
        : 'Border boards'
      items.push({
        description: label,
        quantity: totalBorderBoards,
        unit: 'ea',
        cost: deckProduct?.cost ?? DEFAULT_COSTS.deckBoards,
        markup: DEFAULT_MARKUP,
        tier: deckProduct?.tier ?? 'GOOD',
        category: 'Decking',
        isLabor: false,
        productId: deckProduct?.productId,
      })
    }
  }

  // 3. Carpentry labor — hourly rates (Lead Carpenter $57.50/hr, Carpenter $25.00/hr)
  const LEAD_CARPENTER_RATE = 57.50
  const CARPENTER_RATE      = 25.00
  const leadHours     = num(measurements.leadCarpenterHours)
  const carpenterHours = num(measurements.carpenterHours)

  if (leadHours > 0) {
    items.push({
      description: 'Lead Carpenter',
      quantity: leadHours,
      unit: 'hr',
      cost: LEAD_CARPENTER_RATE,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Decking',
      isLabor: true,
    })
  }
  if (carpenterHours > 0) {
    items.push({
      description: 'Carpenter',
      quantity: carpenterHours,
      unit: 'hr',
      cost: CARPENTER_RATE,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Decking',
      isLabor: true,
    })
  }

  // How many pricing tiers are active — one per selected material/product.
  // Railing and stair items repeat once per tier so every priced option is complete.
  const tierCount  = deckProductIds.length > 0 ? deckProductIds.length
    : deckMaterials.length > 0 ? deckMaterials.length
    : 1
  const activeTiers = TIER_SEQUENCE.slice(0, tierCount)

  // 3. Railing
  const railingType = String(measurements.railingType ?? 'wood')

  if (totalRailLf > 0) {
    const postCapsManual = num(measurements.postCaps)
    const postCapsQty    = postCapsManual > 0 ? postCapsManual : effectivePosts

    if (railingType === 'wood') {
      // ── Wood railing: dimensional lumber (2×4 top + bottom rail, 2×6 cap) ──
      const railBoardLen   = totalRailLf <= 16 ? nextStdLen(totalRailLf) : 16
      const railBoardCount = totalRailLf <= 16 ? 1 : Math.ceil(totalRailLf / 16)

      const rail2x4    = findOutdoorLumber(products, '2x4', railBoardLen)
      const rail2x6    = findOutdoorLumber(products, '2x6', railBoardLen)
      const postProduct = effectivePosts > 0 ? findProduct(products, 'railing post', 'deck post', 'post') : undefined
      const capProduct  = effectivePosts > 0 ? findProduct(products, 'post cap', 'railing cap') : undefined
      const balProduct  = balusters > 0 ? findProduct(products, 'baluster', 'spindle', 'picket') : undefined

      items.push({
        description: rail2x4
          ? `${rail2x4.name} (top rail — ${Math.round(totalRailLf * 10) / 10} lf)`
          : `2×4×${railBoardLen}' top rail (${Math.round(totalRailLf * 10) / 10} lf)`,
        quantity: railBoardCount, unit: 'ea',
        cost: rail2x4?.cost ?? (railBoardLen * 0.70), markup: DEFAULT_MARKUP,
        tier: 'GOOD', packages: 'good,better,best', category: 'Deck', isLabor: false,
        productId: rail2x4?.id,
      })
      items.push({
        description: rail2x4 ? `${rail2x4.name} (bottom rail)` : `2×4×${railBoardLen}' bottom rail`,
        quantity: railBoardCount, unit: 'ea',
        cost: rail2x4?.cost ?? (railBoardLen * 0.70), markup: DEFAULT_MARKUP,
        tier: 'GOOD', packages: 'good,better,best', category: 'Deck', isLabor: false,
        productId: rail2x4?.id,
      })
      items.push({
        description: rail2x6 ? `${rail2x6.name} (cap rail)` : `2×6×${railBoardLen}' cap rail`,
        quantity: railBoardCount, unit: 'ea',
        cost: rail2x6?.cost ?? (railBoardLen * 1.10), markup: DEFAULT_MARKUP,
        tier: 'GOOD', packages: 'good,better,best', category: 'Deck', isLabor: false,
        productId: rail2x6?.id,
      })
      if (effectivePosts > 0) {
        items.push({
          description: postProduct?.name ?? `Railing posts (@ ${postSpacing} ft o.c.)`,
          quantity: effectivePosts, unit: 'ea',
          cost: postProduct?.cost ?? 18, markup: DEFAULT_MARKUP,
          tier: 'GOOD', packages: 'good,better,best', category: 'Deck', isLabor: false,
          productId: postProduct?.id,
        })
        items.push({
          description: capProduct?.name ?? 'Post caps',
          quantity: postCapsQty, unit: 'ea',
          cost: capProduct?.cost ?? 12, markup: DEFAULT_MARKUP,
          tier: 'GOOD', packages: 'good,better,best', category: 'Deck', isLabor: false,
          productId: capProduct?.id,
        })
      }
      if (balusters > 0) {
        items.push({
          description: balProduct?.name ?? `Balusters (@ ${balusterSpacing}" o.c.)`,
          quantity: balusters, unit: 'ea',
          cost: balProduct?.cost ?? 4.50, markup: DEFAULT_MARKUP,
          tier: 'GOOD', packages: 'good,better,best', category: 'Deck', isLabor: false,
          productId: balProduct?.id,
        })
      }
    } else {
      // ── Composite railing: Harmony or Advantage kit-based system ──
      const kw = railingType === 'harmony' ? 'harmony' : 'advantage'
      const railingColor = String(measurements.railingColor ?? '').toLowerCase()

      // Detect kit length from product name — parse the "x<n>'" dimension (e.g. 36"x6' → 6, 36"x8' → 8)
      function kitLength(p: Product | undefined): number {
        if (!p) return 8
        const m = p.name.match(/x(\d+)['"]/i)
        if (m) return parseInt(m[1])
        return /8['"]/i.test(p.name) ? 8 : 6
      }

      // Rail kits are branded (e.g. "Advantage Rail Kit Black") — filter by system + color
      const kitProducts = products.filter((p) => {
        const hay = (p.name + ' ' + (p.subCategory ?? '')).toLowerCase()
        if (!hay.includes(kw)) return false
        return railingColor ? hay.includes(railingColor) : true
      })

      // Post accessories (Post Sleeve, Post Skirt, Post Cap) are NOT branded with the
      // system name — they're just "5"x5" Post Cap Black". Filter by color only.
      const postProducts = railingColor
        ? products.filter((p) => p.name.toLowerCase().includes(railingColor))
        : products

      // Deck rail kit (not stair)
      const deckKit = kitProducts.find((p) => {
        const n = p.name.toLowerCase()
        return (n.includes('rail kit') || n.includes('rail system')) && !n.includes('stair')
      }) ?? kitProducts.find((p) => p.name.toLowerCase().includes('rail') && !p.name.toLowerCase().includes('stair'))

      // Stair rail kit
      const stairKit = kitProducts.find((p) => {
        const n = p.name.toLowerCase()
        return n.includes('stair') && n.includes('rail')
      })

      // Post accessories — Harmony uses a combined "Post, Skirt, Cap" product;
      // Advantage uses separate Post Sleeve, Post Skirt, Post Cap items.
      const harmonyPost  = kw === 'harmony'
        ? kitProducts.find((p) => p.name.toLowerCase().includes('post'))
        : undefined
      // Deck posts use 42" sleeve; stair posts use 12' sleeve
      const postSleeve   = kw === 'advantage'
        ? (postProducts.find((p) => p.name.toLowerCase().includes('post sleeve') && p.name.toLowerCase().includes('42'))
          ?? postProducts.find((p) => p.name.toLowerCase().includes('post sleeve'))
          ?? products.find((p) => p.name.toLowerCase().includes('post sleeve') && p.name.toLowerCase().includes('42'))
          ?? products.find((p) => p.name.toLowerCase().includes('post sleeve')))
        : undefined
      const postSleeveLong = kw === 'advantage'
        ? (postProducts.find((p) => p.name.toLowerCase().includes('post sleeve') && p.name.toLowerCase().includes("12'"))
          ?? products.find((p) => p.name.toLowerCase().includes('post sleeve') && p.name.toLowerCase().includes("12'"))
          ?? postSleeve)
        : undefined
      const postSkirt    = kw === 'advantage'
        ? (postProducts.find((p) => p.name.toLowerCase().includes('post skirt'))
          ?? products.find((p) => p.name.toLowerCase().includes('post skirt')))
        : undefined
      const postCap      = postProducts.find((p) => p.name.toLowerCase().includes('post cap'))
        ?? products.find((p) => p.name.toLowerCase().includes('post cap'))

      // ── Composite railing layout ──
      // postSpacing (user-set, default 6') is the target bay width.
      // Find the smallest available kit whose physical length >= postSpacing so rails span
      // each bay without gaps. If no kit qualifies, fall back to the longest available and
      // cap effective spacing at that length.

      type RunLf = { type?: unknown; lengthFt?: unknown; lengthIn?: unknown }
      const toLf = (r: RunLf) => num(r.lengthFt as number) + num(r.lengthIn as number) / 12

      const deckActiveRuns = (Array.isArray(measurements.deckRailRuns)
        ? (measurements.deckRailRuns as RunLf[]).filter(r => r.type !== 'ledger') : [])
      const stairActiveRunsRaw = (Array.isArray(measurements.stairRailRuns)
        ? (measurements.stairRailRuns as RunLf[]).filter(r => r.type !== 'ledger') : [])
      // Auto-generate stair runs when none are entered but stairs exist (1 run per flight)
      const stairActiveRuns: RunLf[] = stairActiveRunsRaw.length > 0
        ? stairActiveRunsRaw
        : (stairs > 0 && stringerLengthFt > 0
          ? Array.from({ length: stairs }, () => ({ lengthFt: stairStringerLengthFt, lengthIn: stairStringerLengthIn }))
          : [])

      const deckRunLfs = deckActiveRuns.map(toLf)
      const stairRunLfs = stairActiveRuns.map(toLf)

      // Collect available kit products for deck and stair, sorted by length ascending
      const sortedDeckKits = kitProducts
        .filter(p => { const n = p.name.toLowerCase(); return n.includes('rail') && !n.includes('stair') })
        .map(p => ({ p, l: kitLength(p) }))
        .sort((a, b) => a.l - b.l)
      const sortedStairKits = kitProducts
        .filter(p => { const n = p.name.toLowerCase(); return n.includes('stair') && n.includes('rail') })
        .map(p => ({ p, l: kitLength(p) }))
        .sort((a, b) => a.l - b.l)

      // Deck: pick smallest kit length >= postSpacing; fall back to largest if none qualifies
      const deckEntry = sortedDeckKits.find(e => e.l >= postSpacing) ?? sortedDeckKits[sortedDeckKits.length - 1]
      const chosenDeckKit = deckEntry?.p ?? deckKit
      // Effective spacing can't exceed the kit's physical length (rails must span the bay)
      const deckEffSpacing = Math.min(postSpacing, deckEntry?.l ?? postSpacing)

      // Per-run kit count using effectiveSpacing (equal bay widths within each run)
      const deckRunCalcs = deckRunLfs.map(lf => ({ bays: lf > 0 ? Math.ceil(lf / deckEffSpacing) : 0 }))
      const deckKitQty = deckRunCalcs.reduce((s, r) => s + r.bays, 0)

      // Stair: pick smallest stair kit length >= deckEffSpacing (use same spacing for consistency)
      const stairEntry = sortedStairKits.find(e => e.l >= deckEffSpacing) ?? sortedStairKits[sortedStairKits.length - 1]
      const chosenStairKit = stairEntry?.p ?? stairKit
      const stairEffSpacing = stairEntry?.l ?? 6

      const stairRunCalcs = stairRunLfs.map(lf => ({ bays: lf > 0 ? Math.ceil(lf / stairEffSpacing) : 0 }))
      const stairKitQty = stairRunCalcs.reduce((s, r) => s + r.bays, 0)

      // Post count: treat deck perimeter as one continuous path (corners shared between runs)
      // so post count = total bays + 1, not sum(run_bays + 1).
      const deckPerimPosts = deckRailLf > 0 ? Math.ceil(deckRailLf / deckEffSpacing) + 1 : 0
      // Stair posts are per-run (each flight is independent)
      const stairPostsTotal = stairRunCalcs.reduce((s, r) => s + (r.bays > 0 ? r.bays + 1 : 0), 0)

      const compositeAutoPosts = deckPerimPosts + stairPostsTotal
      const compositeEffectivePosts = manualPosts > 0 ? manualPosts : compositeAutoPosts
      const compositePostCapsQty = postCapsManual > 0 ? postCapsManual : compositeEffectivePosts

      // Clip jig: Harmony only — 1 per stair run (Advantage does not use a clip jig)
      const clipJigQty = kw === 'harmony' ? stairActiveRuns.length : 0

      // ── Deck rail kits ──
      if (deckKitQty > 0) {
        items.push({
          description: chosenDeckKit?.name ?? `${kw.charAt(0).toUpperCase() + kw.slice(1)} Rail Section`,
          quantity: deckKitQty, unit: 'ea',
          cost: chosenDeckKit?.cost ?? 180, markup: DEFAULT_MARKUP,
          tier: 'GOOD', packages: 'good,better,best', category: 'Deck', isLabor: false,
          productId: chosenDeckKit?.id,
        })
      }

      // ── Stair rail kits ──
      if (stairKitQty > 0) {
        items.push({
          description: chosenStairKit?.name ?? `${kw.charAt(0).toUpperCase() + kw.slice(1)} Stair Section`,
          quantity: stairKitQty, unit: 'ea',
          cost: chosenStairKit?.cost ?? 160, markup: DEFAULT_MARKUP,
          tier: 'GOOD', packages: 'good,better,best', category: 'Deck', isLabor: false,
          productId: chosenStairKit?.id,
        })
      }

      // ── Post accessories ──
      if (compositeEffectivePosts > 0) {
        if (harmonyPost) {
          // Harmony: single combined Post/Skirt/Cap kit
          items.push({
            description: harmonyPost.name,
            quantity: compositeEffectivePosts, unit: 'ea',
            cost: harmonyPost.cost, markup: DEFAULT_MARKUP,
            tier: 'GOOD', packages: 'good,better,best', category: 'Deck', isLabor: false,
            productId: harmonyPost.id,
          })
        } else {
          // Advantage: separate Post Sleeve (42" deck / 12' stair), Post Skirt, Post Cap
          const deckPostQty = manualPosts > 0 ? 0 : deckPerimPosts
          const stairPostQty = manualPosts > 0 ? 0 : stairPostsTotal
          const manualPostQty = manualPosts > 0 ? manualPosts : 0
          // 42" sleeves for deck posts (and any manual override posts)
          const deckSleeveQty = deckPostQty + manualPostQty
          if (postSleeve && deckSleeveQty > 0) {
            items.push({
              description: postSleeve.name,
              quantity: deckSleeveQty, unit: 'ea',
              cost: postSleeve.cost, markup: DEFAULT_MARKUP,
              tier: 'GOOD', packages: 'good,better,best', category: 'Deck', isLabor: false,
              productId: postSleeve.id,
            })
          }
          // 12' sleeves for stair posts
          if (postSleeveLong && stairPostQty > 0) {
            items.push({
              description: postSleeveLong.name,
              quantity: stairPostQty, unit: 'ea',
              cost: postSleeveLong.cost, markup: DEFAULT_MARKUP,
              tier: 'GOOD', packages: 'good,better,best', category: 'Deck', isLabor: false,
              productId: postSleeveLong.id,
            })
          }
          if (postSkirt) {
            items.push({
              description: postSkirt.name,
              quantity: compositeEffectivePosts, unit: 'ea',
              cost: postSkirt.cost, markup: DEFAULT_MARKUP,
              tier: 'GOOD', packages: 'good,better,best', category: 'Deck', isLabor: false,
              productId: postSkirt.id,
            })
          }
          if (postCap) {
            items.push({
              description: postCap.name,
              quantity: compositePostCapsQty, unit: 'ea',
              cost: postCap.cost, markup: DEFAULT_MARKUP,
              tier: 'GOOD', packages: 'good,better,best', category: 'Deck', isLabor: false,
              productId: postCap.id,
            })
          }
        }
      }

      // ── Rail Clip Jig: 1 per stair run ──
      if (clipJigQty > 0) {
        const clipJigProduct = products.find((p) => {
          const n = p.name.toLowerCase()
          return n.includes('clip jig') || n.includes('rail clip jig')
        })
        items.push({
          description: clipJigProduct?.name ?? `${kw.charAt(0).toUpperCase() + kw.slice(1)} Rail Clip Jig`,
          quantity: clipJigQty, unit: 'ea',
          cost: clipJigProduct?.cost ?? 25, markup: DEFAULT_MARKUP,
          tier: 'GOOD', packages: 'good,better,best', category: 'Deck', isLabor: false,
          productId: clipJigProduct?.id,
        })
      }
    }
  }

  // 3b. Gate hardware — one kit per gate run (gate runs also get railing kits above)
  const deckGateCount = gateRunCount(measurements.deckRailRuns)
  const stairGateCount = gateRunCount(measurements.stairRailRuns)
  const totalGateCount = deckGateCount + stairGateCount
  if (totalGateCount > 0) {
    const gateProduct = findProduct(products, 'gate kit', 'gate hardware', 'gate latch', 'gate hinge')
      ?? products.find(p => p.name.toLowerCase().includes('gate'))
    items.push({
      description: gateProduct?.name ?? `Gate hardware kit (${totalGateCount} gate${totalGateCount > 1 ? 's' : ''})`,
      quantity: totalGateCount,
      unit: 'ea',
      cost: gateProduct?.cost ?? 85,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      packages: 'good,better,best',
      category: 'Deck',
      isLabor: false,
      productId: gateProduct?.id,
    })
  }

  // 4. Stairs — structural, shared across all material tiers
  if (stairs > 0) {
    let stringerBoardCount = stairStringerCt
    let stringerBoardLen   = 8
    if (stairStringerCt > 0 && stringerLengthFt > 0) {
      stringerBoardLen = nextStdLen(stringerLengthFt)
      const stringersPerBoard = Math.floor(stringerBoardLen / stringerLengthFt)
      stringerBoardCount = stringersPerBoard > 1
        ? Math.ceil(stairStringerCt / stringersPerBoard)
        : stairStringerCt
    }

    // Stair tread boards are the same deck board product — stairBoardCount (stairs × risers × 2)
    // is already included in totalBoardCount so they appear in the deck board line items.
    // Only fall back to a placeholder if there are no deck board products selected.
    const hasDeckBoardItems = Array.isArray(measurements.deckProductIds) && (measurements.deckProductIds as unknown[]).length > 0
    const treadProduct = hasDeckBoardItems ? undefined : findProduct(products, 'stair tread', 'stair board', 'tread')
    if (!hasDeckBoardItems) {
      items.push({
        description: treadProduct?.name
          ?? `Stair treads (${stairs} flight${stairs > 1 ? 's' : ''} × ${stairRisers} risers)`,
        quantity: stairTreads,
        unit: 'ea',
        cost: treadProduct?.cost ?? 12,
        markup: DEFAULT_MARKUP,
        tier: 'GOOD',
        packages: 'good,better,best',
        category: 'Deck',
        isLabor: false,
        productId: treadProduct?.id,
      })
    }
    const stringerProduct = stairStringerCt > 0
      ? findOutdoorLumber(products, '2x12', stringerBoardLen)
      : undefined

    if (stairStringerCt > 0) {
      items.push({
        description: stringerProduct?.name
          ?? `2×12×${stringerBoardLen}' stair stringers (${stairStringerCt} from ${stringerBoardCount} board${stringerBoardCount !== 1 ? 's' : ''})`,
        quantity: stringerBoardCount,
        unit: 'ea',
        cost: stringerProduct?.cost ?? (stringerBoardLen * 3.50),
        markup: DEFAULT_MARKUP,
        tier: 'GOOD',
        packages: 'good,better,best',
        category: 'Deck',
        isLabor: false,
        productId: stringerProduct?.id,
      })
    }
  }

  // Assign packages from tier: labor is shared across all tiers; materials belong to their own tier only
  const tierToPackages = (t: AssemblyItem['tier']): string => {
    if (t === 'GOOD' || t === 'GOOD_PLUS') return 'good'
    if (t === 'BETTER' || t === 'BETTER_PLUS') return 'better'
    if (t === 'BEST' || t === 'BEST_PLUS') return 'best'
    return 'good,better,best'
  }
  for (const item of items) {
    if (!item.packages) {
      item.packages = item.isLabor ? 'good,better,best' : tierToPackages(item.tier)
    }
  }

  // Sort by tier so estimate rows read GOOD → BETTER → BEST with all items
  // for each tier grouped together, then by insertion order within the tier.
  const TIER_RANK: Record<string, number> = {
    GOOD: 0, BETTER: 1, BEST: 2, GOOD_PLUS: 3, BETTER_PLUS: 4, BEST_PLUS: 5,
  }
  // Stable sort: attach original index, sort by tier rank, strip index
  items.forEach((item, i) => { (item as unknown as { _i: number })._i = i })
  items.sort((a, b) => {
    const ra = TIER_RANK[a.tier] ?? 99
    const rb = TIER_RANK[b.tier] ?? 99
    if (ra !== rb) return ra - rb
    return ((a as unknown as { _i: number })._i) - ((b as unknown as { _i: number })._i)
  })
  items.forEach((item) => { delete (item as unknown as { _i?: number })._i })

  return items
}

// ---------------------------------------------------------------------------
// Decking Accessories Assembly
// ---------------------------------------------------------------------------
export function calculateDeckingAccessoriesAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const items: AssemblyItem[] = []

  const fasciaLf             = num(measurements.fasciaBoardsFt) + num(measurements.fasciaBoardsIn) / 12
  const topLocFasciaManual   = num(measurements.topLocFasciaCartons)
  // TimberTech flag — injected by MeasurementsClient from the selected deck product
  const isTimberTechDeck     = measurements.isTimberTechDeck === true
  // TopLoc fascia auto-calc only applies to TimberTech decks
  const topLocFasciaCartons  = topLocFasciaManual > 0
    ? topLocFasciaManual
    : (isTimberTechDeck && fasciaLf > 0 ? Math.ceil(fasciaLf / 100) : 0)
  const screwsLbs            = num(measurements.deckScrewsLbs)
  const cortexKitCartons = num(measurements.cortexKitCartons)
  // ConceLoc hidden fasteners
  const conceLocSizeId = String(measurements.conceLocSizeId ?? '')
  const conceLocSqft   = num(measurements.conceLocSqft)
  const conceLocBoxesManual = num(measurements.conceLocBoxes)
  const CONCELOC_COVERAGE: Record<string, number> = { '100': 100, '500': 500, '1000': 1000 }
  const conceLocSqftPerBox = CONCELOC_COVERAGE[conceLocSizeId] ?? 0
  const conceLocBoxes = conceLocBoxesManual > 0
    ? conceLocBoxesManual
    : (conceLocSqftPerBox > 0 && conceLocSqft > 0 ? Math.ceil(conceLocSqft / conceLocSqftPerBox) : 0)
  // TopLoc hidden fasteners — only for TimberTech decks
  const topLocSizeId = String(measurements.topLocSizeId ?? '')
  const topLocSqft   = num(measurements.topLocSqft)
  const topLocBoxesManual = num(measurements.topLocBoxes)
  const TOPLOC_COVERAGE: Record<string, number> = { '100': 100, '500': 500 }
  const topLocSqftPerBox = TOPLOC_COVERAGE[topLocSizeId] ?? 0
  // Auto-calculate only when this is a TimberTech deck; manual override always respected
  const topLocBoxes = topLocBoxesManual > 0
    ? topLocBoxesManual
    : (isTimberTechDeck && topLocSqftPerBox > 0 && topLocSqft > 0 ? Math.ceil(topLocSqft / topLocSqftPerBox) : 0)

  // ── Fascia boards — material-matched, one line per deck tier ─────────────
  if (fasciaLf > 0) {
    // fasciaBoardSize injected from measurements form (e.g. "1x8")
    const fasciaSizeStr  = String(measurements.fasciaBoardSize ?? '1x8')
    const fasciaWidthIn  = parseInt(fasciaSizeStr.replace('1x', '')) || 8

    // Deck product IDs injected by MeasurementsClient from the Decking tab
    const injectedDeckIds: string[] = Array.isArray(measurements.deckProductIds)
      ? (measurements.deckProductIds as string[]) : []

    // Resolve + sort cheapest→most expensive (matches deck board tier order)
    const resolvedDeckProds = injectedDeckIds
      .map(id => products.find(p => p.id === id))
      .filter((p): p is Product => !!p)
      .sort((a, b) => a.cost - b.cost)

    const ACC_TIER_SEQ: AssemblyItem['tier'][] = [
      'GOOD', 'BETTER', 'BEST', 'GOOD_PLUS', 'BETTER_PLUS', 'BEST_PLUS',
    ]

    if (resolvedDeckProds.length > 0) {
      resolvedDeckProds.forEach((deckProd, idx) => {
        const tier = ACC_TIER_SEQ[idx] ?? 'BEST_PLUS'
        const isCollection = (deckProd.subCategory ?? '').toLowerCase().includes('collection')
        const isCedarTone  = deckProd.category?.toLowerCase().includes('cedarton') ||
                             deckProd.name?.toLowerCase().includes('cedarton')

        if (isCollection) {
          // TimberTech: color-matched 12' fascia panels
          const fasciaProd = findTTFascia(products, deckProd)
          const ttBoardLen = 12
          const ttCount    = Math.ceil(fasciaLf / ttBoardLen)
          items.push({
            description: fasciaProd?.name ?? `TimberTech fascia — color matched (${Math.round(fasciaLf * 10) / 10} lf)`,
            quantity: ttCount,
            unit: 'ea',
            cost: fasciaProd?.cost ?? 100,
            markup: DEFAULT_MARKUP,
            tier,
            category: 'Decking Accessories',
            isLabor: false,
            productId: fasciaProd?.id,
          })

          // TopLoc Composite Fasteners for TT fascia (auto from fasciaLf)
          if (topLocFasciaCartons > 0) {
            const topLocFasciaProd = findProduct(products, 'toploc composite', 'toploc fascia', 'composite fastener')
            items.push({
              description: topLocFasciaProd?.name ?? 'TopLoc Composite Fasteners (fascia)',
              quantity: topLocFasciaCartons,
              unit: 'carton',
              cost: topLocFasciaProd?.cost ?? 45,
              markup: DEFAULT_MARKUP,
              tier,
              category: 'Decking Accessories',
              isLabor: false,
              productId: topLocFasciaProd?.id,
            })
          }
        } else {
          // PT Green or CedarTone: 1× dimensional boards
          // Use 16' for PT Green (stocked), 12' for CedarTone (max available)
          const fasciaBoardLen  = isCedarTone ? 12 : 16
          const fasciaBoardCount = Math.ceil(fasciaLf / fasciaBoardLen)
          const fasciaProd      = findPTFascia(products, fasciaWidthIn, fasciaBoardLen, isCedarTone)
          const fallbackDesc    = `1×${fasciaWidthIn}×${fasciaBoardLen}' ${isCedarTone ? 'CedarTone PT' : 'PT Green'} fascia`
          items.push({
            description: fasciaProd?.name ?? fallbackDesc,
            quantity: fasciaBoardCount,
            unit: 'ea',
            cost: fasciaProd?.cost ?? (fasciaBoardLen * 1.20),
            markup: DEFAULT_MARKUP,
            tier,
            category: 'Decking Accessories',
            isLabor: false,
            productId: fasciaProd?.id,
          })
        }
      })
    } else {
      // No deck products injected — generic fallback (single GOOD line)
      const fasciaBoardLen   = 12
      const fasciaBoardCount = Math.ceil(fasciaLf / fasciaBoardLen)
      const fasciaProd       = findPTFascia(products, fasciaWidthIn, fasciaBoardLen, false)
      items.push({
        description: fasciaProd?.name ?? `1×${fasciaWidthIn}×${fasciaBoardLen}' PT fascia`,
        quantity: fasciaBoardCount,
        unit: 'ea',
        cost: fasciaProd?.cost ?? (fasciaBoardLen * 1.20),
        markup: DEFAULT_MARKUP,
        tier: fasciaProd?.tier ?? 'GOOD',
        category: 'Decking Accessories',
        isLabor: false,
        productId: fasciaProd?.id,
      })
    }
  }

  if (conceLocBoxes > 0 && conceLocSizeId) {
    const sizeLabel = conceLocSizeId === '500' ? '500 sqft (gun)' : `${conceLocSizeId} sqft`
    const fastProduct = findProduct(products, 'conceloc', 'hidden fastener', 'deck fastener')
    items.push({
      description: fastProduct?.name ?? `ConceLoc hidden fasteners — ${sizeLabel} box`,
      quantity: conceLocBoxes,
      unit: 'box',
      cost: fastProduct?.cost ?? (conceLocSizeId === '1000' ? 320 : conceLocSizeId === '500' ? 175 : 38),
      markup: DEFAULT_MARKUP,
      tier: fastProduct?.tier ?? 'GOOD',
      packages: 'good,better,best',
      category: 'Decking Accessories',
      isLabor: false,
      productId: fastProduct?.id,
    })
  }

  if (topLocBoxes > 0 && topLocSizeId) {
    const sizeLabel = `${topLocSizeId} sqft`
    const topLocProduct = findProduct(products, 'toploc', 'top loc', 'hidden fastener', 'deck fastener')
    items.push({
      description: topLocProduct?.name ?? `TopLoc hidden fasteners — ${sizeLabel} box`,
      quantity: topLocBoxes,
      unit: 'box',
      cost: topLocProduct?.cost ?? (topLocSizeId === '500' ? 350 : 75),
      markup: DEFAULT_MARKUP,
      tier: topLocProduct?.tier ?? 'GOOD',
      packages: 'good,better,best',
      category: 'Decking Accessories',
      isLabor: false,
      productId: topLocProduct?.id,
    })
  }

  if (screwsLbs > 0) {
    const screwProduct = findProduct(products, 'deck screw', 'decking screw')
    items.push({
      description: screwProduct?.name ?? 'Deck screws',
      quantity: screwsLbs,
      unit: 'lb',
      cost: screwProduct?.cost ?? 12,
      markup: DEFAULT_MARKUP,
      tier: screwProduct?.tier ?? 'GOOD',
      packages: 'good,better,best',
      category: 'Decking Accessories',
      isLabor: false,
      productId: screwProduct?.id,
    })
  }

  if (cortexKitCartons > 0) {
    const cortexProduct = findProduct(products, 'cortex', 'cortex screw', 'cortex plug')
    items.push({
      description: cortexProduct?.name ?? 'Cortex screws & plugs',
      quantity: cortexKitCartons,
      unit: 'carton',
      cost: cortexProduct?.cost ?? 130,
      markup: DEFAULT_MARKUP,
      tier: cortexProduct?.tier ?? 'GOOD',
      packages: 'good,better,best',
      category: 'Decking Accessories',
      isLabor: false,
      productId: cortexProduct?.id,
    })
  }

  // Assign packages for fascia items (per deck tier); shared items already have packages set above
  const daTierToPackages = (t: AssemblyItem['tier']): string => {
    if (t === 'GOOD' || t === 'GOOD_PLUS') return 'good'
    if (t === 'BETTER' || t === 'BETTER_PLUS') return 'better'
    if (t === 'BEST' || t === 'BEST_PLUS') return 'best'
    return 'good,better,best'
  }
  for (const item of items) {
    if (!item.packages) {
      item.packages = daTierToPackages(item.tier)
    }
  }

  return items
}

// ---------------------------------------------------------------------------
// Deck Framing Assembly
// ---------------------------------------------------------------------------
export function calculateDeckFramingAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const items: AssemblyItem[] = []

  const ledgerLf    = num(measurements.ledgerFt) + num(measurements.ledgerIn) / 12
  const beamLf      = num(measurements.beamFt) + num(measurements.beamIn) / 12
  const joistSpan   = num(measurements.joistSpanFt) + num(measurements.joistSpanIn) / 12
  const joistSpacingIn = num(measurements.joistSpacingIn) || 16
  const rawJoistCount  = num(measurements.joistCount)
  // 0 = auto-calculate: ledger length / spacing + 1 end joist
  const joistCount  = rawJoistCount > 0
    ? rawJoistCount
    : (ledgerLf > 0 && joistSpan > 0 ? Math.ceil(ledgerLf / (joistSpacingIn / 12)) + 1 : 0)
  const postCount   = num(measurements.postCount)
  const postHt      = num(measurements.postHeightFt) + num(measurements.postHeightIn) / 12
  const blockingLf  = num(measurements.blockingFt) + num(measurements.blockingIn) / 12
  const joistSize   = String(measurements.joistSize  ?? '2x8')
  const beamSize    = String(measurements.beamSize   ?? '2x10')
  const postSize    = String(measurements.postSize   ?? '6x6')
  const ledgerSize  = String(measurements.ledgerSize ?? '2x10')

  // nextStdLen and findLumber are module-level helpers defined above

  // ── LEDGER ──────────────────────────────────────────────────────────────────
  // Single continuous run — pick the next standard length ≥ ledger LF.
  // If ledger > 20', splice with two pieces.
  if (ledgerLf > 0) {
    const boardLen  = nextStdLen(ledgerLf)
    const qty       = Math.ceil(ledgerLf / boardLen)   // usually 1, 2 if very long
    const product   = findLumber(products, ledgerSize, boardLen, 'ledger')
    items.push({
      description: product?.name ?? `Ledger board (${ledgerSize}×${boardLen}')`,
      quantity: qty,
      unit: 'ea',
      cost: product?.cost ?? (boardLen * 1.80),
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Deck Framing',
      isLabor: false,
      productId: product?.id,
    })
  }

  // ── BEAMS ───────────────────────────────────────────────────────────────────
  // Same as ledger — pick the board length that covers the span.
  if (beamLf > 0) {
    const boardLen  = nextStdLen(beamLf)
    const qty       = Math.ceil(beamLf / boardLen)
    const product   = findLumber(products, beamSize, boardLen, 'beam')
    items.push({
      description: product?.name ?? `Beams (${beamSize}×${boardLen}')`,
      quantity: qty,
      unit: 'ea',
      cost: product?.cost ?? (boardLen * 2.50),
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Deck Framing',
      isLabor: false,
      productId: product?.id,
    })
  }

  // ── JOISTS ──────────────────────────────────────────────────────────────────
  // One board per joist, length = next standard ≥ joist span.
  if (joistCount > 0 && joistSpan > 0) {
    const boardLen  = nextStdLen(joistSpan)
    const product   = findLumber(products, joistSize, boardLen, 'joist')
    items.push({
      description: product?.name ?? `Joists (${joistSize}×${boardLen}') — ${joistCount} pc`,
      quantity: joistCount,
      unit: 'ea',
      cost: product?.cost ?? (boardLen * 1.50),
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Deck Framing',
      isLabor: false,
      productId: product?.id,
    })
  }

  // ── POSTS ───────────────────────────────────────────────────────────────────
  // Buy the shortest standard board that covers the post height.
  // One board per post (cuttable to height with waste).
  if (postCount > 0 && postHt > 0) {
    const boardLen  = nextStdLen(postHt)
    // Check if we can cut multiple posts from one long board (e.g. 4×3' posts → 1×12')
    const postsPerBoard = Math.floor(boardLen / postHt)
    const qty       = postsPerBoard > 1 ? Math.ceil(postCount / postsPerBoard) : postCount
    const product   = findLumber(products, postSize, boardLen, 'post')
    const note      = postsPerBoard > 1
      ? `${postCount} posts, ${postsPerBoard} cuts/board`
      : `${postCount} pc × ${postHt.toFixed(1)}'`
    items.push({
      description: product?.name ?? `Posts (${postSize}×${boardLen}') — ${note}`,
      quantity: qty,
      unit: 'ea',
      cost: product?.cost ?? (boardLen * 3.50),
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Deck Framing',
      isLabor: false,
      productId: product?.id,
    })
  }

  // ── PIERS & FOOTINGS ────────────────────────────────────────────────────────
  const pierType    = String(measurements.pierType ?? 'none')
  const pierCount   = num(measurements.pierCount)
  const tubeFormDiamIn  = num(measurements.tubeFormDiamIn)  || 10
  const tubeFormDepthFt = num(measurements.tubeFormDepthFt)
  const manualBags  = num(measurements.concreteBags60lb)

  if (pierType === 'concrete' && pierCount > 0) {
    // Auto-calc concrete bags: cylinder volume, 60 lb bag ≈ 0.45 ft³
    const rFt       = (tubeFormDiamIn / 2) / 12
    const volPerFt3 = Math.PI * rFt * rFt * tubeFormDepthFt
    const totalVol  = pierCount * volPerFt3
    const autoBags  = totalVol > 0 ? Math.ceil(totalVol / 0.45) : 0
    const bags      = manualBags > 0 ? manualBags : autoBags

    // Tube forms — one per pier
    const tubeProduct = products.find(p =>
      p.name.toLowerCase().includes('tube') &&
      p.name.toLowerCase().includes('form')
    )
    items.push({
      description: tubeProduct?.name ?? `${tubeFormDiamIn}" Tube Form × ${pierCount} piers`,
      quantity: pierCount,
      unit: 'ea',
      cost: tubeProduct?.cost ?? 8.00,
      markup: DEFAULT_MARKUP,
      tier: tubeProduct?.tier ?? 'GOOD',
      category: 'Deck Framing',
      isLabor: false,
      productId: tubeProduct?.id,
    })

    // Concrete bags
    if (bags > 0) {
      const concreteProduct = products.find(p =>
        p.name.toLowerCase().includes('60') &&
        p.name.toLowerCase().includes('concrete')
      ) ?? products.find(p => p.name.toLowerCase().includes('concrete mix'))
      items.push({
        description: concreteProduct?.name ?? `60 lb Concrete Mix — ${pierCount} piers${totalVol > 0 ? ` (${totalVol.toFixed(1)} ft³)` : ''}`,
        quantity: bags,
        unit: 'ea',
        cost: concreteProduct?.cost ?? 7.50,
        markup: DEFAULT_MARKUP,
        tier: concreteProduct?.tier ?? 'GOOD',
        category: 'Deck Framing',
        isLabor: false,
        productId: concreteProduct?.id,
      })
    }
  }

  if (pierType === 'diamond' && pierCount > 0) {
    const diamondProduct = products.find(p =>
      p.name.toLowerCase().includes('diamond') &&
      p.name.toLowerCase().includes('pier')
    )
    items.push({
      description: diamondProduct?.name ?? `Diamond Piers × ${pierCount}`,
      quantity: pierCount,
      unit: 'ea',
      cost: diamondProduct?.cost ?? 85.00,
      markup: DEFAULT_MARKUP,
      tier: diamondProduct?.tier ?? 'GOOD',
      category: 'Deck Framing',
      isLabor: false,
      productId: diamondProduct?.id,
    })
  }

  // ── BLOCKING ────────────────────────────────────────────────────────────────
  // Blocking is cut from standard boards (same size as joists).
  // Divide total blocking LF by 8' board length to get board count.
  if (blockingLf > 0) {
    const blockBoardLen = 8   // standard blocking board length
    const qty           = Math.ceil(blockingLf / blockBoardLen)
    const product       = findLumber(products, joistSize, blockBoardLen, 'blocking')
    items.push({
      description: product?.name ?? `Blocking (${joistSize}×${blockBoardLen}')`,
      quantity: qty,
      unit: 'ea',
      cost: product?.cost ?? (blockBoardLen * 1.50),
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Deck Framing',
      isLabor: false,
      productId: product?.id,
    })
  }

  // Carpentry labor — hourly (Lead Carpenter $57.50/hr, Carpenter $25.00/hr)
  const LEAD_RATE   = 57.50
  const CARP_RATE   = 25.00
  const leadHrs     = num(measurements.leadCarpenterHours)
  const carpHrs     = num(measurements.carpenterHours)

  if (leadHrs > 0) {
    items.push({
      description: 'Lead Carpenter',
      quantity: leadHrs,
      unit: 'hr',
      cost: LEAD_RATE,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Deck Framing',
      isLabor: true,
    })
  }
  if (carpHrs > 0) {
    items.push({
      description: 'Carpenter',
      quantity: carpHrs,
      unit: 'hr',
      cost: CARP_RATE,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Deck Framing',
      isLabor: true,
    })
  }

  return items
}

// ---------------------------------------------------------------------------
// Deck Framing Accessories Assembly
// ---------------------------------------------------------------------------
export function calculateDeckFramingAccessoriesAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const items: AssemblyItem[] = []

  const joistHangers    = num(measurements.joistHangers)
  const postAnchors     = num(measurements.postAnchors)
  const postAnchorSize  = String(measurements.postAnchorSize ?? '6x6')
  const beamBrackets    = num(measurements.beamBrackets)
  const lagScrews       = num(measurements.lagScrews)
  const structScrews    = num(measurements.structuralScrewsLbs)
  const carrageBolts    = num(measurements.carrageBolts)

  if (joistHangers > 0) {
    const product = findProduct(products, 'joist hanger', 'hanger')
    items.push({
      description: product?.name ?? 'Joist hangers',
      quantity: joistHangers,
      unit: 'ea',
      cost: product?.cost ?? 4.50,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Deck Framing Accessories',
      isLabor: false,
      productId: product?.id,
    })
  }

  if (postAnchors > 0) {
    const product = findProduct(products, `post anchor ${postAnchorSize}`, 'post anchor', postAnchorSize)
    items.push({
      description: product?.name ?? `Post anchors (${postAnchorSize})`,
      quantity: postAnchors,
      unit: 'ea',
      cost: product?.cost ?? (postAnchorSize === '6x6' ? 28 : 18),
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Deck Framing Accessories',
      isLabor: false,
      productId: product?.id,
    })
  }

  if (beamBrackets > 0) {
    const product = findProduct(products, 'beam bracket', 'connector')
    items.push({
      description: product?.name ?? 'Beam brackets',
      quantity: beamBrackets,
      unit: 'ea',
      cost: product?.cost ?? 14,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Deck Framing Accessories',
      isLabor: false,
      productId: product?.id,
    })
  }

  const simpleEntries: [number, string, string[], number, string][] = [
    [lagScrews,    'Lag screws',        ['lag screw', 'lag bolt'],      0.85, 'ea'],
    [structScrews, 'Structural screws', ['structural screw', 'screw'],  22,   'lb'],
    [carrageBolts, 'Carriage bolts',    ['carriage bolt', 'bolt'],      0.65, 'ea'],
  ]

  for (const [qty, desc, keywords, fallbackCost, unit] of simpleEntries) {
    if (qty > 0) {
      const product = findProduct(products, ...keywords)
      items.push({
        description: product?.name ?? desc,
        quantity: qty,
        unit,
        cost: product?.cost ?? fallbackCost,
        markup: DEFAULT_MARKUP,
        tier: product?.tier ?? 'GOOD',
        category: 'Deck Framing Accessories',
        isLabor: false,
        productId: product?.id,
      })
    }
  }

  return items
}

// ---------------------------------------------------------------------------
// Gutter Assembly
// ---------------------------------------------------------------------------
export function calculateGutterAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const linearFt = num(measurements.linearFt)
  const downspouts = num(measurements.downspouts)
  const corners = num(measurements.corners)
  const guards = Boolean(measurements.guards)

  if (linearFt <= 0) return []

  const items: AssemblyItem[] = []

  const gutterProduct = findProduct(products, 'gutter', 'guttering')
  items.push({
    description: gutterProduct?.name ?? 'Gutters',
    quantity: linearFt,
    unit: 'lf',
    cost: gutterProduct?.cost ?? DEFAULT_COSTS.gutter,
    markup: DEFAULT_MARKUP,
    tier: gutterProduct?.tier ?? 'GOOD',
    category: 'Gutters',
    isLabor: false,
    productId: gutterProduct?.id,
  })

  if (downspouts > 0) {
    const downspoutProduct = findProduct(products, 'downspout')
    items.push({
      description: downspoutProduct?.name ?? 'Downspouts',
      quantity: downspouts,
      unit: 'ea',
      cost: downspoutProduct?.cost ?? DEFAULT_COSTS.downspout,
      markup: DEFAULT_MARKUP,
      tier: downspoutProduct?.tier ?? 'GOOD',
      category: 'Gutters',
      isLabor: false,
      productId: downspoutProduct?.id,
    })
  }

  if (corners > 0) {
    const cornerProduct = findProduct(products, 'gutter corner', 'corner')
    items.push({
      description: cornerProduct?.name ?? 'Gutter corners',
      quantity: corners,
      unit: 'ea',
      cost: cornerProduct?.cost ?? DEFAULT_COSTS.gutterCorner,
      markup: DEFAULT_MARKUP,
      tier: cornerProduct?.tier ?? 'GOOD',
      category: 'Gutters',
      isLabor: false,
      productId: cornerProduct?.id,
    })
  }

  if (guards) {
    const guardProduct = findProduct(products, 'gutter guard', 'leaf guard')
    items.push({
      description: guardProduct?.name ?? 'Gutter guards',
      quantity: linearFt,
      unit: 'lf',
      cost: guardProduct?.cost ?? DEFAULT_COSTS.gutterGuard,
      markup: DEFAULT_MARKUP,
      tier: guardProduct?.tier ?? 'GOOD',
      category: 'Gutters',
      isLabor: false,
      productId: guardProduct?.id,
    })
  }

  const laborProduct = findProduct(products, 'gutter labor', 'labor')
  items.push({
    description: laborProduct?.name ?? 'Gutter installation labor',
    quantity: linearFt,
    unit: 'lf',
    cost: laborProduct?.cost ?? DEFAULT_COSTS.gutterLabor,
    markup: DEFAULT_MARKUP,
    tier: laborProduct?.tier ?? 'GOOD',
    category: 'Gutters',
    isLabor: true,
    productId: laborProduct?.id,
  })

  return items
}

// ---------------------------------------------------------------------------
// Wall Assembly — per-board resolution with exact PT / Common Framing products
// ---------------------------------------------------------------------------

function closetWallLf(c: Record<string, unknown>): number {
  // New format: widthFt + widthIn, depthFt + depthIn, openingFt + openingIn
  // Legacy format: width (decimal ft), depth (decimal ft), openingFt (decimal ft)
  const hasNew = 'widthFt' in c
  const w = hasNew
    ? num(c.widthFt) + num(c.widthIn) / 12
    : num(c.width)
  const d = hasNew
    ? num(c.depthFt) + num(c.depthIn) / 12
    : num(c.depth)
  const opening = hasNew
    ? num(c.openingFt) + num(c.openingIn) / 12
    : num(c.openingFt, 3)
  if (w <= 0) return 0
  if (d <= 0) return Math.max(0, w - opening) // open nook
  return Math.max(0, 2 * d + 2 * w - opening)
}

// Round up to nearest standard wall framing lumber length (max 16')
const STD_WALL_LENGTHS = [8, 10, 12, 14, 16]
function nextWallFrameLen(lf: number): number {
  return STD_WALL_LENGTHS.find((l) => l >= lf) ?? 16
}

// How many standard boards are needed to cover a plate run of `lf` feet.
// For runs ≤ 16' → 1 board of nextWallFrameLen(lf).
// For longer runs → ceil(lf / 16) boards of 16' (longest standard stock).
function plateBoards(lf: number): { len: number; count: number } {
  if (lf <= 16) return { len: nextWallFrameLen(lf), count: 1 }
  return { len: 16, count: Math.ceil(lf / 16) }
}

// Header beam depth (in) based on clear span in total inches
function headerDepth(widthTotalIn: number): number {
  if (widthTotalIn <= 36) return 6   // ≤ 3'-0"
  if (widthTotalIn <= 60) return 8   // ≤ 5'-0"
  if (widthTotalIn <= 84) return 10  // ≤ 7'-0"
  return 12
}

export function calculateWallAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const wallsArr = measurements.walls
  const closetsArr = measurements.closets

  const studSize   = String(measurements.studSize ?? '2x4')
  const studSpacing = num(measurements.studSpacing, 16)
  const corners    = num(measurements.corners)
  const is2x6      = studSize === '2x6'
  const [dim1, dim2] = studSize.split('x') // e.g. "2", "4"

  // Product name helpers
  function cfName(len: number)  { return `${dim1}"x${dim2}"x${len}' Common Framing` }
  function ptName(len: number)  { return `${dim1}"x${dim2}"x${len}' PT Green` }
  function hdrName(depth: number, len: number) { return `2"x${depth}"x${len}' Common Framing` }

  // Count doors + windows from arrays (new format) or legacy scalars
  const doorsArr   = Array.isArray(measurements.doors)   ? measurements.doors   : []
  const windowsArr = Array.isArray(measurements.windows) ? measurements.windows : []
  const totalDoors   = doorsArr.reduce((s: number, d: unknown) => s + num((d as {count?:unknown}).count, 1), 0)
    || num(measurements.doorOpenings)
  const totalWindows = windowsArr.reduce((s: number, w: unknown) => s + num((w as {count?:unknown}).count, 1), 0)
    || num(measurements.windowOpenings)

  // Accumulators: boardLen → qty
  const studAcc = new Map<number, number>()     // stud board length → count
  const bpAcc   = new Map<number, number>()     // bottom plate board length → boards
  const tpAcc   = new Map<number, number>()     // top plate board length → boards
  // Header: beam depth (in) → count (each count = 2 boards, doubled header)
  const hdrAcc  = new Map<number, number>()

  let totalStuds = 0
  let totalLf    = 0
  let hasWalls   = false

  // ── Process a single wall run (lf, height) ────────────────────────────────
  function processRun(lf: number, ht: number) {
    if (lf <= 0) return
    hasWalls = true
    totalLf += lf

    const { len: bpLen, count: bpCount } = plateBoards(lf)
    const { len: tpLen, count: tpCount } = plateBoards(lf)
    const studLen   = nextStdLen(ht)
    const wallStuds = Math.ceil((lf * 12) / studSpacing) + 1

    bpAcc.set(bpLen, (bpAcc.get(bpLen) ?? 0) + bpCount)          // bottom plate boards
    tpAcc.set(tpLen, (tpAcc.get(tpLen) ?? 0) + tpCount * 2)      // top plate boards (double)
    studAcc.set(studLen, (studAcc.get(studLen) ?? 0) + wallStuds)
    totalStuds += wallStuds
  }

  // ── Main wall sections ────────────────────────────────────────────────────
  if (Array.isArray(wallsArr)) {
    for (const w of wallsArr) {
      const wall = w as { length?: unknown; height?: unknown }
      processRun(num(wall.length), num(wall.height, 8))
    }
  }

  // ── Closets (break into back wall + side walls) ───────────────────────────
  if (Array.isArray(closetsArr)) {
    for (const c of closetsArr) {
      const closet = c as Record<string, unknown>
      const hasNew = 'widthFt' in closet
      const w  = hasNew ? num(closet.widthFt) + num(closet.widthIn) / 12 : num(closet.width)
      const d  = hasNew ? num(closet.depthFt) + num(closet.depthIn) / 12 : num(closet.depth)
      const ht = hasNew
        ? num(closet.heightFt, 8) + num(closet.heightIn) / 12
        : num(closet.height, 8)
      const opening = hasNew
        ? num(closet.openingFt) + num(closet.openingIn) / 12
        : num(closet.openingFt, 3)

      if (w <= 0) continue

      if (d > 0) {
        // Full closet: back wall + 2 side walls + front stub (from scrap)
        processRun(w, ht)       // back wall
        processRun(d, ht)       // left side
        processRun(d, ht)       // right side
        // Front stubs beside opening
        const stubLf = w - opening
        if (stubLf > 0) {
          const { len: sLen, count: sCount } = plateBoards(stubLf)
          bpAcc.set(sLen, (bpAcc.get(sLen) ?? 0) + sCount)
          tpAcc.set(sLen, (tpAcc.get(sLen) ?? 0) + sCount * 2)
          totalLf += stubLf
          hasWalls = true
        }
        // 4 extra corner studs per closet
        const stdH = nextStdLen(ht)
        studAcc.set(stdH, (studAcc.get(stdH) ?? 0) + 4)
        totalStuds += 4
      } else {
        // Open nook: just aggregate plate run
        processRun(closetWallLf(closet), ht)
      }
    }
  }

  if (!hasWalls) return []

  // ── Jack studs for door/window openings ───────────────────────────────────
  const jackStudLen = nextStdLen(8) // 8' boards for jacks/trimmers
  const jackStuds   = (totalDoors + totalWindows) * 2
  if (jackStuds > 0) {
    studAcc.set(jackStudLen, (studAcc.get(jackStudLen) ?? 0) + jackStuds)
    totalStuds += jackStuds
  }

  // ── Corner extra studs ────────────────────────────────────────────────────
  if (corners > 0) {
    studAcc.set(jackStudLen, (studAcc.get(jackStudLen) ?? 0) + corners * 2)
    totalStuds += corners * 2
  }

  // ── Headers sized by opening width (ft + in format) ──────────────────────
  for (const d of doorsArr) {
    const door = d as { widthFt?: unknown; widthIn?: unknown; count?: unknown }
    const wIn  = num(door.widthFt) * 12 + num(door.widthIn)  // total inches
    const cnt  = num(door.count, 1)
    if (wIn <= 0) continue
    const depth = headerDepth(wIn)
    hdrAcc.set(depth, (hdrAcc.get(depth) ?? 0) + cnt)
  }
  for (const w of windowsArr) {
    const win  = w as { widthFt?: unknown; widthIn?: unknown; count?: unknown }
    const wIn  = num(win.widthFt) * 12 + num(win.widthIn)    // total inches
    const cnt  = num(win.count, 1)
    if (wIn <= 0) continue
    const depth = headerDepth(wIn)
    hdrAcc.set(depth, (hdrAcc.get(depth) ?? 0) + cnt)
  }
  // Fallback: if no dimension data, use legacy count with 2×12 headers
  if (hdrAcc.size === 0 && (totalDoors + totalWindows) > 0) {
    hdrAcc.set(12, totalDoors + totalWindows)
  }

  // ── Build line items ──────────────────────────────────────────────────────
  const items: AssemblyItem[] = []

  // 1. Studs — one line per board length
  for (const [len, qty] of Array.from(studAcc.entries()).sort(([a], [b]) => a - b)) {
    if (qty <= 0) continue
    const pn      = cfName(len)
    const product = findProduct(products, pn)
    items.push({
      description: product?.name ?? `${studSize} × ${len}' studs (${studSpacing}" OC)`,
      quantity: qty,
      unit: 'ea',
      cost: product?.cost ?? (is2x6 ? (len * 0.75) : (len * 0.52)),
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Wall Assembly',
      isLabor: false,
      productId: product?.id,
    })
  }

  // 2. Bottom plates — PT Green, one line per board length
  for (const [len, qty] of Array.from(bpAcc.entries()).sort(([a], [b]) => a - b)) {
    if (qty <= 0) continue
    const pn      = ptName(len)
    const product = findProduct(products, pn)
    items.push({
      description: product?.name ?? `${studSize} × ${len}' bottom plate (PT Green)`,
      quantity: qty,
      unit: 'ea',
      cost: product?.cost ?? (is2x6 ? (len * 0.72) : (len * 0.58)),
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Wall Assembly',
      isLabor: false,
      productId: product?.id,
    })
  }

  // 3. Top plates — Common Framing, doubled (2 boards per wall run), one line per length
  for (const [len, qty] of Array.from(tpAcc.entries()).sort(([a], [b]) => a - b)) {
    if (qty <= 0) continue
    const pn      = cfName(len)
    const product = findProduct(products, pn)
    items.push({
      description: product?.name ?? `${studSize} × ${len}' top plate (double) — ${qty} boards`,
      quantity: qty,
      unit: 'ea',
      cost: product?.cost ?? (is2x6 ? (len * 0.75) : (len * 0.52)),
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Wall Assembly',
      isLabor: false,
      productId: product?.id,
    })
  }

  // 4. Headers — one line per beam depth, 2 boards per opening (doubled)
  for (const [depth, openingCount] of Array.from(hdrAcc.entries()).sort(([a], [b]) => a - b)) {
    if (openingCount <= 0) continue
    const hdrBoardLen = depth <= 6 ? 8 : 10
    const pn          = hdrName(depth, hdrBoardLen)
    const product     = findProduct(products, pn)
    const boardCount  = openingCount * 2 // doubled header = 2 boards per opening
    items.push({
      description: product?.name ?? `2×${depth} headers — ${openingCount} opening${openingCount !== 1 ? 's' : ''} (${boardCount} boards)`,
      quantity: boardCount,
      unit: 'ea',
      cost: product?.cost ?? (depth * hdrBoardLen * 0.55),
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Wall Assembly',
      isLabor: false,
      productId: product?.id,
    })
  }

  // 5. Framing nails
  const nailProduct = findProduct(products, 'framing nail', 'paslode', 'framing nails')
  items.push({
    description: nailProduct?.name ?? 'Framing nails',
    quantity: ceil(totalStuds / 250),
    unit: 'box',
    cost: nailProduct?.cost ?? 65,
    markup: DEFAULT_MARKUP,
    tier: nailProduct?.tier ?? 'GOOD',
    category: 'Wall Assembly',
    isLabor: false,
    productId: nailProduct?.id,
  })

  // 6. Labor — ~1 hr per 40 lf
  const laborProduct = findProduct(products, 'framing labor', 'wall framing', 'carpentry labor')
  items.push({
    description: laborProduct?.name ?? 'Wall framing labor',
    quantity: ceil(totalLf / 40),
    unit: 'hr',
    cost: laborProduct?.cost ?? 85,
    markup: DEFAULT_MARKUP,
    tier: laborProduct?.tier ?? 'GOOD',
    category: 'Wall Assembly',
    isLabor: true,
    productId: laborProduct?.id,
  })

  // 7. Red Head Anchors — 1 every 24" of bottom plate LF
  if (measurements.redHeadAnchors) {
    const anchorQty     = Math.ceil(totalLf / 2)  // 1 per 24" = 1 per 2 lf
    const anchorProduct = findProduct(products, 'red head anchor', 'concrete anchor', 'anchor bolt', 'redhead')
    items.push({
      description: anchorProduct?.name ?? 'Red Head Anchors (24" OC)',
      quantity: anchorQty,
      unit: 'ea',
      cost: anchorProduct?.cost ?? 2.50,
      markup: DEFAULT_MARKUP,
      tier: anchorProduct?.tier ?? 'GOOD',
      category: 'Wall Assembly',
      isLabor: false,
      productId: anchorProduct?.id,
    })
  }

  // 8. Stud Shoes — 1 per stud
  if (measurements.studShoes) {
    const shoeProduct = findProduct(products, 'stud shoe', 'stud connector', 'stud shoes')
    items.push({
      description: shoeProduct?.name ?? 'Stud Shoes',
      quantity: totalStuds,
      unit: 'ea',
      cost: shoeProduct?.cost ?? 1.85,
      markup: DEFAULT_MARKUP,
      tier: shoeProduct?.tier ?? 'GOOD',
      category: 'Wall Assembly',
      isLabor: false,
      productId: shoeProduct?.id,
    })
  }

  // 9. Pipe Guards — rep-entered qty
  if (measurements.pipeGuards) {
    const pgQty = num(measurements.pipeGuardsQty)
    if (pgQty > 0) {
      const pgProduct = findProduct(products, 'pipe guard', 'nail plate', 'pipe protection', 'pipe guards')
      items.push({
        description: pgProduct?.name ?? 'Pipe Guards / Nail Plates',
        quantity: pgQty,
        unit: 'ea',
        cost: pgProduct?.cost ?? 1.25,
        markup: DEFAULT_MARKUP,
        tier: pgProduct?.tier ?? 'GOOD',
        category: 'Wall Assembly',
        isLabor: false,
        productId: pgProduct?.id,
      })
    }
  }

  return items
}

// ---------------------------------------------------------------------------
// Windows & Doors Assembly
// ---------------------------------------------------------------------------
export function calculateWindowsDoorAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const doors = measurements.doors
  const windows = measurements.windows

  const items: AssemblyItem[] = []

  // ── Doors ──
  if (Array.isArray(doors) && doors.length > 0) {
    let intDoors = 0
    let extDoors = 0

    for (const d of doors) {
      const door = d as {
        widthFt?: unknown; widthIn?: unknown; heightFt?: unknown; heightIn?: unknown;
        count?: unknown; type?: unknown; style?: unknown
      }
      const count = num(door.count, 1)
      const isExt = String(door.type ?? 'interior') === 'exterior'

      if (isExt) extDoors += count; else intDoors += count
    }

    if (intDoors > 0) {
      const product = findProduct(products, 'interior door', 'prehung', 'door')
      items.push({
        description: product?.name ?? 'Interior doors',
        quantity: intDoors,
        unit: 'ea',
        cost: product?.cost ?? 185,
        markup: DEFAULT_MARKUP,
        tier: product?.tier ?? 'GOOD',
        category: 'Interior Doors',
        isLabor: false,
        productId: product?.id,
      })
      const laborProduct = findProduct(products, 'door installation', 'door labor', 'hanging door')
      items.push({
        description: laborProduct?.name ?? 'Interior door installation labor',
        quantity: ceil(intDoors * 1.5),
        unit: 'hr',
        cost: laborProduct?.cost ?? 75,
        markup: DEFAULT_MARKUP,
        tier: laborProduct?.tier ?? 'GOOD',
        category: 'Interior Doors',
        isLabor: true,
        productId: laborProduct?.id,
      })
    }

    if (extDoors > 0) {
      const product = findProduct(products, 'exterior door', 'entry door', 'fiberglass door', 'steel door')
      items.push({
        description: product?.name ?? 'Exterior doors',
        quantity: extDoors,
        unit: 'ea',
        cost: product?.cost ?? 450,
        markup: DEFAULT_MARKUP,
        tier: product?.tier ?? 'GOOD',
        category: 'Exterior Door',
        isLabor: false,
        productId: product?.id,
      })
      const laborProduct = findProduct(products, 'door installation', 'door labor', 'exterior door install')
      items.push({
        description: laborProduct?.name ?? 'Exterior door installation labor',
        quantity: ceil(extDoors * 2.5),
        unit: 'hr',
        cost: laborProduct?.cost ?? 85,
        markup: DEFAULT_MARKUP,
        tier: laborProduct?.tier ?? 'GOOD',
        category: 'Exterior Door',
        isLabor: true,
        productId: laborProduct?.id,
      })
    }

  }

  // ── Windows ──
  if (Array.isArray(windows) && windows.length > 0) {
    let totalWindows = 0

    for (const w of windows) {
      const win = w as { widthFt?: unknown; widthIn?: unknown; heightFt?: unknown; heightIn?: unknown; count?: unknown }
      const count = num(win.count, 1)
      totalWindows += count
    }

    if (totalWindows > 0) {
      const product = findProduct(products, 'window', 'double hung', 'casement')
      items.push({
        description: product?.name ?? 'Windows',
        quantity: totalWindows,
        unit: 'ea',
        cost: product?.cost ?? 285,
        markup: DEFAULT_MARKUP,
        tier: product?.tier ?? 'GOOD',
        category: 'Windows',
        isLabor: false,
        productId: product?.id,
      })
      const laborProduct = findProduct(products, 'window installation', 'window labor', 'window install')
      items.push({
        description: laborProduct?.name ?? 'Window installation labor',
        quantity: ceil(totalWindows * 2),
        unit: 'hr',
        cost: laborProduct?.cost ?? 80,
        markup: DEFAULT_MARKUP,
        tier: laborProduct?.tier ?? 'GOOD',
        category: 'Windows',
        isLabor: true,
        productId: laborProduct?.id,
      })
    }

  }

  return items
}

// ---------------------------------------------------------------------------
// Flooring Assembly
// ---------------------------------------------------------------------------
export function calculateFlooringAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const rooms = measurements.rooms
  let totalSqf = num(measurements.directSqft)

  if (totalSqf <= 0 && Array.isArray(rooms) && rooms.length > 0) {
    totalSqf = rooms.reduce((sum: number, r: unknown) => {
      const room = r as { length?: unknown; width?: unknown }
      return sum + num(room.length) * num(room.width)
    }, 0)
  }

  if (totalSqf <= 0) return []

  const wastePct = num(measurements.wasteFactor, 10)
  const tMoldingLf = num(measurements.tMoldingLf)
  const stairNoses = num(measurements.stairNoses)
  const thresholds = num(measurements.thresholds)

  const adjustedSqf = ceil(totalSqf * (1 + wastePct / 100))
  const underlaymentRolls = ceil(adjustedSqf / 100)

  const items: AssemblyItem[] = []

  // 1. Flooring material — priced per carton
  const floorProduct = findProduct(products, 'flooring', 'laminate', 'lvp', 'vinyl plank', 'hardwood')

  // Determine sqft-per-carton: manual override → product name parse → fallback 20
  const manualSqftPerCarton = num(measurements.sqftPerCarton)
  const parsedSqftPerCarton = floorProduct ? parseCartonSqft(floorProduct.name) : 0
  const sqftPerCarton = manualSqftPerCarton > 0
    ? manualSqftPerCarton
    : parsedSqftPerCarton > 0
      ? parsedSqftPerCarton
      : 20

  const cartons = ceil(adjustedSqf / sqftPerCarton)
  const cartonDesc = `Flooring material (${sqftPerCarton} sqf/carton)`

  items.push({
    description: floorProduct?.name ?? cartonDesc,
    quantity: cartons,
    unit: 'carton',
    cost: floorProduct?.cost ?? (2.50 * sqftPerCarton),
    markup: DEFAULT_MARKUP,
    tier: floorProduct?.tier ?? 'GOOD',
    category: 'Flooring',
    isLabor: false,
    productId: floorProduct?.id,
  })

  // 2. Underlayment — 1 roll per 100 sqf
  const underlayProduct = findProduct(products, 'underlayment', 'floor underlayment', 'foam underlayment')
  items.push({
    description: underlayProduct?.name ?? 'Underlayment',
    quantity: underlaymentRolls,
    unit: 'roll',
    cost: underlayProduct?.cost ?? 28,
    markup: DEFAULT_MARKUP,
    tier: underlayProduct?.tier ?? 'GOOD',
    category: 'Flooring',
    isLabor: false,
    productId: underlayProduct?.id,
  })

  // 3. T-Molding
  if (tMoldingLf > 0) {
    const tProduct = findProduct(products, 't-molding', 't molding', 'transition strip')
    items.push({
      description: tProduct?.name ?? 'T-Molding transitions',
      quantity: tMoldingLf,
      unit: 'lf',
      cost: tProduct?.cost ?? 4.50,
      markup: DEFAULT_MARKUP,
      tier: tProduct?.tier ?? 'GOOD',
      category: 'Flooring',
      isLabor: false,
      productId: tProduct?.id,
    })
  }

  // 4. Stair noses
  if (stairNoses > 0) {
    const stairProduct = findProduct(products, 'stair nose', 'stair noses', 'stairnose')
    items.push({
      description: stairProduct?.name ?? 'Stair noses',
      quantity: stairNoses,
      unit: 'ea',
      cost: stairProduct?.cost ?? 35,
      markup: DEFAULT_MARKUP,
      tier: stairProduct?.tier ?? 'GOOD',
      category: 'Flooring',
      isLabor: false,
      productId: stairProduct?.id,
    })
  }

  // 5. Thresholds / reducers
  if (thresholds > 0) {
    const threshProduct = findProduct(products, 'threshold', 'reducer', 'floor reducer')
    items.push({
      description: threshProduct?.name ?? 'Thresholds / reducers',
      quantity: thresholds,
      unit: 'ea',
      cost: threshProduct?.cost ?? 28,
      markup: DEFAULT_MARKUP,
      tier: threshProduct?.tier ?? 'GOOD',
      category: 'Flooring',
      isLabor: false,
      productId: threshProduct?.id,
    })
  }

  // 6. Installation labor
  const laborProduct = findProduct(products, 'flooring labor', 'floor installation', 'flooring install')
  items.push({
    description: laborProduct?.name ?? 'Flooring installation labor',
    quantity: adjustedSqf,
    unit: 'sqf',
    cost: laborProduct?.cost ?? 1.75,
    markup: DEFAULT_MARKUP,
    tier: laborProduct?.tier ?? 'GOOD',
    category: 'Flooring',
    isLabor: true,
    productId: laborProduct?.id,
  })

  return items
}

// ---------------------------------------------------------------------------
// Tile Assembly
// ---------------------------------------------------------------------------
export function calculateTileAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const areas = measurements.areas
  let totalSqf = 0

  if (Array.isArray(areas) && areas.length > 0) {
    totalSqf = areas.reduce((sum: number, a: unknown) => {
      const area = a as { length?: unknown; width?: unknown }
      return sum + num(area.length) * num(area.width)
    }, 0)
  }

  if (totalSqf <= 0) return []

  const wastePct = num(measurements.wasteFactor, 15)
  const groutJoints = String(measurements.groutJoints ?? 'medium')
  const includesBackerBoard = Boolean(measurements.includesBackerBoard)

  const adjustedSqf = ceil(totalSqf * (1 + wastePct / 100))
  const thinsetBags = ceil(adjustedSqf / 50)
  const groutCoverage = groutJoints === 'narrow' ? 80 : groutJoints === 'wide' ? 35 : 50
  const groutBags = ceil(adjustedSqf / groutCoverage)

  const items: AssemblyItem[] = []

  // 1. Tile material
  const tileProduct = findProduct(products, 'tile', 'ceramic', 'porcelain')
  items.push({
    description: tileProduct?.name ?? 'Tile material',
    quantity: adjustedSqf,
    unit: 'sqf',
    cost: tileProduct?.cost ?? 3.50,
    markup: DEFAULT_MARKUP,
    tier: tileProduct?.tier ?? 'GOOD',
    category: 'Tile',
    isLabor: false,
    productId: tileProduct?.id,
  })

  // 2. Thinset mortar
  const thinsetProduct = findProduct(products, 'thinset', 'thin-set', 'mortar', 'tile mortar')
  items.push({
    description: thinsetProduct?.name ?? 'Thinset mortar',
    quantity: thinsetBags,
    unit: 'bag',
    cost: thinsetProduct?.cost ?? 22,
    markup: DEFAULT_MARKUP,
    tier: thinsetProduct?.tier ?? 'GOOD',
    category: 'Tile',
    isLabor: false,
    productId: thinsetProduct?.id,
  })

  // 3. Grout
  const groutProduct = findProduct(products, 'grout', 'tile grout', 'unsanded grout', 'sanded grout')
  items.push({
    description: groutProduct?.name ?? `Grout (${groutJoints} joints)`,
    quantity: groutBags,
    unit: 'bag',
    cost: groutProduct?.cost ?? 18,
    markup: DEFAULT_MARKUP,
    tier: groutProduct?.tier ?? 'GOOD',
    category: 'Tile',
    isLabor: false,
    productId: groutProduct?.id,
  })

  // 4. Backer board
  if (includesBackerBoard) {
    const backerProduct = findProduct(products, 'backer board', 'cement board', 'hardiebacker', 'durock', 'wonderboard')
    items.push({
      description: backerProduct?.name ?? 'Cement backer board',
      quantity: adjustedSqf,
      unit: 'sqf',
      cost: backerProduct?.cost ?? 0.85,
      markup: DEFAULT_MARKUP,
      tier: backerProduct?.tier ?? 'GOOD',
      category: 'Tile',
      isLabor: false,
      productId: backerProduct?.id,
    })
  }

  // 5. Tile installation labor
  const laborProduct = findProduct(products, 'tile labor', 'tile installation', 'tile setter', 'tile install')
  items.push({
    description: laborProduct?.name ?? 'Tile installation labor',
    quantity: adjustedSqf,
    unit: 'sqf',
    cost: laborProduct?.cost ?? 5.00,
    markup: DEFAULT_MARKUP,
    tier: laborProduct?.tier ?? 'GOOD',
    category: 'Tile',
    isLabor: true,
    productId: laborProduct?.id,
  })

  return items
}

// ---------------------------------------------------------------------------
// Bathroom Assembly
// ---------------------------------------------------------------------------
export function calculateBathroomAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const vanities  = num(measurements.vanities)
  const toilets   = num(measurements.toilets)
  const showers   = num(measurements.showers)
  const mirrors   = num(measurements.mirrors)
  const towelBars = num(measurements.towelBars)
  const tpHolders = num(measurements.tpHolders)
  const faucets   = num(measurements.faucets)

  const items: AssemblyItem[] = []

  if (vanities > 0) {
    const product = findProduct(products, 'vanity')
    items.push({
      description: product?.name ?? 'Vanity installation',
      quantity: vanities,
      unit: 'ea',
      cost: product?.cost ?? 180,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Bathroom',
      isLabor: false,
      productId: product?.id,
    })
  }

  if (toilets > 0) {
    const product = findProduct(products, 'toilet')
    items.push({
      description: product?.name ?? 'Toilet installation',
      quantity: toilets,
      unit: 'ea',
      cost: product?.cost ?? 320,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Bathroom',
      isLabor: false,
      productId: product?.id,
    })
  }

  if (showers > 0) {
    const product = findProduct(products, 'shower', 'tub', 'shower unit')
    items.push({
      description: product?.name ?? 'Shower / tub installation',
      quantity: showers,
      unit: 'ea',
      cost: product?.cost ?? 450,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Bathroom',
      isLabor: false,
      productId: product?.id,
    })
  }

  if (faucets > 0) {
    const product = findProduct(products, 'faucet', 'bathroom faucet')
    items.push({
      description: product?.name ?? 'Faucet installation',
      quantity: faucets,
      unit: 'ea',
      cost: product?.cost ?? 95,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Bathroom',
      isLabor: false,
      productId: product?.id,
    })
  }

  if (mirrors > 0) {
    const product = findProduct(products, 'mirror', 'bathroom mirror')
    items.push({
      description: product?.name ?? 'Mirror installation',
      quantity: mirrors,
      unit: 'ea',
      cost: product?.cost ?? 55,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Bathroom',
      isLabor: false,
      productId: product?.id,
    })
  }

  if (towelBars > 0) {
    const product = findProduct(products, 'towel bar', 'towel ring', 'towel rack')
    items.push({
      description: product?.name ?? 'Towel bars',
      quantity: towelBars,
      unit: 'ea',
      cost: product?.cost ?? 32,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Bathroom',
      isLabor: false,
      productId: product?.id,
    })
  }

  if (tpHolders > 0) {
    const product = findProduct(products, 'toilet paper holder', 'tp holder', 'paper holder')
    items.push({
      description: product?.name ?? 'Toilet paper holders',
      quantity: tpHolders,
      unit: 'ea',
      cost: product?.cost ?? 22,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Bathroom',
      isLabor: false,
      productId: product?.id,
    })
  }

  // Bathroom installation labor — ~2 hr per fixture set
  const fixtureCount = vanities + toilets + showers + faucets
  if (fixtureCount > 0) {
    const laborProduct = findProduct(products, 'bathroom labor', 'plumbing labor', 'bath install')
    items.push({
      description: laborProduct?.name ?? 'Bathroom fixture installation labor',
      quantity: ceil(fixtureCount * 2),
      unit: 'hr',
      cost: laborProduct?.cost ?? 95,
      markup: DEFAULT_MARKUP,
      tier: laborProduct?.tier ?? 'GOOD',
      category: 'Bathroom',
      isLabor: true,
      productId: laborProduct?.id,
    })
  }

  return items
}

// ---------------------------------------------------------------------------
// Insulation Assembly
// ---------------------------------------------------------------------------
// Rules:
//   Wall batts — 2×4 → R-13 kraft-faced (or JM Safe & Fireblock); 2×6 → R-19
//   Attic      — blow-in only (cellulose / fiberglass); ~35 sqft per bag
// ---------------------------------------------------------------------------
export function calculateInsulationAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const items: AssemblyItem[] = []

  const studSize        = String(measurements.studSize ?? '2x4')
  const wallProduct     = String(measurements.wallProduct ?? 'batt')
  const is2x6           = studSize === '2x6'
  const wastePct        = num(measurements.wasteFactor, 10)
  const battSqftPerUnit = num(measurements.battSqftPerUnit, 40) || 40  // sqft per bunk/roll

  // ── Wall batts ─────────────────────────────────────────────────────────────
  const wallSections = Array.isArray(measurements.wallSections) ? measurements.wallSections : []
  const wallNetSqft  = wallSections.reduce((s: number, w: unknown) => {
    const ws = w as { length?: unknown; height?: unknown }
    return s + num(ws.length) * num(ws.height)
  }, 0)

  if (wallNetSqft > 0) {
    const wallSqftWithWaste = Math.ceil(wallNetSqft * (1 + wastePct / 100))

    if (is2x6) {
      // R-19 kraft-faced batt — priced per bunk/roll
      const bunks = Math.ceil(wallSqftWithWaste / battSqftPerUnit)
      const product = findProduct(products, 'R-19', 'r19', 'kraft', '2x6 insulation', 'r-19')
      items.push({
        description: product?.name ?? 'R-19 Kraft-Faced Batt insulation',
        quantity: bunks,
        unit: 'bunk',
        cost: product?.cost ?? 0.72 * battSqftPerUnit,
        markup: DEFAULT_MARKUP,
        tier: product?.tier ?? 'GOOD',
        category: 'Insulation',
        isLabor: false,
        productId: product?.id,
      })
    } else if (wallProduct === 'fireblock') {
      // JM Safe & Sound / Fireblock — sold by bag (covers ~40 sqft)
      const bags = Math.ceil(wallSqftWithWaste / 40)
      const product = findProduct(products, 'JM safe', 'fireblock', 'safe sound', 'fire block', 'safe & sound')
      items.push({
        description: product?.name ?? 'JM Safe & Sound / Fireblock insulation',
        quantity: bags,
        unit: 'bag',
        cost: product?.cost ?? 42,
        markup: DEFAULT_MARKUP,
        tier: product?.tier ?? 'GOOD',
        category: 'Insulation',
        isLabor: false,
        productId: product?.id,
      })
    } else {
      // R-13 kraft-faced batt (standard 2×4) — priced per bunk/roll
      const bunks = Math.ceil(wallSqftWithWaste / battSqftPerUnit)
      const product = findProduct(products, 'R-13', 'r13', 'kraft', '2x4 insulation', 'r-13')
      items.push({
        description: product?.name ?? 'R-13 Kraft-Faced Batt insulation',
        quantity: bunks,
        unit: 'bunk',
        cost: product?.cost ?? 0.52 * battSqftPerUnit,
        markup: DEFAULT_MARKUP,
        tier: product?.tier ?? 'GOOD',
        category: 'Insulation',
        isLabor: false,
        productId: product?.id,
      })
    }

    // Installation labor — ~1 hr per 200 sqft of batt
    const wallLaborProduct = findProduct(products, 'insulation labor', 'batt install', 'insulation install')
    items.push({
      description: wallLaborProduct?.name ?? 'Batt insulation installation labor',
      quantity: Math.ceil(wallNetSqft / 200),
      unit: 'hr',
      cost: wallLaborProduct?.cost ?? 55,
      markup: DEFAULT_MARKUP,
      tier: wallLaborProduct?.tier ?? 'GOOD',
      category: 'Insulation',
      isLabor: true,
      productId: wallLaborProduct?.id,
    })
  }

  // ── Attic blow-in ──────────────────────────────────────────────────────────
  const blowInType    = String(measurements.blowInType ?? 'cellulose').toLowerCase()
  const isFiberglass  = blowInType === 'fiberglass'
  const SQFT_PER_BAG  = isFiberglass ? 106 : 40   // EcoFill WX label vs Insulmax cellulose

  const atticSections = Array.isArray(measurements.atticSections) ? measurements.atticSections : []
  const atticSqft     = atticSections.reduce((s: number, a: unknown) => {
    const as_ = a as { length?: unknown; width?: unknown }
    return s + num(as_.length) * num(as_.width)
  }, 0)

  if (atticSqft > 0) {
    const manualBags = num(measurements.blowInBags)
    const blowInBags = manualBags > 0 ? manualBags : Math.ceil(atticSqft / SQFT_PER_BAG)

    const bagProduct = isFiberglass
      ? findProduct(products, 'ecofill', 'fiberglass blow', 'blow-in fiberglass', 'fiberglass insulation bag')
      : findProduct(products, 'insulmax', 'cellulose', 'blow-in cellulose', 'cellulose blow', 'blow-in', 'blown in', 'attic insulation')
    items.push({
      description: bagProduct?.name ?? (isFiberglass ? 'Fiberglass blow-in insulation' : 'Cellulose blow-in insulation'),
      quantity: blowInBags,
      unit: 'bag',
      cost: bagProduct?.cost ?? 28,
      markup: DEFAULT_MARKUP,
      tier: bagProduct?.tier ?? 'GOOD',
      category: 'Insulation',
      isLabor: false,
      productId: bagProduct?.id,
    })

    // Attic labor — ~1 hr per 500 sqft
    const atticLaborProduct = findProduct(products, 'blow-in labor', 'attic insulation labor', 'insulation labor')
    items.push({
      description: atticLaborProduct?.name ?? 'Blow-in insulation labor',
      quantity: Math.ceil(atticSqft / 500),
      unit: 'hr',
      cost: atticLaborProduct?.cost ?? 65,
      markup: DEFAULT_MARKUP,
      tier: atticLaborProduct?.tier ?? 'GOOD',
      category: 'Insulation',
      isLabor: true,
      productId: atticLaborProduct?.id,
    })
  }

  return items
}

// ---------------------------------------------------------------------------
// Insulation Accessories Assembly
// ---------------------------------------------------------------------------
// • Support wire — 1 every 24" along joist run, per ceiling section (16" OC)
// • Equipment rental — blow-in blower machine, priced per day
// ---------------------------------------------------------------------------
export function calculateInsulationAccessoriesAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const items: AssemblyItem[] = []

  // ── Ceiling support wire ────────────────────────────────────────────────
  const ceilingSections = Array.isArray(measurements.ceilingSections) ? measurements.ceilingSections : []

  let totalWires = 0
  for (const s of ceilingSections) {
    const sec     = s as { length?: unknown; width?: unknown }
    const length  = num(sec.length)   // ft along joists
    const width   = num(sec.width)    // ft across joists
    if (length <= 0 || width <= 0) continue
    const wiresPerBay = Math.ceil(length / 2)              // one wire every 24" (2 ft)
    const numBays     = Math.ceil(width / (16 / 12))       // 16" OC joists → bay every 1.33 ft
    totalWires += wiresPerBay * numBays
  }

  if (totalWires > 0) {
    const wireProduct = findProduct(products, 'insulation support wire', 'support wire', 'ceiling wire', 'insul wire')
    items.push({
      description: wireProduct?.name ?? 'Ceiling insulation support wire (24" OC)',
      quantity: totalWires,
      unit: 'ea',
      cost: wireProduct?.cost ?? 0.45,
      markup: DEFAULT_MARKUP,
      tier: wireProduct?.tier ?? 'GOOD',
      category: 'Insulation Accessories',
      isLabor: false,
      productId: wireProduct?.id,
    })
  }

  // ── Blow-in equipment rental ─────────────────────────────────────────────
  if (measurements.hasBlowIn) {
    const days          = Math.max(1, num(measurements.rentalDays, 1))
    const rentalProduct = findProduct(products, 'blower rental', 'blow-in rental', 'equipment rental', 'insulation blower')
    items.push({
      description: rentalProduct?.name ?? 'Blow-in blower machine rental',
      quantity: days,
      unit: 'day',
      cost: rentalProduct?.cost ?? 95,
      markup: DEFAULT_MARKUP,
      tier: rentalProduct?.tier ?? 'GOOD',
      category: 'Insulation Accessories',
      isLabor: false,
      productId: rentalProduct?.id,
    })
  }

  return items
}

// ---------------------------------------------------------------------------
// Drywall Assembly
// ---------------------------------------------------------------------------
// Sheets sized by selection (4×8 = 32 sqft, 4×12 = 48 sqft) + waste factor
// Consumables: joint compound (1 bucket/200 sqft), screws (1 box/300 sqft),
//              paper tape (1 roll/500 sqft)
// Labor: hang ~1 hr/100 sqft + finish/mud ~1 hr/75 sqft
// ---------------------------------------------------------------------------
export function calculateDrywallAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const items: AssemblyItem[] = []

  const sheetSize       = String(measurements.sheetSize       ?? '4x8')
  const wallThickness   = String(measurements.wallThickness   ?? measurements.thickness ?? '1/2')
  const ceilThickness   = String(measurements.ceilingThickness ?? '5/8')
  const wastePct        = num(measurements.wasteFactor, 10)
  const sheetSqft       = sheetSize === '4x12' ? 48 : 32
  const waste           = 1 + wastePct / 100

  const wallSections = Array.isArray(measurements.wallSections) ? measurements.wallSections : []
  const ceilSections = Array.isArray(measurements.ceilingSections) ? measurements.ceilingSections : []

  const wallSqft = wallSections.reduce((s: number, w: unknown) => {
    const ws = w as { length?: unknown; height?: unknown }
    return s + num(ws.length) * num(ws.height)
  }, 0)
  const ceilSqft = ceilSections.reduce((s: number, c: unknown) => {
    const cs = c as { length?: unknown; width?: unknown }
    return s + num(cs.length) * num(cs.width)
  }, 0)

  const netSqft = wallSqft + ceilSqft
  if (netSqft <= 0) return []

  // 1a. Wall drywall sheets (½" default)
  if (wallSqft > 0) {
    const wallSheets   = Math.ceil(wallSqft * waste / sheetSqft)
    const wallProduct  = findProduct(products, `${sheetSize} drywall`, `${wallThickness} drywall`, 'drywall sheet', 'gypsum board')
    items.push({
      description: wallProduct?.name ?? `${sheetSize} × ${wallThickness}" drywall — walls`,
      quantity: wallSheets,
      unit: 'ea',
      cost: wallProduct?.cost ?? (sheetSize === '4x12' ? 18 : 13),
      markup: DEFAULT_MARKUP,
      tier: wallProduct?.tier ?? 'GOOD',
      category: 'Drywall',
      isLabor: false,
      productId: wallProduct?.id,
    })
  }

  // 1b. Ceiling drywall sheets (⅝" default)
  if (ceilSqft > 0) {
    const ceilSheets   = Math.ceil(ceilSqft * waste / sheetSqft)
    const ceilProduct  = findProduct(products, `${sheetSize} drywall`, `${ceilThickness} drywall`, '5/8 drywall', 'ceiling drywall', 'gypsum board')
    items.push({
      description: ceilProduct?.name ?? `${sheetSize} × ${ceilThickness}" drywall — ceilings`,
      quantity: ceilSheets,
      unit: 'ea',
      cost: ceilProduct?.cost ?? (sheetSize === '4x12' ? 20 : 15),
      markup: DEFAULT_MARKUP,
      tier: ceilProduct?.tier ?? 'GOOD',
      category: 'Drywall',
      isLabor: false,
      productId: ceilProduct?.id,
    })
  }

  // 2. Joint compound — 1 bucket (3.5 gal) per 200 sqft
  const mudBuckets  = Math.ceil(netSqft / 200)
  const mudProduct  = findProduct(products, 'joint compound', 'drywall mud', 'all purpose mud')
  items.push({
    description: mudProduct?.name ?? 'Joint compound (3.5 gal bucket)',
    quantity: mudBuckets,
    unit: 'ea',
    cost: mudProduct?.cost ?? 22,
    markup: DEFAULT_MARKUP,
    tier: mudProduct?.tier ?? 'GOOD',
    category: 'Drywall',
    isLabor: false,
    productId: mudProduct?.id,
  })

  // 3. Drywall screws — 1 box (5 lb) per 300 sqft
  const screwBoxes   = Math.ceil(netSqft / 300)
  const screwProduct = findProduct(products, 'drywall screw', 'drywall screws', 'coarse thread screw')
  items.push({
    description: screwProduct?.name ?? 'Drywall screws (5 lb box)',
    quantity: screwBoxes,
    unit: 'ea',
    cost: screwProduct?.cost ?? 14,
    markup: DEFAULT_MARKUP,
    tier: screwProduct?.tier ?? 'GOOD',
    category: 'Drywall',
    isLabor: false,
    productId: screwProduct?.id,
  })

  // 4. Paper tape — 1 roll (500 ft) per 500 sqft
  const tapeRolls   = Math.ceil(netSqft / 500)
  const tapeProduct = findProduct(products, 'drywall tape', 'paper tape', 'joint tape')
  items.push({
    description: tapeProduct?.name ?? 'Paper tape (500 ft roll)',
    quantity: tapeRolls,
    unit: 'ea',
    cost: tapeProduct?.cost ?? 8,
    markup: DEFAULT_MARKUP,
    tier: tapeProduct?.tier ?? 'GOOD',
    category: 'Drywall',
    isLabor: false,
    productId: tapeProduct?.id,
  })

  // 5. Hang labor — ~1 hr per 100 sqft
  const hangLabor = findProduct(products, 'drywall hang', 'hang labor', 'drywall labor')
  items.push({
    description: hangLabor?.name ?? 'Drywall hanging labor',
    quantity: Math.ceil(netSqft / 100),
    unit: 'hr',
    cost: hangLabor?.cost ?? 65,
    markup: DEFAULT_MARKUP,
    tier: hangLabor?.tier ?? 'GOOD',
    category: 'Drywall',
    isLabor: true,
    productId: hangLabor?.id,
  })

  // 6. Finish / mud labor — ~1 hr per 75 sqft (taping, 3 coats, sand)
  const finishLabor = findProduct(products, 'drywall finish', 'mud labor', 'taping labor', 'finish labor')
  items.push({
    description: finishLabor?.name ?? 'Drywall finishing labor (tape, mud, sand)',
    quantity: Math.ceil(netSqft / 75),
    unit: 'hr',
    cost: finishLabor?.cost ?? 70,
    markup: DEFAULT_MARKUP,
    tier: finishLabor?.tier ?? 'GOOD',
    category: 'Drywall',
    isLabor: true,
    productId: finishLabor?.id,
  })

  return items
}

// ---------------------------------------------------------------------------
// Drywall Accessories Assembly
// ---------------------------------------------------------------------------
// Corner bead (8 ft sticks), J-bead/L-bead (10 ft sticks),
// drywall primer (gal), texture (cans or buckets)
// ---------------------------------------------------------------------------
export function calculateDrywallAccessoriesAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const items: AssemblyItem[] = []

  const cornerBeadLf  = num(measurements.cornerBeadLf)
  const jBeadLf       = num(measurements.jBeadLf)
  const primerSqft    = num(measurements.primerSqft)
  const textureType   = String(measurements.textureType ?? 'none')
  const textureSqft   = num(measurements.textureSqft)

  // 1. Corner bead — 8 ft sticks
  if (cornerBeadLf > 0) {
    const sticks  = Math.ceil(cornerBeadLf / 8)
    const product = findProduct(products, 'corner bead', 'metal corner', 'vinyl corner bead')
    items.push({
      description: product?.name ?? 'Corner bead (8 ft sticks)',
      quantity: sticks,
      unit: 'ea',
      cost: product?.cost ?? 3.25,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Drywall Accessories',
      isLabor: false,
      productId: product?.id,
    })
  }

  // 2. J-bead / L-bead — 10 ft sticks
  if (jBeadLf > 0) {
    const sticks  = Math.ceil(jBeadLf / 10)
    const product = findProduct(products, 'j bead', 'j-bead', 'l bead', 'l-bead', 'edge bead')
    items.push({
      description: product?.name ?? 'J-Bead / L-Bead (10 ft sticks)',
      quantity: sticks,
      unit: 'ea',
      cost: product?.cost ?? 4.50,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Drywall Accessories',
      isLabor: false,
      productId: product?.id,
    })
  }

  // 3. Drywall primer — 1 gal per 375 sqft
  if (primerSqft > 0) {
    const gallons = Math.ceil(primerSqft / 375)
    const product = findProduct(products, 'drywall primer', 'pva primer', 'wall primer', 'primer sealer')
    items.push({
      description: product?.name ?? 'Drywall primer / PVA sealer',
      quantity: gallons,
      unit: 'gal',
      cost: product?.cost ?? 28,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Drywall Accessories',
      isLabor: false,
      productId: product?.id,
    })
  }

  // 4. Texture
  if (textureType !== 'none' && textureSqft > 0) {
    if (textureType === 'orange-peel' || textureType === 'knockdown') {
      const cans    = Math.ceil(textureSqft / 50)  // spray can ≈ 50 sqft
      const product = findProduct(products, `${textureType} texture`, 'texture spray', 'spray texture', 'homax')
      items.push({
        description: product?.name ?? `${textureType === 'orange-peel' ? 'Orange Peel' : 'Knockdown'} texture (spray can)`,
        quantity: cans,
        unit: 'ea',
        cost: product?.cost ?? 18,
        markup: DEFAULT_MARKUP,
        tier: product?.tier ?? 'GOOD',
        category: 'Drywall Accessories',
        isLabor: false,
        productId: product?.id,
      })
    } else if (textureType === 'smooth') {
      const buckets = Math.ceil(textureSqft / 200) // compound bucket ≈ 200 sqft
      const product = findProduct(products, 'topping compound', 'finish coat', 'lightweight compound', 'smooth finish')
      items.push({
        description: product?.name ?? 'Topping compound for smooth finish',
        quantity: buckets,
        unit: 'ea',
        cost: product?.cost ?? 24,
        markup: DEFAULT_MARKUP,
        tier: product?.tier ?? 'GOOD',
        category: 'Drywall Accessories',
        isLabor: false,
        productId: product?.id,
      })
    }

    // Texture labor — ~1 hr per 150 sqft
    const textureLabor = findProduct(products, 'texture labor', 'drywall texture labor', 'painting labor')
    items.push({
      description: `${textureType === 'orange-peel' ? 'Orange peel' : textureType === 'knockdown' ? 'Knockdown' : 'Smooth'} texture labor`,
      quantity: Math.ceil(textureSqft / 150),
      unit: 'hr',
      cost: textureLabor?.cost ?? 60,
      markup: DEFAULT_MARKUP,
      tier: textureLabor?.tier ?? 'GOOD',
      category: 'Drywall Accessories',
      isLabor: true,
      productId: textureLabor?.id,
    })
  }

  return items
}

// ---------------------------------------------------------------------------
// Interior Trim Assembly
// Inputs: baseLf, doorDeductions, crownLf, doors[], windows[], stickLength, wasteFactor
// ---------------------------------------------------------------------------
export function calculateInteriorTrimAssembly(
  measurements: MeasurementData,
  products: Product[],
): AssemblyItem[] {
  const items: AssemblyItem[] = []

  const baseLf         = num(measurements.baseLf)
  const doorDeductions = num(measurements.doorDeductions)
  const crownLf        = num(measurements.crownLf)
  const stickLength    = num(measurements.stickLength, 8)
  const wasteFactor    = 1 + num(measurements.wasteFactor, 10) / 100

  // Profile keywords — prepended to search so catalog products named e.g. "Colonial Base Molding" match first
  const baseProfile   = String(measurements.baseProfile   ?? '').toLowerCase().trim()
  const casingProfile = String(measurements.casingProfile ?? '').toLowerCase().trim()
  const crownProfile  = String(measurements.crownProfile  ?? '').toLowerCase().trim()

  // Helper: sticks needed from LF
  function sticks(lf: number): number {
    return lf > 0 ? ceil(lf * wasteFactor / stickLength) : 0
  }

  // ── Doors ──────────────────────────────────────────────────────────────────
  type DoorEntry = {
    widthFt?: unknown; widthIn?: unknown;
    heightFt?: unknown; heightIn?: unknown;
    count?: unknown; type?: unknown;
  }
  const doors = Array.isArray(measurements.doors) ? (measurements.doors as DoorEntry[]) : []

  // ── Windows ────────────────────────────────────────────────────────────────
  type WindowEntry = {
    widthFt?: unknown; widthIn?: unknown;
    heightFt?: unknown; heightIn?: unknown;
    count?: unknown;
  }
  const windows = Array.isArray(measurements.windows) ? (measurements.windows as WindowEntry[]) : []

  // Door casing LF per entry: (2h + w) × sides × count
  const totalDoorCasingLf = doors.reduce((sum, d) => {
    const w     = num(d.widthFt)  + num(d.widthIn)  / 12
    const h     = num(d.heightFt) + num(d.heightIn) / 12
    const sides = String(d.type) === 'exterior' ? 1 : 2
    return sum + (2 * h + w) * sides * num(d.count, 1)
  }, 0)

  // Window casing LF per entry: (2h + 2w) × count
  const totalWindowCasingLf = windows.reduce((sum, w) => {
    const wd = num(w.widthFt)  + num(w.widthIn)  / 12
    const ht = num(w.heightFt) + num(w.heightIn) / 12
    return sum + (2 * ht + 2 * wd) * num(w.count, 1)
  }, 0)

  // Net base LF (deduct 3 lf per door opening for base molding)
  const netBaseLf = Math.max(0, baseLf - doorDeductions * 3)

  // Total installed LF (for labor + consumables)
  const totalInstalledLf = netBaseLf + crownLf + totalDoorCasingLf + totalWindowCasingLf

  // 1. Base molding
  const baseStickCount = sticks(netBaseLf)
  if (baseStickCount > 0) {
    const baseKeywords: string[] = baseProfile
      ? [`${baseProfile} base`, `${baseProfile} baseboard`, baseProfile, 'base molding', 'baseboard', 'base trim']
      : ['base molding', 'baseboard', 'base trim']
    const product = findProduct(products, ...baseKeywords)
    const profileLabel = baseProfile ? ` · ${baseProfile.charAt(0).toUpperCase() + baseProfile.slice(1)}` : ''
    items.push({
      description: `Base molding (${stickLength}ft sticks)${profileLabel}`,
      quantity: baseStickCount,
      unit: 'ea',
      cost: product?.cost ?? DEFAULT_COSTS.baseMolding * stickLength,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Interior Trim',
      isLabor: false,
      productId: product?.id,
    })
  }

  // 2. Crown molding
  const crownStickCount = sticks(crownLf)
  if (crownStickCount > 0) {
    const crownKeywords: string[] = crownProfile
      ? [`${crownProfile} crown`, crownProfile, 'crown molding', 'crown trim', 'crown']
      : ['crown molding', 'crown trim', 'crown']
    const product = findProduct(products, ...crownKeywords)
    const profileLabel = crownProfile ? ` · ${crownProfile.charAt(0).toUpperCase() + crownProfile.slice(1)}` : ''
    items.push({
      description: `Crown molding (${stickLength}ft sticks)${profileLabel}`,
      quantity: crownStickCount,
      unit: 'ea',
      cost: product?.cost ?? DEFAULT_COSTS.crownMolding * stickLength,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Interior Trim',
      isLabor: false,
      productId: product?.id,
    })
  }

  // Casing product lookup (shared for door + window)
  const casingKeywords: string[] = casingProfile
    ? [`${casingProfile} casing`, `${casingProfile} door casing`, casingProfile, 'door casing', 'casing trim', 'door trim']
    : ['door casing', 'casing trim', 'door trim']
  const casingProfileLabel = casingProfile
    ? ` · ${casingProfile.charAt(0).toUpperCase() + casingProfile.slice(1)}`
    : ''

  // 3. Door casing (interior — both sides)
  // Treat anything that isn't explicitly "exterior" as interior so that doors with
  // a missing/undefined type (e.g. synced from older saved data) still produce sticks.
  const intDoorCasingLf = doors.reduce((sum, d) => {
    if (String(d.type ?? '').toLowerCase() === 'exterior') return sum
    const w = num(d.widthFt) + num(d.widthIn) / 12
    const h = num(d.heightFt) + num(d.heightIn) / 12
    return sum + (2 * h + w) * 2 * num(d.count, 1)
  }, 0)
  const intDoorSticks = sticks(intDoorCasingLf)
  if (intDoorSticks > 0) {
    const product = findProduct(products, ...casingKeywords)
    items.push({
      description: `Interior door casing (${stickLength}ft sticks)${casingProfileLabel}`,
      quantity: intDoorSticks,
      unit: 'ea',
      cost: product?.cost ?? DEFAULT_COSTS.doorCasing * stickLength,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Interior Trim',
      isLabor: false,
      productId: product?.id,
    })
  }

  // 4. Door casing (exterior — one side)
  const extDoorCasingLf = doors.reduce((sum, d) => {
    if (String(d.type ?? '').toLowerCase() !== 'exterior') return sum
    const w = num(d.widthFt) + num(d.widthIn) / 12
    const h = num(d.heightFt) + num(d.heightIn) / 12
    return sum + (2 * h + w) * 1 * num(d.count, 1)
  }, 0)
  const extDoorSticks = sticks(extDoorCasingLf)
  if (extDoorSticks > 0) {
    const product = findProduct(products, ...casingKeywords)
    items.push({
      description: `Exterior door casing (${stickLength}ft sticks)${casingProfileLabel}`,
      quantity: extDoorSticks,
      unit: 'ea',
      cost: product?.cost ?? DEFAULT_COSTS.doorCasing * stickLength,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Interior Trim',
      isLabor: false,
      productId: product?.id,
    })
  }

  // 5. Window casing — uses same casing profile + keywords
  const winCasingKeywords: string[] = casingProfile
    ? [`${casingProfile} window casing`, `${casingProfile} casing`, casingProfile, 'window casing', 'window trim', 'casing trim']
    : ['window casing', 'window trim', 'casing trim']
  const winSticks = sticks(totalWindowCasingLf)
  if (winSticks > 0) {
    const product = findProduct(products, ...winCasingKeywords)
    items.push({
      description: `Window casing (${stickLength}ft sticks)${casingProfileLabel}`,
      quantity: winSticks,
      unit: 'ea',
      cost: product?.cost ?? DEFAULT_COSTS.windowCasing * stickLength,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Interior Trim',
      isLabor: false,
      productId: product?.id,
    })
  }

  if (totalInstalledLf <= 0) return items

  // 6. Finish nails — 1 box per 200 lf  → Interior Trim Accessories
  const nailBoxes = ceil(totalInstalledLf / 200)
  const nailProduct = findProduct(products, 'finish nail', 'brad nail', 'trim nail')
  items.push({
    description: nailProduct?.name ?? 'Finish nails (2" 16ga)',
    quantity: nailBoxes,
    unit: 'box',
    cost: nailProduct?.cost ?? DEFAULT_COSTS.finishNails,
    markup: DEFAULT_MARKUP,
    tier: nailProduct?.tier ?? 'GOOD',
    category: 'Interior Trim Accessories',
    isLabor: false,
    productId: nailProduct?.id,
  })

  // 7. Caulk — 1 tube per 100 lf  → Interior Trim Accessories
  const caulkTubes = ceil(totalInstalledLf / 100)
  const caulkProduct = findProduct(products, 'paintable caulk', 'caulk', 'trim caulk')
  items.push({
    description: caulkProduct?.name ?? 'Paintable caulk',
    quantity: caulkTubes,
    unit: 'tube',
    cost: caulkProduct?.cost ?? DEFAULT_COSTS.caulk,
    markup: DEFAULT_MARKUP,
    tier: caulkProduct?.tier ?? 'GOOD',
    category: 'Interior Trim Accessories',
    isLabor: false,
    productId: caulkProduct?.id,
  })

  // 8. Trim install labor — per lf  → Interior Trim Accessories
  const laborProduct = findProduct(products, 'trim labor', 'trim install', 'finish carpentry', 'interior trim labor')
  items.push({
    description: laborProduct?.name ?? 'Trim installation labor',
    quantity: Math.round(totalInstalledLf * 10) / 10,
    unit: 'lf',
    cost: laborProduct?.cost ?? DEFAULT_COSTS.trimLabor,
    markup: DEFAULT_MARKUP,
    tier: laborProduct?.tier ?? 'GOOD',
    category: 'Interior Trim Accessories',
    isLabor: true,
    productId: laborProduct?.id,
  })

  return items
}

// ---------------------------------------------------------------------------
// Exterior Trim Assembly
// Converts per-type linear-foot measurements into sticks-to-order plus
// consumables (caulk, primer, paint, nails) and installation labor.
// ---------------------------------------------------------------------------
export function calculateExteriorTrimAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const cornerBoardsLf = num(measurements.cornerBoardsLf)
  const friezeLf       = num(measurements.friezeLf)
  const rakeLf         = num(measurements.rakeLf)
  const waterTableLf   = num(measurements.waterTableLf)
  const bandBoardLf    = num(measurements.bandBoardLf)
  const windowTrimLf   = num(measurements.windowTrimLf)
  const doorTrimLf     = num(measurements.doorTrimLf)
  const fasciaLf       = num(measurements.fasciaLf)
  const jChannelLf     = num(measurements.jChannelLf)
  const wastePct       = num(measurements.wasteFactor, 10)

  const totalLf =
    cornerBoardsLf + friezeLf + rakeLf + waterTableLf +
    bandBoardLf + windowTrimLf + doorTrimLf + fasciaLf
  // Note: jChannelLf is NOT included in totalLf — it's a separate product (12' sticks)

  if (totalLf <= 0 && jChannelLf <= 0) return []

  const adjustedLf = totalLf * (1 + wastePct / 100)

  const items: AssemblyItem[] = []

  // Stick length is determined by material: aluminum = 10', LP/other = 16'
  function stickLengthFor(product: Product | undefined): number {
    if (!product) return 16
    const n = product.name.toLowerCase()
    return (n.includes('aluminum') || n.includes('aluminium') || n.includes('alum')) ? 10 : 16
  }

  function sticksFor(lf: number, stickLen: number): number {
    if (lf <= 0 || stickLen <= 0) return 0
    return ceil(lf * (1 + wastePct / 100) / stickLen)
  }

  // Shared coil helper — 24"×50' coil, strips cut to (exposure + 1.25" return)
  function lfPerCoilFor(exposureIn: number): number {
    return exposureIn > 0 ? Math.floor(24 / (exposureIn + 1.25)) * 50 : 150
  }

  // LP Smart Trim: prefer SmartTrim products filtered by thickness (4/4 or 5/4)
  // Standard: use existing keyword matching
  const trimMaterial    = String(measurements.trimMaterial ?? 'standard')
  const lpTrimThickness = String(measurements.lpSmartTrimThickness ?? '4/4')
  const isLpSmartTrim   = trimMaterial === 'lp_smart_trim'

  // Shared: push an aluminum-coil line item for bent-on-site trim
  const aluminumCoilProduct = products.find(p => {
    const n = p.name.toLowerCase()
    return n.includes('coil') && (n.includes('aluminum') || n.includes('aluminium') || n.includes('alum'))
           && !n.includes('tape') && !n.includes('wrap')
  })

  function pushCoilItem(label: string, lf: number, exposureIn: number) {
    if (lf <= 0) return
    const lfPer = lfPerCoilFor(exposureIn)
    const coilQty = Math.ceil(lf * (1 + wastePct / 100) / lfPer)
    items.push({
      description: aluminumCoilProduct
        ? `${aluminumCoilProduct.name} (${label} — ${exposureIn}″ face)`
        : `Aluminum coil (${label} — ${exposureIn}″ face)`,
      quantity: coilQty,
      unit: 'ea',
      cost: aluminumCoilProduct?.cost ?? DEFAULT_COSTS.fascia,
      markup: DEFAULT_MARKUP,
      tier: aluminumCoilProduct?.tier ?? 'GOOD',
      category: 'Exterior Trim',
      isLabor: false,
      productId: aluminumCoilProduct?.id,
    })
  }

  // Helper: find LP SmartTrim board by face width
  // LP naming: 4/4 → "440", 5/4 → "540"; width as " x {n}"" in the product name
  function findTrimBoardByWidth(widthIn: number): Product | undefined {
    const thickCode = lpTrimThickness === '5/4' ? '540' : '440'
    const widthStr  = ` x ${widthIn}"`
    const isLpTrim  = (p: Product) => {
      const n = p.name.toLowerCase()
      return n.includes('smarttrim') || n.includes('smart trim') || (n.includes('lp') && n.includes('trim'))
    }
    // 1st: exact thickness code + width
    const best = products.find(p => isLpTrim(p) && p.name.toLowerCase().includes(thickCode) && p.name.toLowerCase().includes(widthStr))
    if (best) return best
    // 2nd: width only
    return products.find(p => isLpTrim(p) && p.name.toLowerCase().includes(widthStr))
  }

  // 1a. Frieze board
  const friezeExposureIn = num(measurements.friezeExposureIn, 4)
  if (friezeLf > 0) {
    if (isLpSmartTrim) {
      // LP: use SmartTrim board matching the exposure width, 16ft sticks
      const friezeBoard = findTrimBoardByWidth(friezeExposureIn) ?? findTrimProduct(['frieze', 'exterior trim'])
      const qty = sticksFor(friezeLf, 16)
      items.push({
        description: friezeBoard?.name ?? `LP SmartTrim ${friezeExposureIn}" ${lpTrimThickness} (frieze)`,
        quantity: qty,
        unit: 'ea',
        cost: friezeBoard?.cost ?? DEFAULT_COSTS.exteriorTrimBoard * 16,
        markup: DEFAULT_MARKUP,
        tier: friezeBoard?.tier ?? 'GOOD',
        category: 'Exterior Trim',
        isLabor: false,
        productId: friezeBoard?.id,
      })
    } else {
      pushCoilItem('frieze', friezeLf, friezeExposureIn)
    }
  }

  // 1b. Fascia
  const fasciaExposureIn = num(measurements.fasciaExposureIn, 6)
  if (fasciaLf > 0) {
    if (isLpSmartTrim) {
      // LP: use SmartTrim board matching the exposure width, 16ft sticks
      const fasciaBoard = findTrimBoardByWidth(fasciaExposureIn) ?? findTrimProduct(['fascia', 'exterior trim'])
      const qty = sticksFor(fasciaLf, 16)
      items.push({
        description: fasciaBoard?.name ?? `LP SmartTrim ${fasciaExposureIn}" ${lpTrimThickness} (fascia)`,
        quantity: qty,
        unit: 'ea',
        cost: fasciaBoard?.cost ?? DEFAULT_COSTS.exteriorTrimBoard * 16,
        markup: DEFAULT_MARKUP,
        tier: fasciaBoard?.tier ?? 'GOOD',
        category: 'Exterior Trim',
        isLabor: false,
        productId: fasciaBoard?.id,
      })
    } else {
      pushCoilItem('fascia', fasciaLf, fasciaExposureIn)
    }
  }

  // 1c. Trim boards — 16ft sticks
  // LP naming: 4/4 → "440", 5/4 → "540"
  const lpThickCode = lpTrimThickness === '5/4' ? '540' : '440'
  function findTrimProduct(keywords: string[]): Product | undefined {
    if (isLpSmartTrim) {
      const isLpTrimP = (p: Product) => {
        const n = p.name.toLowerCase()
        return n.includes('smarttrim') || n.includes('smart trim') || (n.includes('lp') && n.includes('trim'))
      }
      // 1st: LP trim with correct thickness code
      return products.find(p => isLpTrimP(p) && p.name.toLowerCase().includes(lpThickCode))
        // 2nd: any LP trim
        ?? products.find(p => isLpTrimP(p))
        // 3rd: standard keyword fallback
        ?? findProduct(products, ...keywords)
    }
    return findProduct(products, ...keywords)
  }

  const trimTypes: { label: string; lf: number; keywords: string[] }[] = [
    { label: 'Corner boards',  lf: cornerBoardsLf, keywords: ['corner board', 'corner trim', 'exterior trim'] },
    { label: 'Rake board',     lf: rakeLf,         keywords: ['rake board', 'rake trim', 'exterior trim'] },
    { label: 'Level Starter',  lf: waterTableLf,   keywords: ['level starter', 'water table', 'steel starter', 'cbm'] },
    { label: 'Band board',     lf: bandBoardLf,    keywords: ['band board', 'belt course', 'exterior trim'] },
    { label: 'Window trim',    lf: windowTrimLf,   keywords: ['window trim', 'window casing', 'exterior trim'] },
    { label: 'Door trim',      lf: doorTrimLf,     keywords: ['door trim', 'door casing', 'exterior trim'] },
  ]

  for (const { label, lf, keywords } of trimTypes) {
    if (lf <= 0) continue
    const product = findTrimProduct(keywords)
    const stickLen = stickLengthFor(product)
    const qty = sticksFor(lf, stickLen)
    if (qty <= 0) continue
    items.push({
      description: `${label} (${stickLen}ft sticks${isLpSmartTrim ? ` — LP Smart Trim ${lpTrimThickness}` : ''})`,
      quantity: qty,
      unit: 'ea',
      cost: product?.cost ?? DEFAULT_COSTS.exteriorTrimBoard * stickLen,
      markup: DEFAULT_MARKUP,
      tier: product?.tier ?? 'GOOD',
      category: 'Exterior Trim',
      isLabor: false,
      productId: product?.id,
    })
  }

  // 2. Exterior caulk — only add if the specific OSI/NPC/TRI caulk is found in the assembly
  // No generic fallback — avoids matching DAP Dynaflex or other catalog caulks
  // Rate: 14 lf/tube (16 lf gross with waste); 12 tubes/box; DB cost is per tube
  const caulkProduct = products.find(p => {
    const n = p.name.toLowerCase()
    return (n.includes('osi') || n.includes('npc') || n.includes('12tb') ||
            (n.includes('tri') && n.includes('caulk'))) && n.includes('caulk')
  })
  if (caulkProduct) {
    const tubesNeeded = Math.max(1, ceil(adjustedLf / 14))
    items.push({
      description: caulkProduct.name,
      quantity: tubesNeeded,
      unit: 'ea',
      cost: caulkProduct.cost ?? 8.68,
      markup: DEFAULT_MARKUP,
      tier: caulkProduct.tier ?? 'GOOD',
      category: 'Exterior Trim Accessories',
      isLabor: false,
      productId: caulkProduct.id,
    })
  }

  // 2b. J-Channel — around windows/doors, at soffit line & wall corners (12' sticks)
  if (jChannelLf > 0) {
    const jChannelProduct = products.find(p => {
      const n = p.name.toLowerCase()
      return n.includes('j-channel') || n.includes('j channel') || n.includes('j-trim')
    }) ?? findProduct(products, 'j channel', 'j-channel')
    const jChannelSticks = Math.ceil(jChannelLf / 12)
    items.push({
      description: jChannelProduct?.name ?? 'J-channel',
      quantity: jChannelSticks,
      unit: 'ea',
      cost: jChannelProduct?.cost ?? DEFAULT_COSTS.jChannel,
      markup: DEFAULT_MARKUP,
      tier: jChannelProduct?.tier ?? 'GOOD',
      category: 'Exterior Trim Accessories',
      isLabor: false,
      productId: jChannelProduct?.id,
    })
  }

  // 3. Trim nails — 1 box per 200 lf  → Exterior Trim Accessories
  const nailBoxes = ceil(adjustedLf / 200)
  const nailProduct = findProduct(products, 'trim nail', 'ring shank nail', 'siding nail', 'finish nail')
  items.push({
    description: nailProduct?.name ?? 'Trim nails (galv ring shank)',
    quantity: nailBoxes,
    unit: 'box',
    cost: nailProduct?.cost ?? DEFAULT_COSTS.exteriorTrimNails,
    markup: DEFAULT_MARKUP,
    tier: nailProduct?.tier ?? 'GOOD',
    category: 'Exterior Trim Accessories',
    isLabor: false,
    productId: nailProduct?.id,
  })

  // 4. Installation labor  → Exterior Trim Accessories
  const laborProduct = findProduct(products, 'exterior trim labor', 'trim install labor', 'exterior trim install')
  items.push({
    description: laborProduct?.name ?? 'Exterior trim installation labor',
    quantity: Math.round(adjustedLf * 10) / 10,
    unit: 'lf',
    cost: laborProduct?.cost ?? DEFAULT_COSTS.exteriorTrimLabor,
    markup: DEFAULT_MARKUP,
    tier: laborProduct?.tier ?? 'GOOD',
    category: 'Exterior Trim Accessories',
    isLabor: true,
    productId: laborProduct?.id,
  })

  return items
}
