"use client";

import { useState, useEffect, useCallback } from "react";

const LABOR_UNITS = ["hr", "sq", "ea", "lf", "sqf"] as const;
type LaborUnit = (typeof LABOR_UNITS)[number];

interface LaborItem {
  id: string;
  name: string;
  unit: string;
  cost: number;
  subCategory: string | null;
  active: boolean;
  createdAt: string;
}

interface FormState {
  name: string;
  unit: LaborUnit | string;
  cost: string;
  markup: string;
  subCategory: string;
  active: boolean;
}

const emptyForm: FormState = {
  name: "",
  unit: "hr",
  cost: "",
  markup: "30",
  subCategory: "",
  active: true,
};

// Markup is stored in subCategory as "__markup__:XX" for now, or derived from a naming convention.
// Since the Product model has no markup field, we encode it in subCategory: "__markup__:30"
function parseMarkup(subCategory: string | null): number {
  if (!subCategory) return 30;
  const match = subCategory.match(/__markup__:(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 30;
}

function encodeSubCategory(subCategory: string, markup: number): string {
  const base = subCategory.replace(/__markup__:\d+(?:\.\d+)?/g, "").trim();
  return `__markup__:${markup}${base ? ` ${base}` : ""}`;
}

function displaySubCategory(subCategory: string | null): string {
  if (!subCategory) return "";
  return subCategory.replace(/__markup__:\d+(?:\.\d+)?/g, "").trim();
}

export default function LaborClient() {
  const [items, setItems] = useState<LaborItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LaborItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<LaborItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/products?category=Labor&active=true");
      if (!res.ok) throw new Error("Failed to load labor rates");
      const data = await res.json();
      setItems(data);
    } catch {
      setError("Failed to load labor rates. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function openAdd() {
    setEditingItem(null);
    setForm(emptyForm);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(item: LaborItem) {
    setEditingItem(item);
    const markup = parseMarkup(item.subCategory);
    const sub = displaySubCategory(item.subCategory);
    setForm({
      name: item.name,
      unit: item.unit,
      cost: String(item.cost),
      markup: String(markup),
      subCategory: sub,
      active: item.active,
    });
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingItem(null);
    setFormError("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim() || !form.cost || !form.unit) {
      setFormError("Name, cost, and unit are required.");
      return;
    }

    const costNum = parseFloat(form.cost);
    const markupNum = parseFloat(form.markup) || 0;

    if (isNaN(costNum) || costNum < 0) {
      setFormError("Cost must be a valid non-negative number.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: "Labor",
        subCategory: encodeSubCategory(form.subCategory, markupNum),
        cost: costNum,
        unit: form.unit,
        tier: "GOOD",
        active: form.active,
      };

      let res: Response;
      if (editingItem) {
        res = await fetch(`/api/admin/products/${editingItem.id}`, {
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
        setFormError(err.error ?? "Failed to save labor rate.");
        return;
      }

      closeModal();
      fetchItems();
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
        setError(err.error ?? "Failed to delete labor rate.");
      } else {
        setDeleteTarget(null);
        fetchItems();
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Actions bar */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-400">
          {items.length} labor line item{items.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Labor Rate
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="px-6 py-16 text-center text-slate-400 text-sm">Loading labor rates...</div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center text-slate-400 text-sm">
            No labor rates yet. Add your first one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Unit</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Cost</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Markup %</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Sell Price</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Active</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {items.map((item) => {
                  const markup = parseMarkup(item.subCategory);
                  const sellPrice = item.cost * (1 + markup / 100);
                  return (
                    <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-xs">{item.unit}</td>
                      <td className="px-4 py-3 text-right text-white font-mono">
                        ${item.cost.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300 font-mono">
                        {markup.toFixed(0)}%
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-mono font-semibold">
                        ${sellPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${item.active ? "bg-emerald-400" : "bg-slate-600"}`} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(item)}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors px-2 py-1 rounded hover:bg-blue-900/30"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors px-2 py-1 rounded hover:bg-red-900/30"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-3 p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-slate-400">
        <strong className="text-slate-300">Note:</strong> Labor items use the Products table with category set to &quot;Labor&quot;.
        Sell Price is automatically calculated as Cost &times; (1 + Markup%).
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-base font-semibold text-white">
                {editingItem ? "Edit Labor Rate" : "Add Labor Rate"}
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
                  placeholder="e.g. Carpentry Labor"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Unit <span className="text-red-400">*</span>
                  </label>
                  <select
                    required
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {LABOR_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Sub-Category / Trade</label>
                  <input
                    type="text"
                    value={form.subCategory}
                    onChange={(e) => setForm((f) => ({ ...f, subCategory: e.target.value }))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Roofing"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Markup (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.markup}
                    onChange={(e) => setForm((f) => ({ ...f, markup: e.target.value }))}
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="30"
                  />
                </div>
              </div>

              {/* Live sell price preview */}
              {form.cost && !isNaN(parseFloat(form.cost)) && (
                <div className="rounded-lg bg-emerald-900/20 border border-emerald-700/40 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-slate-300">Sell Price Preview</span>
                  <span className="text-emerald-400 font-semibold font-mono">
                    ${(parseFloat(form.cost) * (1 + (parseFloat(form.markup) || 0) / 100)).toFixed(2)} / {form.unit || "unit"}
                  </span>
                </div>
              )}

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
                  {saving ? "Saving..." : editingItem ? "Save Changes" : "Add Labor Rate"}
                </button>
              </div>
            </form>
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
                <h3 className="text-base font-semibold text-white">Delete Labor Rate</h3>
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
