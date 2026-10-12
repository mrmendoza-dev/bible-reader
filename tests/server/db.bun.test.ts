import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { treaty } from "@elysiajs/eden";
import type { App } from "../../server/app";
import { createApp } from "../../server/app";
import { closeDb, getDb, initDb, runMigrations } from "../../server/db";
import { examples } from "../../server/db/schema";

describe("Drizzle + /api/examples", () => {
  beforeAll(() => {
    initDb(":memory:");
    runMigrations();
  });

  afterAll(() => {
    closeDb();
  });

  it("returns rows from the examples table via Elysia", async () => {
    const app = createApp();
    await getDb().insert(examples).values({ label: "demo" });

    const client = treaty<App>("http://db.test", {
      fetcher: ((input: RequestInfo, init?: RequestInit) =>
        app.handle(new Request(input, init))) as unknown as typeof fetch,
    });

    const res = await client.api.examples.get();
    expect(res.error).toBeNull();
    expect(res.data).toEqual([{ id: 1, label: "demo" }]);
  });
});
