import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema";

type Db = BunSQLiteDatabase<typeof schema>;

let sqlite: Database | null = null;
let db: Db | null = null;

export const getDatabasePath = (): string =>
  Bun.env.DATABASE_PATH ?? "data/dev.db";

/** Opens SQLite (default file path from env) and returns the Drizzle client. */
export const initDb = (path = getDatabasePath()): Db => {
  if (db) {
    return db;
  }
  const openPath = path === ":memory:" ? path : resolve(path);
  if (path !== ":memory:") {
    mkdirSync(dirname(openPath), { recursive: true });
  }
  sqlite = new Database(openPath);
  sqlite.run("PRAGMA foreign_keys = ON;");
  db = drizzle(sqlite, { schema });
  return db;
};

export const getDb = (): Db => {
  if (!db) {
    return initDb();
  }
  return db;
};

/** Applies SQL migrations in `server/db/migrations` (safe to call on every server start). */
export const runMigrations = (): void => {
  const database = getDb();
  const folder = join(import.meta.dir, "migrations");
  migrate(database, { migrationsFolder: folder });
};

/** Releases the DB handle (mainly for tests). */
export const closeDb = (): void => {
  sqlite?.close();
  sqlite = null;
  db = null;
};
