"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { withTaxAndDelivery, taxRateFrom, DEFAULT_TAX_RATE, SETTINGS_TRADE_TYPE } from "@/lib/pricing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Tier = "GOOD" | "GOOD_PLUS" | "BETTER" | "BETTER_PLUS" | "BEST" | "BEST_PLUS";

export interface EstimateItem {
  id: string;
  estimateId: string;
  productId: string;
  description: string;
  quantity: number;
  unit: string;
  cost: number;
  markup: number;
  tier: Tier;
  packages: string;
  category: string;
  isLabor: boolean;
  sku?: string | null;
  supplier?: string | null;
}

// ---------------------------------------------------------------------------
// Package helpers
// ---------------------------------------------------------------------------

const PKG_KEYS = ["good", "better", "best"] as const;
type PkgKey = typeof PKG_KEYS[number];

const PKG_META: Record<PkgKey, { label: string; short: string; active: string; inactive: string }> = {
  good:   { label: "Good",   short: "G", active: "bg-emerald-700 text-emerald-100 border-emerald-600", inactive: "border-slate-600 text-slate-500 hover:border-slate-400" },
  better: { label: "Better", short: "B", active: "bg-blue-700 text-blue-100 border-blue-600",          inactive: "border-slate-600 text-slate-500 hover:border-slate-400" },
  best:   { label: "Best",   short: "★", active: "bg-amber-700 text-amber-100 border-amber-600",       inactive: "border-slate-600 text-slate-500 hover:border-slate-400" },
};

function pkgsFromString(s: string): Set<PkgKey> {
  const set = new Set<PkgKey>();
  for (const p of s.split(",")) {
    const t = p.trim() as PkgKey;
    if (PKG_KEYS.includes(t)) set.add(t);
  }
  return set;
}

function pkgsToString(set: Set<PkgKey>): string {
  return PKG_KEYS.filter((k) => set.has(k)).join(",") || "good";
}

function PackageToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const active = pkgsFromString(value);
  function toggle(key: PkgKey) {
    const next = new Set(active);
    if (next.has(key) && next.size > 1) next.delete(key);
    else next.add(key);
    onChange(pkgsToString(next));
  }
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-slate-500 mr-1">Packages:</span>
      {PKG_KEYS.map((key) => {
        const m = PKG_META[key];
        const on = active.has(key);
        return (
          <button key={key} type="button" onClick={() => toggle(key)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide transition-colors ${on ? m.active : m.inactive}`}>
            {m.short}
          </button>
        );
      })}
    </div>
  );
}

function PackageBadges({ packages }: { packages: string }) {
  const active = pkgsFromString(packages);
  return (
    <span className="flex items-center gap-0.5">
      {PKG_KEYS.map((key) => {
        const m = PKG_META[key];
        if (!active.has(key)) return null;
        return (
          <span key={key} className={`text-[9px] font-bold px-1 py-0.5 rounded border ${m.active}`}>
            {m.short}
          </span>
        );
      })}
    </span>
  );
}

export interface Estimate {
  id: string;
  name: string;
  clientName: string;
  address: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: EstimateItem[];
}

interface Product {
  id: string;
  sku: string | null;
  name: string;
  cost: number;
  unit: string;
  category: string;
  subCategory: string | null;
  supplier: string | null;
  tier: Tier;
  packages?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIER_LABELS: Record<Tier, string> = {
  GOOD: "Good",
  GOOD_PLUS: "Good+",
  BETTER: "Better",
  BETTER_PLUS: "Better+",
  BEST: "Best",
  BEST_PLUS: "Best+",
};

const TIER_COLORS: Record<Tier, string> = {
  GOOD:        "text-emerald-400 bg-emerald-900/30 border-emerald-700",
  GOOD_PLUS:   "text-green-400   bg-green-900/30   border-green-700",
  BETTER:      "text-blue-400   bg-blue-900/30   border-blue-700",
  BETTER_PLUS: "text-sky-400    bg-sky-900/30    border-sky-700",
  BEST:        "text-amber-400  bg-amber-900/30  border-amber-700",
  BEST_PLUS:   "text-orange-400 bg-orange-900/30 border-orange-700",
};

const DEFAULT_MARKUP = 30;

function parseCurrency(val: string): number {
  const n = parseFloat(val.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function fmt(n: number): string {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

function extractScopes(notes: string | null): string[] {
  if (!notes) return [];
  const line = notes.split("\n").find((l) => l.startsWith("__scopes__:"));
  if (!line) return [];
  try {
    const json = JSON.parse(line.replace("__scopes__:", ""));
    return json.scopes ?? [];
  } catch {
    return [];
  }
}

function extractPlainNotes(notes: string | null): string {
  if (!notes) return "";
  return notes
    .split("\n")
    .filter((l) => !l.startsWith("__scopes__:"))
    .join("\n")
    .trim();
}

// sell price formula: cost / (1 - markup/100)
function sellPrice(cost: number, markup: number): number {
  if (markup >= 100) return cost * 100;
  return cost / (1 - markup / 100);
}

// ---------------------------------------------------------------------------
// Manual Add Item Form (for custom items not in catalog)
// ---------------------------------------------------------------------------

interface AddItemFormProps {
  category: string;
  onAdd: (item: Omit<EstimateItem, "id" | "estimateId">) => Promise<void>;
  onClose: () => void;
  isLabor?: boolean;
  onBack?: () => void;
}

function AddItemForm({ category, onAdd, onClose, isLabor = false, onBack }: AddItemFormProps) {
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState(isLabor ? "hr" : "ea");
  const [cost, setCost] = useState("");
  const [markup, setMarkup] = useState(String(DEFAULT_MARKUP));
  const [tier] = useState<Tier>("GOOD");
  const [packages, setPackages] = useState("good,better,best");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const markupNum = parseFloat(markup || "0");
  const costNum = parseCurrency(cost);
  const sell = costNum > 0 ? sellPrice(costNum, markupNum) : 0;
  const lineTotal = sell * parseFloat(quantity || "0");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim() || !cost || !quantity) {
      setError("Description, quantity, and cost are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onAdd({
        productId: "custom",
        description: description.trim(),
        quantity: parseFloat(quantity),
        unit: unit.trim() || "ea",
        cost: parseCurrency(cost),
        markup: parseFloat(markup || "0"),
        tier,
        packages,
        category,
        isLabor,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
      setSaving(false);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-600 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              title="Back to search"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h4 className="text-sm font-semibold text-white">
            {isLabor ? "Add Labor Line" : "Add Custom Item"}
          </h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isLabor ? "e.g. Tear-off labor" : "e.g. Asphalt shingles 30yr"}
            className="w-full rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              {isLabor ? "Hours" : "Qty"}
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="0"
              step="0.5"
              className="w-full rounded-lg bg-slate-800 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Unit</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="ea"
              className="w-full rounded-lg bg-slate-800 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              {isLabor ? "Rate/hr ($)" : "Unit Cost ($)"}
            </label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full rounded-lg bg-slate-800 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Markup %</label>
          <input
            type="number"
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
            min="0"
            step="1"
            className="w-full rounded-lg bg-slate-800 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <PackageToggle value={packages} onChange={setPackages} />

        {sell > 0 && (
          <div className="rounded-lg bg-slate-800/60 border border-slate-700 px-3 py-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">Sell price per unit</span>
            <span className="text-white font-semibold tabular-nums">{fmt(sell)}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-500">
            Line total:{" "}
            <span className="text-slate-300 font-medium">{fmt(lineTotal)}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold px-4 py-1.5 rounded-lg text-xs transition-colors"
            >
              {saving ? "Saving..." : "Add Line"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirm Add Panel (after selecting a product from search)
// ---------------------------------------------------------------------------

interface ConfirmAddPanelProps {
  product: Product;
  category: string;
  isLabor: boolean;
  onAdd: (item: Omit<EstimateItem, "id" | "estimateId">) => Promise<void>;
  onBack: () => void;
  onClose: () => void;
}

function ConfirmAddPanel({ product, category, isLabor, onAdd, onBack, onClose }: ConfirmAddPanelProps) {
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState(product.unit);
  const [cost, setCost] = useState(String(product.cost));
  const [markup, setMarkup] = useState(String(DEFAULT_MARKUP));
  const [tier] = useState<Tier>(product.tier ?? "GOOD");
  const [packages, setPackages] = useState(() => {
    // Use the catalog's explicit packages field if set, otherwise derive from tier
    if (product.packages && product.packages !== "good,better,best") return product.packages;
    const t = product.tier ?? "GOOD";
    if (t === "BEST" || t === "BEST_PLUS") return "best";
    if (t === "BETTER" || t === "BETTER_PLUS") return "better,best";
    return "good,better,best";
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const markupNum = parseFloat(markup || "0");
  const costNum = parseCurrency(cost);
  const sell = costNum > 0 ? sellPrice(costNum, markupNum) : 0;
  const lineTotal = sell * parseFloat(quantity || "0");

  async function handleAdd() {
    if (!quantity || parseFloat(quantity) <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onAdd({
        productId: product.id,
        description: product.name,
        quantity: parseFloat(quantity),
        unit: unit.trim() || product.unit,
        cost: costNum,
        markup: markupNum,
        tier,
        packages,
        category,
        isLabor,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-700">
        <button
          type="button"
          onClick={onBack}
          className="text-slate-500 hover:text-slate-300 transition-colors"
          title="Back to search"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-sm font-semibold text-white flex-1">Confirm Item</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Product info card */}
        <div className="rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 space-y-1">
          <p className="text-sm font-semibold text-white">{product.name}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {product.sku && <span className="font-mono text-slate-400">{product.sku}</span>}
            {product.sku && <span>·</span>}
            <span>{product.category}</span>
            {product.subCategory && <><span>›</span><span>{product.subCategory}</span></>}
            {product.supplier && <><span>·</span><span className="text-slate-500">{product.supplier}</span></>}
          </div>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        {/* Qty + unit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              {isLabor ? "Hours" : "Quantity"}
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="0"
              step="0.5"
              autoFocus
              className="w-full rounded-lg bg-slate-800 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Unit</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Cost */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Unit Cost ($)
          </label>
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            min="0"
            step="0.01"
            className="w-full rounded-lg bg-slate-800 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Markup */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Markup %</label>
          <input
            type="number"
            value={markup}
            onChange={(e) => setMarkup(e.target.value)}
            min="0"
            max="99"
            step="1"
            className="w-full rounded-lg bg-slate-800 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <PackageToggle value={packages} onChange={setPackages} />

        {/* Live pricing */}
        <div className="rounded-lg bg-slate-800/60 border border-slate-700 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Sell price / unit</span>
            <span className="text-white font-semibold tabular-nums">{fmt(sell)}</span>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-slate-700 pt-2">
            <span className="text-slate-400 font-medium">Line total</span>
            <span className="text-white font-bold tabular-nums text-sm">{fmt(lineTotal)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-semibold px-4 py-1.5 rounded-lg text-xs transition-colors"
        >
          {saving ? "Adding..." : "Add to Estimate"}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product Search Modal
// ---------------------------------------------------------------------------

interface ProductSearchModalProps {
  category: string;
  isLabor: boolean;
  onAdd: (item: Omit<EstimateItem, "id" | "estimateId">) => Promise<void>;
  onClose: () => void;
}

function ProductSearchModal({ category, isLabor, onAdd, onClose }: ProductSearchModalProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(isLabor ? "Labor" : "");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showManual, setShowManual] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load all products on mount to populate category list
  useEffect(() => {
    async function loadInitial() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (isLabor) params.set("category", "Labor");
        const res = await fetch(`/api/products?${params}`);
        if (res.ok) {
          const data: Product[] = await res.json();
          setProducts(data);
          // Extract unique categories
          const cats = Array.from(new Set(data.map((p) => p.category))).sort();
          setCategories(cats);
        }
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
    // Focus search input
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [isLabor]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (categoryFilter) params.set("category", categoryFilter);
        const res = await fetch(`/api/products?${params}`);
        if (res.ok) {
          const data: Product[] = await res.json();
          setProducts(data);
          if (!categoryFilter) {
            const cats = Array.from(new Set(data.map((p) => p.category))).sort();
            setCategories(cats);
          }
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, categoryFilter]);

  async function handleAdd(item: Omit<EstimateItem, "id" | "estimateId">) {
    await onAdd(item);
    onClose();
  }

  // Keyboard: close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (showManual) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg">
          <div className="p-5">
            <AddItemForm
              category={category}
              isLabor={isLabor}
              onAdd={handleAdd}
              onClose={onClose}
              onBack={() => setShowManual(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (selectedProduct) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: "90vh" }}>
          <ConfirmAddPanel
            product={selectedProduct}
            category={category}
            isLabor={isLabor}
            onAdd={handleAdd}
            onBack={() => setSelectedProduct(null)}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        {/* Modal header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white">
              {isLabor ? "Add Labor" : "Add Material"}
            </h2>
            <p className="text-xs text-slate-500 truncate">Search the product catalog</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search + filter */}
        <div className="px-5 py-3 space-y-2 border-b border-slate-700">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 111 11a6 6 0 0116 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or SKU..."
              className="w-full rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="w-4 h-4 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>

          {!isLabor && categories.length > 1 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto">
          {products.length === 0 && !loading ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-slate-500">
                {search ? `No products found for "${search}"` : "No products in catalog."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/60">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setSelectedProduct(product)}
                  className="w-full text-left px-5 py-3.5 hover:bg-slate-800 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors truncate">
                        {product.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {product.sku && (
                          <span className="text-xs font-mono text-slate-500">{product.sku}</span>
                        )}
                        {product.sku && <span className="text-slate-700 text-xs">·</span>}
                        <span className="text-xs text-slate-500">{product.category}</span>
                        {product.subCategory && (
                          <>
                            <span className="text-slate-700 text-xs">›</span>
                            <span className="text-xs text-slate-500">{product.subCategory}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-semibold text-slate-200 tabular-nums">{fmt(product.cost)}</p>
                      <p className="text-xs text-slate-500">/{product.unit}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer: enter manually */}
        <div className="px-5 py-3 border-t border-slate-700">
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
          >
            {isLabor ? "Enter custom labor item manually" : "Item not in catalog? Enter manually"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Item Row
// ---------------------------------------------------------------------------

interface ItemRowProps {
  item: EstimateItem;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Pick<EstimateItem, "description" | "quantity" | "unit" | "cost" | "markup" | "tier" | "packages">>) => Promise<void>;
}

function ItemRow({ item, onDelete, onUpdate }: ItemRowProps) {
  const [deleting,  setDeleting]  = useState(false);
  const [editing,   setEditing]   = useState(false);
  const [saving,    setSaving]    = useState(false);

  // Edit state — initialised from item each time edit opens
  const [desc,     setDesc]     = useState(item.description);
  const [qty,      setQty]      = useState(String(item.quantity));
  const [unit,     setUnit]     = useState(item.unit);
  const [cost,     setCost]     = useState(String(item.cost));
  const [markup,   setMarkup]   = useState(String(item.markup));
  const [tier]                  = useState<Tier>(item.tier);
  const [packages, setPackages] = useState(item.packages ?? "good,better,best");
  const [pkgSaving, setPkgSaving] = useState(false);

  const sell      = sellPrice(item.cost, item.markup);
  const lineTotal = sell * item.quantity;

  function openEdit() {
    setDesc(item.description);
    setQty(String(item.quantity));
    setUnit(item.unit);
    setCost(String(item.cost));
    setMarkup(String(item.markup));
    setPackages(item.packages ?? "good,better,best");
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate(item.id, {
        description: desc.trim() || item.description,
        quantity:    parseFloat(qty)    || item.quantity,
        unit:        unit.trim()        || item.unit,
        cost:        parseCurrency(cost),
        markup:      parseFloat(markup) || 0,
        tier,
        packages,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(item.id);
    } catch {
      setDeleting(false);
    }
  }

  // ── Edit mode ───────────────────────────────────────────────────────────────
  if (editing) {
    const previewCost = parseCurrency(cost);
    const previewSell = previewCost > 0 ? sellPrice(previewCost, parseFloat(markup) || 0) : 0;
    const previewTotal = previewSell * (parseFloat(qty) || 0);

    return (
      <div className="py-3 px-1 space-y-3 bg-slate-700/30 rounded-lg my-1 border border-slate-600">
        {/* Description */}
        <input
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full rounded-lg bg-slate-700 border border-slate-600 text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Description"
        />

        {/* Qty / Unit / Cost / Markup in a row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">Qty</label>
            <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} min="0"
              className="w-full rounded-lg bg-slate-700 border border-slate-600 text-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">Unit</label>
            <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-lg bg-slate-700 border border-slate-600 text-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">Unit Cost ($)</label>
            <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} min="0" step="0.01"
              className="w-full rounded-lg bg-slate-700 border border-slate-600 text-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-[10px] text-slate-500 mb-0.5">Markup %</label>
            <input type="number" value={markup} onChange={(e) => setMarkup(e.target.value)} min="0" max="100"
              className="w-full rounded-lg bg-slate-700 border border-slate-600 text-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Package selector */}
        <div className="flex items-center justify-between">
          <PackageToggle value={packages} onChange={setPackages} />
          {previewTotal > 0 && (
            <span className="text-xs text-slate-400">
              → <span className="text-white font-semibold">{fmt(previewTotal)}</span>
            </span>
          )}
        </div>

        {/* Save / Cancel */}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setEditing(false)}
            className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="text-xs text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  // ── Read mode ───────────────────────────────────────────────────────────────
  async function togglePkg(key: PkgKey) {
    const current = pkgsFromString(item.packages ?? "good,better,best");
    if (current.has(key) && current.size <= 1) return; // keep at least one
    const next = new Set(current);
    if (next.has(key)) next.delete(key); else next.add(key);
    const newVal = pkgsToString(next);
    setPkgSaving(true);
    try { await onUpdate(item.id, { packages: newVal }); }
    finally { setPkgSaving(false); }
  }

  return (
    <div className="flex items-center gap-3 py-2.5 px-1 group">
      {/* Inline package toggles */}
      <span className={`flex items-center gap-0.5 ${pkgSaving ? "opacity-50 pointer-events-none" : ""}`}>
        {PKG_KEYS.map((key) => {
          const m = PKG_META[key];
          const on = pkgsFromString(item.packages ?? "good,better,best").has(key);
          return (
            <button key={key} type="button" onClick={() => togglePkg(key)}
              title={`Toggle ${m.label} package`}
              className={`text-[9px] font-bold px-1 py-0.5 rounded border transition-colors ${on ? m.active : m.inactive}`}>
              {m.short}
            </button>
          );
        })}
      </span>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white leading-snug line-clamp-2" title={item.description}>
          {item.description}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {item.quantity} {item.unit} @ {fmt(item.cost)} cost · {item.markup}% markup → {fmt(sell)}/unit
        </p>
        {(item.sku || item.supplier) && (
          <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5">
            {item.sku && <span className="font-mono text-slate-500">{item.sku}</span>}
            {item.sku && item.supplier && <span>·</span>}
            {item.supplier && <span>{item.supplier}</span>}
          </p>
        )}
      </div>

      {/* Total */}
      <span className="text-sm font-semibold text-slate-200 flex-shrink-0 tabular-nums">
        {fmt(lineTotal)}
      </span>

      {/* Edit */}
      <button onClick={openEdit}
        className="flex-shrink-0 text-slate-500 hover:text-blue-400 transition-colors"
        title="Edit item">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>

      {/* Delete */}
      <button onClick={handleDelete} disabled={deleting}
        className="flex-shrink-0 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30"
        title="Remove item">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trade Section
// ---------------------------------------------------------------------------

// List of scopes that have a pre-built standard items template
const SCOPES_WITH_TEMPLATES = new Set([
  "Wall Assembly",
  "Wall Accessories",
  "Insulation",
  "Insulation Accessories",
  "Drywall",
  "Drywall Accessories",
  "Flooring",
  "Flooring Accessories",
  "Painting",
  "Paint Accessories",
  "Interior Trim",
  "Interior Trim Accessories",
  "Interior Doors",
  "Interior Door Assembly",
  "Vanity",
  "Vanity Assembly",
  "Toilet",
  "Toilet Assembly",
  "Sink",
  "Sink Assembly",
  "Faucet",
  "Faucet Assembly",
  "Tile",
  "Tile Accessories",
  "Kitchen Cabinets",
  "Kitchen Assembly",
  "Kitchen Sink",
  "Kitchen Sink Assembly",
  "Countertops",
  "Countertop Accessories",
  "Exterior Trim",
  "Exterior Trim Accessories",
  "Siding",
  "Siding Accessories",
  "Shutters",
  "Shutter Accessories",
  "Roofing",
  "Roofing Accessories",
  "Windows",
  "Window Accessories",
  "Exterior Door",
  "Exterior Door Accessories",
  "Decking",
  "Decking Accessories",
  "Deck Framing",
  "Deck Framing Accessories",
  // more added here as Turk reviews each sheet
]);

interface TradeSectionProps {
  trade: string;
  estimateId: string;
  items: EstimateItem[];
  onAddItem: (item: Omit<EstimateItem, "id" | "estimateId">) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onUpdateItem: (id: string, patch: Partial<Pick<EstimateItem, "description" | "quantity" | "unit" | "cost" | "markup" | "tier" | "packages">>) => Promise<void>;
  onItemsLoaded: (items: EstimateItem[]) => void;
}

function TradeSection({ trade, estimateId, items, onAddItem, onDeleteItem, onUpdateItem, onItemsLoaded }: TradeSectionProps) {
  const [modal, setModal] = useState<"material" | "labor" | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [clearingScope, setClearingScope] = useState(false);
  const [syncingPackages, setSyncingPackages] = useState(false);
  const [templateMsg, setTemplateMsg] = useState("");

  const isCustom = trade === "Custom";
  const materialItems = items.filter((i) => !i.isLabor);
  const laborItems = items.filter((i) => i.isLabor);
  const hasTemplate = SCOPES_WITH_TEMPLATES.has(trade);

  // Tier grouping — only activate when multiple tiers are present
  const TIER_ORDER_DISPLAY: Tier[] = ["GOOD", "GOOD_PLUS", "BETTER", "BETTER_PLUS", "BEST", "BEST_PLUS"];
  const tiersPresent = TIER_ORDER_DISPLAY.filter(t => items.some(i => i.tier === t));
  const multiTier = tiersPresent.length > 1;

  async function handleAdd(item: Omit<EstimateItem, "id" | "estimateId">) {
    await onAddItem(item);
    setModal(null);
  }

  async function clearScope() {
    if (!confirm(`Remove all ${trade} items from this estimate?`)) return;
    setClearingScope(true);
    setTemplateMsg("");
    try {
      const res = await fetch(
        `/api/estimates/${estimateId}/template?scope=${encodeURIComponent(trade)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clear scope");

      const estRes = await fetch(`/api/estimates/${estimateId}`);
      if (estRes.ok) {
        const est = await estRes.json();
        onItemsLoaded(est.items ?? []);
      }
      setTemplateMsg(`Removed ${data.deleted} items.`);
    } catch (err) {
      setTemplateMsg(err instanceof Error ? err.message : "Error clearing scope");
    } finally {
      setClearingScope(false);
    }
  }

  async function syncPackages() {
    setSyncingPackages(true);
    setTemplateMsg("");
    try {
      const res = await fetch(`/api/estimates/${estimateId}/sync-packages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: trade }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sync packages");

      const estRes = await fetch(`/api/estimates/${estimateId}`);
      if (estRes.ok) {
        const est = await estRes.json();
        onItemsLoaded(est.items ?? []);
      }
      setTemplateMsg(`Auto-assigned packages for ${data.updated} items from catalog tiers.`);
    } catch (err) {
      setTemplateMsg(err instanceof Error ? err.message : "Error syncing packages");
    } finally {
      setSyncingPackages(false);
    }
  }

  async function loadTemplate() {
    setLoadingTemplate(true);
    setTemplateMsg("");
    try {
      const res = await fetch(
        `/api/estimates/${estimateId}/template?scope=${encodeURIComponent(trade)}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load template");

      // Refresh items by re-fetching the estimate
      const estRes = await fetch(`/api/estimates/${estimateId}`);
      if (estRes.ok) {
        const est = await estRes.json();
        onItemsLoaded(est.items ?? []);
      }

      const msg = data.notFound?.length > 0
        ? `Added ${data.added} items. ${data.notFound.length} not found in catalog.`
        : `Added ${data.added} standard items.`;
      setTemplateMsg(msg);
    } catch (err) {
      setTemplateMsg(err instanceof Error ? err.message : "Error loading template");
    } finally {
      setLoadingTemplate(false);
    }
  }

  return (
    <>
      <div className={`bg-slate-800 border rounded-xl overflow-hidden ${isCustom ? "border-violet-800/60" : "border-slate-700"}`}>
        {/* Section header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${isCustom ? "border-violet-800/40 bg-violet-950/30" : "border-slate-700"}`}>
          <div className="flex items-center gap-2">
            {isCustom && (
              <div className="w-5 h-5 rounded bg-violet-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
            )}
            <h3 className={`text-sm font-semibold ${isCustom ? "text-violet-300" : "text-white"}`}>{trade}</h3>
            {isCustom && (
              <span className="text-xs text-violet-500 font-normal">Full catalog</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Load standard items — only shown when template exists and tab is empty */}
            {hasTemplate && items.length === 0 && (
              <button
                type="button"
                onClick={loadTemplate}
                disabled={loadingTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 border border-emerald-800 hover:border-emerald-600 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
              >
                {loadingTemplate ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                )}
                Standard Items
              </button>
            )}
            {/* Auto-assign packages from catalog tiers */}
            {items.length > 0 && !isCustom && (
              <button
                type="button"
                onClick={syncPackages}
                disabled={syncingPackages}
                title="Auto-assign G/B/★ packages based on each product's catalog tier"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 border border-violet-800 hover:border-violet-600 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
              >
                {syncingPackages ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Auto-assign
              </button>
            )}
            {/* Clear all items in this scope */}
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearScope}
                disabled={clearingScope}
                title="Remove all items in this section"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 border border-rose-900 hover:border-rose-700 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
              >
                {clearingScope ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
                Clear All
              </button>
            )}
            <button
              type="button"
              onClick={() => setModal("material")}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 border border-blue-800 hover:border-blue-600 px-2.5 py-1 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Material
            </button>
            <button
              type="button"
              onClick={() => setModal("labor")}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 border border-slate-600 hover:border-slate-500 px-2.5 py-1 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Labor
            </button>
          </div>
        </div>

        <div className="px-5 py-3 space-y-0">
          {/* Template feedback */}
          {templateMsg && (
            <p className="text-xs text-emerald-400 py-1 pb-2">{templateMsg}</p>
          )}

          {/* ── Multi-tier layout: group by tier band ─────────────────────── */}
          {multiTier ? (
            <div className="space-y-4">
              {tiersPresent.map(tier => {
                const tm = materialItems.filter(i => i.tier === tier);
                const tl = laborItems.filter(i => i.tier === tier);
                if (tm.length === 0 && tl.length === 0) return null;
                const tierTotal = [...tm, ...tl].reduce(
                  (s, i) => s + i.quantity * i.cost * (1 + i.markup / 100), 0
                );
                return (
                  <div key={tier}>
                    {/* Tier band header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide flex-shrink-0 ${TIER_COLORS[tier]}`}>
                        {TIER_LABELS[tier]}
                      </span>
                      <div className="flex-1 h-px bg-slate-700" />
                      <span className="text-xs font-semibold text-slate-400 flex-shrink-0">{fmt(tierTotal)}</span>
                    </div>

                    <div className="space-y-0 pl-1 border-l-2 border-slate-700/60 ml-1">
                      {/* Materials in this tier */}
                      {tm.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1 pt-0.5">
                            Materials
                          </p>
                          <div className="divide-y divide-slate-700/50">
                            {tm.map(item => (
                              <ItemRow key={item.id} item={item} onDelete={onDeleteItem} onUpdate={onUpdateItem} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Labor in this tier */}
                      {tl.length > 0 && (
                        <div className={tm.length > 0 ? "mt-2 pt-2 border-t border-slate-700/40" : ""}>
                          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1">
                            Labor
                          </p>
                          <div className="divide-y divide-slate-700/50">
                            {tl.map(item => (
                              <ItemRow key={item.id} item={item} onDelete={onDeleteItem} onUpdate={onUpdateItem} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── Single-tier layout (original): flat Materials / Labor ──── */
            <>
              {materialItems.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                      Materials
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-600 tabular-nums">cost {fmt(materialItems.reduce((s, i) => s + i.cost * i.quantity, 0))}</span>
                      <span className="text-[10px] font-semibold text-slate-400 tabular-nums">sell {fmt(materialItems.reduce((s, i) => s + sellPrice(i.cost, i.markup) * i.quantity, 0))}</span>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-700/50">
                    {materialItems.map((item) => (
                      <ItemRow key={item.id} item={item} onDelete={onDeleteItem} onUpdate={onUpdateItem} />
                    ))}
                  </div>
                </div>
              )}

              {laborItems.length > 0 && (
                <div className={materialItems.length > 0 ? "mt-3 pt-3 border-t border-slate-700/50" : ""}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                      Labor
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-600 tabular-nums">cost {fmt(laborItems.reduce((s, i) => s + i.cost * i.quantity, 0))}</span>
                      <span className="text-[10px] font-semibold text-slate-400 tabular-nums">sell {fmt(laborItems.reduce((s, i) => s + sellPrice(i.cost, i.markup) * i.quantity, 0))}</span>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-700/50">
                    {laborItems.map((item) => (
                      <ItemRow key={item.id} item={item} onDelete={onDeleteItem} onUpdate={onUpdateItem} />
                    ))}
                  </div>
                </div>
              )}

              {materialItems.length > 0 && laborItems.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-600/60 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 tabular-nums">cost {fmt(items.reduce((s, i) => s + i.cost * i.quantity, 0))}</span>
                    <span className="text-xs font-bold text-white tabular-nums">sell {fmt(items.reduce((s, i) => s + sellPrice(i.cost, i.markup) * i.quantity, 0))}</span>
                  </div>
                </div>
              )}
            </>
          )}

          {items.length === 0 && !hasTemplate && !isCustom && (
            <p className="text-xs text-slate-600 py-4 text-center">
              No items yet — use the buttons above to add materials or labor.
            </p>
          )}

          {items.length === 0 && isCustom && (
            <div className="py-8 text-center space-y-1">
              <p className="text-sm text-violet-400/70 font-medium">Open catalog</p>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                Search any material or labor from the full catalog — not limited to a specific scope.
              </p>
            </div>
          )}

          {items.length === 0 && hasTemplate && !templateMsg && (
            <p className="text-xs text-slate-600 py-4 text-center">
              Click <span className="text-emerald-600">Standard Items</span> to pre-load the catalog items for this scope, or add manually above.
            </p>
          )}
        </div>
      </div>

      {/* Product search modal */}
      {modal && (
        <ProductSearchModal
          category={trade}
          isLabor={modal === "labor"}
          onAdd={handleAdd}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Summary Panel — Good / Better / Best packages
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Markup Slider
// ---------------------------------------------------------------------------

interface MarkupSliderProps {
  value: number;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
  saving?: boolean;
}

function MarkupSlider({ value, onChange, onCommit, saving }: MarkupSliderProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Margin</h3>
        <div className="flex items-center gap-2">
          {saving && <span className="text-[10px] text-slate-500">Saving…</span>}
          <span className="text-sm font-bold text-white tabular-nums">{value}%</span>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={60}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
        className="w-full accent-blue-500 cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>0%</span>
        <span>30%</span>
        <span>60%</span>
      </div>
    </div>
  );
}

function TaxRateBox({ value, onCommit }: { value: number; onCommit: (rate: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  const isCustom = value !== DEFAULT_TAX_RATE;

  function commit() {
    const n = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(n) || n < 0 || n >= 100) {
      setDraft(String(value));
      return;
    }
    if (n !== value) onCommit(n);
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Material Tax</h3>
        <p className="text-[10px] text-slate-600">
          {isCustom ? `Custom · standard is ${DEFAULT_TAX_RATE}%` : "Standard rate"}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          min="0"
          max="99"
          step="0.1"
          className={`w-20 rounded-lg bg-slate-700 border px-2.5 py-1.5 text-sm text-right tabular-nums text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isCustom ? "border-amber-600" : "border-slate-600"
          }`}
        />
        <span className="text-sm text-slate-400">%</span>
      </div>
    </div>
  );
}

function dominantMarkup(items: EstimateItem[]): number {
  const counts = new Map<number, number>();
  for (const i of items) counts.set(i.markup, (counts.get(i.markup) ?? 0) + 1);
  let best = DEFAULT_MARKUP;
  let bestCount = 0;
  for (const [m, c] of counts) if (c > bestCount) { best = m; bestCount = c; }
  return best;
}

function MarkupOverridesPanel({ items, globalMarkup, onReset }: {
  items: EstimateItem[];
  globalMarkup: number;
  onReset: (id: string) => void;
}) {
  return (
    <div className="bg-amber-950/30 border border-amber-700/50 rounded-xl px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Custom margins</h3>
        <span className="text-[10px] text-amber-500/80">{items.length} line{items.length !== 1 ? "s" : ""} ≠ {globalMarkup}%</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-2 text-xs">
            <div className="min-w-0 flex-1">
              <p className="text-slate-200 truncate">{i.description}</p>
              <p className="text-[10px] text-slate-500">{i.category}</p>
            </div>
            <span className={`tabular-nums font-semibold ${i.markup > globalMarkup ? "text-emerald-400" : "text-amber-400"}`}>
              {i.markup}%
            </span>
            <button
              onClick={() => onReset(i.id)}
              className="text-[10px] text-slate-400 hover:text-white border border-slate-600 hover:border-slate-500 rounded px-1.5 py-0.5 transition-colors"
              title={`Reset to ${globalMarkup}%`}
            >
              Reset
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface SummaryPanelProps {
  items: EstimateItem[];
  packageLabels?: Record<PkgKey, string>;
  markupOverride?: number;
  taxRate?: number;
}

function SummaryPanel({ items, packageLabels = { good: 'Good', better: 'Better', best: 'Best' }, markupOverride, taxRate = DEFAULT_TAX_RATE }: SummaryPanelProps) {
  function effectiveMarkup(item: EstimateItem) {
    return markupOverride != null ? markupOverride : item.markup;
  }
  const PACKAGES = [
    {
      key: "good"   as const,
      label: packageLabels.good,
      description: "Base package",
      tiers: new Set<Tier>(["GOOD", "GOOD_PLUS"]),
      color: "text-emerald-400",
      border: "border-emerald-800/50",
      badge: "text-emerald-400 bg-emerald-900/30 border-emerald-700",
      accent: "border-t-2 border-t-emerald-600",
    },
    {
      key: "better" as const,
      label: packageLabels.better,
      description: `Includes ${packageLabels.good} +`,
      tiers: new Set<Tier>(["GOOD", "GOOD_PLUS", "BETTER", "BETTER_PLUS"]),
      color: "text-blue-400",
      border: "border-blue-800/50",
      badge: "text-blue-400 bg-blue-900/30 border-blue-700",
      accent: "border-t-2 border-t-blue-500",
    },
    {
      key: "best"   as const,
      label: packageLabels.best,
      description: `Includes ${packageLabels.better} +`,
      tiers: new Set<Tier>(["GOOD", "GOOD_PLUS", "BETTER", "BETTER_PLUS", "BEST", "BEST_PLUS"]),
      color: "text-amber-400",
      border: "border-amber-800/50",
      badge: "text-amber-400 bg-amber-900/30 border-amber-700",
      accent: "border-t-2 border-t-amber-500",
    },
  ];

  // A package is visible only if it has items that are NOT in the preceding package.
  // This prevents phantom cards when e.g. only 2 deck materials are selected.
  const packageTotals = useMemo(() => {
    return PACKAGES.map((pkg, idx) => {
      const key = pkg.key;
      const pkgItems = items.filter((i) => (i.packages ?? "good,better,best").split(",").includes(key));
      const materials = pkgItems.filter((i) => !i.isLabor).reduce((s, i) => s + sellPrice(i.cost, effectiveMarkup(i)) * i.quantity, 0);
      const labor = pkgItems.filter((i) => i.isLabor).reduce((s, i) => s + sellPrice(i.cost, effectiveMarkup(i)) * i.quantity, 0);
      const prevKey = idx > 0 ? PACKAGES[idx - 1].key : null;
      const visible = idx === 0 || items.some((i) => {
        const pkgs = (i.packages ?? "good,better,best").split(",");
        return pkgs.includes(key) && (prevKey === null || !pkgs.includes(prevKey));
      });
      return { ...pkg, ...withTaxAndDelivery(materials, labor, taxRate), visible };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, packageLabels, markupOverride, taxRate]);

  const visibleTotals = packageTotals.filter((p) => p.visible);
  const isMulti = visibleTotals.length > 1;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Pricing Options
        </h3>
        {isMulti && (
          <span className="text-[10px] text-slate-600">{visibleTotals.length} packages</span>
        )}
      </div>

      {/* Package cards — only packages with unique items are rendered */}
      {visibleTotals.map((pkg, idx) => {
        const prevTotal = idx > 0 ? visibleTotals[idx - 1].total : 0;
        const delta = idx > 0 ? pkg.total - prevTotal : 0;
        const showDelta = isMulti && delta > 0;
        const prevLabel = idx > 0 ? visibleTotals[idx - 1].label : "";

        return (
          <div
            key={pkg.key}
            className={`bg-slate-800 border rounded-xl overflow-hidden ${pkg.border} ${pkg.accent}`}
          >
            {/* Card header */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${pkg.badge}`}>
                  {pkg.label}
                </span>
                {!isMulti && idx === 0 && (
                  <span className="text-[10px] text-slate-600">base</span>
                )}
                {showDelta && (
                  <span className="text-[10px] text-slate-500">
                    +{fmt(delta)} vs {prevLabel}
                  </span>
                )}
              </div>
              <span className={`text-base font-bold tabular-nums ${pkg.color}`}>
                {fmt(pkg.total)}
              </span>
            </div>

            {/* Materials / Labor breakdown */}
            <div className="px-4 pb-3 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Materials</span>
                <span className="text-slate-300 tabular-nums">{fmt(pkg.materials)}</span>
              </div>
              {pkg.tax > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Tax ({taxRate}%)</span>
                  <span className="text-slate-300 tabular-nums">{fmt(pkg.tax)}</span>
                </div>
              )}
              {pkg.delivery > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Delivery</span>
                  <span className="text-slate-300 tabular-nums">{fmt(pkg.delivery)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Labor</span>
                <span className="text-slate-300 tabular-nums">{fmt(pkg.labor)}</span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Tip when all items are in one package */}
      {!isMulti && (
        <p className="text-[10px] text-slate-600 leading-relaxed pt-1">
          All items are in <span className="text-emerald-600">{packageLabels.good}</span>. Assign items to{" "}
          <span className="text-blue-600">{packageLabels.better}</span> or{" "}
          <span className="text-amber-600">{packageLabels.best}</span> tiers to build a three-option proposal.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Measurements Summary Panel
// ---------------------------------------------------------------------------

interface MeasurementRecord {
  tradeType: string;
  data: unknown;
}

interface MLine { label: string; value: string }

function fmtN(n: number, dec = 0): string {
  return n.toLocaleString("en-CA", { maximumFractionDigits: dec });
}

function summarizeMeasurement(tradeType: string, data: unknown): MLine[] {
  const d = data as Record<string, unknown>;
  const lines: MLine[] = [];

  switch (tradeType) {
    case "Roofing": {
      const planes = (d.planes as Array<{ area: number }>) ?? [];
      const sqft = planes.reduce((s, p) => s + (p.area || 0), 0);
      if (sqft) lines.push({ label: "Roof area", value: `${fmtN(sqft)} sqft` });
      const lfFields: [string, string][] = [
        ["Ridge", "ridge"], ["Hip", "hip"], ["Valleys", "valleys"],
        ["Rakes", "rakes"], ["Eaves", "eaves"],
      ];
      for (const [label, key] of lfFields) {
        const v = d[key] as number;
        if (v) lines.push({ label, value: `${fmtN(v)} LF` });
      }
      break;
    }
    case "Siding": {
      const walls = (d.walls as Array<{ width: number; height: number }>) ?? [];
      const wallArea = walls.reduce((s, w) => s + (w.width || 0) * (w.height || 0), 0);
      if (wallArea) lines.push({ label: "Wall area", value: `${fmtN(wallArea)} sqft` });
      const soffit = d.soffitArea as number;
      const fasciaLf = d.fasciaLf as number;
      if (soffit) lines.push({ label: "Soffit", value: `${fmtN(soffit)} sqft` });
      if (fasciaLf) lines.push({ label: "Fascia", value: `${fmtN(fasciaLf)} LF` });
      break;
    }
    case "Wall Assembly": {
      const walls = (d.walls as unknown[]) ?? [];
      const doors = (d.doors as unknown[]) ?? [];
      const windows = (d.windows as unknown[]) ?? [];
      if (walls.length) lines.push({ label: "Wall sections", value: String(walls.length) });
      if (doors.length) lines.push({ label: "Doors", value: String(doors.length) });
      if (windows.length) lines.push({ label: "Windows", value: String(windows.length) });
      break;
    }
    case "Drywall": {
      type DWWall = { lengthFt?: number; lengthIn?: number; heightFt?: number; heightIn?: number };
      type DWCeil = { lengthFt?: number; lengthIn?: number; widthFt?: number; widthIn?: number };
      const walls = (d.wallSections as DWWall[]) ?? [];
      const ceils = (d.ceilingSections as DWCeil[]) ?? [];
      const wallSqft = walls.reduce((s, w) => {
        const l = (w.lengthFt || 0) + (w.lengthIn || 0) / 12;
        const h = (w.heightFt || 0) + (w.heightIn || 0) / 12;
        return s + l * h;
      }, 0);
      const ceilSqft = ceils.reduce((s, c) => {
        const l = (c.lengthFt || 0) + (c.lengthIn || 0) / 12;
        const w = (c.widthFt || 0) + (c.widthIn || 0) / 12;
        return s + l * w;
      }, 0);
      if (wallSqft) lines.push({ label: "Wall area", value: `${fmtN(wallSqft)} sqft` });
      if (ceilSqft) lines.push({ label: "Ceiling area", value: `${fmtN(ceilSqft)} sqft` });
      break;
    }
    case "Drywall Accessories": {
      const cbLf = d.cornerBeadLf as number;
      const primer = d.primerSqft as number;
      const texture = d.textureSqft as number;
      if (cbLf) lines.push({ label: "Corner bead", value: `${fmtN(cbLf)} LF` });
      if (primer) lines.push({ label: "Primer", value: `${fmtN(primer)} sqft` });
      if (texture) lines.push({ label: "Texture", value: `${fmtN(texture)} sqft` });
      break;
    }
    case "Flooring": {
      const rooms = (d.rooms as Array<{ length: number; width: number }>) ?? [];
      const sqft = rooms.reduce((s, r) => s + (r.length || 0) * (r.width || 0), 0);
      if (sqft) lines.push({ label: "Floor area", value: `${fmtN(sqft)} sqft` });
      if (rooms.length > 1) lines.push({ label: "Rooms", value: String(rooms.length) });
      const tmLf = d.tMoldingLf as number;
      if (tmLf) lines.push({ label: "T-Molding", value: `${fmtN(tmLf)} LF` });
      break;
    }
    case "Tile": {
      const areas = (d.areas as Array<{ length: number; width: number }>) ?? [];
      const sqft = areas.reduce((s, a) => s + (a.length || 0) * (a.width || 0), 0);
      if (sqft) lines.push({ label: "Tile area", value: `${fmtN(sqft)} sqft` });
      if (areas.length > 1) lines.push({ label: "Areas", value: String(areas.length) });
      break;
    }
    case "Gutters": {
      const lf = d.linearFt as number;
      const ds = d.downspouts as number;
      const corners = d.corners as number;
      if (lf) lines.push({ label: "Length", value: `${fmtN(lf)} LF` });
      if (ds) lines.push({ label: "Downspouts", value: String(ds) });
      if (corners) lines.push({ label: "Corners", value: String(corners) });
      break;
    }
    case "Decking": {
      type DeckSec = { lengthFt: number; lengthIn: number; widthFt: number; widthIn: number };
      const sections = (d.sections as DeckSec[]) ?? [];
      const sqft = sections.reduce((s, sec) => {
        const l = (sec.lengthFt || 0) + (sec.lengthIn || 0) / 12;
        const w = (sec.widthFt || 0) + (sec.widthIn || 0) / 12;
        return s + l * w;
      }, 0);
      if (sqft) lines.push({ label: "Deck area", value: `${fmtN(sqft)} sqft` });
      const stairs = d.stairs as number;
      if (stairs) lines.push({ label: "Stairs", value: String(stairs) });
      break;
    }
    case "Deck Framing": {
      const ledger = (d.ledgerFt as number || 0) + (d.ledgerIn as number || 0) / 12;
      if (ledger) lines.push({ label: "Ledger", value: `${fmtN(ledger, 1)} LF` });
      const joists = d.joistCount as number;
      const posts = d.postCount as number;
      const piers = d.pierCount as number;
      if (joists) lines.push({ label: "Joists", value: String(joists) });
      if (posts) lines.push({ label: "Posts", value: String(posts) });
      if (piers) lines.push({ label: "Piers", value: String(piers) });
      break;
    }
    case "Decking Accessories": {
      const fasciaFt = (d.fasciaBoardsFt as number || 0) + (d.fasciaBoardsIn as number || 0) / 12;
      if (fasciaFt) lines.push({ label: "Fascia boards", value: `${fmtN(fasciaFt, 1)} LF` });
      const clSqft = d.conceLocSqft as number;
      const tlSqft = d.topLocSqft as number;
      if (clSqft) lines.push({ label: "ConceLoc", value: `${fmtN(clSqft)} sqft` });
      if (tlSqft) lines.push({ label: "TopLoc", value: `${fmtN(tlSqft)} sqft` });
      break;
    }
    case "Exterior Trim": {
      const lfFields: [string, string][] = [
        ["Corner boards", "cornerBoardsLf"], ["Frieze", "friezeLf"], ["Rake", "rakeLf"],
        ["Water table", "waterTableLf"], ["Window trim", "windowTrimLf"],
        ["Door trim", "doorTrimLf"], ["Fascia", "fasciaLf"],
      ];
      for (const [label, key] of lfFields) {
        const v = d[key] as number;
        if (v) lines.push({ label, value: `${fmtN(v)} LF` });
      }
      break;
    }
    case "Interior Trim": {
      const baseLf = d.baseLf as number;
      const crownLf = d.crownLf as number;
      const doors = (d.doors as unknown[]) ?? [];
      const windows = (d.windows as unknown[]) ?? [];
      if (baseLf) lines.push({ label: "Base", value: `${fmtN(baseLf)} LF` });
      if (crownLf) lines.push({ label: "Crown", value: `${fmtN(crownLf)} LF` });
      if (doors.length) lines.push({ label: "Doors", value: String(doors.length) });
      if (windows.length) lines.push({ label: "Windows", value: String(windows.length) });
      break;
    }
    case "Painting": {
      const surfaces = (d.surfaces as Array<{ length: number; width: number }>) ?? [];
      const sqft = surfaces.reduce((s, surf) => s + (surf.length || 0) * (surf.width || 0), 0);
      if (sqft) lines.push({ label: "Surface area", value: `${fmtN(sqft)} sqft` });
      const baseLf = d.baseLf as number;
      const casingLf = d.casingLf as number;
      if (baseLf) lines.push({ label: "Base", value: `${fmtN(baseLf)} LF` });
      if (casingLf) lines.push({ label: "Casing", value: `${fmtN(casingLf)} LF` });
      break;
    }
    case "Insulation": {
      const wallSecs = (d.wallSections as unknown[]) ?? [];
      const atticSecs = (d.atticSections as unknown[]) ?? [];
      const bags = d.blowInBags as number;
      if (wallSecs.length) lines.push({ label: "Wall sections", value: String(wallSecs.length) });
      if (atticSecs.length) lines.push({ label: "Attic sections", value: String(atticSecs.length) });
      if (bags) lines.push({ label: "Blow-in bags", value: String(bags) });
      break;
    }
    case "Kitchen": {
      const upper = d.upperCabinetsLf as number;
      const lower = d.lowerCabinetsLf as number;
      const counter = d.countertopLf as number;
      const backsplash = d.backsplashSqft as number;
      if (upper) lines.push({ label: "Upper cabinets", value: `${fmtN(upper)} LF` });
      if (lower) lines.push({ label: "Lower cabinets", value: `${fmtN(lower)} LF` });
      if (counter) lines.push({ label: "Countertop", value: `${fmtN(counter)} LF` });
      if (backsplash) lines.push({ label: "Backsplash", value: `${fmtN(backsplash)} sqft` });
      break;
    }
    case "Bathroom": {
      const vanities = d.vanities as number;
      const toilets = d.toilets as number;
      const showers = d.showers as number;
      if (vanities) lines.push({ label: "Vanities", value: String(vanities) });
      if (toilets) lines.push({ label: "Toilets", value: String(toilets) });
      if (showers) lines.push({ label: "Showers", value: String(showers) });
      break;
    }
    case "Windows/Doors": {
      const doors = (d.doors as unknown[]) ?? [];
      const windows = (d.windows as unknown[]) ?? [];
      if (doors.length) lines.push({ label: "Doors", value: String(doors.length) });
      if (windows.length) lines.push({ label: "Windows", value: String(windows.length) });
      break;
    }
    case "Demo": {
      const areas = (d.areas as Array<{ sqft: number }>) ?? [];
      const sqft = areas.reduce((s, a) => s + (a.sqft || 0), 0);
      if (sqft) lines.push({ label: "Demo area", value: `${fmtN(sqft)} sqft` });
      if (d.dumpsterNeeded) lines.push({ label: "Dumpster", value: "Yes" });
      break;
    }
    case "General Labor": {
      const tasks = (d.tasks as Array<{ label: string; sqft?: number; hours?: number; inputType?: string }>) ?? [];
      for (const task of tasks) {
        if (task.inputType === "sqft" && task.sqft) {
          lines.push({ label: task.label, value: `${fmtN(task.sqft)} sqft` });
        } else if (task.hours) {
          lines.push({ label: task.label, value: `${fmtN(task.hours, 1)} hrs` });
        }
      }
      break;
    }
  }

  return lines;
}

const TRADE_ICONS: Record<string, string> = {
  "Roofing": "🏠", "Siding": "🧱", "Wall Assembly": "🔩", "Drywall": "📋",
  "Drywall Accessories": "🔧", "Flooring": "🟫", "Tile": "🔷", "Gutters": "💧",
  "Decking": "🪵", "Deck Framing": "🔨", "Decking Accessories": "⚙️",
  "Exterior Trim": "🪟", "Interior Trim": "🚪", "Painting": "🎨",
  "Insulation": "🧊", "Kitchen": "🍳", "Bathroom": "🚿",
  "Windows/Doors": "🚪", "Demo": "🏚️", "General Labor": "👷",
};

function MeasurementsSummaryPanel({ measurements, items = [], markupOverride }: { measurements: MeasurementRecord[]; items?: EstimateItem[]; markupOverride?: number }) {
  const [open, setOpen] = useState(true);

  const sections = measurements
    .filter((m) => m.tradeType !== "Job" && m.tradeType !== SETTINGS_TRADE_TYPE)
    .map((m) => ({ tradeType: m.tradeType, lines: summarizeMeasurement(m.tradeType, m.data) }))
    .filter((s) => s.lines.length > 0);

  if (measurements.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between group"
      >
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Measurements
        </h3>
        <svg
          className={`w-3.5 h-3.5 text-slate-600 transition-transform ${open ? "" : "-rotate-90"}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="space-y-2">
          {sections.length === 0 ? (
            <p className="text-[11px] text-slate-600 italic">
              No measurements saved yet.
            </p>
          ) : (
            sections.map((section) => {
              const tradeItems = items.filter((i) => i.category.toLowerCase() === section.tradeType.toLowerCase());
              const totalCost = tradeItems.reduce((s, i) => s + i.cost * i.quantity, 0);
              const totalSell = tradeItems.reduce((s, i) => s + sellPrice(i.cost, markupOverride ?? i.markup) * i.quantity, 0);
              return (
                <div
                  key={section.tradeType}
                  className="bg-slate-800/60 border border-slate-700/60 rounded-lg overflow-hidden"
                >
                  <div className="px-3 py-1.5 bg-slate-800 border-b border-slate-700/60">
                    <span className="text-[11px] font-semibold text-slate-300">
                      {TRADE_ICONS[section.tradeType] && (
                        <span className="mr-1">{TRADE_ICONS[section.tradeType]}</span>
                      )}
                      {section.tradeType}
                    </span>
                  </div>
                  <div className="px-3 py-2 space-y-1">
                    {section.lines.map((line, i) => (
                      <div key={i} className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] text-slate-500 truncate">{line.label}</span>
                        <span className="text-[11px] text-slate-300 tabular-nums whitespace-nowrap font-medium">
                          {line.value}
                        </span>
                      </div>
                    ))}
                    {tradeItems.length > 0 && (
                      <div className="flex items-center justify-between gap-2 pt-1.5 mt-1 border-t border-slate-700/50">
                        <span className="text-[10px] text-slate-600">cost {fmt(totalCost)}</span>
                        <span className="text-[10px] font-semibold text-slate-400 tabular-nums">sell {fmt(totalSell)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main EstimateBuilder
// ---------------------------------------------------------------------------

interface EstimateBuilderProps {
  estimate: Estimate;
  isAdmin?: boolean;
  measurements?: MeasurementRecord[];
}

export default function EstimateBuilder({ estimate: initialEstimate, isAdmin = false, measurements = [] }: EstimateBuilderProps) {
  const [items, setItems] = useState<EstimateItem[]>(initialEstimate.items);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [status, setStatus] = useState<string>(initialEstimate.status);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [showRejectPanel, setShowRejectPanel] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");

  // Global markup = most common item markup; anything else is a per-line override
  const baseMarkup = useMemo(() => dominantMarkup(items), [items]);
  const [globalMarkup, setGlobalMarkup] = useState<number>(() => dominantMarkup(initialEstimate.items));
  const [markupSaving, setMarkupSaving] = useState(false);
  const [isDraggingMarkup, setIsDraggingMarkup] = useState(false);
  const overrideItems = useMemo(() => items.filter((i) => i.markup !== baseMarkup), [items, baseMarkup]);
  const previewItems = useMemo(
    () => isDraggingMarkup ? items.map((i) => (i.markup === baseMarkup ? { ...i, markup: globalMarkup } : i)) : items,
    [items, isDraggingMarkup, baseMarkup, globalMarkup]
  );

  const [taxRate, setTaxRate] = useState<number>(() => taxRateFrom(measurements));
  const saveTaxRate = useCallback(async (rate: number) => {
    setTaxRate(rate);
    await fetch(`/api/estimates/${initialEstimate.id}/measurements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeType: SETTINGS_TRADE_TYPE, data: { taxRate: rate }, applyAssembly: false }),
    });
  }, [initialEstimate.id]);

  const commitMarkup = useCallback(async (value: number) => {
    setIsDraggingMarkup(false);
    setMarkupSaving(true);
    try {
      const res = await fetch(`/api/estimates/${initialEstimate.id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markup: value }),
      });
      if (!res.ok) return;
      const { from } = await res.json() as { from: number };
      setItems((prev) => prev.map((i) => (i.markup === from ? { ...i, markup: value } : i)));
    } finally {
      setMarkupSaving(false);
    }
  }, [initialEstimate.id]);

  const scopes = useMemo(() => extractScopes(initialEstimate.notes), [initialEstimate.notes]);
  const plainNotes = useMemo(() => extractPlainNotes(initialEstimate.notes), [initialEstimate.notes]);

  // Derive per-tier display labels from deck measurement data (stored as _tierLabels when Apply is run)
  const packageLabels = useMemo((): Record<PkgKey, string> => {
    const deckM = measurements.find(m =>
      m.tradeType.toLowerCase() === 'decking' || m.tradeType.toLowerCase() === 'deck'
    )
    const tl = (deckM?.data as Record<string, unknown> | undefined)?._tierLabels as Record<string, string> | undefined
    if (tl) {
      return { good: tl.good ?? 'Good', better: tl.better ?? 'Better', best: tl.best ?? 'Best' }
    }
    return { good: 'Good', better: 'Better', best: 'Best' }
  }, [measurements]);

  // Determine which trades are active — union of scopes + categories from existing items
  const itemCategories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category));
    return Array.from(cats);
  }, [items]);

  const trades = useMemo(() => {
    const all = [...scopes];
    for (const cat of itemCategories) {
      if (!all.includes(cat)) all.push(cat);
    }
    return all;
  }, [scopes, itemCategories]);

  // Custom tab is always present at the end
  const allTabs = useMemo(() => {
    const result = trades.filter((t) => t !== "Custom");
    result.push("Custom");
    return result;
  }, [trades]);

  // Default to first scope tab; fall back to Custom if no scopes
  const currentTab = activeTab ?? (trades[0] ?? "Custom");

  const addItem = useCallback(
    async (item: Omit<EstimateItem, "id" | "estimateId">) => {
      const res = await fetch(`/api/estimates/${initialEstimate.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add item");
      }

      const created: EstimateItem = await res.json();
      setItems((prev) => [...prev, created]);
    },
    [initialEstimate.id]
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      const res = await fetch(
        `/api/estimates/${initialEstimate.id}/items?itemId=${itemId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete item");
      }

      setItems((prev) => prev.filter((i) => i.id !== itemId));
    },
    [initialEstimate.id]
  );

  const updateItem = useCallback(
    async (itemId: string, patch: Partial<Pick<EstimateItem, "description" | "quantity" | "unit" | "cost" | "markup" | "tier" | "packages">>) => {
      const res = await fetch(
        `/api/estimates/${initialEstimate.id}/items?itemId=${itemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }
      );

      if (!res.ok) {
        let msg = "Failed to update item";
        try { const d = await res.json(); msg = d.error || msg; } catch {}
        throw new Error(msg);
      }

      const updated: EstimateItem = await res.json();
      setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
    },
    [initialEstimate.id]
  );

  const currentTradeItems = useMemo(
    () => items.filter((i) => i.category === currentTab),
    [items, currentTab]
  );

  const statusColor: Record<string, string> = {
    draft: "bg-slate-700 text-slate-300",
    pending_review: "bg-amber-900/60 text-amber-300",
    approved: "bg-emerald-900 text-emerald-300",
    rejected: "bg-red-900 text-red-300",
    sent: "bg-blue-900 text-blue-300",
    completed: "bg-emerald-900 text-emerald-300",
    won: "bg-green-900 text-green-300",
    lost: "bg-red-900 text-red-300",
  };

  const statusLabel: Record<string, string> = {
    draft: "Draft",
    pending_review: "Pending Review",
    approved: "Approved",
    rejected: "Rejected",
    sent: "Sent",
    completed: "Completed",
    won: "Won",
    lost: "Lost",
  };

  async function handleSubmitForReview() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/estimates/${initialEstimate.id}/submit`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }
      setStatus("pending_review");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReview(action: "approve" | "reject") {
    setReviewing(true);
    setReviewError("");
    try {
      const res = await fetch(`/api/estimates/${initialEstimate.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: rejectNotes || undefined }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${action}`);
      }
      setStatus(action === "approve" ? "approved" : "rejected");
      setShowRejectPanel(false);
      setRejectNotes("");
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setReviewing(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-xl font-bold text-white truncate">
                  {initialEstimate.name}
                </h1>
                <span
                  className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    statusColor[status] ?? "bg-slate-700 text-slate-300"
                  }`}
                >
                  {statusLabel[status] ?? status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400 flex-wrap">
                <span className="font-medium text-slate-300">{initialEstimate.clientName}</span>
                {initialEstimate.address && (
                  <>
                    <span className="text-slate-600">·</span>
                    <span>{initialEstimate.address}</span>
                  </>
                )}
              </div>
              {plainNotes && (
                <p className="text-xs text-slate-500 mt-1.5 max-w-xl truncate">{plainNotes}</p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Measurements link */}
              <a
                href={`/estimates/${initialEstimate.id}/measurements`}
                className="inline-flex items-center gap-1.5 border border-slate-600 hover:border-slate-500 text-slate-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                title="Enter measurements to auto-populate"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">Measurements</span>
              </a>

              {/* Export PDF */}
              <a
                href={`/estimates/${initialEstimate.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                title="Open print / PDF view"
                className="inline-flex items-center gap-2 border border-slate-600 hover:border-slate-500 text-slate-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span className="hidden sm:inline">Export PDF</span>
              </a>

              {/* Submit for Review — only when draft */}
              {status === "draft" && (
                <button
                  type="button"
                  onClick={handleSubmitForReview}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Submit for Review
                    </>
                  )}
                </button>
              )}

              {/* Approve / Reject — admin only, when pending_review */}
              {isAdmin && status === "pending_review" && (
                <>
                  <button
                    type="button"
                    onClick={() => handleReview("approve")}
                    disabled={reviewing}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    {reviewing ? (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectPanel((v) => !v)}
                    disabled={reviewing}
                    className="inline-flex items-center gap-2 bg-red-700 hover:bg-red-600 disabled:bg-red-900 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reject
                  </button>
                </>
              )}
            </div>

          </div>

          {/* Reject panel */}
          {showRejectPanel && isAdmin && status === "pending_review" && (
            <div className="mt-3 bg-red-900/20 border border-red-800/50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-red-300">Rejection notes (optional)</p>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Explain what needs to be changed..."
                rows={3}
                className="w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleReview("reject")}
                  disabled={reviewing}
                  className="inline-flex items-center gap-2 bg-red-700 hover:bg-red-600 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  {reviewing ? "Rejecting..." : "Confirm Reject"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowRejectPanel(false); setRejectNotes(""); }}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {(submitError || reviewError) && (
            <p className="text-xs text-red-400">{submitError || reviewError}</p>
          )}
          </div>
        </div>
      </div>

      {/* Body: Tabs + Summary */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6 items-start">
        {/* Left: trade tabs + items */}
        <div className="flex-1 min-w-0 space-y-4">
          <>
            {/* Tab nav */}
            <div className="flex items-center gap-1 flex-wrap">
              {allTabs.map((trade) => {
                const isCustom = trade === "Custom";
                const count = items.filter((i) => i.category === trade).length;
                const isActive = currentTab === trade;
                return (
                  <button
                    key={trade}
                    type="button"
                    onClick={() => setActiveTab(trade)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? isCustom
                          ? "bg-violet-600 text-white"
                          : "bg-blue-600 text-white"
                        : isCustom
                        ? "text-violet-400 hover:text-white hover:bg-violet-900/30 border border-violet-800 hover:border-violet-600"
                        : "text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700"
                    }`}
                  >
                    {isCustom && (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                    {trade}
                    {count > 0 && (
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? isCustom ? "bg-violet-500 text-white" : "bg-blue-500 text-white"
                            : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active trade section */}
            {currentTab && (
              <TradeSection
                trade={currentTab}
                estimateId={initialEstimate.id}
                items={currentTradeItems}
                onAddItem={addItem}
                onDeleteItem={deleteItem}
                onUpdateItem={updateItem}
                onItemsLoaded={(loaded) => setItems(loaded)}
              />
            )}
          </>
        </div>

        {/* Right: Markup + Summary + Measurements */}
        <div className="w-72 flex-shrink-0 space-y-3">
          <MarkupSlider
            value={globalMarkup}
            onChange={(v) => { setIsDraggingMarkup(true); setGlobalMarkup(v); }}
            onCommit={commitMarkup}
            saving={markupSaving}
          />
          <TaxRateBox value={taxRate} onCommit={saveTaxRate} />
          {overrideItems.length > 0 && (
            <MarkupOverridesPanel
              items={overrideItems}
              globalMarkup={baseMarkup}
              onReset={(id) => updateItem(id, { markup: baseMarkup })}
            />
          )}
          <SummaryPanel items={previewItems} packageLabels={packageLabels} taxRate={taxRate} />
          <MeasurementsSummaryPanel measurements={measurements} items={previewItems} />
        </div>
      </div>
    </div>
  );
}
