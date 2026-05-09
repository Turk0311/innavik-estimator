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

  // More scopes will be added here as Turk reviews each Excel sheet...
};
