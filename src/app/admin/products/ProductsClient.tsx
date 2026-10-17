"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// CSV helpers (runs in the browser — no extra deps)
// ---------------------------------------------------------------------------

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// Map flexible column header names → canonical keys
const COL_MAP: Record<string, string> = {
  "name": "name", "product name": "name", "product": "name",
  "sku": "sku", "item #": "sku", "item number": "sku",
  "category": "category", "cat": "category",
  "subcategory": "subcategory", "sub category": "subcategory",
  "sub-category": "subcategory", "collection": "subcategory",
  "supplier": "supplier", "vendor": "supplier",
  "cost": "cost", "price": "cost", "unit cost": "cost", "unit price": "cost",
  "unit": "unit", "uom": "unit",
  "tier": "tier",
  "active": "active",
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 1) return [];
  const firstRow = parseCSVRow(lines[0]);
  const firstCell = firstRow[0]?.trim().toLowerCase() ?? '';
  // If the first cell matches a known header alias, treat row 0 as headers.
  // Otherwise fall back to positional mapping: col 0 = name, col 1 = cost.
  const hasHeaders = Object.prototype.hasOwnProperty.call(COL_MAP, firstCell);
  const headers = hasHeaders
    ? firstRow.map((h) => COL_MAP[h.trim().toLowerCase()] ?? h.trim().toLowerCase())
    : ['name', 'cost'];
  return lines
    .slice(hasHeaders ? 1 : 0)
    .map((line) => {
      const values = parseCSVRow(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i]?.trim() ?? ""; });
      return row;
    })
    .filter((row) => Object.values(row).some((v) => v));
}


const TIERS = ["GOOD", "GOOD_PLUS", "BETTER", "BETTER_PLUS", "BEST", "BEST_PLUS"] as const;
type Tier = (typeof TIERS)[number];

const PKG_KEYS = ["good", "better", "best"] as const;
type PkgKey = typeof PKG_KEYS[number];
const PKG_META: Record<PkgKey, { short: string; active: string; inactive: string }> = {
  good:   { short: "G", active: "bg-emerald-700 text-emerald-100 border-emerald-600", inactive: "border-slate-600 text-slate-500 hover:border-slate-400" },
  better: { short: "B", active: "bg-blue-700 text-blue-100 border-blue-600",          inactive: "border-slate-600 text-slate-500 hover:border-slate-400" },
  best:   { short: "★", active: "bg-amber-700 text-amber-100 border-amber-600",       inactive: "border-slate-600 text-slate-500 hover:border-slate-400" },
};
function pkgsFromString(s: string): Set<PkgKey> {
  const set = new Set<PkgKey>();
  for (const p of s.split(",")) { const t = p.trim() as PkgKey; if (PKG_KEYS.includes(t)) set.add(t); }
  return set;
}
function pkgsToString(set: Set<PkgKey>): string {
  return PKG_KEYS.filter((k) => set.has(k)).join(",") || "good";
}

interface Product {
  id: string;
  sku: string | null;
  name: string;
  category: string;
  subCategory: string | null;
  supplier: string | null;
  cost: number;
  unit: string;
  tier: Tier;
  packages: string;
  active: boolean;
  createdAt: string;
}

interface FormState {
  sku: string;
  name: string;
  category: string;
  subCategory: string;
  supplier: string;
  cost: string;
  unit: string;
  tier: Tier;
  packages: string;
  active: boolean;
}

const emptyForm: FormState = {
  sku: "",
  name: "",
  category: "",
  subCategory: "",
  supplier: "",
  cost: "",
  unit: "",
  tier: "GOOD",
  packages: "good,better,best",
  active: true,
};

const tierLabel: Record<Tier, string> = {
  GOOD:        "Good",
  GOOD_PLUS:   "Good+",
  BETTER:      "Better",
  BETTER_PLUS: "Better+",
  BEST:        "Best",
  BEST_PLUS:   "Best+",
};

const tierColor: Record<Tier, string> = {
  GOOD:        "bg-emerald-900/60 text-emerald-300",
  GOOD_PLUS:   "bg-green-900/60   text-green-300",
  BETTER:      "bg-blue-900/60    text-blue-300",
  BETTER_PLUS: "bg-sky-900/60     text-sky-300",
  BEST:        "bg-amber-900/60   text-amber-300",
  BEST_PLUS:   "bg-orange-900/60  text-orange-300",
};

// ---------------------------------------------------------------------------
// Assemblies (for the "Add to Assembly" section of the product modal)
// ---------------------------------------------------------------------------

interface AssemblySummary {
  id: string;
  name: string;
  tradeType: string;
}

const ASSEMBLY_TRADE_TYPES = [
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

export default function ProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterTier, setFilterTier] = useState("");
  const [filterActive, setFilterActive] = useState("true");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Add to Assembly
  const [assemblies, setAssemblies] = useState<AssemblySummary[]>([]);
  const [addToAssembly, setAddToAssembly] = useState(false);
  const [assemblyMode, setAssemblyMode] = useState<"existing" | "new">("existing");
  const [selectedAssemblyId, setSelectedAssemblyId] = useState("");
  const [newAssemblyName, setNewAssemblyName] = useState("");
  const [newAssemblyTradeType, setNewAssemblyTradeType] = useState("");
  const [assemblyQty, setAssemblyQty] = useState("1");
  const [assemblyUnit, setAssemblyUnit] = useState("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // CSV import
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[] | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (filterCategory) params.set("category", filterCategory);
    if (filterTier) params.set("tier", filterTier);
    if (filterActive !== "") params.set("active", filterActive);

    try {
      const res = await fetch(`/api/admin/products?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load products");
      const data = await res.json();
      setProducts(data);
    } catch {
      setError("Failed to load products. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterTier, filterActive]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Load distinct categories once on mount
  useEffect(() => {
    fetch("/api/admin/products?distinct=category")
      .then((r) => r.json())
      .then((data: string[]) => setCategories(data))
      .catch(() => {});
  }, []);

  // Load assemblies once on mount (for "Add to Assembly" picker)
  useEffect(() => {
    fetch("/api/admin/assemblies")
      .then((r) => r.json())
      .then((data: { id: string; name: string; tradeType: string }[]) =>
        setAssemblies(data.map((a) => ({ id: a.id, name: a.name, tradeType: a.tradeType })))
      )
      .catch(() => {});
  }, []);

  const filtered = products.filter((p) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku ?? "").toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.subCategory ?? "").toLowerCase().includes(q) ||
      (p.supplier ?? "").toLowerCase().includes(q)
    );
  });

  function resetAssemblyFields() {
    setAddToAssembly(false);
    setAssemblyMode("existing");
    setSelectedAssemblyId("");
    setNewAssemblyName("");
    setNewAssemblyTradeType("");
    setAssemblyQty("1");
    setAssemblyUnit("");
  }

  function openAdd() {
    setEditingProduct(null);
    setForm(emptyForm);
    setFormError("");
    resetAssemblyFields();
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setForm({
      sku: product.sku ?? "",
      name: product.name,
      category: product.category,
      subCategory: product.subCategory ?? "",
      supplier: product.supplier ?? "",
      cost: String(product.cost),
      unit: product.unit,
      tier: product.tier,
      packages: product.packages ?? "good,better,best",
      active: product.active,
    });
    setFormError("");
    resetAssemblyFields();
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingProduct(null);
    setFormError("");
    resetAssemblyFields();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim() || !form.category || !form.cost || !form.unit.trim()) {
      setFormError("Name, category, cost, and unit are required.");
      return;
    }

    const costNum = parseFloat(form.cost);
    if (isNaN(costNum) || costNum < 0) {
      setFormError("Cost must be a valid non-negative number.");
      return;
    }

    if (addToAssembly) {
      if (assemblyMode === "existing" && !selectedAssemblyId) {
        setFormError("Select an assembly to add this product to, or switch to \"New Assembly\".");
        return;
      }
      if (assemblyMode === "new" && (!newAssemblyName.trim() || !newAssemblyTradeType)) {
        setFormError("Enter a name and trade type for the new assembly.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        sku: form.sku.trim() || null,
        name: form.name.trim(),
        category: form.category,
        subCategory: form.subCategory.trim() || null,
        supplier: form.supplier.trim() || null,
        cost: costNum,
        unit: form.unit.trim(),
        tier: form.tier,
        packages: form.packages || "good,better,best",
        active: form.active,
      };

      let res: Response;
      if (editingProduct) {
        res = await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error ?? "Failed to save product.");
        return;
      }

      const savedProduct: Product = await res.json();

      // Optionally attach this product to an assembly as a line item
      if (addToAssembly) {
        const qty = parseFloat(assemblyQty);
        const unit = assemblyUnit.trim() || payload.unit;

        if (assemblyMode === "existing") {
          const itemRes = await fetch(`/api/admin/assemblies/${selectedAssemblyId}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: savedProduct.id,
              quantity: isNaN(qty) ? 1 : qty,
              unit,
            }),
          });
          if (!itemRes.ok) {
            const err = await itemRes.json();
            setError(`Product saved, but failed to add it to the assembly: ${err.error ?? "unknown error"}`);
          }
        } else {
          const asmRes = await fetch("/api/admin/assemblies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: newAssemblyName.trim(),
              tradeType: newAssemblyTradeType,
              items: [{ productId: savedProduct.id, quantity: isNaN(qty) ? 1 : qty, unit }],
            }),
          });
          if (!asmRes.ok) {
            const err = await asmRes.json();
            setError(`Product saved, but failed to create the assembly: ${err.error ?? "unknown error"}`);
          } else {
            const newAsm = await asmRes.json();
            setAssemblies((prev) => [...prev, { id: newAsm.id, name: newAsm.name, tradeType: newAsm.tradeType }]);
          }
        }
      }

      closeModal();
      fetchProducts();
    } catch {
      setFormError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? "Failed to delete product.");
      } else {
        setDeleteTarget(null);
        fetchProducts();
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setDeleting(false);
    }
  }

  function handleCSVFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      setCsvPreview(rows);
      setCsvResult(null);
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  async function handleCSVImport() {
    if (!csvPreview) return;
    setCsvImporting(true);
    try {
      const res = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: csvPreview }),
      });
      const result = await res.json();
      setCsvResult(result);
      setCsvPreview(null);
      fetchProducts();
    } catch {
      setCsvResult({ created: 0, updated: 0, errors: ["Network error — import failed."] });
      setCsvPreview(null);
    } finally {
      setCsvImporting(false);
    }
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="text"
          placeholder="Search name, SKU, supplier..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-48 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-lg bg-slate-900 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filterTier}
          onChange={(e) => setFilterTier(e.target.value)}
          className="rounded-lg bg-slate-900 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Tiers</option>
          {TIERS.map((t) => (
            <option key={t} value={t}>{tierLabel[t]}</option>
          ))}
        </select>
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="rounded-lg bg-slate-900 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
          <option value="">All</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          {/* Hidden file input */}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCSVFileChange}
          />
          <button
            onClick={() => csvInputRef.current?.click()}
            className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold px-4 py-2 rounded-lg text-sm transition-colors border border-slate-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Import CSV
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Product
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-16 text-center text-slate-400 text-sm">Loading products...</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-slate-400 text-sm">
            No products found. Try adjusting your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">SKU</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Sub-Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Supplier</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Cost</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Unit</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tier</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Active</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{product.sku ?? "—"}</td>
                    <td className="px-4 py-3 text-white font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-slate-300">{product.category}</td>
                    <td className="px-4 py-3 text-slate-400">{product.subCategory ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-400">{product.supplier ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-white font-mono">
                      ${product.cost.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{product.unit}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${tierColor[product.tier]}`}>
                        {tierLabel[product.tier]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${product.active ? "bg-emerald-400" : "bg-slate-600"}`} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(product)}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors px-2 py-1 rounded hover:bg-blue-900/30"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(product)}
                          className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors px-2 py-1 rounded hover:bg-red-900/30"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {filtered.length} product{filtered.length !== 1 ? "s" : ""} shown
      </p>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-base font-semibold text-white">
                {editingProduct ? "Edit Product" : "Add Product"}
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {formError && (
                <div className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">SKU</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. RF-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Product name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category…</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Sub-Category</label>
                  <input
                    type="text"
                    value={form.subCategory}
                    onChange={(e) => setForm((f) => ({ ...f, subCategory: e.target.value }))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Shingles"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Supplier</label>
                <input
                  type="text"
                  value={form.supplier}
                  onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
                  className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Supplier name"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Cost ($) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.cost}
                    onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Unit <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. sq, hr, ea"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Tier</label>
                  <select
                    value={form.tier}
                    onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value as Tier }))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TIERS.map((t) => (
                      <option key={t} value={t}>{tierLabel[t]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Package assignment — which G/B/★ packages this product belongs to by default */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Default Packages</label>
                <div className="flex items-center gap-2">
                  {PKG_KEYS.map((key) => {
                    const m = PKG_META[key];
                    const active = pkgsFromString(form.packages).has(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          const current = pkgsFromString(form.packages);
                          if (current.has(key) && current.size <= 1) return;
                          const next = new Set(current);
                          if (next.has(key)) next.delete(key); else next.add(key);
                          setForm((f) => ({ ...f, packages: pkgsToString(next) }));
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-bold border uppercase tracking-wide transition-colors ${active ? m.active : m.inactive}`}
                      >
                        {m.short}
                      </button>
                    );
                  })}
                  <span className="text-xs text-slate-500 ml-2">
                    {pkgsFromString(form.packages).size === 3 ? "All packages" :
                     pkgsFromString(form.packages).size === 1 ? `${form.packages} only` :
                     `${form.packages}`}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Controls which G/B/★ columns this product appears in when added to an estimate.</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                    form.active ? "bg-blue-600" : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      form.active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-sm text-slate-300">
                  {form.active ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Add to Assembly */}
              <div className="border-t border-slate-700 pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => setAddToAssembly((v) => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                      addToAssembly ? "bg-blue-600" : "bg-slate-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        addToAssembly ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-slate-300">
                    Add to an assembly
                  </span>
                </label>

                {addToAssembly && (
                  <div className="mt-3 space-y-3 pl-1">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAssemblyMode("existing")}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium border transition-colors ${
                          assemblyMode === "existing"
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-slate-900 border-slate-600 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        Existing Assembly
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssemblyMode("new")}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium border transition-colors ${
                          assemblyMode === "new"
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-slate-900 border-slate-600 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        New Assembly
                      </button>
                    </div>

                    {assemblyMode === "existing" ? (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Assembly</label>
                        <select
                          value={selectedAssemblyId}
                          onChange={(e) => setSelectedAssemblyId(e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select assembly…</option>
                          {assemblies.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.tradeType} — {a.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1.5">Assembly Name</label>
                          <input
                            type="text"
                            value={newAssemblyName}
                            onChange={(e) => setNewAssemblyName(e.target.value)}
                            placeholder="e.g. RAM Board Floor Protection"
                            className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1.5">Trade Type</label>
                          <select
                            value={newAssemblyTradeType}
                            onChange={(e) => setNewAssemblyTradeType(e.target.value)}
                            className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select trade…</option>
                            {ASSEMBLY_TRADE_TYPES.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Quantity</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={assemblyQty}
                          onChange={(e) => setAssemblyQty(e.target.value)}
                          className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Unit</label>
                        <input
                          type="text"
                          value={assemblyUnit}
                          onChange={(e) => setAssemblyUnit(e.target.value)}
                          placeholder={form.unit.trim() || "defaults to product unit"}
                          className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-700 mt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
                >
                  {saving ? "Saving..." : editingProduct ? "Save Changes" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Preview Modal */}
      {csvPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setCsvPreview(null)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-white">CSV Import Preview</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {csvPreview.length} row{csvPreview.length !== 1 ? "s" : ""} detected — existing products will be updated, new ones created.
                </p>
              </div>
              <button onClick={() => setCsvPreview(null)} className="text-slate-400 hover:text-white transition-colors p-1 rounded">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Preview table */}
            <div className="overflow-auto flex-1 px-6 py-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-700">
                    {Object.keys(csvPreview[0] ?? {}).map((h) => (
                      <th key={h} className="pb-2 pr-4 font-semibold uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {csvPreview.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-700/30">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="py-1.5 pr-4 text-slate-300 max-w-[180px] truncate">{val || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvPreview.length > 50 && (
                <p className="text-xs text-slate-500 mt-3">…and {csvPreview.length - 50} more rows</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700 flex-shrink-0">
              <button onClick={() => setCsvPreview(null)} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={handleCSVImport}
                disabled={csvImporting}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
              >
                {csvImporting ? "Importing…" : `Import ${csvPreview.length} row${csvPreview.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Result Modal */}
      {csvResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setCsvResult(null)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-white mb-4">Import Complete</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg px-4 py-3 text-center">
                <p className="text-2xl font-bold text-emerald-400">{csvResult.created}</p>
                <p className="text-xs text-emerald-300 mt-0.5">Created</p>
              </div>
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg px-4 py-3 text-center">
                <p className="text-2xl font-bold text-blue-400">{csvResult.updated}</p>
                <p className="text-xs text-blue-300 mt-0.5">Updated</p>
              </div>
            </div>
            {csvResult.errors.length > 0 && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg px-4 py-3 mb-4 max-h-40 overflow-y-auto">
                <p className="text-xs font-semibold text-red-400 mb-1.5">{csvResult.errors.length} row{csvResult.errors.length !== 1 ? "s" : ""} skipped:</p>
                {csvResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-300">{e}</p>
                ))}
              </div>
            )}
            <button
              onClick={() => setCsvResult(null)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-900/40 border border-red-700 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white">Delete Product</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Are you sure you want to delete <span className="text-white font-medium">{deleteTarget.name}</span>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 bg-red-700 hover:bg-red-600 disabled:bg-red-900 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
