import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

// Only create the pool when DATABASE_URL is present. During Vercel builds,
// `next build` tries to collect page data and may import API route modules;
// without DATABASE_URL set we must not throw at module-load time.
let _pool: Pool | null = null;
function getPool(): Pool {
  if (_pool) return _pool;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required to connect to the database. " +
      "Set it in your environment (Vercel project settings or .env.local)."
    );
  }
  _pool = globalForDb.__arenaNextJsPostgresqlPool ?? new Pool({ connectionString: url });
  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = _pool;
  }
  return _pool;
}

// Proxy so that `pool` / `db` are created on first access (lazy). This keeps
// Next.js's static analysis happy — it sees real named exports — while
// deferring the DATABASE_URL check to request time.
export const pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    return Reflect.get(getPool(), prop, receiver);
  },
});

let _db: ReturnType<typeof drizzle> | null = null;
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    if (!_db) _db = drizzle(getPool());
    return Reflect.get(_db, prop, receiver);
  },
});
