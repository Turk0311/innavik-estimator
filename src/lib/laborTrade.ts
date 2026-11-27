// Which trade a labor line belongs to — who does the work, not which tab it sits on.
// Read from the line's name first (carpenter lines on any tab are Carpentry), then from its tab.

const TRADE_BY_NAME: [RegExp, string][] = [
  [/carpent|capenter/i, "Carpentry"],
  [/plumb/i, "Plumbing"],
  [/electri/i, "Electrical"],
  [/concrete/i, "Concrete"],
  [/\bdemo\b|dumpster/i, "Demo"],
  [/shower tile|shower nook|tiler|\btile\b/i, "Tile"],
  [/drywall/i, "Drywall"],
  [/paint/i, "Painting"],
  [/siding/i, "Siding"],
  [/gutter(?! apron)|downspout|miter/i, "Gutters"],
  [/floor|laminate/i, "Flooring"],
  [/insulat/i, "Insulation"],
]

export function laborTrade(description: string, category: string): string {
  for (const [rx, trade] of TRADE_BY_NAME) if (rx.test(description)) return trade
  // Fall back to the tab, without its Accessories / Assembly suffix
  return category.replace(/\s+(Accessories|Assembly)$/i, "").trim() || "Other"
}
