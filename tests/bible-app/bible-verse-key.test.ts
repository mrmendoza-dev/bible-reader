import { getVerseKey } from "@apps/production/bible-app/services/bible-verses-service";
import { DEFAULT_TRANSLATION_ID } from "@apps/production/bible-app/translations";
import { describe, expect, it } from "vitest";

describe("getVerseKey", () => {
  it("normalizes legacy uppercase translation ids", () => {
    expect(getVerseKey("genesis", 1, "6", "KJV")).toBe(
      getVerseKey("genesis", 1, "6", DEFAULT_TRANSLATION_ID),
    );
  });

  it("treats missing translation as the default catalog id", () => {
    expect(getVerseKey("genesis", 1, "6")).toBe(
      `genesis-1-6-${DEFAULT_TRANSLATION_ID}`,
    );
  });
});
