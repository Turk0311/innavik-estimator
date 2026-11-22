// Board fasteners for TimberTech decks, shared by the build and the Decking Accessories form.
// Square-edge (SQ) boards are face-screwed with Cortex; grooved (GV) boards take ConceaLoc clips.

export const CORTEX_SQFT_PER_KIT = 300

export interface ConceaLocPrices { box100: number; box500: number; box1000: number }
// Catalog prices at the time of writing — the build passes live prices
export const CONCEALOC_DEFAULT_PRICES: ConceaLocPrices = { box100: 149.12, box500: 702.64, box1000: 1366.62 }

export type BoardFastenerPlan =
  | { kind: "cortex"; pvc: boolean; kits: number }
  | { kind: "concealoc"; n1000: number; n500: number; n100: number }
  | null

// AZEK lines (Harvest, Landmark, Vintage) are PVC; the other TimberTech lines are composite
export function isPvcBoard(name: string): boolean {
  return /\b(HARVEST|LANDMARK|VINTAGE)\b(?!\s*\+)/i.test(name)
}

export function boardFastenerPlan(boardName: string, deckSqft: number, prices = CONCEALOC_DEFAULT_PRICES): BoardFastenerPlan {
  if (deckSqft <= 0) return null
  if (/\bSQ\b/i.test(boardName)) {
    return { kind: "cortex", pvc: isPvcBoard(boardName), kits: Math.ceil(deckSqft / CORTEX_SQFT_PER_KIT) }
  }
  if (/\bGV\b/i.test(boardName)) {
    // Cheapest mix of 1000 / 500 / 100 sqft boxes
    const big = Math.floor(deckSqft / 1000)
    const rest = deckSqft - big * 1000
    const options = [
      { n1000: 0, n500: 0, n100: Math.ceil(rest / 100) },
      { n1000: 0, n500: 1, n100: Math.ceil(Math.max(0, rest - 500) / 100) },
      { n1000: rest > 0 ? 1 : 0, n500: 0, n100: 0 },
    ]
    const cost = (o: typeof options[number]) => o.n1000 * prices.box1000 + o.n500 * prices.box500 + o.n100 * prices.box100
    const best = options.sort((a, b) => cost(a) - cost(b))[0]
    return { kind: "concealoc", n1000: big + best.n1000, n500: best.n500, n100: best.n100 }
  }
  return null
}

export function describePlan(plan: BoardFastenerPlan): string {
  if (!plan) return "—"
  if (plan.kind === "cortex") return `Cortex ${plan.pvc ? "PVC" : "Composite"} 300 sqft × ${plan.kits}`
  const parts = [
    plan.n1000 > 0 && `1,000 sqft × ${plan.n1000}`,
    plan.n500 > 0 && `500 sqft (gun) × ${plan.n500}`,
    plan.n100 > 0 && `100 sqft × ${plan.n100}`,
  ].filter(Boolean)
  return `ConceaLoc ${parts.join(" + ")}`
}
