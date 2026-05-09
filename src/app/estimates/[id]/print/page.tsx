import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import PrintControls from "./PrintControls";

type PageProps = { params: Promise<{ id: string }> };

type Tier = "GOOD" | "BETTER" | "BEST";

interface EstimateItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  cost: number;
  markup: number;
  tier: Tier;
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

function calcTierTotals(items: EstimateItem[]) {
  const result: Record<Tier, { materials: number; labor: number }> = {
    GOOD: { materials: 0, labor: 0 },
    BETTER: { materials: 0, labor: 0 },
    BEST: { materials: 0, labor: 0 },
  };
  for (const item of items) {
    const sell = sellPrice(item.cost, item.markup) * item.quantity;
    if (item.isLabor) result[item.tier].labor += sell;
    else result[item.tier].materials += sell;
  }
  return result;
}

function calcCumulative(totals: Record<Tier, { materials: number; labor: number }>) {
  return {
    GOOD: totals.GOOD,
    BETTER: {
      materials: totals.GOOD.materials + totals.BETTER.materials,
      labor: totals.GOOD.labor + totals.BETTER.labor,
    },
    BEST: {
      materials: totals.GOOD.materials + totals.BETTER.materials + totals.BEST.materials,
      labor: totals.GOOD.labor + totals.BETTER.labor + totals.BEST.labor,
    },
  };
}

export default async function PrintPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;

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

  const items = estimate.items as EstimateItem[];

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

  const tierConfigs: { tier: Tier; label: string; color: string; bg: string }[] = [
    { tier: "GOOD", label: "Good", color: "#059669", bg: "#ecfdf5" },
    { tier: "BETTER", label: "Better", color: "#2563eb", bg: "#eff6ff" },
    { tier: "BEST", label: "Best", color: "#d97706", bg: "#fffbeb" },
  ];

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
      <PrintControls estimateId={id} />

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
                <div style={{ width: "32px", height: "32px", background: "#1d4ed8", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 21V12h6v9" />
                  </svg>
                </div>
                <span style={{ fontSize: "20px", fontWeight: "700", color: "#1d4ed8", letterSpacing: "-0.02em" }}>
                  Innavik
                </span>
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

          {/* ---- GOOD / BETTER / BEST SUMMARY ---- */}
          <div style={{ marginBottom: "32px" }}>
            <div style={{ fontSize: "10px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
              Estimate Summary — Good / Better / Best
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              {tierConfigs.map(({ tier, label, color, bg }) => {
                const c = cumul[tier];
                const total = c.materials + c.labor;
                const addLabel = tier === "GOOD" ? "Base package" : tier === "BETTER" ? "Includes Good +" : "Includes Better +";
                return (
                  <div key={tier} style={{ border: `1.5px solid ${color}40`, borderRadius: "8px", padding: "16px", background: bg }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <span style={{ fontWeight: "700", fontSize: "13px", color }}>{label}</span>
                      <span style={{ fontSize: "10px", color: "#94a3b8" }}>{addLabel}</span>
                    </div>
                    <div style={{ marginBottom: "4px", display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                      <span style={{ color: "#64748b" }}>Materials</span>
                      <span style={{ color: "#334155" }}>{fmt(c.materials)}</span>
                    </div>
                    <div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                      <span style={{ color: "#64748b" }}>Labor</span>
                      <span style={{ color: "#334155" }}>{fmt(c.labor)}</span>
                    </div>
                    <div style={{ borderTop: `1px solid ${color}30`, paddingTop: "8px", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: "600", fontSize: "12px", color }}>Total</span>
                      <span style={{ fontWeight: "700", fontSize: "15px", color }}>{fmt(total)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Delta callout */}
            {(["BETTER", "BEST"] as Tier[]).some((t) => tierTotals[t].materials + tierTotals[t].labor > 0) && (
              <div style={{ marginTop: "8px", display: "flex", gap: "16px" }}>
                {(["BETTER", "BEST"] as Tier[]).map((tier) => {
                  const delta = tierTotals[tier].materials + tierTotals[tier].labor;
                  if (delta === 0) return null;
                  const cfg = tierConfigs.find((c) => c.tier === tier)!;
                  return (
                    <div key={tier} style={{ fontSize: "10px", color: "#64748b" }}>
                      <span style={{ color: cfg.color, fontWeight: "600" }}>{cfg.label}</span> upgrade adds{" "}
                      <span style={{ fontWeight: "600" }}>{fmt(delta)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ---- ITEMIZED LINE ITEMS ---- */}
          {categories.length > 0 && (
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
                                const tierColor = item.tier === "GOOD" ? "#059669" : item.tier === "BETTER" ? "#2563eb" : "#d97706";
                                const tierLabel = item.tier === "GOOD" ? "Good" : item.tier === "BETTER" ? "Better" : "Best";
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
                                const tierColor = item.tier === "GOOD" ? "#059669" : item.tier === "BETTER" ? "#2563eb" : "#d97706";
                                const tierLabel = item.tier === "GOOD" ? "Good" : item.tier === "BETTER" ? "Better" : "Best";
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
