import { describe, expect, it } from "vitest";
import { getVerseKey } from "@/bible/services/bible-verses-service";
import { DEFAULT_TRANSLATION_ID } from "@/bible/translations";

describe("getVerseKey", () => {
  it("normalizes legacy uppercase translation ids", () => {
    expect(getVerseKey("genesis", 1, "6", "KJV")).toBe(
      getVerseKey("genesis", 1, "6", "kjv"),
    );
  });

  it("treats missing translation as the default catalog id", () => {
    expect(getVerseKey("genesis", 1, "6")).toBe(
      `genesis-1-6-${DEFAULT_TRANSLATION_ID}`,
    );
  });
});
