import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ensureDirectoryExists,
  generateUnixTimestamp,
} from "../../server/utils/helpers";

describe("generateUnixTimestamp", () => {
  it("returns seconds since epoch", () => {
    const before = Math.floor(Date.now() / 1000);
    const ts = generateUnixTimestamp();
    const after = Math.floor(Date.now() / 1000);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe("ensureDirectoryExists", () => {
  it("creates a nested directory when missing", async () => {
    const base = await mkdtemp(join(tmpdir(), "srv-test-"));
    const nested = join(base, "a", "b");
    await ensureDirectoryExists(nested);
    const st = await stat(nested);
    expect(st.isDirectory()).toBe(true);
    await rm(base, { recursive: true, force: true });
  });
});
