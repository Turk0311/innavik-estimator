import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  connectionString: 'postgresql://postgres:SyjjaWHBNMTlutRIYPatOasyUVNEuJwS@switchyard.proxy.rlwy.net:28325/railway',
  ssl: { rejectUnauthorized: false }
});

const names = [
  'R-19 Kraft Faced Fiberglass Insulation 6-1/4"x15"x93\' 87.19sq ft',
  'R-30 EcoBatt Kraft Faced Fiberglass Insulation 69.33 sqf 1616195',
  'R-10 2"x4\'x8\' Foamular 250 Board Insulation',
  'Insulmax Blow-in Cellulose Insulation',
  'EcoFill WX Fiberglass Blow-in Insulation 106.6 sq ft @ R-19',
  'R-13 EcoRoll Kraft-Faced Fiberglass Insulation Roll 3-1/2"x15"x32\'',
  'R-13 EcoRoll Kraft-Faced Fiberglass Insulation Roll 3-1/2"x23"x32\'',
  'R-13 EcoBatt Kraft-Face Fiberglass Insulation Batt 3-1/2"x15"x93"',
  'R-13 EcoBatt Kraft-Face Fiberglass Insulation Batt 3-1/2"x23"x93"',
  'R-15 EcoRoll Kraft-Faced Fiberglass Insulation Roll 3-1/2"x15"x18\'',
  'JM Safe & Fireblock 3"x15-1/4"x47" 50sqf',
  '24" Insulation Support Wire 100ct',
  'Equipment Rental (Insulation)',
  'Arrow T50 3/8" Crown x 1/2" Leg Galvanized Heavy-Duty Staples - 5,000 Count',
  'Arrow T50 3/8" Crown x 3/8" Leg Galvanized Heavy-Duty Staples - 5,000 Count',
  'OSI Orange Fire Block Expanding Spray Foam 21.1 oz',
];

for (const name of names) {
  const r = await pool.query(
    `SELECT id, name, cost, unit FROM "Product" WHERE name ILIKE $1 LIMIT 1`,
    [name]
  );
  const found = r.rows[0];
  console.log(found ? `✓  ${found.name} — $${found.cost}/${found.unit}` : `✗  NOT FOUND: ${name}`);
}

await pool.end();
