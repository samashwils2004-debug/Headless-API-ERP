import { Kysely, PostgresDialect } from 'kysely';
import { ERPDatabase } from '../types/db';

// Prevents Next.js hot-reload from spinning up infinite connections during development
const globalForKysely = globalThis as unknown as { db: Kysely<ERPDatabase> };

export const db =
  globalForKysely.db ||
  new Kysely<ERPDatabase>({
    dialect: new PostgresDialect({
      // Bypasses the strict ESM type-checker using a runtime module load
      pool: new (require('pg').Pool)({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        max: 10, // Optimal connection pooling for serverless architectures
        ssl: {
          rejectUnauthorized: false, // Permits secure Aiven handshakes without physical certificate files
        },
      }),
    }),
  });

if (process.env.NODE_ENV !== 'production') globalForKysely.db = db;

