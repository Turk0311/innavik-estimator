import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:SyjjaWHBNMTlutRIYPatOasyUVNEuJwS@switchyard.proxy.rlwy.net:28325/railway',
  ssl: { rejectUnauthorized: false }
});

try {
  const r1 = await pool.query('SELECT COUNT(*) FROM "Estimate"');
  console.log('Estimates:', r1.rows[0].count);

  const r2 = await pool.query('SELECT COUNT(*) FROM "Measurement"');
  console.log('Measurements:', r2.rows[0].count);

  // Check columns on Estimate
  const r3 = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'Estimate' ORDER BY ordinal_position`);
  console.log('Estimate columns:', r3.rows.map(r => r.column_name).join(', '));

  // Quick findMany equivalent
  const r4 = await pool.query('SELECT id, name, status FROM "Estimate" LIMIT 3');
  console.log('Sample estimates:', r4.rows);
} catch(e) {
  console.error('Error:', e.message);
} finally {
  await pool.end();
}
