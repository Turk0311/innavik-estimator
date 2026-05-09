import { PrismaClient } from './src/generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:SyjjaWHBNMTlutRIYPatOasyUVNEuJwS@switchyard.proxy.rlwy.net:28325/railway',
  ssl: { rejectUnauthorized: false }
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

try {
  const estimates = await prisma.estimate.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { items: true } },
      user: { select: { name: true } },
    },
    take: 3,
  });
  console.log('Success! Found', estimates.length, 'estimates');
  console.log(estimates.map(e => ({ id: e.id, name: e.name, user: e.user.name, items: e._count.items })));
} catch(e) {
  console.error('Error code:', e.code);
  console.error('Error message:', e.message);
  console.error('Meta:', e.meta);
}

await prisma.$disconnect();
await pool.end();
