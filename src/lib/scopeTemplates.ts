// ---------------------------------------------------------------------------
// Scope Templates
// Maps each scope name to the exact product names from the catalog.
// Products are looked up by exact name match (case-insensitive) in the DB.
// Add more scopes here as you go through each Excel sheet.
// ---------------------------------------------------------------------------

export interface TemplateItem {
  productName: string;   // exact name to look up in Product table
  defaultQty: number;    // starting quantity (rep will adjust)
  isLabor?: boolean;     // if true, treated as labor line
}

export const SCOPE_TEMPLATES: Record<string, TemplateItem[]> = {

  // ---- INTERIOR ----------------------------------------------------------

  "Wall Assembly": [
    { productName: '2"x4"x8\' Common Framing', defaultQty: 1 },
    { productName: '2"x4"x16\' Common Framing', defaultQty: 1 },
    { productName: '2"x4"x16\' PT Green', defaultQty: 1 },
    { productName: '2"x6"x8\' Common Framing', defaultQty: 1 },
    { productName: '2"x6"x16\' PT Green', defaultQty: 1 },
    { productName: '2"x12"x10\' Common Framing', defaultQty: 1 },
  ],

  "Wall Accessories": [
    { productName: 'Paslode 2-3/8" Framing Nails', defaultQty: 1 },
    { productName: 'MiTek 5"x1-9/16" Steel Single Stud Shoe', defaultQty: 1 },
    { productName: '1-1/2"x3" Self Nailing Pipe Stud Guard', defaultQty: 1 },
    { productName: 'Red Head 1/4"x2-1/4" Hex Nut Expansion Wedge 25 Count', defaultQty: 1 },
  ],

  "Insulation": [
    { productName: 'R-19 Kraft Faced Fiberglass Insulation 6-1/4"x15"x93\' 87.19sq ft', defaultQty: 1 },
    { productName: 'R-30 EcoBatt Kraft Faced Fiberglass Insulation 69.33 sqf 1616195', defaultQty: 1 },
    { productName: 'R-10 2"x4\'x8\' Foamular 250 Board Insulation', defaultQty: 1 },
    { productName: 'Insulmax Blow-in Cellulose Insulation', defaultQty: 1 },
    { productName: 'EcoFill WX Fiberglass Blow-in Insulation 106.6 sq ft @ R-19', defaultQty: 1 },
    { productName: 'R-13 EcoRoll Kraft-Faced Fiberglass Insulation Roll 3-1/2"x15"x32\'', defaultQty: 1 },
    { productName: 'R-13 EcoRoll Kraft-Faced Fiberglass Insulation Roll 3-1/2"x23"x32\'', defaultQty: 1 },
    { productName: 'R-13 EcoBatt Kraft-Face Fiberglass Insulation Batt 3-1/2"x15"x93"', defaultQty: 1 },
    { productName: 'R-13 EcoBatt Kraft-Face Fiberglass Insulation Batt 3-1/2"x23"x93"', defaultQty: 1 },
    { productName: 'R-15 EcoRoll Kraft-Faced Fiberglass Insulation Roll 3-1/2"x15"x18\'', defaultQty: 1 },
    { productName: 'JM Safe & Fireblock 3"x15-1/4"x47" 50sqf', defaultQty: 1 },
  ],

  "Insulation Accessories": [
    { productName: '24" Insulation Support Wire 100ct', defaultQty: 1 },
    { productName: 'Equipment Rental (Insulation)', defaultQty: 1 },
    // Arrow T50 staples not yet in catalog — rep to add manually
    { productName: 'Arrow T50 3/8" Crown x 1/2" Leg Galvanized Heavy-Duty Staples - 5,000 Count', defaultQty: 1 },
    { productName: 'Arrow T50 3/8" Crown x 3/8" Leg Galvanized Heavy-Duty Staples - 5,000 Count', defaultQty: 1 },
    { productName: 'OSI Orange Fire Block Expanding Spray Foam 21.1 oz', defaultQty: 1 },
  ],

  // More scopes will be added here as Turk reviews each Excel sheet...
};
