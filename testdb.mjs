import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:SyjjaWHBNMTlutRIYPatOasyUVNEuJwS@switchyard.proxy.rlwy.net:28325/railway',
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  console.log('Database connection successful!');
  const res = await client.query('SELECT COUNT(*) FROM "User"');
  console.log('User count:', res.rows[0].count);
  await client.end();
} catch (err) {
  console.error('Connection failed:', err.message);
}
