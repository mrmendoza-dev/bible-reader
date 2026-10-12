import { treaty } from "@elysiajs/eden";
import { describe, expect, it } from "vitest";
import type { App } from "../../server/app";
import { createApp } from "../../server/app";

describe("Elysia API (createApp)", () => {
  it("serves /api/health via Request.handle", async () => {
    const app = createApp();
    const res = await app.handle(new Request("http://localhost/api/health"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("serves /api metadata via Request.handle", async () => {
    const app = createApp();
    const res = await app.handle(new Request("http://localhost/api"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      name: "bible-reader-api",
      status: "ok",
    });
  });

  it("infers /api and /api/health via Eden Treaty + fetcher", async () => {
    const app = createApp();
    const client = treaty<App>("http://eden.test", {
      fetcher: ((input: RequestInfo, init?: RequestInit) =>
        app.handle(new Request(input, init))) as unknown as typeof fetch,
    });

    const root = await client.api.get();
    expect(root.error).toBeNull();
    expect(root.data).toMatchObject({
      name: "bible-reader-api",
      status: "ok",
    });

    const health = await client.api.health.get();
    expect(health.error).toBeNull();
    expect(health.data).toEqual({ status: "ok" });
  });
});
