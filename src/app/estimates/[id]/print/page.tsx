import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import PrintControls from "./PrintControls";
import PackageSelector from "./PackageSelector";
import { withTaxAndDelivery, taxRateFrom } from "@/lib/pricing";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ packages?: string }>;
};

type Tier = "GOOD" | "GOOD_PLUS" | "BETTER" | "BETTER_PLUS" | "BEST" | "BEST_PLUS";

interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  cost: number;
  markup: number;
  tier: Tier;
  packages: string;
  category: string;
  isLabor: boolean;
}

function sellPrice(cost: number, markup: number): number {
  if (markup >= 100) return cost * 100;
  return cost / (1 - markup / 100);
}

function fmt(n: number): string {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

const TIER_ORDER: Tier[] = ["GOOD", "GOOD_PLUS", "BETTER", "BETTER_PLUS", "BEST", "BEST_PLUS"];

const TIER_PRINT_LABEL: Record<Tier, string> = {
  GOOD: "Good", GOOD_PLUS: "Good+", BETTER: "Better",
  BETTER_PLUS: "Better+", BEST: "Best", BEST_PLUS: "Best+",
};

const TIER_PRINT_COLOR: Record<Tier, string> = {
  GOOD: "#059669", GOOD_PLUS: "#16a34a",
  BETTER: "#2563eb", BETTER_PLUS: "#0284c7",
  BEST: "#d97706", BEST_PLUS: "#ea580c",
};

function calcTierTotals(items: EstimateItem[]) {
  const result: Record<Tier, { materials: number; labor: number }> = {
    GOOD:        { materials: 0, labor: 0 },
    GOOD_PLUS:   { materials: 0, labor: 0 },
    BETTER:      { materials: 0, labor: 0 },
    BETTER_PLUS: { materials: 0, labor: 0 },
    BEST:        { materials: 0, labor: 0 },
    BEST_PLUS:   { materials: 0, labor: 0 },
  };
  for (const item of items) {
    const sell = sellPrice(item.cost, item.markup) * item.quantity;
    if (item.isLabor) result[item.tier].labor += sell;
    else result[item.tier].materials += sell;
  }
  return result;
}

function calcCumulative(totals: Record<Tier, { materials: number; labor: number }>) {
  const result: Record<Tier, { materials: number; labor: number }> = {
    GOOD:        { materials: 0, labor: 0 },
    GOOD_PLUS:   { materials: 0, labor: 0 },
    BETTER:      { materials: 0, labor: 0 },
    BETTER_PLUS: { materials: 0, labor: 0 },
    BEST:        { materials: 0, labor: 0 },
    BEST_PLUS:   { materials: 0, labor: 0 },
  };
  let cumMat = 0, cumLab = 0;
  for (const t of TIER_ORDER) {
    cumMat += totals[t].materials;
    cumLab += totals[t].labor;
    result[t] = { materials: cumMat, labor: cumLab };
  }
  return result;
}

export default async function PrintPage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const sp = await searchParams;
  // packages=0 means the user explicitly toggled it off; otherwise auto-enable when tiers differ
  const packagesForced = sp.packages === "0" ? false : sp.packages === "1" ? true : null;

  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: {
      items: { orderBy: [{ category: "asc" }, { isLabor: "asc" }, { description: "asc" }] },
      user: { select: { name: true } },
    },
  });

  if (!estimate) notFound();

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && estimate.userId !== session.user.id) notFound();

  const items = estimate.items.map((i) => ({ ...i, packages: i.packages ?? "good,better,best" })) as EstimateItem[];
  const settings = await prisma.measurement.findMany({ where: { estimateId: id, tradeType: "Settings" } });
  const taxRate = taxRateFrom(settings);

  const tierTotals = calcTierTotals(items);
  const cumul = calcCumulative(tierTotals);
  const categories = Array.from(new Set(items.map((i) => i.category))).sort();

  const printDate = new Date().toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const estimateDate = estimate.createdAt.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

    // Three client-facing packages (each is cumulative)
  const PRINT_PACKAGES = [
    {
      label: "Good",
      subLabel: "Base package",
      color: "#059669",
      bg: "#ecfdf5",
      border: "#059669",
      tiers: ["GOOD", "GOOD_PLUS"] as Tier[],
    },
    {
      label: "Better",
      subLabel: "Includes Good +",
      color: "#2563eb",
      bg: "#eff6ff",
      border: "#2563eb",
      tiers: ["GOOD", "GOOD_PLUS", "BETTER", "BETTER_PLUS"] as Tier[],
    },
    {
      label: "Best",
      subLabel: "Includes Better +",
      color: "#d97706",
      bg: "#fffbeb",
      border: "#d97706",
      tiers: ["GOOD", "GOOD_PLUS", "BETTER", "BETTER_PLUS", "BEST", "BEST_PLUS"] as Tier[],
    },
  ];

  const packageTotals = PRINT_PACKAGES.map((pkg) => {
    const key = pkg.label.toLowerCase();
    const pkgItems = items.filter((i) => (i.packages ?? "good,better,best").split(",").includes(key));
    const materials = pkgItems.filter((i) => !i.isLabor).reduce((s, i) => s + sellPrice(i.cost, i.markup) * i.quantity, 0);
    const labor     = pkgItems.filter((i) => i.isLabor).reduce( (s, i) => s + sellPrice(i.cost, i.markup) * i.quantity, 0);
    return { ...pkg, ...withTaxAndDelivery(materials, labor, taxRate) };
  });

  // Pre-compute print items for client component (sell prices computed server-side)
  const printItems = items.map((item) => ({
    id: item.id,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    sellPrice: sellPrice(item.cost, item.markup),
    lineTotal: sellPrice(item.cost, item.markup) * item.quantity,
    tier: item.tier,
    tierLabel: TIER_PRINT_LABEL[item.tier] ?? item.tier,
    tierColor: TIER_PRINT_COLOR[item.tier] ?? "#64748b",
    packages: item.packages ?? "good,better,best",
    category: item.category,
    isLabor: item.isLabor,
  }));

  const [good, better, best] = packageTotals;
  const isMultiPackage = good.total !== better.total || better.total !== best.total;

  // Auto-enable packages view when tiers differ; user can override with ?packages=0
  const showPackages = packagesForced !== null ? packagesForced : isMultiPackage;

  // Extract plain notes
  const plainNotes = estimate.notes
    ? estimate.notes
        .split("\n")
        .filter((l) => !l.startsWith("__scopes__:"))
        .join("\n")
        .trim()
    : "";

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-page { padding-top: 0 !important; background: white !important; }
          .print-doc { box-shadow: none !important; border-radius: 0 !important; max-width: 100% !important; padding: 0 !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 18mm; size: letter; }
        }
      `}</style>

      {/* Screen-only controls */}
      <PrintControls estimateId={id} showPackages={showPackages} />

      {/* Page wrapper */}
      <div
        className="print-page"
        style={{ background: "#f1f5f9", minHeight: "100vh", paddingTop: "60px", paddingBottom: "40px" }}
      >
        <div
          className="print-doc"
          style={{
            background: "white",
            maxWidth: "816px",
            margin: "24px auto",
            padding: "48px 56px",
            boxShadow: "0 4px 32px rgba(0,0,0,0.12)",
            borderRadius: "8px",
          }}
        >
          {/* ---- HEADER ---- */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", borderBottom: "2px solid #1d4ed8", paddingBottom: "20px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/innavik-logo.png" alt="Innavik" style={{ height: "32px", width: "auto" }} />
              </div>
              <div style={{ color: "#64748b", fontSize: "12px" }}>General Construction · Antioch, IL</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "2px" }}>
                Estimate
              </div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>{estimate.name}</div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                Prepared {estimateDate} · Printed {printDate}
              </div>
            </div>
          </div>

          {/* ---- CLIENT INFO ---- */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "28px" }}>
            <div>
              <div style={{ fontSize: "10px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                Client
              </div>
              <div style={{ fontWeight: "600", fontSize: "14px", color: "#0f172a" }}>{estimate.clientName}</div>
              {estimate.address && (
                <div style={{ color: "#475569", marginTop: "2px" }}>{estimate.address}</div>
              )}
            </div>
            <div>
              <div style={{ fontSize: "10px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                Prepared By
              </div>
              <div style={{ fontWeight: "600", fontSize: "14px", color: "#0f172a" }}>{estimate.user.name}</div>
              <div style={{ color: "#475569", marginTop: "2px" }}>Innavik Construction</div>
            </div>
          </div>

          {/* ---- SUMMARY ---- */}
          <div style={{ marginBottom: "32px" }}>
            <div style={{ fontSize: "10px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
              Estimate Summary
            </div>

            {showPackages ? (
              /* ── Three-package view ──────────────────────────────────────── */
              <PackageSelector
                packages={packageTotals.map(({ label, subLabel, color, bg, border, tiers, materials, labor, tax, delivery, total }) => ({
                  label, subLabel, color, bg, border, tiers, materials, labor, tax, delivery, total,
                }))}
                isMultiPackage={isMultiPackage}
                items={printItems}
              />
            ) : (
              /* ── Default single-total view ──────────────────────────────── */
              (() => {
                const allMaterials = items.filter((i) => !i.isLabor).reduce((s, i) => s + sellPrice(i.cost, i.markup) * i.quantity, 0);
                const allLabor     = items.filter((i) =>  i.isLabor).reduce((s, i) => s + sellPrice(i.cost, i.markup) * i.quantity, 0);
                const priced       = withTaxAndDelivery(allMaterials, allLabor, taxRate);
                const grandTotal   = priced.total;
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px 16px", background: "#f8fafc" }}>
                      <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "6px" }}>Materials</div>
                      <div style={{ fontWeight: "700", fontSize: "16px", color: "#0f172a" }}>{fmt(priced.materials)}</div>
                    </div>
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px 16px", background: "#f8fafc" }}>
                      <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "6px" }}>Labor</div>
                      <div style={{ fontWeight: "700", fontSize: "16px", color: "#0f172a" }}>{fmt(allLabor)}</div>
                    </div>
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px 16px", background: "#f8fafc" }}>
                      <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "6px" }}>Delivery</div>
                      <div style={{ fontWeight: "700", fontSize: "16px", color: "#0f172a" }}>{fmt(priced.delivery)}</div>
                    </div>
                    <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px 16px", background: "#f8fafc" }}>
                      <div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "6px" }}>Tax</div>
                      <div style={{ fontWeight: "700", fontSize: "16px", color: "#0f172a" }}>{fmt(priced.tax)}</div>
                    </div>
                    <div style={{ gridColumn: "1 / -1", border: "1.5px solid #1d4ed8", borderRadius: "8px", padding: "14px 16px", background: "#eff6ff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: "600", fontSize: "13px", color: "#1e40af" }}>Estimate Total</span>
                      <span style={{ fontWeight: "800", fontSize: "22px", color: "#1d4ed8" }}>{fmt(grandTotal)}</span>
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* ---- ITEMIZED LINE ITEMS (hidden in packages mode — PackageSelector renders filtered version) ---- */}
          {!showPackages && categories.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "10px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px" }}>
                Itemized Breakdown
              </div>

              {categories.map((category) => {
                const catItems = items.filter((i) => i.category === category);
                const materialItems = catItems.filter((i) => !i.isLabor);
                const laborItems = catItems.filter((i) => i.isLabor);
                const catTotal = catItems.reduce((sum, i) => sum + sellPrice(i.cost, i.markup) * i.quantity, 0);

                return (
                  <div key={category} style={{ marginBottom: "20px" }}>
                    {/* Category header */}
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px 6px 0 0", padding: "8px 12px", fontWeight: "600", fontSize: "12px", color: "#0f172a", display: "flex", justifyContent: "space-between" }}>
                      <span>{category}</span>
                      <span style={{ fontWeight: "400", fontSize: "11px", color: "#64748b" }}>
                        {catItems.length} line{catItems.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Items table */}
                    <div style={{ border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 6px 6px", overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                            <th style={{ padding: "5px 12px", textAlign: "left", color: "#94a3b8", fontWeight: "500", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Description</th>
                            <th style={{ padding: "5px 8px", textAlign: "center", color: "#94a3b8", fontWeight: "500", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Tier</th>
                            <th style={{ padding: "5px 8px", textAlign: "right", color: "#94a3b8", fontWeight: "500", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Qty</th>
                            <th style={{ padding: "5px 8px", textAlign: "right", color: "#94a3b8", fontWeight: "500", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Unit Price</th>
                            <th style={{ padding: "5px 12px", textAlign: "right", color: "#94a3b8", fontWeight: "500", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {materialItems.length > 0 && (
                            <>
                              <tr>
                                <td colSpan={5} style={{ padding: "4px 12px", background: "#f0fdf4", fontSize: "9px", fontWeight: "700", color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                  Materials
                                </td>
                              </tr>
                              {materialItems.map((item, idx) => {
                                const sell = sellPrice(item.cost, item.markup);
                                const lineTotal = sell * item.quantity;
                                const tierColor = TIER_PRINT_COLOR[item.tier] ?? "#64748b";
                                const tierLabel = TIER_PRINT_LABEL[item.tier] ?? item.tier;
                                return (
                                  <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "white" : "#fafafa" }}>
                                    <td style={{ padding: "5px 12px", color: "#0f172a" }}>{item.description}</td>
                                    <td style={{ padding: "5px 8px", textAlign: "center" }}>
                                      <span style={{ fontSize: "9px", fontWeight: "700", color: tierColor, textTransform: "uppercase" }}>{tierLabel}</span>
                                    </td>
                                    <td style={{ padding: "5px 8px", textAlign: "right", color: "#475569", whiteSpace: "nowrap" }}>
                                      {item.quantity} {item.unit}
                                    </td>
                                    <td style={{ padding: "5px 8px", textAlign: "right", color: "#475569", whiteSpace: "nowrap" }}>
                                      {fmt(sell)}
                                    </td>
                                    <td style={{ padding: "5px 12px", textAlign: "right", fontWeight: "600", color: "#0f172a", whiteSpace: "nowrap" }}>
                                      {fmt(lineTotal)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </>
                          )}

                          {laborItems.length > 0 && (
                            <>
                              <tr>
                                <td colSpan={5} style={{ padding: "4px 12px", background: "#eff6ff", fontSize: "9px", fontWeight: "700", color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                  Labor
                                </td>
                              </tr>
                              {laborItems.map((item, idx) => {
                                const sell = sellPrice(item.cost, item.markup);
                                const lineTotal = sell * item.quantity;
                                const tierColor = TIER_PRINT_COLOR[item.tier] ?? "#64748b";
                                const tierLabel = TIER_PRINT_LABEL[item.tier] ?? item.tier;
                                return (
                                  <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "white" : "#fafafa" }}>
                                    <td style={{ padding: "5px 12px", color: "#0f172a" }}>{item.description}</td>
                                    <td style={{ padding: "5px 8px", textAlign: "center" }}>
                                      <span style={{ fontSize: "9px", fontWeight: "700", color: tierColor, textTransform: "uppercase" }}>{tierLabel}</span>
                                    </td>
                                    <td style={{ padding: "5px 8px", textAlign: "right", color: "#475569", whiteSpace: "nowrap" }}>
                                      {item.quantity} {item.unit}
                                    </td>
                                    <td style={{ padding: "5px 8px", textAlign: "right", color: "#475569", whiteSpace: "nowrap" }}>
                                      {fmt(sell)}
                                    </td>
                                    <td style={{ padding: "5px 12px", textAlign: "right", fontWeight: "600", color: "#0f172a", whiteSpace: "nowrap" }}>
                                      {fmt(lineTotal)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </>
                          )}

                          {/* Category subtotal */}
                          <tr style={{ borderTop: "1.5px solid #e2e8f0", background: "#f8fafc" }}>
                            <td colSpan={4} style={{ padding: "7px 12px", fontWeight: "600", color: "#475569", fontSize: "11px" }}>
                              {category} Subtotal
                            </td>
                            <td style={{ padding: "7px 12px", textAlign: "right", fontWeight: "700", color: "#0f172a", fontSize: "12px" }}>
                              {fmt(catTotal)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ---- NOTES ---- */}
          {plainNotes && (
            <div style={{ marginBottom: "24px", padding: "14px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
              <div style={{ fontSize: "10px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                Notes
              </div>
              <div style={{ color: "#475569", whiteSpace: "pre-wrap", fontSize: "12px" }}>{plainNotes}</div>
            </div>
          )}

          {/* ---- FOOTER ---- */}
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#94a3b8", fontSize: "10px" }}>
            <span>Innavik Construction · Antioch, IL · www.innavik.com</span>
            <span>This estimate is valid for 30 days from the date of issue.</span>
          </div>
        </div>
      </div>
    </>
  );
}
