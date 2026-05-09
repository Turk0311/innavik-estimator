import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:SyjjaWHBNMTlutRIYPatOasyUVNEuJwS@switchyard.proxy.rlwy.net:28325/railway',
  ssl: { rejectUnauthorized: false }
});

await client.connect();

const hash = await bcrypt.hash('Innavik2024!', 12);
const id = 'admin_' + Date.now();

await client.query(
  `INSERT INTO "User" (id, email, name, password, role, active, "createdAt")
   VALUES ($1, $2, $3, $4, $5, $6, NOW())
   ON CONFLICT (email) DO NOTHING`,
  [id, 'turk@innavik.com', 'Turk', hash, 'ADMIN', true]
);

console.log('Admin user created: turk@innavik.com / Innavik2024!');
await client.end();
