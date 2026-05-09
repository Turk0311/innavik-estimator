/**
 * import-products.mjs
 *
 * Reads product and labor data from the Build Book Excel (.xlsm) file and
 * inserts it into the PostgreSQL "Product" table.
 *
 * The .xlsm file is a ZIP archive containing XML files (Office Open XML).
 * We parse it using only Node.js built-in modules (fs, zlib) plus the pg
 * package which is already installed in the project.
 *
 * Data sources inside the workbook:
 *   "Price Page"    → product catalog  (SKU, Line, Cost, Supplier, Category, Sub Category)
 *   "General Labor" → labor rates      (Line, total, Unit, Cost, Mark Up, Sell, Total Sell)
 *   "Roofing Labor" → roofing labor    (Line, total, Unit, Cost, Mark Up, Sell, Total Sell)
 *
 * Run with:
 *   node import-products.mjs
 */

import fs from 'fs';
import zlib from 'zlib';
import pg from 'pg';

const { Client } = pg;

// ─── Configuration ────────────────────────────────────────────────────────────

const EXCEL_PATH =
  'C:\\Users\\turk0\\OneDrive - Innavik\\INNAVIK Share\\Super Secret Project\\Build Book Version 1.1 - Claude.xlsm';

const DB_URL =
  'postgresql://postgres:SyjjaWHBNMTlutRIYPatOasyUVNEuJwS@switchyard.proxy.rlwy.net:28325/railway';

// ─── Minimal ZIP parser (pure Node.js built-ins) ──────────────────────────────

/**
 * Parse a ZIP file buffer and return a map of  filename → raw Buffer.
 * Handles stored (method 0) and deflated (method 8) entries.
 */
function parseZip(buf) {
  const files = {};
  let i = 0;

  while (i < buf.length - 4) {
    // Local file header signature: 0x04034b50 (little-endian: 50 4b 03 04)
    if (
      buf[i] === 0x50 &&
      buf[i + 1] === 0x4b &&
      buf[i + 2] === 0x03 &&
      buf[i + 3] === 0x04
    ) {
      const compressionMethod = buf.readUInt16LE(i + 8);
      const compressedSize    = buf.readUInt32LE(i + 18);
      const fileNameLength    = buf.readUInt16LE(i + 26);
      const extraFieldLength  = buf.readUInt16LE(i + 28);

      const fileNameStart = i + 30;
      const fileName = buf.toString('utf8', fileNameStart, fileNameStart + fileNameLength);
      const dataStart = fileNameStart + fileNameLength + extraFieldLength;

      if (compressedSize > 0) {
        const compressedData = buf.slice(dataStart, dataStart + compressedSize);

        if (compressionMethod === 0) {
          files[fileName] = compressedData;
        } else if (compressionMethod === 8) {
          try {
            files[fileName] = zlib.inflateRawSync(compressedData);
          } catch {
            // Skip entries we cannot decompress
          }
        }
      }

      i = dataStart + compressedSize;
    } else {
      i++;
    }
  }

  return files;
}

// ─── XML helpers ──────────────────────────────────────────────────────────────

/** Extract an attribute value from a string of XML attributes */
function attr(attrStr, name) {
  const re = new RegExp(`\\b${name}="([^"]*)"`);
  const m = re.exec(attrStr);
  return m ? m[1] : null;
}

/**
 * Parse sharedStrings.xml into an array of strings.
 * Each <si> element is one shared string entry (may contain rich text <r><t> nodes).
 */
function parseSharedStrings(xml) {
  const strings = [];
  const siBlocks = xml.split(/<si[ >]/);

  for (let i = 1; i < siBlocks.length; i++) {
    const block = siBlocks[i];
    const tMatches = [...block.matchAll(/<t(?:\s[^>]*)?>([^<]*)<\/t>/g)];
    const text = tMatches.map(m => m[1]).join('');
    strings.push(
      text
        .replace(/&amp;/g,  '&')
        .replace(/&lt;/g,   '<')
        .replace(/&gt;/g,   '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
    );
  }

  return strings;
}

/**
 * Convert an Excel column address (A, B, …, Z, AA, AB, …) to a 0-based index.
 */
function colToIndex(col) {
  let n = 0;
  for (const ch of col.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

/**
 * Parse a sheet XML and return an array of rows.
 * Each row is an array of cell values (string | number | null) indexed by column.
 *
 * @param {string}   xml        - sheet XML content
 * @param {string[]} sharedStrs - shared strings table
 * @returns {{ rowNum: number, cells: (string|number|null)[] }[]}
 */
function parseSheet(xml, sharedStrs) {
  const rows = [];
  const rowRe = /<row\s([^>]*)>([\s\S]*?)<\/row>/g;
  let rowMatch;

  while ((rowMatch = rowRe.exec(xml)) !== null) {
    const rowAttrs   = rowMatch[1];
    const rowContent = rowMatch[2];
    const rowNum     = parseInt(attr(rowAttrs, 'r') ?? '0', 10);

    // Determine the width of the row from cell references
    const cellAddresses = [...rowContent.matchAll(/\br="([A-Z]+)\d+"/g)].map(m => m[1]);
    const maxCol = cellAddresses.reduce((max, col) => Math.max(max, colToIndex(col)), -1);

    const cells = new Array(maxCol + 1).fill(null);

    const cellRe = /<c\s([^>]*)>([\s\S]*?)<\/c>|<c\s([^>]*)\/>/g;
    let cellMatch;

    while ((cellMatch = cellRe.exec(rowContent)) !== null) {
      const cAttrs   = cellMatch[1] ?? cellMatch[3];
      const cContent = cellMatch[2] ?? '';

      const ref  = attr(cAttrs, 'r') ?? '';
      const type = attr(cAttrs, 't') ?? '';

      const colLetters = ref.replace(/\d+/g, '');
      if (!colLetters) continue;
      const colIdx = colToIndex(colLetters);

      const vMatch = /<v>([^<]*)<\/v>/.exec(cContent);
      const rawVal = vMatch ? vMatch[1] : null;

      let value = null;
      if (rawVal !== null) {
        if (type === 's') {
          value = sharedStrs[parseInt(rawVal, 10)] ?? '';
        } else if (type === 'str' || type === 'inlineStr') {
          value = rawVal;
        } else {
          value = parseFloat(rawVal);
        }
      }

      if (colIdx >= 0 && colIdx < cells.length) {
        cells[colIdx] = value;
      }
    }

    rows.push({ rowNum, cells });
  }

  return rows;
}

// ─── Workbook relationship resolver ──────────────────────────────────────────

/**
 * Returns a map of sheet name → zip entry path (e.g. "xl/worksheets/sheet6.xml").
 */
function resolveSheetPaths(zipFiles) {
  const wbXml   = zipFiles['xl/workbook.xml']?.toString('utf8') ?? '';
  const relsXml = zipFiles['xl/_rels/workbook.xml.rels']?.toString('utf8') ?? '';

  // sheet name → rId
  const nameToRid = {};
  const sheetRe = /<sheet\s([^>]*?)\/?>/g;
  let m;
  while ((m = sheetRe.exec(wbXml)) !== null) {
    const tag  = m[1];
    const name = attr(tag, 'name');
    const rId  = attr(tag, 'r:id') ?? attr(tag, 'id');
    if (name && rId) nameToRid[name] = rId;
  }

  // rId → target path — note: Relationship tags are self-closing, use [^>]* to capture all attrs
  const ridToTarget = {};
  const relRe = /<Relationship([^>]*)\/>/g;
  while ((m = relRe.exec(relsXml)) !== null) {
    const tag    = m[1];
    const rId    = attr(tag, 'Id');
    const target = attr(tag, 'Target');
    if (rId && target) ridToTarget[rId] = target;
  }

  // Compose: sheet name → zip path
  const result = {};
  for (const [name, rId] of Object.entries(nameToRid)) {
    const target = ridToTarget[rId];
    if (!target) continue;
    // Target is relative to xl/ (e.g. "worksheets/sheet6.xml")
    const zipPath = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
    result[name] = zipPath;
  }

  return result;
}

// ─── Sheet-specific parsers ───────────────────────────────────────────────────

/**
 * Parse the "Price Page" sheet into product records.
 *
 * Columns: SKU(A=0), Line/name(B=1), Cost(C=2), Supplier(D=3), Category(E=4), Sub Category(F=5)
 * Row 1 is the header. Skip rows where name (col B) is empty.
 */
function parsePricePage(rows, sharedStrs) {
  // Find header row to dynamically detect column positions
  let headerIdx = 0; // default: row 0 (first row) is header
  let colMap = { sku: 0, name: 1, cost: 2, supplier: 3, category: 4, subCategory: 5 };

  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const vals = rows[i].cells.map(c => (typeof c === 'string' ? c.toLowerCase().trim() : ''));
    if (vals.some(v => v === 'sku' || v === 'line')) {
      headerIdx = i;
      vals.forEach((v, idx) => {
        if (v === 'sku')                                       colMap.sku         = idx;
        else if (v === 'line')                                 colMap.name        = idx;
        else if (v === 'cost')                                 colMap.cost        = idx;
        else if (v === 'supplier')                             colMap.supplier    = idx;
        else if (v === 'category')                             colMap.category    = idx;
        else if (v === 'sub category' || v === 'subcategory') colMap.subCategory = idx;
      });
      break;
    }
  }

  const products = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const cells = rows[i].cells;
    const get   = idx => (idx < cells.length ? cells[idx] : null);

    const name = get(colMap.name);
    if (!name || String(name).trim() === '') continue;

    const skuRaw = get(colMap.sku);
    const sku    = skuRaw != null && String(skuRaw).trim() !== '' ? String(skuRaw).trim() : null;

    // Cost: may be a number or a formula result
    const costRaw = get(colMap.cost);
    const cost    = costRaw != null ? parseFloat(costRaw) || 0 : 0;

    const supplierRaw    = get(colMap.supplier);
    const categoryRaw    = get(colMap.category);
    const subCategoryRaw = get(colMap.subCategory);

    products.push({
      sku,
      name:        String(name).trim(),
      cost,
      unit:        'ea',
      category:    categoryRaw    ? String(categoryRaw).trim()    : 'General',
      subCategory: subCategoryRaw ? String(subCategoryRaw).trim() : null,
      supplier:    supplierRaw    ? String(supplierRaw).trim()    : 'Menards',
      tier:        'GOOD',
    });
  }

  return products;
}

/**
 * Parse a labor sheet (General Labor or Roofing Labor) into product records.
 *
 * Columns: Line/name(A=0), total(B=1), Unit(C=2), Cost(D=3), Mark Up(E=4), Sell(F=5), ...
 * Row 1 is the header. Skip rows where name (col A) is empty.
 *
 * @param {object[]} rows
 * @param {string}   categoryLabel  - 'Labor' or 'Roofing Labor'
 */
function parseLaborSheet(rows, categoryLabel) {
  // Detect header row
  let headerIdx = 0;
  let colMap = { name: 0, unit: 2, cost: 3 };

  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const vals = rows[i].cells.map(c => (typeof c === 'string' ? c.toLowerCase().trim() : ''));
    if (vals.some(v => v === 'line' || v === 'cost')) {
      headerIdx = i;
      vals.forEach((v, idx) => {
        if (v === 'line')       colMap.name = idx;
        else if (v === 'unit') colMap.unit = idx;
        else if (v === 'cost') colMap.cost = idx;
      });
      break;
    }
  }

  const products = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const cells = rows[i].cells;
    const get   = idx => (idx < cells.length ? cells[idx] : null);

    const name = get(colMap.name);
    if (!name || String(name).trim() === '') continue;

    const costRaw = get(colMap.cost);
    const cost    = costRaw != null ? parseFloat(costRaw) || 0 : 0;

    const unitRaw = get(colMap.unit);
    const unit    = unitRaw && String(unitRaw).trim() !== '' ? String(unitRaw).trim() : 'ea';

    products.push({
      sku:         null,
      name:        String(name).trim(),
      cost,
      unit,
      category:    categoryLabel,
      subCategory: null,
      supplier:    null,
      tier:        'GOOD',
    });
  }

  return products;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── 1. Read and parse the Excel file ──
  console.log('Reading Excel file…');
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`File not found: ${EXCEL_PATH}`);
    process.exit(1);
  }
  const buf = fs.readFileSync(EXCEL_PATH);
  console.log(`  File size: ${(buf.length / 1024).toFixed(1)} KB`);

  console.log('Parsing ZIP archive…');
  const zipFiles = parseZip(buf);
  console.log(`  Entries extracted: ${Object.keys(zipFiles).length}`);

  // ── 2. Shared strings ──
  const ssXml = zipFiles['xl/sharedStrings.xml']?.toString('utf8') ?? '';
  const sharedStrs = parseSharedStrings(ssXml);
  console.log(`  Shared strings: ${sharedStrs.length}`);

  // ── 3. Resolve sheet paths ──
  const sheetPaths = resolveSheetPaths(zipFiles);
  console.log('  Sheet paths:');
  for (const [name, p] of Object.entries(sheetPaths)) {
    console.log(`    "${name}" → ${p}`);
  }

  function getSheetRows(sheetName) {
    // Exact match
    let zipPath = sheetPaths[sheetName];
    if (!zipPath) {
      // Case-insensitive fallback
      const key = Object.keys(sheetPaths).find(k => k.toLowerCase() === sheetName.toLowerCase());
      if (key) zipPath = sheetPaths[key];
    }
    if (!zipPath) return null;

    const xml = zipFiles[zipPath]?.toString('utf8');
    if (!xml) return null;
    return parseSheet(xml, sharedStrs);
  }

  // ── 4. Parse "Price Page" (products) ──
  console.log('\nParsing "Price Page" sheet…');
  const priceRows = getSheetRows('Price Page');
  if (!priceRows) {
    console.error('ERROR: Could not find "Price Page" sheet.');
    process.exit(1);
  }
  console.log(`  Raw rows: ${priceRows.length}`);
  const products = parsePricePage(priceRows, sharedStrs);
  console.log(`  Products parsed: ${products.length}`);
  if (products.length > 0) {
    console.log(`  Sample: ${products[0].name} | cost=${products[0].cost} | cat=${products[0].category}`);
  }

  // ── 5. Parse "General Labor" ──
  console.log('\nParsing "General Labor" sheet…');
  const laborRows = getSheetRows('General Labor');
  if (!laborRows) {
    console.error('ERROR: Could not find "General Labor" sheet.');
    process.exit(1);
  }
  console.log(`  Raw rows: ${laborRows.length}`);
  const laborItems = parseLaborSheet(laborRows, 'Labor');
  console.log(`  Labor items parsed: ${laborItems.length}`);
  if (laborItems.length > 0) {
    console.log(`  Sample: ${laborItems[0].name} | cost=${laborItems[0].cost} | unit=${laborItems[0].unit}`);
  }

  // ── 6. Parse "Roofing Labor" ──
  console.log('\nParsing "Roofing Labor" sheet…');
  const roofingRows = getSheetRows('Roofing Labor');
  if (!roofingRows) {
    console.error('ERROR: Could not find "Roofing Labor" sheet.');
    process.exit(1);
  }
  console.log(`  Raw rows: ${roofingRows.length}`);
  const roofingItems = parseLaborSheet(roofingRows, 'Roofing Labor');
  console.log(`  Roofing labor items parsed: ${roofingItems.length}`);
  if (roofingItems.length > 0) {
    console.log(`  Sample: ${roofingItems[0].name} | cost=${roofingItems[0].cost} | unit=${roofingItems[0].unit}`);
  }

  // ── 7. Combine all items ──
  const allItems = [...products, ...laborItems, ...roofingItems];
  console.log(`\nTotal items to import: ${allItems.length}`);
  console.log(`  Products (Price Page):  ${products.length}`);
  console.log(`  Labor (General Labor):  ${laborItems.length}`);
  console.log(`  Roofing Labor:          ${roofingItems.length}`);

  if (allItems.length === 0) {
    console.log('Nothing to import. Exiting.');
    return;
  }

  // ── 8. Connect to PostgreSQL ──
  console.log('\nConnecting to database…');
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('  Connected successfully.');

  // ── 9. Insert items ──
  console.log('\nInserting products…');
  const ts = Date.now();
  let inserted = 0;
  let skipped  = 0;
  let errors   = 0;

  for (let i = 0; i < allItems.length; i++) {
    const p  = allItems[i];
    const id = `prod_${ts}_${i}`;

    try {
      const res = await client.query(
        `INSERT INTO "Product" (id, sku, name, cost, unit, category, "subCategory", supplier, tier, active, "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::"Tier", $10, NOW())
         ON CONFLICT DO NOTHING`,
        [
          id,
          p.sku,
          p.name,
          p.cost,
          p.unit,
          p.category,
          p.subCategory,
          p.supplier,
          p.tier,      // cast to Tier enum
          true,
        ]
      );

      if (res.rowCount && res.rowCount > 0) {
        inserted++;
      } else {
        skipped++;
      }
    } catch (err) {
      errors++;
      console.error(`\n  Error on item "${p.name}":`, err.message);
    }

    // Progress every 50 items or at the end
    if ((i + 1) % 50 === 0 || i + 1 === allItems.length) {
      process.stdout.write(
        `\r  Progress: ${i + 1}/${allItems.length}  inserted=${inserted}  skipped=${skipped}  errors=${errors}   `
      );
    }
  }

  console.log('\n');
  console.log('─'.repeat(55));
  console.log('Import complete!');
  console.log(`  Total processed : ${allItems.length}`);
  console.log(`  Inserted        : ${inserted}`);
  console.log(`  Skipped (dupe)  : ${skipped}`);
  console.log(`  Errors          : ${errors}`);
  console.log('─'.repeat(55));

  await client.end();
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
