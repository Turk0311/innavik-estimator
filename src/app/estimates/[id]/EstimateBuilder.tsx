"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Tier = "GOOD" | "BETTER" | "BEST";

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
  category: string;
  isLabor: boolean;
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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIER_LABELS: Record<Tier, string> = {
  GOOD: "Good",
  BETTER: "Better",
  BEST: "Best",
};

const TIER_COLORS: Record<Tier, string> = {
  GOOD: "text-emerald-400 bg-emerald-900/30 border-emerald-700",
  BETTER: "text-blue-400 bg-blue-900/30 border-blue-700",
  BEST: "text-amber-400 bg-amber-900/30 border-amber-700",
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
  const [tier, setTier] = useState<Tier>("GOOD");
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

        <div className="grid grid-cols-2 gap-3">
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

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as Tier)}
              className="w-full rounded-lg bg-slate-800 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="GOOD">Good</option>
              <option value="BETTER">Better</option>
              <option value="BEST">Best</option>
            </select>
          </div>
        </div>

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
  const [tier, setTier] = useState<Tier>(product.tier ?? "GOOD");
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

        {/* Markup + Tier */}
        <div className="grid grid-cols-2 gap-3">
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
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as Tier)}
              className="w-full rounded-lg bg-slate-800 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="GOOD">Good</option>
              <option value="BETTER">Better</option>
              <option value="BEST">Best</option>
            </select>
          </div>
        </div>

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
}

function ItemRow({ item, onDelete }: ItemRowProps) {
  const [deleting, setDeleting] = useState(false);
  const sell = sellPrice(item.cost, item.markup);
  const lineTotal = sell * item.quantity;

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(item.id);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-3 py-2.5 px-1 group">
      {/* Tier badge */}
      <span
        className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${TIER_COLORS[item.tier]}`}
      >
        {TIER_LABELS[item.tier]}
      </span>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{item.description}</p>
        <p className="text-xs text-slate-500">
          {item.quantity} {item.unit} @ {fmt(item.cost)} cost · {item.markup}% markup → {fmt(sell)}/unit
        </p>
      </div>

      {/* Total */}
      <span className="text-sm font-semibold text-slate-200 flex-shrink-0 tabular-nums">
        {fmt(lineTotal)}
      </span>

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-slate-600 hover:text-red-400 transition-all disabled:opacity-50"
        title="Remove item"
      >
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

interface TradeSectionProps {
  trade: string;
  items: EstimateItem[];
  onAddItem: (item: Omit<EstimateItem, "id" | "estimateId">) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
}

function TradeSection({ trade, items, onAddItem, onDeleteItem }: TradeSectionProps) {
  const [modal, setModal] = useState<"material" | "labor" | null>(null);

  const materialItems = items.filter((i) => !i.isLabor);
  const laborItems = items.filter((i) => i.isLabor);

  async function handleAdd(item: Omit<EstimateItem, "id" | "estimateId">) {
    await onAddItem(item);
    setModal(null);
  }

  return (
    <>
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">{trade}</h3>
          <div className="flex items-center gap-2">
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
          {/* Materials */}
          {materialItems.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
                Materials
              </p>
              <div className="divide-y divide-slate-700/50">
                {materialItems.map((item) => (
                  <ItemRow key={item.id} item={item} onDelete={onDeleteItem} />
                ))}
              </div>
            </div>
          )}

          {/* Labor */}
          {laborItems.length > 0 && (
            <div className={materialItems.length > 0 ? "mt-3 pt-3 border-t border-slate-700/50" : ""}>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">
                Labor
              </p>
              <div className="divide-y divide-slate-700/50">
                {laborItems.map((item) => (
                  <ItemRow key={item.id} item={item} onDelete={onDeleteItem} />
                ))}
              </div>
            </div>
          )}

          {items.length === 0 && (
            <p className="text-xs text-slate-600 py-4 text-center">
              No items yet — use the buttons above to add materials or labor.
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
// Summary Panel
// ---------------------------------------------------------------------------

interface SummaryPanelProps {
  items: EstimateItem[];
}

function SummaryPanel({ items }: SummaryPanelProps) {
  const tiers: Tier[] = ["GOOD", "BETTER", "BEST"];

  const totals = useMemo(() => {
    const result: Record<Tier, { materials: number; labor: number }> = {
      GOOD: { materials: 0, labor: 0 },
      BETTER: { materials: 0, labor: 0 },
      BEST: { materials: 0, labor: 0 },
    };

    for (const item of items) {
      const sell = sellPrice(item.cost, item.markup) * item.quantity;
      if (item.isLabor) {
        result[item.tier].labor += sell;
      } else {
        result[item.tier].materials += sell;
      }
    }

    return result;
  }, [items]);

  // Cumulative totals — each tier includes all lower tiers
  const cumulative = useMemo(() => {
    return {
      GOOD: {
        materials: totals.GOOD.materials,
        labor: totals.GOOD.labor,
      },
      BETTER: {
        materials: totals.GOOD.materials + totals.BETTER.materials,
        labor: totals.GOOD.labor + totals.BETTER.labor,
      },
      BEST: {
        materials: totals.GOOD.materials + totals.BETTER.materials + totals.BEST.materials,
        labor: totals.GOOD.labor + totals.BETTER.labor + totals.BEST.labor,
      },
    };
  }, [totals]);

  const tierConfigs = [
    { tier: "GOOD" as Tier, label: "Good", addLabel: "(base)" },
    { tier: "BETTER" as Tier, label: "Better", addLabel: "(+ upgrades)" },
    { tier: "BEST" as Tier, label: "Best", addLabel: "(+ premium)" },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-white">Summary</h3>
          <p className="text-xs text-slate-500 mt-0.5">Cumulative per tier</p>
        </div>

        <div className="divide-y divide-slate-700">
          {tierConfigs.map(({ tier, label, addLabel }) => {
            const c = cumulative[tier];
            const total = c.materials + c.labor;

            return (
              <div key={tier} className="px-5 py-4">
                <div className={`flex items-center gap-2 mb-3`}>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border ${TIER_COLORS[tier]}`}>
                    {label}
                  </span>
                  <span className="text-xs text-slate-600">{addLabel}</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Materials</span>
                    <span className="text-slate-300 tabular-nums">{fmt(c.materials)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Labor</span>
                    <span className="text-slate-300 tabular-nums">{fmt(c.labor)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-700">
                    <span className="text-slate-300 font-semibold">Total</span>
                    <span className="text-white font-bold tabular-nums text-sm">{fmt(total)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tier delta breakdown */}
      {tiers.some((t) => totals[t].materials + totals[t].labor > 0) && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-700">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Tier additions
            </h4>
          </div>
          <div className="divide-y divide-slate-700">
            {tiers.map((tier) => {
              const delta = totals[tier].materials + totals[tier].labor;
              if (delta === 0) return null;
              return (
                <div key={tier} className="flex items-center justify-between px-5 py-2.5">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${TIER_COLORS[tier]}`}>
                    {TIER_LABELS[tier]}
                  </span>
                  <span className="text-xs text-slate-400 tabular-nums">+{fmt(delta)}</span>
                </div>
              );
            })}
          </div>
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
}

export default function EstimateBuilder({ estimate: initialEstimate }: EstimateBuilderProps) {
  const [items, setItems] = useState<EstimateItem[]>(initialEstimate.items);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const scopes = useMemo(() => extractScopes(initialEstimate.notes), [initialEstimate.notes]);
  const plainNotes = useMemo(() => extractPlainNotes(initialEstimate.notes), [initialEstimate.notes]);

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

  // Set active tab default to first trade
  const currentTab = activeTab ?? trades[0] ?? null;

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

  const currentTradeItems = useMemo(
    () => items.filter((i) => i.category === currentTab),
    [items, currentTab]
  );

  const statusColor: Record<string, string> = {
    draft: "bg-slate-700 text-slate-300",
    sent: "bg-blue-900 text-blue-300",
    completed: "bg-emerald-900 text-emerald-300",
    won: "bg-green-900 text-green-300",
    lost: "bg-red-900 text-red-300",
  };

  const statusLabel: Record<string, string> = {
    draft: "Draft",
    sent: "Sent",
    completed: "Completed",
    won: "Won",
    lost: "Lost",
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-xl font-bold text-white truncate">
                  {initialEstimate.name}
                </h1>
                <span
                  className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    statusColor[initialEstimate.status] ?? "bg-slate-700 text-slate-300"
                  }`}
                >
                  {statusLabel[initialEstimate.status] ?? initialEstimate.status}
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

            {/* Export placeholder */}
            <button
              type="button"
              title="Export to PDF (coming soon)"
              className="flex-shrink-0 inline-flex items-center gap-2 border border-slate-600 hover:border-slate-500 text-slate-400 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Body: Tabs + Summary */}
      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6 items-start">
        {/* Left: trade tabs + items */}
        <div className="flex-1 min-w-0 space-y-4">
          {trades.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl px-8 py-16 text-center">
              <svg
                className="w-12 h-12 text-slate-600 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-slate-400 text-sm">No scopes selected for this estimate.</p>
            </div>
          ) : (
            <>
              {/* Tab nav */}
              <div className="flex items-center gap-1 flex-wrap">
                {trades.map((trade) => {
                  const count = items.filter((i) => i.category === trade).length;
                  const isActive = currentTab === trade;
                  return (
                    <button
                      key={trade}
                      type="button"
                      onClick={() => setActiveTab(trade)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700"
                      }`}
                    >
                      {trade}
                      {count > 0 && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full ${
                            isActive ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-400"
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
                  items={currentTradeItems}
                  onAddItem={addItem}
                  onDeleteItem={deleteItem}
                />
              )}
            </>
          )}
        </div>

        {/* Right: Summary */}
        <div className="w-72 flex-shrink-0">
          <SummaryPanel items={items} />
        </div>
      </div>
    </div>
  );
}
