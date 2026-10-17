"use client";

import { useState } from "react";

type Tier = "GOOD" | "GOOD_PLUS" | "BETTER" | "BETTER_PLUS" | "BEST" | "BEST_PLUS";

export interface PackageOption {
  label: string;
  subLabel: string;
  color: string;
  bg: string;
  border: string;
  tiers: Tier[];
  materials: number;
  labor: number;
  tax: number;
  delivery: number;
  total: number;
}

export interface PrintItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  sellPrice: number;
  lineTotal: number;
  tier: Tier;
  tierLabel: string;
  tierColor: string;
  packages: string;
  category: string;
  isLabor: boolean;
}

interface Props {
  packages: PackageOption[];
  isMultiPackage: boolean;
  items: PrintItem[];
}

function fmt(n: number): string {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

export default function PackageSelector({ packages, isMultiPackage, items }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const selectedPkg = packages.find((p) => p.label === selected) ?? null;

  const filteredItems = selectedPkg
    ? items.filter((i) => (i.packages ?? "good,better,best").split(",").includes(selectedPkg.label.toLowerCase()))
    : [];

  const categories = Array.from(new Set(filteredItems.map((i) => i.category))).sort();

  return (
    <div>
      {/* Three package cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
        {packages.map((pkg, idx) => {
          const prevTotal = idx > 0 ? packages[idx - 1].total : 0;
          const delta = pkg.total - prevTotal;
          const isMiddle = idx === 1;
          const isSelected = selected === pkg.label;

          return (
            <div
              key={pkg.label}
              onClick={() => setSelected(pkg.label)}
              style={{
                borderTop: `3px solid ${pkg.color}`,
                borderRight: isSelected ? `2px solid ${pkg.color}` : `1.5px solid ${pkg.color}50`,
                borderBottom: isSelected ? `2px solid ${pkg.color}` : `1.5px solid ${pkg.color}50`,
                borderLeft: isSelected ? `2px solid ${pkg.color}` : `1.5px solid ${pkg.color}50`,
                borderRadius: "8px",
                padding: "14px 14px 12px",
                background: isSelected ? pkg.bg : "white",
                boxShadow: isSelected
                  ? `0 2px 16px ${pkg.color}30`
                  : isMiddle && isMultiPackage
                  ? `0 2px 12px ${pkg.color}20`
                  : "none",
                cursor: "pointer",
                transition: "box-shadow 0.15s, border-color 0.15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "2px" }}>
                <span style={{ fontWeight: "800", fontSize: "14px", color: pkg.color }}>{pkg.label}</span>
                {isMultiPackage && isMiddle && (
                  <span style={{ fontSize: "8px", fontWeight: "700", background: pkg.color, color: "white", padding: "1px 5px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Popular
                  </span>
                )}
              </div>
              <div style={{ fontSize: "9px", color: "#94a3b8", marginBottom: "10px" }}>
                {isMultiPackage && idx > 0 ? `${pkg.subLabel} (+${fmt(delta)})` : pkg.subLabel}
              </div>

              <div style={{ marginBottom: "3px", display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                <span style={{ color: "#64748b" }}>Materials</span>
                <span style={{ color: "#334155" }}>{fmt(pkg.materials)}</span>
              </div>
              <div style={{ marginBottom: "3px", display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                <span style={{ color: "#64748b" }}>Labor</span>
                <span style={{ color: "#334155" }}>{fmt(pkg.labor)}</span>
              </div>
              {pkg.delivery > 0 && (
                <div style={{ marginBottom: "3px", display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                  <span style={{ color: "#64748b" }}>Delivery</span>
                  <span style={{ color: "#334155" }}>{fmt(pkg.delivery)}</span>
                </div>
              )}
              <div style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", fontSize: "10px" }}>
                <span style={{ color: "#64748b" }}>Tax</span>
                <span style={{ color: "#334155" }}>{fmt(pkg.tax)}</span>
              </div>

              <div style={{ borderTop: `1px solid ${pkg.color}30`, paddingTop: "7px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: "600", fontSize: "11px", color: pkg.color }}>Total</span>
                <span style={{ fontWeight: "800", fontSize: "15px", color: pkg.color }}>{fmt(pkg.total)}</span>
              </div>

              <label
                style={{ marginTop: "12px", borderTop: `1px dashed ${pkg.color}30`, paddingTop: "10px", display: "flex", alignItems: "center", gap: "7px", cursor: "pointer" }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="radio"
                  name="package-selection"
                  value={pkg.label}
                  checked={isSelected}
                  onChange={() => setSelected(pkg.label)}
                  style={{ accentColor: pkg.color, width: "14px", height: "14px", flexShrink: 0, cursor: "pointer" }}
                />
                <span style={{ fontSize: "9px", color: "#64748b", userSelect: "none" }}>
                  I choose the <span style={{ fontWeight: "700", color: pkg.color }}>{pkg.label}</span> package
                </span>
              </label>
            </div>
          );
        })}
      </div>

      {/* Selected package summary bar */}
      {selectedPkg && (
        <div
          style={{
            marginTop: "12px",
            border: `2px solid ${selectedPkg.color}`,
            borderRadius: "8px",
            padding: "14px 16px",
            background: selectedPkg.bg,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: selectedPkg.color, fontWeight: "700", marginBottom: "2px" }}>
              ✓ {selectedPkg.label} Package Selected
            </div>
            <div style={{ fontSize: "10px", color: "#64748b" }}>
              Materials {fmt(selectedPkg.materials)} · Labor {fmt(selectedPkg.labor)}{selectedPkg.delivery > 0 && <> · Delivery {fmt(selectedPkg.delivery)}</>} · Tax {fmt(selectedPkg.tax)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "10px", color: "#64748b", marginBottom: "1px" }}>Package Total</div>
            <div style={{ fontWeight: "800", fontSize: "20px", color: selectedPkg.color }}>
              {fmt(selectedPkg.total)}
            </div>
          </div>
        </div>
      )}

      {/* Filtered itemized breakdown */}
      {selectedPkg && categories.length > 0 && (
        <div style={{ marginTop: "28px" }}>
          <div style={{ fontSize: "10px", fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px" }}>
            {selectedPkg.label} Package — Itemized Breakdown
          </div>

          {categories.map((category) => {
            const catItems = filteredItems.filter((i) => i.category === category);
            const materialItems = catItems.filter((i) => !i.isLabor);
            const laborItems = catItems.filter((i) => i.isLabor);
            const catTotal = catItems.reduce((s, i) => s + i.lineTotal, 0);

            return (
              <div key={category} style={{ marginBottom: "20px" }}>
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px 6px 0 0", padding: "8px 12px", fontWeight: "600", fontSize: "12px", color: "#0f172a", display: "flex", justifyContent: "space-between" }}>
                  <span>{category}</span>
                  <span style={{ fontWeight: "400", fontSize: "11px", color: "#64748b" }}>
                    {catItems.length} line{catItems.length !== 1 ? "s" : ""}
                  </span>
                </div>

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
                          {materialItems.map((item, i) => (
                            <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                              <td style={{ padding: "5px 12px", color: "#0f172a" }}>{item.description}</td>
                              <td style={{ padding: "5px 8px", textAlign: "center" }}>
                                <span style={{ fontSize: "9px", fontWeight: "700", color: item.tierColor, textTransform: "uppercase" }}>{item.tierLabel}</span>
                              </td>
                              <td style={{ padding: "5px 8px", textAlign: "right", color: "#475569", whiteSpace: "nowrap" }}>{item.quantity} {item.unit}</td>
                              <td style={{ padding: "5px 8px", textAlign: "right", color: "#475569", whiteSpace: "nowrap" }}>{fmt(item.sellPrice)}</td>
                              <td style={{ padding: "5px 12px", textAlign: "right", fontWeight: "600", color: "#0f172a", whiteSpace: "nowrap" }}>{fmt(item.lineTotal)}</td>
                            </tr>
                          ))}
                        </>
                      )}

                      {laborItems.length > 0 && (
                        <>
                          <tr>
                            <td colSpan={5} style={{ padding: "4px 12px", background: "#eff6ff", fontSize: "9px", fontWeight: "700", color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                              Labor
                            </td>
                          </tr>
                          {laborItems.map((item, i) => (
                            <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "white" : "#fafafa" }}>
                              <td style={{ padding: "5px 12px", color: "#0f172a" }}>{item.description}</td>
                              <td style={{ padding: "5px 8px", textAlign: "center" }}>
                                <span style={{ fontSize: "9px", fontWeight: "700", color: item.tierColor, textTransform: "uppercase" }}>{item.tierLabel}</span>
                              </td>
                              <td style={{ padding: "5px 8px", textAlign: "right", color: "#475569", whiteSpace: "nowrap" }}>{item.quantity} {item.unit}</td>
                              <td style={{ padding: "5px 8px", textAlign: "right", color: "#475569", whiteSpace: "nowrap" }}>{fmt(item.sellPrice)}</td>
                              <td style={{ padding: "5px 12px", textAlign: "right", fontWeight: "600", color: "#0f172a", whiteSpace: "nowrap" }}>{fmt(item.lineTotal)}</td>
                            </tr>
                          ))}
                        </>
                      )}

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
    </div>
  );
}
