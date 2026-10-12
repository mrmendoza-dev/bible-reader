import { join } from "node:path";
import { defineConfig } from "drizzle-kit";

const dbPath = process.env.DATABASE_PATH ?? "data/dev.db";
const resolved = dbPath.startsWith("/") ? dbPath : join(process.cwd(), dbPath);

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: `file:${resolved}`,
  },
});
