// Check what DATABASE_URL looks like when loaded by dotenv
import { config } from 'dotenv';
config();
console.log('DATABASE_URL set?', !!process.env.DATABASE_URL);
console.log('DATABASE_URL prefix:', process.env.DATABASE_URL?.slice(0, 30));
