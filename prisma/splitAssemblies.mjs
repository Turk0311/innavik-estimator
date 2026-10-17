/**
 * splitAssemblies.mjs
 *
 * Splits the "Bathroom" and "Windows/Doors" assemblies into scope-aligned
 * assemblies that match the Estimate Builder tab names exactly.
 *
 * Run: node prisma/splitAssemblies.mjs
 */

import { PrismaClient } from "../src/generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { createRequire } from "module";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
require("dotenv").config({ path: resolve(__dirname, "../.env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Keyword → scope mapping for Bathroom products
// Each entry: { scope, keywords } — if ANY keyword matches the product name
// (case-insensitive), it's assigned to that scope.
// More specific rules come first.
// ---------------------------------------------------------------------------
const BATHROOM_SCOPE_RULES = [
  // Tile accessories (curbs, membranes, grout, mortar, etc.) — before Tile
  {
    scope: "Tile Accessories",
    keywords: [
      "curb", "mapei", "schluter", "qep", "lash", "wedge", "silicone",
      "mortar", "thinset", "grout", "aqua defense", "aqua defence",
      "mapeguard", "ditra", "kerdi", "ultraflex", "flexcolor", "mapesil",
      "bed mud", "seaming tape", "clip", "edge trim",
    ],
  },
  // Tile products
  {
    scope: "Tile",
    keywords: [
      "tile", "porcelain", "ceramic", "mosaic", "hexagon", "limestone",
      "cement board", "backerboard", "hardibacker",
    ],
  },
  // Faucet assembly items
  {
    scope: "Faucet Assembly",
    keywords: ["teflon", "faucet line", "compression faucet"],
  },
  // Faucet products
  {
    scope: "Faucet",
    keywords: ["faucet", "delta", "moen", "american standard", "kohler"],
  },
  // Sink assembly
  {
    scope: "Sink Assembly",
    keywords: ["p-trap", "tail piece", "plumb pak", "plumbers putty", "oatey"],
  },
  // Sink products
  {
    scope: "Sink",
    keywords: ["sink", "basin", "pedestal", "undermount"],
  },
  // Toilet assembly
  {
    scope: "Toilet Assembly",
    keywords: ["toilet kit", "harvey", "wax ring", "flange", "closet bolt"],
  },
  // Toilet products
  {
    scope: "Toilet",
    keywords: ["toilet", "elongated", "round toilet", "tuscany huron", "eljer", "briggs"],
  },
  // Vanity assembly
  {
    scope: "Vanity Assembly",
    keywords: ["construction screw", "grip fast", "#10x"],
  },
  // Vanity products
  {
    scope: "Vanity",
    keywords: ["vanity", "craft & main", "dakota", "tuscany® ravenna"],
  },
];

// ---------------------------------------------------------------------------
// Keyword → scope mapping for Windows/Doors products
// ---------------------------------------------------------------------------
const WINDOWS_DOORS_SCOPE_RULES = [
  // Exterior door accessories
  {
    scope: "Exterior Door Accessories",
    keywords: ["great stuff", "shim", "construction screw", "caulk"],
  },
  // Exterior door products
  {
    scope: "Exterior Door",
    keywords: [
      "exterior door", "prehung", "fiberglass door", "steel door",
      "mastercraft", "lakeside", "36\"x80\"",
    ],
  },
  // Window accessories
  {
    scope: "Window Accessories",
    keywords: ["butyl", "flashing tape", "window and door", "great stuff"],
  },
  // Window products
  {
    scope: "Windows",
    keywords: ["window", "patio door", "vinyl window"],
  },
];

function classifyProduct(productName, rules) {
  const lower = productName.toLowerCase();
  for (const rule of rules) {
    if (rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return rule.scope;
    }
  }
  return null; // unmatched
}

async function splitAssembly(assemblyName, rules, tradeType) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Splitting: "${assemblyName}"`);
  console.log("=".repeat(60));

  const assembly = await prisma.assembly.findFirst({
    where: { name: { equals: assemblyName, mode: "insensitive" } },
    include: {
      items: true,
    },
  });

  if (!assembly) {
    console.log(`  ⚠️  Assembly "${assemblyName}" not found — skipping.`);
    return;
  }

  // Load all product details
  const productIds = assembly.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Classify each item
  const byScope = {};
  const unmatched = [];

  for (const item of assembly.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      unmatched.push({ item, reason: "product not found in DB" });
      continue;
    }
    const scope = classifyProduct(product.name, rules);
    if (!scope) {
      unmatched.push({ item, product });
    } else {
      if (!byScope[scope]) byScope[scope] = [];
      byScope[scope].push({ item, product });
    }
  }

  // Report
  for (const [scope, entries] of Object.entries(byScope)) {
    console.log(`\n  → "${scope}" (${entries.length} items)`);
    for (const { product } of entries) {
      console.log(`      • ${product.name}`);
    }
  }

  if (unmatched.length > 0) {
    console.log(`\n  ⚠️  UNMATCHED (${unmatched.length} items — staying in original or review manually):`);
    for (const { product, reason } of unmatched) {
      console.log(`      • ${product?.name ?? "unknown"} ${reason ? `(${reason})` : ""}`);
    }
  }

  // Create new assemblies for each scope
  for (const [scope, entries] of Object.entries(byScope)) {
    // Check if an assembly with this scope name already exists
    const existing = await prisma.assembly.findFirst({
      where: { name: { equals: scope, mode: "insensitive" } },
    });

    if (existing) {
      console.log(`\n  ℹ️  Assembly "${scope}" already exists (id: ${existing.id}) — adding missing items only.`);
      // Get existing product IDs to avoid duplicates
      const existingItems = await prisma.assemblyItem.findMany({
        where: { assemblyId: existing.id },
      });
      const existingProductIds = new Set(existingItems.map((i) => i.productId));

      const toAdd = entries.filter(({ item }) => !existingProductIds.has(item.productId));
      if (toAdd.length === 0) {
        console.log(`     All items already present — nothing to add.`);
      } else {
        await prisma.assemblyItem.createMany({
          data: toAdd.map(({ item, product }) => ({
            assemblyId: existing.id,
            productId: item.productId,
            quantity: item.quantity,
            unit: product.unit,
          })),
        });
        console.log(`     Added ${toAdd.length} new items.`);
      }
    } else {
      const newAssembly = await prisma.assembly.create({
        data: {
          name: scope,
          tradeType,
          description: `Standard ${scope} product list split from "${assemblyName}"`,
          items: {
            create: entries.map(({ item, product }) => ({
              productId: item.productId,
              quantity: item.quantity,
              unit: product.unit,
            })),
          },
        },
      });
      console.log(`\n  ✅  Created assembly "${scope}" (id: ${newAssembly.id}) with ${entries.length} items.`);
    }
  }

  // Rename the original assembly to mark it as archived (don't delete — keep as reference)
  await prisma.assembly.update({
    where: { id: assembly.id },
    data: { name: `[ARCHIVED] ${assembly.name}` },
  });
  console.log(`\n  📦  Renamed original "${assembly.name}" → "[ARCHIVED] ${assembly.name}"`);
}

async function main() {
  console.log("Assembly Splitter — Innavik Estimator");
  console.log("Splitting Bathroom and Windows/Doors into scope-aligned assemblies...\n");

  await splitAssembly("Bathroom", BATHROOM_SCOPE_RULES, "BATHROOM");
  await splitAssembly("Windows/Doors", WINDOWS_DOORS_SCOPE_RULES, "EXTERIOR");

  console.log("\n\nDone! Review the output above and check Admin → Assemblies to verify.");
  console.log("Archived originals are prefixed with [ARCHIVED] and can be deleted from admin.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
