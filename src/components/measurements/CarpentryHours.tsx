"use client";

// Carpentry hours — blank uses the suggested hours from the measurements; a number replaces it.
// Rates come from the Labor page (Lead Carpenter, Carpenter, Finish Carpenter).
export default function CarpentryHours({
  fields,
  onChange,
  boxed = false,
}: {
  fields: { key: string; label: string; value: number | undefined }[];
  onChange: (key: string, value: number) => void;
  boxed?: boolean;
}) {
  return (
    <div className={boxed ? "bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3" : "pt-2 border-t border-slate-700 space-y-3"}>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Carpentry Labor</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Leave blank to use suggested hours from the measurements. Rates come from the Labor page.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-slate-400 mb-1">{f.label}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={!f.value ? "" : f.value}
                onChange={(e) => onChange(f.key, e.target.value === "" ? 0 : Number(e.target.value))}
                placeholder="Suggested"
                min="0"
                step="0.5"
                className="w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <span className="text-slate-500 text-xs flex-shrink-0">hrs</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
