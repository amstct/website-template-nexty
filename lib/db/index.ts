import { createDatabase } from './config';

const connectionString = process.env.DATABASE_URL;

/**
 * When false, the app can run in frontend-only mode (marketing pages, static content).
 * Auth, payments, CMS (DB-backed), and dashboard require a database.
 */
export const isDatabaseEnabled = Boolean(connectionString);

type Database = ReturnType<typeof createDatabase>;

let dbInstance: Database | null = null;

function getDb(): Database {
  if (dbInstance) {
    return dbInstance;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Database features are unavailable in frontend-only mode.'
    );
  }

  dbInstance = createDatabase({
    connectionString: process.env.DATABASE_URL,
  });
  return dbInstance;
}

/**
 * Lazy database proxy: importing this module does not require DATABASE_URL.
 * The connection is created on first use. Prefer guarding with `isDatabaseEnabled`
 * on public/frontend paths so they can degrade gracefully.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
