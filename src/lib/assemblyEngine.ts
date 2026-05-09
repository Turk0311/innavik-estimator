// Assembly calculation engine
// Takes raw field measurements and returns a list of pre-calculated estimate items

export type MeasurementData = Record<string, unknown>

export type AssemblyItem = {
  description: string
  quantity: number
  unit: string
  cost: number
  markup: number
  tier: 'GOOD' | 'BETTER' | 'BEST'
  category: string
  isLabor: boolean
  productId?: string
}

type Product = {
  id: string
  name: string
  cost: number
  unit: string
  category: string
  subCategory: string | null
  tier: 'GOOD' | 'BETTER' | 'BEST'
}

// ---------------------------------------------------------------------------
// Pitch multipliers for roofing labor
// ---------------------------------------------------------------------------
const PITCH_MULTIPLIERS: Record<string, number> = {
  'up_to_6_12': 1.0,
  '7_8_12': 1.1,
  '9_10_12': 1.25,
  '11_12_12': 1.4,
  'mansard': 1.5,
  'flat': 0.85,
}

// Default costs used when no product match is found
const DEFAULT_COSTS = {
  shingles: 32,        // per square
  underlayment: 28,    // per roll
  starterStrip: 45,    // per bundle
  ridgeCap: 52,        // per bundle
  dripEdge: 1.20,      // per lf
  iceWater: 85,        // per roll
  coilNails: 28,       // per box
  tearoffLabor: 65,    // per square
  installLabor: 90,    // per square
  // Siding
  siding: 2.50,        // per sqf
  jChannel: 1.10,      // per lf
  insideCorner: 1.40,  // per lf (8ft pieces assumed counted)
  outsideCorner: 1.40, // per lf
  soffit: 1.80,        // per sqf
  fascia: 1.50,        // per lf
  sidingLabor: 1.80,   // per sqf
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

function ceil(n: number): number {
  return Math.ceil(n)
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v)
  return isNaN(n) ? fallback : n
}

// ---------------------------------------------------------------------------
// Roofing Assembly — supports planes array (new) or legacy roofArea (old)
// ---------------------------------------------------------------------------
export function calculateRoofingAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
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
  const layers = num(measurements.layers, 1)
  const ridgeLf = num(measurements.ridge)
  const hipLf = num(measurements.hip)
  const valleysLf = num(measurements.valleys)
  const rakesLf = num(measurements.rakes)
  const eavesLf = num(measurements.eaves)
  const chimneys = num(measurements.chimneys)
  const skylights = num(measurements.skylights)
  const powerVents = num(measurements.powerVents)

  if (sqf <= 0) return []

  const adjustedSqf = sqf * (1 + wastePct / 100)
  const squares = ceil(adjustedSqf / 100)
  const pitchMultiplier = PITCH_MULTIPLIERS[pitch] ?? 1.0

  const items: AssemblyItem[] = []

  // 1. Tear-off
  if (layers > 1) {
    const tearoffProduct = findProduct(products, 'tear', 'tearoff', 'removal')
    items.push({
      description: `Tear-off — ${layers} layers`,
      quantity: squares,
      unit: 'sq',
      cost: tearoffProduct?.cost ?? DEFAULT_COSTS.tearoffLabor * pitchMultiplier,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Roofing',
      isLabor: true,
      productId: tearoffProduct?.id,
    })
  }

  // 2. Shingles
  const shingleProduct = findProduct(products, 'shingle', 'asphalt')
  items.push({
    description: 'Asphalt shingles',
    quantity: squares,
    unit: 'sq',
    cost: shingleProduct?.cost ?? DEFAULT_COSTS.shingles,
    markup: DEFAULT_MARKUP,
    tier: 'GOOD',
    category: 'Roofing',
    isLabor: false,
    productId: shingleProduct?.id,
  })

  // 3. Underlayment — 1 roll per 10 squares
  const underlayProduct = findProduct(products, 'underlayment', 'felt', 'synthetic')
  items.push({
    description: 'Underlayment',
    quantity: ceil(squares / 10),
    unit: 'roll',
    cost: underlayProduct?.cost ?? DEFAULT_COSTS.underlayment,
    markup: DEFAULT_MARKUP,
    tier: 'GOOD',
    category: 'Roofing',
    isLabor: false,
    productId: underlayProduct?.id,
  })

  // 4. Starter strip
  if (eavesLf > 0) {
    const starterProduct = findProduct(products, 'starter', 'starter strip')
    items.push({
      description: 'Starter strip',
      quantity: ceil(eavesLf / 120),
      unit: 'bundle',
      cost: starterProduct?.cost ?? DEFAULT_COSTS.starterStrip,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: starterProduct?.id,
    })
  }

  // 5. Ridge cap
  if (ridgeLf + hipLf > 0) {
    const ridgeProduct = findProduct(products, 'ridge', 'ridge cap', 'hip')
    items.push({
      description: 'Ridge / hip cap',
      quantity: ceil((ridgeLf + hipLf) / 22),
      unit: 'bundle',
      cost: ridgeProduct?.cost ?? DEFAULT_COSTS.ridgeCap,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: ridgeProduct?.id,
    })
  }

  // 6. Drip edge
  if (eavesLf + rakesLf > 0) {
    const dripProduct = findProduct(products, 'drip edge', 'drip')
    items.push({
      description: 'Drip edge',
      quantity: eavesLf + rakesLf,
      unit: 'lf',
      cost: dripProduct?.cost ?? DEFAULT_COSTS.dripEdge,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: dripProduct?.id,
    })
  }

  // 7. Ice & water shield
  if (eavesLf > 0) {
    const iceWaterProduct = findProduct(products, 'ice', 'water', 'ice & water', 'ice and water')
    items.push({
      description: 'Ice & water shield',
      quantity: ceil((eavesLf * 2) / 66),
      unit: 'roll',
      cost: iceWaterProduct?.cost ?? DEFAULT_COSTS.iceWater,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: iceWaterProduct?.id,
    })
  }

  // 8. Coil nails
  const nailProduct = findProduct(products, 'coil nail', 'nail', 'nails')
  items.push({
    description: 'Coil nails',
    quantity: ceil(squares / 22),
    unit: 'box',
    cost: nailProduct?.cost ?? DEFAULT_COSTS.coilNails,
    markup: DEFAULT_MARKUP,
    tier: 'GOOD',
    category: 'Roofing',
    isLabor: false,
    productId: nailProduct?.id,
  })

  // 9. Valley flashing
  if (valleysLf > 0) {
    const valleyProduct = findProduct(products, 'valley', 'valley flashing')
    items.push({
      description: 'Valley flashing',
      quantity: valleysLf,
      unit: 'lf',
      cost: valleyProduct?.cost ?? 2.5,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: valleyProduct?.id,
    })
  }

  // 10. Chimney flashing
  if (chimneys > 0) {
    const chimneyProduct = findProduct(products, 'chimney', 'chimney flashing')
    items.push({
      description: 'Chimney flashing',
      quantity: chimneys,
      unit: 'ea',
      cost: chimneyProduct?.cost ?? 180,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: chimneyProduct?.id,
    })
  }

  // 11. Skylight flashing
  if (skylights > 0) {
    const skylightProduct = findProduct(products, 'skylight', 'skylight flashing')
    items.push({
      description: 'Skylight flashing',
      quantity: skylights,
      unit: 'ea',
      cost: skylightProduct?.cost ?? 120,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: skylightProduct?.id,
    })
  }

  // 12. Power vents
  if (powerVents > 0) {
    const ventProduct = findProduct(products, 'power vent', 'vent', 'ventilation')
    items.push({
      description: 'Power vents',
      quantity: powerVents,
      unit: 'ea',
      cost: ventProduct?.cost ?? 85,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: ventProduct?.id,
    })
  }

  // 13. Installation labor
  const laborProduct = findProduct(products, 'install labor', 'roofing labor', 'labor')
  items.push({
    description: `Roofing installation labor (pitch: ${pitch.replace(/_/g, ' ')})`,
    quantity: squares,
    unit: 'sq',
    cost: (laborProduct?.cost ?? DEFAULT_COSTS.installLabor) * pitchMultiplier,
    markup: DEFAULT_MARKUP,
    tier: 'GOOD',
    category: 'Roofing',
    isLabor: true,
    productId: laborProduct?.id,
  })

  return items
}

// ---------------------------------------------------------------------------
// Siding Assembly — supports walls array (new) or legacy wallArea (old)
// ---------------------------------------------------------------------------
export function calculateSidingAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  let wallArea = 0

  const walls = measurements.walls
  if (Array.isArray(walls) && walls.length > 0) {
    wallArea = walls.reduce((sum: number, w: unknown) => {
      const wall = w as { width?: unknown; height?: unknown }
      return sum + num(wall.width) * num(wall.height)
    }, 0)
  } else {
    wallArea = num(measurements.wallArea)
  }

  const perimeter = num(measurements.perimeter)
  const openingsCount = num(measurements.openings)
  const insideCorners = num(measurements.insideCorners)
  const outsideCorners = num(measurements.outsideCorners)
  const soffitArea = num(measurements.soffitArea)
  // Support both old 'fascia' and new 'fasciaLf'
  const fasciaLf = num(measurements.fasciaLf ?? measurements.fascia)
  const wastePct = num(measurements.wasteFactor, 10)

  if (wallArea <= 0) return []

  const adjustedWallArea = wallArea * (1 + wastePct / 100)
  const netWallArea = Math.max(adjustedWallArea - openingsCount * 20, adjustedWallArea * 0.5)

  const items: AssemblyItem[] = []

  // 1. Siding panels
  const sidingProduct = findProduct(products, 'siding', 'vinyl siding', 'panel')
  items.push({
    description: 'Siding panels',
    quantity: ceil(netWallArea),
    unit: 'sqf',
    cost: sidingProduct?.cost ?? DEFAULT_COSTS.siding,
    markup: DEFAULT_MARKUP,
    tier: 'GOOD',
    category: 'Siding',
    isLabor: false,
    productId: sidingProduct?.id,
  })

  // 2. J-channel / perimeter trim
  if (perimeter > 0) {
    const jChannelProduct = findProduct(products, 'j channel', 'j-channel', 'trim')
    items.push({
      description: 'J-channel / perimeter trim',
      quantity: perimeter,
      unit: 'lf',
      cost: jChannelProduct?.cost ?? DEFAULT_COSTS.jChannel,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Siding',
      isLabor: false,
      productId: jChannelProduct?.id,
    })
  }

  // 3. Inside corners
  if (insideCorners > 0) {
    const insideCornerProduct = findProduct(products, 'inside corner', 'inside')
    items.push({
      description: 'Inside corner posts',
      quantity: insideCorners,
      unit: 'ea',
      cost: insideCornerProduct?.cost ?? DEFAULT_COSTS.insideCorner,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Siding',
      isLabor: false,
      productId: insideCornerProduct?.id,
    })
  }

  // 4. Outside corners
  if (outsideCorners > 0) {
    const outsideCornerProduct = findProduct(products, 'outside corner', 'outside')
    items.push({
      description: 'Outside corner posts',
      quantity: outsideCorners,
      unit: 'ea',
      cost: outsideCornerProduct?.cost ?? DEFAULT_COSTS.outsideCorner,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Siding',
      isLabor: false,
      productId: outsideCornerProduct?.id,
    })
  }

  // 5. Soffit
  if (soffitArea > 0) {
    const soffitProduct = findProduct(products, 'soffit')
    items.push({
      description: 'Soffit',
      quantity: ceil(soffitArea),
      unit: 'sqf',
      cost: soffitProduct?.cost ?? DEFAULT_COSTS.soffit,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Siding',
      isLabor: false,
      productId: soffitProduct?.id,
    })
  }

  // 6. Fascia
  if (fasciaLf > 0) {
    const fasciaProduct = findProduct(products, 'fascia')
    items.push({
      description: 'Fascia',
      quantity: fasciaLf,
      unit: 'lf',
      cost: fasciaProduct?.cost ?? DEFAULT_COSTS.fascia,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Siding',
      isLabor: false,
      productId: fasciaProduct?.id,
    })
  }

  // 7. Installation labor
  const laborProduct = findProduct(products, 'siding labor', 'install labor', 'labor')
  items.push({
    description: 'Siding installation labor',
    quantity: ceil(netWallArea),
    unit: 'sqf',
    cost: laborProduct?.cost ?? DEFAULT_COSTS.sidingLabor,
    markup: DEFAULT_MARKUP,
    tier: 'GOOD',
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
    description: 'Drywall',
    quantity: drywallSqf,
    unit: 'sqf',
    cost: drywallProduct?.cost ?? DEFAULT_COSTS.drywall,
    markup: DEFAULT_MARKUP,
    tier: 'GOOD',
    category: 'Interior',
    isLabor: false,
    productId: drywallProduct?.id,
  })

  // 2. Joint tape — 1 roll per 500 sqf
  const tapeRolls = ceil(drywallSqf / 500)
  if (tapeRolls > 0) {
    const tapeProduct = findProduct(products, 'tape', 'joint tape', 'mesh tape')
    items.push({
      description: 'Joint tape',
      quantity: tapeRolls,
      unit: 'roll',
      cost: tapeProduct?.cost ?? DEFAULT_COSTS.tape,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
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
      description: 'Joint compound',
      quantity: mudBuckets,
      unit: 'pail',
      cost: mudProduct?.cost ?? DEFAULT_COSTS.mudCompound,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
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
    description: 'Interior paint',
    quantity: paintGallons,
    unit: 'gal',
    cost: paintProduct?.cost ?? DEFAULT_COSTS.paint * 350,
    markup: DEFAULT_MARKUP,
    tier: 'GOOD',
    category: 'Interior',
    isLabor: false,
    productId: paintProduct?.id,
  })

  // 5. Labor
  const laborProduct = findProduct(products, 'interior labor', 'drywall labor', 'labor')
  items.push({
    description: 'Interior drywall & paint labor',
    quantity: ceil(netWallArea),
    unit: 'sqf',
    cost: laborProduct?.cost ?? DEFAULT_COSTS.interiorLabor,
    markup: DEFAULT_MARKUP,
    tier: 'GOOD',
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
      description: 'Outlets / receptacles',
      quantity: outlets,
      unit: 'ea',
      cost: outletProduct?.cost ?? DEFAULT_COSTS.outlet,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Electrical',
      isLabor: false,
      productId: outletProduct?.id,
    })
  }

  if (switches > 0) {
    const switchProduct = findProduct(products, 'switch', 'light switch')
    items.push({
      description: 'Light switches',
      quantity: switches,
      unit: 'ea',
      cost: switchProduct?.cost ?? DEFAULT_COSTS.switch,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Electrical',
      isLabor: false,
      productId: switchProduct?.id,
    })
  }

  if (fixtures > 0) {
    const fixtureProduct = findProduct(products, 'fixture', 'light fixture', 'lighting')
    items.push({
      description: 'Light fixtures',
      quantity: fixtures,
      unit: 'ea',
      cost: fixtureProduct?.cost ?? DEFAULT_COSTS.fixture,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Electrical',
      isLabor: false,
      productId: fixtureProduct?.id,
    })
  }

  const electricalHours = outlets * 1.5 + switches * 1.5 + fixtures * 2
  if (electricalHours > 0) {
    const elecLaborProduct = findProduct(products, 'electrical labor', 'electrician', 'labor')
    items.push({
      description: 'Electrical labor',
      quantity: ceil(electricalHours),
      unit: 'hr',
      cost: elecLaborProduct?.cost ?? DEFAULT_COSTS.electricalLabor,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Electrical',
      isLabor: true,
      productId: elecLaborProduct?.id,
    })
  }

  if (roughInPlumbing > 0) {
    const roughInProduct = findProduct(products, 'rough-in', 'plumbing rough', 'rough in')
    items.push({
      description: 'Plumbing rough-in',
      quantity: roughInPlumbing,
      unit: 'ea',
      cost: roughInProduct?.cost ?? DEFAULT_COSTS.roughInPlumbing,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Plumbing',
      isLabor: false,
      productId: roughInProduct?.id,
    })
  }

  if (plumbingFixtures > 0) {
    const plumbFixtureProduct = findProduct(products, 'plumbing fixture', 'fixture', 'faucet')
    items.push({
      description: 'Plumbing fixtures',
      quantity: plumbingFixtures,
      unit: 'ea',
      cost: plumbFixtureProduct?.cost ?? DEFAULT_COSTS.plumbingFixture,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Plumbing',
      isLabor: false,
      productId: plumbFixtureProduct?.id,
    })
  }

  const plumbingHours = roughInPlumbing * 4 + plumbingFixtures * 3
  if (plumbingHours > 0) {
    const plumbLaborProduct = findProduct(products, 'plumbing labor', 'plumber', 'labor')
    items.push({
      description: 'Plumbing labor',
      quantity: ceil(plumbingHours),
      unit: 'hr',
      cost: plumbLaborProduct?.cost ?? DEFAULT_COSTS.plumbingLabor,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
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
    description: `Paint (${coats} coat${coats > 1 ? 's' : ''}${includesPrimer ? ' + primer' : ''})`,
    quantity: paintGallons,
    unit: 'gal',
    cost: paintProduct?.cost ?? DEFAULT_COSTS.paintMaterial,
    markup: DEFAULT_MARKUP,
    tier: 'GOOD',
    category: 'Painting',
    isLabor: false,
    productId: paintProduct?.id,
  })

  const laborProduct = findProduct(products, 'paint labor', 'painting labor', 'labor')
  items.push({
    description: `Painting labor (${coats} coat${coats > 1 ? 's' : ''})`,
    quantity: adjustedSqf,
    unit: 'sqf',
    cost: laborProduct?.cost ?? DEFAULT_COSTS.paintLabor * coats,
    markup: DEFAULT_MARKUP,
    tier: 'GOOD',
    category: 'Painting',
    isLabor: true,
    productId: laborProduct?.id,
  })

  if (includesTrim) {
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
      description: 'Demolition labor',
      quantity: totalSqft,
      unit: 'sqf',
      cost: laborProduct?.cost ?? DEFAULT_COSTS.demoLabor,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Demo',
      isLabor: true,
      productId: laborProduct?.id,
    })
  }

  if (dumpsterNeeded) {
    const dumpsterProduct = findProduct(products, 'dumpster', 'haul', 'disposal')
    items.push({
      description: 'Dumpster rental / haul-away',
      quantity: 1,
      unit: 'ea',
      cost: dumpsterProduct?.cost ?? DEFAULT_COSTS.dumpster,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
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
  products: Product[]
): AssemblyItem[] {
  const tasks = measurements.tasks
  const items: AssemblyItem[] = []

  if (!Array.isArray(tasks) || tasks.length === 0) return items

  const laborProduct = findProduct(products, 'general labor', 'labor', 'hourly')

  for (const t of tasks) {
    const task = t as { label?: unknown; hours?: unknown }
    const hours = num(task.hours)
    if (hours <= 0) continue
    const label = String(task.label || 'General labor')
    items.push({
      description: label,
      quantity: hours,
      unit: 'hr',
      cost: laborProduct?.cost ?? DEFAULT_COSTS.generalLabor,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'General Labor',
      isLabor: true,
      productId: laborProduct?.id,
    })
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
      description: 'Upper cabinets',
      quantity: upperCabinetsLf,
      unit: 'lf',
      cost: product?.cost ?? DEFAULT_COSTS.upperCabinet,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Kitchen',
      isLabor: false,
      productId: product?.id,
    })
  }

  if (lowerCabinetsLf > 0) {
    const product = findProduct(products, 'lower cabinet', 'base cabinet', 'lower')
    items.push({
      description: 'Lower / base cabinets',
      quantity: lowerCabinetsLf,
      unit: 'lf',
      cost: product?.cost ?? DEFAULT_COSTS.lowerCabinet,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Kitchen',
      isLabor: false,
      productId: product?.id,
    })
  }

  if (countertopLf > 0) {
    const product = findProduct(products, 'countertop', 'counter')
    items.push({
      description: 'Countertop',
      quantity: ceil(countertopLf * waste),
      unit: 'lf',
      cost: product?.cost ?? DEFAULT_COSTS.countertop,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Kitchen',
      isLabor: false,
      productId: product?.id,
    })
  }

  if (backsplashSqft > 0) {
    const product = findProduct(products, 'backsplash', 'tile')
    items.push({
      description: 'Backsplash tile',
      quantity: ceil(backsplashSqft * waste),
      unit: 'sqft',
      cost: product?.cost ?? DEFAULT_COSTS.backsplash,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Kitchen',
      isLabor: false,
      productId: product?.id,
    })
  }

  if (appliances > 0) {
    const product = findProduct(products, 'appliance', 'install')
    items.push({
      description: 'Appliance installation',
      quantity: appliances,
      unit: 'ea',
      cost: product?.cost ?? DEFAULT_COSTS.appliance,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Kitchen',
      isLabor: true,
      productId: product?.id,
    })
  }

  if (sink) {
    const product = findProduct(products, 'sink', 'kitchen sink')
    items.push({
      description: 'Sink installation',
      quantity: 1,
      unit: 'ea',
      cost: product?.cost ?? DEFAULT_COSTS.sinkInstall,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
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
      description: 'Cabinet installation labor',
      quantity: hours,
      unit: 'hr',
      cost: laborProduct?.cost ?? DEFAULT_COSTS.kitchenLabor,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Kitchen',
      isLabor: true,
      productId: laborProduct?.id,
    })
  }

  return items
}

// ---------------------------------------------------------------------------
// Deck Assembly
// ---------------------------------------------------------------------------
export function calculateDeckAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const sections = measurements.sections
  let totalArea = 0

  if (Array.isArray(sections) && sections.length > 0) {
    totalArea = sections.reduce((sum: number, s: unknown) => {
      const section = s as { length?: unknown; width?: unknown }
      return sum + num(section.length) * num(section.width)
    }, 0)
  }

  if (totalArea <= 0) return []

  const wastePct = num(measurements.wasteFactor, 10)
  const railingLf = num(measurements.railingLf)
  const stairs = num(measurements.stairs)
  const adjustedArea = ceil(totalArea * (1 + wastePct / 100))

  const items: AssemblyItem[] = []

  const deckProduct = findProduct(products, 'deck board', 'decking', 'composite')
  items.push({
    description: 'Deck boards',
    quantity: adjustedArea,
    unit: 'sqf',
    cost: deckProduct?.cost ?? DEFAULT_COSTS.deckBoards,
    markup: DEFAULT_MARKUP,
    tier: 'GOOD',
    category: 'Deck',
    isLabor: false,
    productId: deckProduct?.id,
  })

  const laborProduct = findProduct(products, 'deck labor', 'framing labor', 'labor')
  items.push({
    description: 'Deck installation labor',
    quantity: adjustedArea,
    unit: 'sqf',
    cost: laborProduct?.cost ?? DEFAULT_COSTS.deckLabor,
    markup: DEFAULT_MARKUP,
    tier: 'GOOD',
    category: 'Deck',
    isLabor: true,
    productId: laborProduct?.id,
  })

  if (railingLf > 0) {
    const railProduct = findProduct(products, 'railing', 'rail')
    items.push({
      description: 'Deck railing',
      quantity: railingLf,
      unit: 'lf',
      cost: railProduct?.cost ?? DEFAULT_COSTS.railing,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Deck',
      isLabor: false,
      productId: railProduct?.id,
    })
  }

  if (stairs > 0) {
    const stairProduct = findProduct(products, 'stair', 'stairs', 'steps')
    items.push({
      description: 'Stair sections',
      quantity: stairs,
      unit: 'ea',
      cost: stairProduct?.cost ?? DEFAULT_COSTS.stairs,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Deck',
      isLabor: false,
      productId: stairProduct?.id,
    })
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
    description: 'Gutters',
    quantity: linearFt,
    unit: 'lf',
    cost: gutterProduct?.cost ?? DEFAULT_COSTS.gutter,
    markup: DEFAULT_MARKUP,
    tier: 'GOOD',
    category: 'Gutters',
    isLabor: false,
    productId: gutterProduct?.id,
  })

  if (downspouts > 0) {
    const downspoutProduct = findProduct(products, 'downspout')
    items.push({
      description: 'Downspouts',
      quantity: downspouts,
      unit: 'ea',
      cost: downspoutProduct?.cost ?? DEFAULT_COSTS.downspout,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Gutters',
      isLabor: false,
      productId: downspoutProduct?.id,
    })
  }

  if (corners > 0) {
    const cornerProduct = findProduct(products, 'gutter corner', 'corner')
    items.push({
      description: 'Gutter corners',
      quantity: corners,
      unit: 'ea',
      cost: cornerProduct?.cost ?? DEFAULT_COSTS.gutterCorner,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Gutters',
      isLabor: false,
      productId: cornerProduct?.id,
    })
  }

  if (guards) {
    const guardProduct = findProduct(products, 'gutter guard', 'leaf guard')
    items.push({
      description: 'Gutter guards',
      quantity: linearFt,
      unit: 'lf',
      cost: guardProduct?.cost ?? DEFAULT_COSTS.gutterGuard,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Gutters',
      isLabor: false,
      productId: guardProduct?.id,
    })
  }

  const laborProduct = findProduct(products, 'gutter labor', 'labor')
  items.push({
    description: 'Gutter installation labor',
    quantity: linearFt,
    unit: 'lf',
    cost: laborProduct?.cost ?? DEFAULT_COSTS.gutterLabor,
    markup: DEFAULT_MARKUP,
    tier: 'GOOD',
    category: 'Gutters',
    isLabor: true,
    productId: laborProduct?.id,
  })

  return items
}
