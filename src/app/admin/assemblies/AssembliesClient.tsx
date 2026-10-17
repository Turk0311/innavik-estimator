"use client";

import { useState, useMemo, useRef, useEffect } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RawItem = { id: string; assemblyId: string; productId: string; quantity: number; unit: string; coverageSqft?: number | null };

type Assembly = {
  id: string;
  name: string;
  tradeType: string;
  description: string | null;
  items: RawItem[];
  createdAt: string | Date;
};

type Product = { id: string; name: string; unit: string; category: string; cost: number };

type DraftItem = { key: string; productId: string; productName: string; quantity: number; unit: string; coverageSqft: number | null };

type DraftAssembly = {
  id: string | null; // null = new
  name: string;
  tradeType: string;
  description: string;
  items: DraftItem[];
};

interface Props {
  initialAssemblies: Assembly[];
  products: Product[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRADE_TYPES = [
  "Roofing",
  "Siding",
  "Siding Accessories",
  "Exterior Trim",
  "Exterior Trim Accessories",
  "Interior Trim",
  "Interior Trim Accessories",
  "Wall Assembly",
  "Wall Accessories",
  "Windows/Doors",
  "Insulation",
  "Insulation Accessories",
  "Drywall",
  "Drywall Accessories",
  "Flooring",
  "Flooring Accessories",
  "Tile",
  "Bathroom",
  "Kitchen",
  "Countertops",
  "Painting",
  "Plumbing/Electrical",
  "Gutters",
  "Decking",
  "Decking Accessories",
  "Deck Framing",
  "Deck Framing Accessories",
  "Demo",
  "General Labor",
];

const CUSTOM_TRADE_VALUE = "__custom__";

const inputCls =
  "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

function uid() {
  return `${Date.now()}-${Math.random()}`;
}

// ---------------------------------------------------------------------------
// Product search dropdown
// ---------------------------------------------------------------------------

function ProductSearch({
  products,
  onSelect,
}: {
  products: Product[];
  onSelect: (p: Product) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [query, products]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search products to add..."
        className={inputCls}
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              className="w-full text-left px-4 py-2.5 hover:bg-slate-700 transition-colors flex items-center justify-between gap-3"
              onMouseDown={() => {
                onSelect(p);
                setQuery("");
                setOpen(false);
              }}
            >
              <span>
                <span className="text-white text-sm font-medium">{p.name}</span>
                <span className="text-slate-500 text-xs ml-2">{p.category}</span>
              </span>
              <span className="text-slate-400 text-xs flex-shrink-0">{p.unit}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assembly editor panel
// ---------------------------------------------------------------------------

function AssemblyEditor({
  draft,
  products,
  onSave,
  onDelete,
  onCancel,
  saving,
}: {
  draft: DraftAssembly;
  products: Product[];
  onSave: (d: DraftAssembly) => void;
  onDelete: (() => void) | null;
  onCancel: () => void;
  saving: boolean;
}) {
  const [d, setD] = useState<DraftAssembly>(draft);
  const [customTrade, setCustomTrade] = useState(
    () => !!draft.tradeType && !TRADE_TYPES.includes(draft.tradeType)
  );

  // Reset when the draft identity changes (switching between assemblies)
  useEffect(() => {
    setD(draft);
    setCustomTrade(!!draft.tradeType && !TRADE_TYPES.includes(draft.tradeType));
  }, [draft]);

  function setField<K extends keyof DraftAssembly>(key: K, value: DraftAssembly[K]) {
    setD((prev) => ({ ...prev, [key]: value }));
  }

  function addProduct(p: Product) {
    setD((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { key: uid(), productId: p.id, productName: p.name, quantity: 1, unit: p.unit, coverageSqft: null },
      ],
    }));
  }

  function updateItem(key: string, field: keyof DraftItem, value: string | number | null) {
    setD((prev) => ({
      ...prev,
      items: prev.items.map((item) => item.key === key ? { ...item, [field]: value } : item),
    }));
  }

  function removeItem(key: string) {
    setD((prev) => ({ ...prev, items: prev.items.filter((item) => item.key !== key) }));
  }

  const isNew = !d.id;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">
          {isNew ? "New Assembly" : "Edit Assembly"}
        </h2>
        <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Name + Trade Type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Assembly Name</label>
          <input
            type="text"
            value={d.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="e.g. Standard Shingle Package"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Trade Type</label>
          <select
            value={customTrade ? CUSTOM_TRADE_VALUE : d.tradeType}
            onChange={(e) => {
              if (e.target.value === CUSTOM_TRADE_VALUE) {
                setCustomTrade(true);
                setField("tradeType", "");
              } else {
                setCustomTrade(false);
                setField("tradeType", e.target.value);
              }
            }}
            className={inputCls}
          >
            <option value="">Select trade...</option>
            {TRADE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
            <option value={CUSTOM_TRADE_VALUE}>+ Add new trade...</option>
          </select>
          {customTrade && (
            <input
              type="text"
              value={d.tradeType}
              onChange={(e) => setField("tradeType", e.target.value)}
              placeholder="Enter new trade type name"
              className={`${inputCls} mt-2`}
              autoFocus
            />
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Description <span className="text-slate-600">(optional)</span></label>
        <input
          type="text"
          value={d.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder="Short description..."
          className={inputCls}
        />
      </div>

      {/* Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Line Items</label>
          <span className="text-xs text-slate-500">{d.items.length} item{d.items.length !== 1 ? "s" : ""}</span>
        </div>

        {d.items.length > 0 && (
          <div className="rounded-lg border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-700/50 text-xs text-slate-400">
                  <th className="text-left px-3 py-2 font-medium">Product</th>
                  <th className="text-left px-3 py-2 font-medium w-20">Qty</th>
                  <th className="text-left px-3 py-2 font-medium w-20">Unit</th>
                  <th className="text-left px-3 py-2 font-medium w-28">
                    <span>Sqft/unit</span>
                    <span className="block text-slate-600 font-normal normal-case" style={{fontSize: "10px"}}>covers per unit</span>
                  </th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {d.items.map((item) => (
                  <tr key={item.key} className="group">
                    <td className="px-3 py-2">
                      <span className="text-white font-medium">{item.productName}</span>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.quantity === 0 ? "" : item.quantity}
                        onChange={(e) => updateItem(item.key, "quantity", e.target.value === "" ? 0 : Number(e.target.value))}
                        min="0"
                        step="0.01"
                        className="w-full rounded bg-slate-700 border border-slate-600 text-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => updateItem(item.key, "unit", e.target.value)}
                        className="w-full rounded bg-slate-700 border border-slate-600 text-white px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.coverageSqft === null || item.coverageSqft === 0 ? "" : item.coverageSqft}
                        onChange={(e) =>
                          updateItem(item.key, "coverageSqft", e.target.value === "" ? null : Number(e.target.value))
                        }
                        min="0"
                        step="1"
                        placeholder="fixed"
                        title="How many sqft does 1 unit cover? Leave blank for a fixed quantity."
                        className="w-full rounded bg-slate-700 border border-slate-600 text-white placeholder-slate-600 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => removeItem(item.key)}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                        title="Remove item"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Product search */}
        <ProductSearch products={products} onSelect={addProduct} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
        <div>
          {onDelete && (
            <button
              onClick={onDelete}
              disabled={saving}
              className="text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
            >
              Delete assembly
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(d)}
            disabled={saving || !d.name || !d.tradeType}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
          >
            {saving ? "Saving…" : isNew ? "Create Assembly" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AssembliesClient({ initialAssemblies, products }: Props) {
  const [assemblies, setAssemblies] = useState<Assembly[]>(initialAssemblies);
  const [draft, setDraft] = useState<DraftAssembly | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build a productId → product name map for rendering existing items
  const productMap = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  // Group assemblies by tradeType
  const grouped = useMemo(() => {
    const map = new Map<string, Assembly[]>();
    for (const a of assemblies) {
      if (!map.has(a.tradeType)) map.set(a.tradeType, []);
      map.get(a.tradeType)!.push(a);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [assemblies]);

  function openNew() {
    setDraft({ id: null, name: "", tradeType: "", description: "", items: [] });
    setError(null);
  }

  function openEdit(a: Assembly) {
    setDraft({
      id: a.id,
      name: a.name,
      tradeType: a.tradeType,
      description: a.description ?? "",
      items: a.items.map((item) => ({
        key: uid(),
        productId: item.productId,
        productName: productMap.get(item.productId)?.name ?? item.productId,
        quantity: item.quantity,
        unit: item.unit,
        coverageSqft: item.coverageSqft ?? null,
      })),
    });
    setError(null);
  }

  async function handleSave(d: DraftAssembly) {
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: d.name,
        tradeType: d.tradeType,
        description: d.description || null,
        items: d.items.map(({ productId, quantity, unit, coverageSqft }) => ({ productId, quantity, unit, coverageSqft: coverageSqft ?? null })),
      };

      const res = d.id
        ? await fetch(`/api/admin/assemblies/${d.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/admin/assemblies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");

      const saved: Assembly = await res.json();

      setAssemblies((prev) =>
        d.id
          ? prev.map((a) => (a.id === saved.id ? saved : a))
          : [...prev, saved]
      );
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this assembly? This cannot be undone.")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/assemblies/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setAssemblies((prev) => prev.filter((a) => a.id !== id));
      setDraft(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      {/* ── Left: Assembly list ── */}
      <div className="lg:col-span-2 space-y-4">
        <button
          onClick={openNew}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Assembly
        </button>

        {assemblies.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl px-6 py-10 text-center">
            <p className="text-slate-400 text-sm">No assemblies yet.</p>
            <p className="text-slate-500 text-xs mt-1">Click "New Assembly" to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([tradeType, group]) => (
              <div key={tradeType} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-750 border-b border-slate-700">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{tradeType}</p>
                </div>
                <ul className="divide-y divide-slate-700/50">
                  {group.map((a) => {
                    const isActive = draft?.id === a.id;
                    return (
                      <li key={a.id}>
                        <button
                          onClick={() => openEdit(a)}
                          className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between gap-2 ${
                            isActive ? "bg-blue-900/20" : "hover:bg-slate-700/50"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${isActive ? "text-blue-300" : "text-white"}`}>
                              {a.name}
                            </p>
                            {a.description && (
                              <p className="text-xs text-slate-500 truncate mt-0.5">{a.description}</p>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 flex-shrink-0 bg-slate-700 px-2 py-0.5 rounded-full">
                            {a.items.length} item{a.items.length !== 1 ? "s" : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Right: Editor ── */}
      <div className="lg:col-span-3">
        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-700 text-red-300 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {draft ? (
          <AssemblyEditor
            key={draft.id ?? "new"}
            draft={draft}
            products={products}
            onSave={handleSave}
            onDelete={draft.id ? () => handleDelete(draft.id!) : null}
            onCancel={() => setDraft(null)}
            saving={saving}
          />
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-xl px-8 py-16 text-center">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </div>
            <p className="text-slate-300 font-medium text-sm">Select an assembly to edit</p>
            <p className="text-slate-500 text-xs mt-1">or create a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}
