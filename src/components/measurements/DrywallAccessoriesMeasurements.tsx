"use client";

import { useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface DrywallAccessoriesData {
  // Corner bead — outside corners
  cornerBeadLf: number;

  // J-bead / L-bead — edges at windows, doors, unfinished borders
  jBeadLf: number;

  // Primer — sqft drives gallons
  primerSqft: number;

  // Texture
  textureType: "none" | "orange-peel" | "knockdown" | "smooth";
  textureSqft: number;
}

interface Props {
  initialData?: Partial<DrywallAccessoriesData>;
  onChange: (data: DrywallAccessoriesData) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";

const PRIMER_SQFT_PER_GAL = 375;      // 1 gal primer ≈ 375 sqft
const CORNER_BEAD_STICK   = 8;        // 8 ft sticks
const TEXTURE_SQFT_PER_CAN = 50;      // spray can — knockdown/orange peel
const TEXTURE_SQFT_PER_GAL = 200;     // compound-based smooth / knockdown bucket

const TEXTURE_OPTIONS: { val: DrywallAccessoriesData["textureType"]; label: string }[] = [
  { val: "none",        label: "None" },
  { val: "smooth",      label: "Smooth" },
  { val: "orange-peel", label: "Orange Peel" },
  { val: "knockdown",   label: "Knockdown" },
];

// ── Sub-components ─────────────────────────────────────────────────────────

function NumInput({
  label, hint, value, onChange, unit,
}: {
  label: string; hint?: string; value: number;
  onChange: (v: number) => void; unit?: string;
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {unit && <span className="text-slate-500 ml-1">({unit})</span>}
      </label>
      {hint && <p className="text-[10px] text-slate-600 mb-1">{hint}</p>}
      <input type="number" min="0"
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        placeholder="0" className={inputCls} />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function DrywallAccessoriesMeasurements({ initialData, onChange }: Props) {
  const [data, setData] = useState<DrywallAccessoriesData>({
    cornerBeadLf:  initialData?.cornerBeadLf  ?? 0,
    jBeadLf:       initialData?.jBeadLf       ?? 0,
    primerSqft:    initialData?.primerSqft    ?? 0,
    textureType:   initialData?.textureType   ?? "none",
    textureSqft:   initialData?.textureSqft   ?? 0,
  });

  function set<K extends keyof DrywallAccessoriesData>(key: K, value: DrywallAccessoriesData[K]) {
    const next = { ...data, [key]: value };
    setData(next);
    onChange(next);
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const cornerBeadSticks = data.cornerBeadLf > 0
    ? Math.ceil(data.cornerBeadLf / CORNER_BEAD_STICK) : 0;
  const primerGallons    = data.primerSqft > 0
    ? Math.ceil(data.primerSqft / PRIMER_SQFT_PER_GAL) : 0;
  const textureCans      = (data.textureType === "orange-peel" || data.textureType === "knockdown") && data.textureSqft > 0
    ? Math.ceil(data.textureSqft / TEXTURE_SQFT_PER_CAN) : 0;
  const textureBuckets   = data.textureType === "smooth" && data.textureSqft > 0
    ? Math.ceil(data.textureSqft / TEXTURE_SQFT_PER_GAL) : 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Corner & Edge Bead ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Corner &amp; Edge Bead</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <NumInput
              label="Corner Bead"
              hint="Outside corners — enter total linear ft"
              unit="lf"
              value={data.cornerBeadLf}
              onChange={(v) => set("cornerBeadLf", v)}
            />
            {cornerBeadSticks > 0 && (
              <p className="text-xs text-slate-400 mt-1.5">
                → <span className="text-white font-medium">{cornerBeadSticks} sticks</span>
                <span className="text-slate-500"> (8 ft ea)</span>
              </p>
            )}
          </div>
          <div>
            <NumInput
              label="J-Bead / L-Bead"
              hint="Edge trim at windows, doors, unfinished borders"
              unit="lf"
              value={data.jBeadLf}
              onChange={(v) => set("jBeadLf", v)}
            />
            {data.jBeadLf > 0 && (
              <p className="text-xs text-slate-400 mt-1.5">
                → <span className="text-white font-medium">{Math.ceil(data.jBeadLf / 10)} sticks</span>
                <span className="text-slate-500"> (10 ft ea)</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Primer ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Drywall Primer</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <NumInput
              label="Area to prime"
              hint={`1 gallon ≈ ${PRIMER_SQFT_PER_GAL} sqft`}
              unit="sqft"
              value={data.primerSqft}
              onChange={(v) => set("primerSqft", v)}
            />
            {primerGallons > 0 && (
              <p className="text-xs text-slate-400 mt-1.5">
                → <span className="text-white font-medium">{primerGallons} gallon{primerGallons !== 1 ? "s" : ""}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Texture ── */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Texture</h3>

        {/* Type selector */}
        <div>
          <label className={labelCls}>Texture type</label>
          <div className="flex flex-wrap gap-1">
            {TEXTURE_OPTIONS.map((o) => (
              <button key={o.val} type="button" onClick={() => set("textureType", o.val)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  data.textureType === o.val
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-500"
                }`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sqft — only if texture selected */}
        {data.textureType !== "none" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <NumInput
                label="Area to texture"
                hint={
                  data.textureType === "smooth"
                    ? `1 bucket ≈ ${TEXTURE_SQFT_PER_GAL} sqft`
                    : `1 can ≈ ${TEXTURE_SQFT_PER_CAN} sqft`
                }
                unit="sqft"
                value={data.textureSqft}
                onChange={(v) => set("textureSqft", v)}
              />
              {(textureCans > 0 || textureBuckets > 0) && (
                <p className="text-xs text-slate-400 mt-1.5">
                  → <span className="text-white font-medium">
                    {textureCans > 0 ? `${textureCans} can${textureCans !== 1 ? "s" : ""}` : ""}
                    {textureBuckets > 0 ? `${textureBuckets} bucket${textureBuckets !== 1 ? "s" : ""}` : ""}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Summary ── */}
      {(cornerBeadSticks > 0 || data.jBeadLf > 0 || primerGallons > 0 || textureCans > 0 || textureBuckets > 0) && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Accessories Summary</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {cornerBeadSticks > 0 && (
              <div className="bg-slate-700/50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500 mb-1">Corner Bead</p>
                <p className="text-lg font-bold text-white">{cornerBeadSticks}</p>
                <p className="text-xs text-slate-400">sticks · {data.cornerBeadLf} lf</p>
              </div>
            )}
            {data.jBeadLf > 0 && (
              <div className="bg-slate-700/50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500 mb-1">J-Bead</p>
                <p className="text-lg font-bold text-white">{Math.ceil(data.jBeadLf / 10)}</p>
                <p className="text-xs text-slate-400">sticks · {data.jBeadLf} lf</p>
              </div>
            )}
            {primerGallons > 0 && (
              <div className="bg-slate-700/50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500 mb-1">Primer</p>
                <p className="text-lg font-bold text-white">{primerGallons}</p>
                <p className="text-xs text-slate-400">gallon{primerGallons !== 1 ? "s" : ""}</p>
              </div>
            )}
            {(textureCans > 0 || textureBuckets > 0) && (
              <div className="bg-slate-700/50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-500 mb-1">Texture ({data.textureType})</p>
                <p className="text-lg font-bold text-white">{textureCans || textureBuckets}</p>
                <p className="text-xs text-slate-400">{textureCans > 0 ? "cans" : "buckets"}</p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
