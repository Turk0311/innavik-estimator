// Catalog products the bathroom tabs let the rep pick from, sorted into lists by what they are

export type PickProduct = { id: string; name: string; cost: number }
export interface BathProductLists {
  toilets: PickProduct[]
  vanities: PickProduct[]
  faucets: PickProduct[]
  valves: PickProduct[]
  doors: PickProduct[]
  surrounds: PickProduct[]
  tiles: PickProduct[]
}

type Src = PickProduct & { category: string }

const NOT_TILE = /curb|mapei|schluter|kerdi|lash|grout|tape|spacer|ultraflex|thin\s*set|wedge|clip|densshield|liner|membrane/i

export function sortBathProducts(products: Src[]): BathProductLists {
  const has = (p: Src, rx: RegExp) => rx.test(p.name)
  const cat = (p: Src, ...c: string[]) => c.some((x) => p.category.toLowerCase() === x.toLowerCase())
  const list = (f: (p: Src) => boolean) =>
    products.filter(f).map(({ id, name, cost }) => ({ id, name, cost })).sort((a, b) => a.cost - b.cost)
  return {
    toilets: list((p) => cat(p, "Toilet", "Bath") && has(p, /toilet|2-piece|power flush/i) && !has(p, /valve|flange|kit/i)),
    vanities: list((p) => cat(p, "Vanity", "Bath", "Sink") && has(p, /vanity|pedestal|pedistal|single sink/i)),
    faucets: list((p) => cat(p, "Sink", "Bath") && has(p, /faucet|widespread|wide spread/i) && !has(p, /kitchen|pull down|line/i)),
    valves: list((p) => cat(p, "Bath", "Shower") && has(p, /valve|spray/i) && !has(p, /pex|elbow/i)),
    doors: list((p) => cat(p, "Bath", "Shower", "Shower Assembly") && has(p, /frameless|glass/i) && !has(p, /mirror/i)),
    surrounds: list((p) => cat(p, "Shower") && has(p, /center drain|maax|piece/i)),
    tiles: list((p) => (cat(p, "Tile") || (cat(p, "Shower") && has(p, /mosaic/i))) && has(p, /tile|mosaic|porcelain|ceramic|sqf/i) && !has(p, NOT_TILE)),
  }
}

export const EMPTY_BATH_PRODUCTS: BathProductLists = {
  toilets: [], vanities: [], faucets: [], valves: [], doors: [], surrounds: [], tiles: [],
}
