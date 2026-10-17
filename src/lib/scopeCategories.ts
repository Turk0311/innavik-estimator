// Shared scope-of-work categories used in new estimate creation and
// the measurements add-scope picker.

export interface ScopeItem {
  name: string;
  accessory?: string;
}

export interface ScopeCategory {
  label: string;
  accent: string;
  headerBg: string;
  headerText: string;
  scopes: ScopeItem[];
}

export const SCOPE_CATEGORIES: ScopeCategory[] = [
  {
    label: "Mitigation",
    accent: "border-orange-500",
    headerBg: "bg-orange-500/10",
    headerText: "text-orange-400",
    scopes: [
      { name: "Floor Protection" },
      { name: "Room Protection" },
      { name: "Contents Movement" },
      { name: "Mitigation" },
    ],
  },
  {
    label: "Interior",
    accent: "border-yellow-500",
    headerBg: "bg-yellow-500/10",
    headerText: "text-yellow-400",
    scopes: [
      { name: "Wall Assembly", accessory: "Wall Accessories" },
      { name: "Insulation", accessory: "Insulation Accessories" },
      { name: "Drywall", accessory: "Drywall Accessories" },
      { name: "Flooring", accessory: "Flooring Accessories" },
      { name: "Painting", accessory: "Paint Accessories" },
      { name: "Interior Trim", accessory: "Interior Trim Accessories" },
      { name: "Interior Doors", accessory: "Interior Door Assembly" },
    ],
  },
  {
    label: "Bathroom",
    accent: "border-sky-500",
    headerBg: "bg-sky-500/10",
    headerText: "text-sky-400",
    scopes: [
      { name: "Vanity", accessory: "Vanity Assembly" },
      { name: "Toilet", accessory: "Toilet Assembly" },
      { name: "Sink", accessory: "Sink Assembly" },
      { name: "Faucet", accessory: "Faucet Assembly" },
      { name: "Tile", accessory: "Tile Accessories" },
    ],
  },
  {
    label: "Kitchen",
    accent: "border-pink-500",
    headerBg: "bg-pink-500/10",
    headerText: "text-pink-400",
    scopes: [
      { name: "Kitchen Cabinets", accessory: "Kitchen Assembly" },
      { name: "Kitchen Sink", accessory: "Kitchen Sink Assembly" },
      { name: "Tile", accessory: "Tile Accessories" },
    ],
  },
  {
    label: "Countertops",
    accent: "border-purple-500",
    headerBg: "bg-purple-500/10",
    headerText: "text-purple-400",
    scopes: [
      { name: "Countertops", accessory: "Countertop Accessories" },
    ],
  },
  {
    label: "Exterior",
    accent: "border-emerald-500",
    headerBg: "bg-emerald-500/10",
    headerText: "text-emerald-400",
    scopes: [
      { name: "Exterior Trim", accessory: "Exterior Trim Accessories" },
      { name: "Siding", accessory: "Siding Accessories" },
      { name: "Shutters", accessory: "Shutter Accessories" },
      { name: "Roofing", accessory: "Roofing Accessories" },
      { name: "Windows", accessory: "Window Accessories" },
      { name: "Exterior Door", accessory: "Exterior Door Accessories" },
      { name: "Decking", accessory: "Decking Accessories" },
      { name: "Deck Framing", accessory: "Deck Framing Accessories" },
      { name: "Gutters" },
    ],
  },
];

// All individual scope names in a flat set — useful for quick lookups
export const ALL_SCOPE_NAMES = new Set(
  SCOPE_CATEGORIES.flatMap((c) =>
    c.scopes.flatMap((s) => (s.accessory ? [s.name, s.accessory] : [s.name]))
  )
);

// Mitigation scopes that belong under the General Labor measurement tab
export const MITIGATION_SCOPES = new Set([
  "Floor Protection",
  "Room Protection",
  "Contents Movement",
  "Mitigation",
]);

// Mitigation scopes measured in sqft (vs hours)
export const SQFT_MITIGATION_SCOPES = new Set([
  "Floor Protection",
  "Room Protection",
  "Mitigation",
]);
