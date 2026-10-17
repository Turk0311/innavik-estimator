// Material tax follows the sheet's divisor convention: 10% → taxed = amount / 0.90
export const DEFAULT_TAX_RATE = 10;
export const DELIVERY_FEE = 150;
// Per-estimate settings are stored as a Measurement record with this tradeType
export const SETTINGS_TRADE_TYPE = "Settings";

export function withTax(amount: number, taxRate: number): number {
  return taxRate > 0 && taxRate < 100 ? amount / (1 - taxRate / 100) : amount;
}

export function materialTax(materials: number, taxRate: number): number {
  return materials > 0 ? withTax(materials, taxRate) - materials : 0;
}

// One delivery per estimate, only when there are materials to deliver
export function deliveryFee(materials: number): number {
  return materials > 0 ? DELIVERY_FEE : 0;
}

export function withTaxAndDelivery(materials: number, labor: number, taxRate: number) {
  const tax = materialTax(materials, taxRate);
  const delivery = deliveryFee(materials);
  return { materials, tax, delivery, labor, total: materials + tax + delivery + labor };
}

// Matches the sheet: material GM includes tax and delivery on the sell side and tax paid on the cost side
export function grossMargin(
  priced: { materials: number; tax: number; delivery: number; labor: number },
  materialsCost: number,
  laborCost: number,
  taxRate: number,
) {
  const materialSell = priced.materials + priced.tax + priced.delivery;
  const materialGM = materialSell - withTax(materialsCost, taxRate);
  const laborGM = priced.labor - laborCost;
  const totalSell = materialSell + priced.labor;
  const pct = (gm: number, sell: number) => (sell > 0 ? (gm / sell) * 100 : 0);
  return {
    materialGM, laborGM, totalGM: materialGM + laborGM,
    materialGMPct: pct(materialGM, materialSell),
    laborGMPct: pct(laborGM, priced.labor),
    totalGMPct: pct(materialGM + laborGM, totalSell),
  };
}

export function taxRateFrom(records: { tradeType: string; data: unknown }[]): number {
  const data = records.find((r) => r.tradeType === SETTINGS_TRADE_TYPE)?.data as { taxRate?: unknown } | undefined;
  const rate = Number(data?.taxRate);
  return Number.isFinite(rate) && rate >= 0 && rate < 100 ? rate : DEFAULT_TAX_RATE;
}
