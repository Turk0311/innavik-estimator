// Assembly calculation engine
// Takes raw field measurements and returns a list of pre-calculated estimate items

export type MeasurementData = Record<string, number | string>

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

// ---------------------------------------------------------------------------
// Roofing Assembly
// ---------------------------------------------------------------------------
export function calculateRoofingAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const sqf = Number(measurements.roofArea ?? 0)
  const wastePct = Number(measurements.wasteFactor ?? 10)
  const pitch = String(measurements.pitch ?? 'up_to_6_12')
  const layers = Number(measurements.layers ?? 1)
  const ridgeLf = Number(measurements.ridge ?? 0)
  const hipLf = Number(measurements.hip ?? 0)
  const valleysLf = Number(measurements.valleys ?? 0)
  const rakesLf = Number(measurements.rakes ?? 0)
  const eavesLf = Number(measurements.eaves ?? 0)
  const chimneys = Number(measurements.chimneys ?? 0)
  const skylights = Number(measurements.skylights ?? 0)
  const powerVents = Number(measurements.powerVents ?? 0)

  if (sqf <= 0) return []

  // Calculate squares with waste
  const adjustedSqf = sqf * (1 + wastePct / 100)
  const squares = ceil(adjustedSqf / 100)

  const pitchMultiplier = PITCH_MULTIPLIERS[pitch] ?? 1.0

  const items: AssemblyItem[] = []

  // 1. Tear-off (if layers > 1, they're tearing off extra layers)
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
  if (squares > 0) {
    const underlayProduct = findProduct(products, 'underlayment', 'felt', 'synthetic')
    const underlayRolls = ceil(squares / 10)
    items.push({
      description: 'Underlayment',
      quantity: underlayRolls,
      unit: 'roll',
      cost: underlayProduct?.cost ?? DEFAULT_COSTS.underlayment,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: underlayProduct?.id,
    })
  }

  // 4. Starter strip — eaves lf / 120 (bundles)
  if (eavesLf > 0) {
    const starterProduct = findProduct(products, 'starter', 'starter strip')
    const starterBundles = ceil(eavesLf / 120)
    items.push({
      description: 'Starter strip',
      quantity: starterBundles,
      unit: 'bundle',
      cost: starterProduct?.cost ?? DEFAULT_COSTS.starterStrip,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: starterProduct?.id,
    })
  }

  // 5. Ridge cap — (ridge lf + hip lf) / 22 (bundles)
  if (ridgeLf + hipLf > 0) {
    const ridgeProduct = findProduct(products, 'ridge', 'ridge cap', 'hip')
    const ridgeBundles = ceil((ridgeLf + hipLf) / 22)
    items.push({
      description: 'Ridge / hip cap',
      quantity: ridgeBundles,
      unit: 'bundle',
      cost: ridgeProduct?.cost ?? DEFAULT_COSTS.ridgeCap,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: ridgeProduct?.id,
    })
  }

  // 6. Drip edge — (eaves + rakes) lf
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

  // 7. Ice & water shield — eaves × 2 / 66 (rolls)
  if (eavesLf > 0) {
    const iceWaterProduct = findProduct(products, 'ice', 'water', 'ice & water', 'ice and water')
    const iceWaterRolls = ceil((eavesLf * 2) / 66)
    items.push({
      description: 'Ice & water shield',
      quantity: iceWaterRolls,
      unit: 'roll',
      cost: iceWaterProduct?.cost ?? DEFAULT_COSTS.iceWater,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: iceWaterProduct?.id,
    })
  }

  // 8. Coil nails — squares / 22 (boxes)
  if (squares > 0) {
    const nailProduct = findProduct(products, 'coil nail', 'nail', 'nails')
    const nailBoxes = ceil(squares / 22)
    items.push({
      description: 'Coil nails',
      quantity: nailBoxes,
      unit: 'box',
      cost: nailProduct?.cost ?? DEFAULT_COSTS.coilNails,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Roofing',
      isLabor: false,
      productId: nailProduct?.id,
    })
  }

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
// Siding Assembly
// ---------------------------------------------------------------------------
export function calculateSidingAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const wallArea = Number(measurements.wallArea ?? 0)
  const perimeter = Number(measurements.perimeter ?? 0)
  const openingsCount = Number(measurements.openings ?? 0)
  const insideCorners = Number(measurements.insideCorners ?? 0)
  const outsideCorners = Number(measurements.outsideCorners ?? 0)
  const soffitArea = Number(measurements.soffitArea ?? 0)
  const fasciaLf = Number(measurements.fascia ?? 0)
  const wastePct = Number(measurements.wasteFactor ?? 10)

  if (wallArea <= 0) return []

  const adjustedWallArea = wallArea * (1 + wastePct / 100)
  // Deduct openings (average 20 sqf per opening)
  const netWallArea = Math.max(adjustedWallArea - openingsCount * 20, adjustedWallArea * 0.5)

  const items: AssemblyItem[] = []

  // 1. Siding panels
  const sidingProduct = findProduct(products, 'siding', 'vinyl siding', 'panel')
  items.push({
    description: 'Siding panels',
    quantity: Math.ceil(netWallArea),
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
      quantity: Math.ceil(soffitArea),
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
    quantity: Math.ceil(netWallArea),
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
// Interior Assembly
// ---------------------------------------------------------------------------
export function calculateInteriorAssembly(
  measurements: MeasurementData,
  products: Product[]
): AssemblyItem[] {
  const roomLength = Number(measurements.roomLength ?? 0)
  const roomWidth = Number(measurements.roomWidth ?? 0)
  const ceilingHeight = Number(measurements.ceilingHeight ?? 8)
  const windows = Number(measurements.windows ?? 0)
  const doors = Number(measurements.doors ?? 0)
  const wastePct = Number(measurements.wasteFactor ?? 10)

  if (roomLength <= 0 || roomWidth <= 0) return []

  const floorArea = roomLength * roomWidth
  const perimeter = 2 * (roomLength + roomWidth)
  const grossWallArea = perimeter * ceilingHeight
  // Deduct openings: windows avg 15 sqf, doors avg 20 sqf
  const openingDeduction = windows * 15 + doors * 20
  const netWallArea = Math.max(grossWallArea - openingDeduction, grossWallArea * 0.7)
  const totalArea = netWallArea + floorArea  // walls + ceiling? ceiling separate
  const ceilingArea = floorArea

  const waste = 1 + wastePct / 100

  const items: AssemblyItem[] = []

  // 1. Drywall — walls + ceiling
  const drywallSqf = Math.ceil((netWallArea + ceilingArea) * waste)
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

  // 3. Mud / joint compound — 1 bucket per 200 sqf
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

  // 4. Paint — walls + ceiling, 1 gal per 350 sqf (2 coats)
  const paintArea = (netWallArea + ceilingArea) * 2  // two coats
  const paintGallons = ceil(paintArea / 350)
  const paintProduct = findProduct(products, 'paint', 'interior paint')
  items.push({
    description: 'Interior paint',
    quantity: paintGallons,
    unit: 'gal',
    cost: paintProduct?.cost ?? DEFAULT_COSTS.paint * 350, // cost per gal estimate
    markup: DEFAULT_MARKUP,
    tier: 'GOOD',
    category: 'Interior',
    isLabor: false,
    productId: paintProduct?.id,
  })

  // 5. Drywall / interior labor
  const laborProduct = findProduct(products, 'interior labor', 'drywall labor', 'labor')
  items.push({
    description: 'Interior drywall & paint labor',
    quantity: Math.ceil(netWallArea),
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
  const outlets = Number(measurements.outlets ?? 0)
  const switches = Number(measurements.switches ?? 0)
  const fixtures = Number(measurements.fixtures ?? 0)
  const roughInPlumbing = Number(measurements.roughInPlumbing ?? 0)
  const plumbingFixtures = Number(measurements.plumbingFixtures ?? 0)

  const items: AssemblyItem[] = []

  // Electrical materials
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

  // Electrical labor — estimate ~1.5 hrs per outlet/switch, 2 hrs per fixture
  const electricalHours = outlets * 1.5 + switches * 1.5 + fixtures * 2
  if (electricalHours > 0) {
    const elecLaborProduct = findProduct(products, 'electrical labor', 'electrician', 'labor')
    items.push({
      description: 'Electrical labor',
      quantity: Math.ceil(electricalHours),
      unit: 'hr',
      cost: elecLaborProduct?.cost ?? DEFAULT_COSTS.electricalLabor,
      markup: DEFAULT_MARKUP,
      tier: 'GOOD',
      category: 'Electrical',
      isLabor: true,
      productId: elecLaborProduct?.id,
    })
  }

  // Plumbing rough-in
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

  // Plumbing fixtures
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

  // Plumbing labor — 4 hrs per rough-in, 3 hrs per fixture
  const plumbingHours = roughInPlumbing * 4 + plumbingFixtures * 3
  if (plumbingHours > 0) {
    const plumbLaborProduct = findProduct(products, 'plumbing labor', 'plumber', 'labor')
    items.push({
      description: 'Plumbing labor',
      quantity: Math.ceil(plumbingHours),
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
