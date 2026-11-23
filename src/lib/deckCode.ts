// Deck code checks — 2021 IRC Section R507 (decks), R312 (guards), R311.7 (stairs).
// Basis: No. 2 Southern pine, 50 psf ground snow load (heavier than the 40 psf live load case,
// so these limits are the conservative ones). Joist spans have no cantilever.

export const DECK_CODE_BASIS = "2021 IRC · No. 2 Southern pine · 50 psf ground snow"

const ft = (feet: number, inches = 0) => feet + inches / 12

// Table R507.6 — maximum deck joist span (ft) by size and on-center spacing (in)
const JOIST_MAX_SPAN: Record<string, Record<number, number>> = {
  "2x6":  { 12: ft(9, 2),  16: ft(8, 4),  24: ft(7, 4) },
  "2x8":  { 12: ft(12, 1), 16: ft(11, 0), 24: ft(9, 5) },
  "2x10": { 12: ft(15, 5), 16: ft(13, 9), 24: ft(11, 3) },
  "2x12": { 12: ft(18, 0), 16: ft(16, 2), 24: ft(13, 2) },
}
const JOIST_SIZES = ["2x6", "2x8", "2x10", "2x12"]

// Table R507.5(2) — maximum span (ft) of a 2-ply beam, by effective joist span (ft)
const EFFECTIVE_JOIST_SPANS = [6, 8, 10, 12, 14, 16, 18]
const BEAM_2PLY_MAX_SPAN: Record<string, number[]> = {
  "2x6":  [ft(6, 8),   ft(5, 9),  ft(5, 2),  ft(4, 9), ft(4, 4), ft(4, 1), ft(3, 10)],
  "2x8":  [ft(8, 6),   ft(7, 4),  ft(6, 7),  ft(6, 0), ft(5, 7), ft(5, 2), ft(4, 11)],
  "2x10": [ft(10, 1),  ft(8, 9),  ft(7, 10), ft(7, 1), ft(6, 7), ft(6, 2), ft(5, 10)],
  "2x12": [ft(11, 11), ft(10, 3), ft(9, 2),  ft(8, 5), ft(7, 9), ft(7, 3), ft(6, 10)],
}
// Table R507.5(5) — joist span factor with no cantilever
const JOIST_SPAN_FACTOR = 0.66

// Innavik standards are stricter than code where noted
export const GUARD_REQUIRED_ABOVE_IN = 30   // R312.1.1 (code)
export const GUARD_SHOP_ABOVE_IN = 18       // Innavik: railing above 18"
export const CODE_MAX_RISER_IN = 7.75       // R311.7.5.1 (code)
export const MAX_RISER_IN = 7.5             // Innavik: 7-1/2" risers
export const HOLD_DOWN_SPACING_FT = 3       // Innavik: every 3' along the ledger (code: 2 per deck, R507.9.2)
export const HANDRAIL_AT_RISERS = 4         // R311.7.8 — one side, 4 or more risers
export const MAX_POST_SPACING_FT = 8        // shop standard, kept even when the beam could go further
export const FROST_DEPTH_FT = 4             // footing depth below grade (southeast Wisconsin)

export function maxJoistSpan(size: string, spacingIn: number): number | null {
  return JOIST_MAX_SPAN[size]?.[spacingIn] ?? null
}

// Smallest joist that spans the deck depth at this spacing; null = no single span works (needs a mid beam)
export function minJoistSize(spanFt: number, spacingIn: number): string | null {
  return JOIST_SIZES.find((s) => (maxJoistSpan(s, spacingIn) ?? 0) >= spanFt) ?? null
}

// Longest allowed span between posts for a doubled beam carrying joists of this span.
// Interpolates between table columns; short joist spans use the 6' column (no extrapolation);
// null when the joists are too long for the table.
export function maxBeamSpan(beamSize: string, joistSpanFt: number): number | null {
  const row = BEAM_2PLY_MAX_SPAN[beamSize]
  if (!row || joistSpanFt <= 0) return null
  const eff = joistSpanFt * JOIST_SPAN_FACTOR
  if (eff <= EFFECTIVE_JOIST_SPANS[0]) return row[0]
  for (let i = 1; i < EFFECTIVE_JOIST_SPANS.length; i++) {
    const hi = EFFECTIVE_JOIST_SPANS[i]
    if (eff <= hi) {
      const lo = EFFECTIVE_JOIST_SPANS[i - 1]
      return row[i - 1] + ((eff - lo) / (hi - lo)) * (row[i] - row[i - 1])
    }
  }
  return null
}

// Post spacing along the beam: the shop's 8' or less if the beam table needs it
export function postSpacingFt(beamSize: string, joistSpanFt: number): number {
  const beam = maxBeamSpan(beamSize, joistSpanFt)
  return beam ? Math.min(MAX_POST_SPACING_FT, Math.floor(beam * 2) / 2) : MAX_POST_SPACING_FT
}

// Hold-downs along the ledger at the shop spacing, one at each end
export function holdDownsFor(ledgerFt: number): number {
  return ledgerFt > 0 ? Math.max(2, Math.ceil(ledgerFt / HOLD_DOWN_SPACING_FT) + 1) : 0
}

// Risers needed to climb the deck height at the shop's 7-1/2" max
export function stairRisersFor(heightFt: number): number {
  return heightFt > 0 ? Math.ceil((heightFt * 12) / MAX_RISER_IN) : 0
}

export function fmtFtIn(feet: number): string {
  const whole = Math.floor(feet + 1e-9)
  const inches = Math.round((feet - whole) * 12)
  return inches === 12 ? `${whole + 1}'-0"` : `${whole}'-${inches}"`
}
