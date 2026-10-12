import { createApp } from "./app";
import { closeDb, initDb, runMigrations } from "./db";
import { getServerPort } from "./env";

initDb();
runMigrations();

const port = getServerPort();
const app = createApp();

app.listen({ hostname: "0.0.0.0", port });

const shutdown = () => {
  closeDb();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`API → http://localhost:${port}/api`);
console.log(`Health → http://localhost:${port}/api/health`);
