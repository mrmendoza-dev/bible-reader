import {
  firstPassageFromReferenceResults,
  referenceQueryLooksLikeReference,
} from "@apps/production/bible-app/utils/bible-reference-query";
import { describe, expect, it } from "vitest";

describe("referenceQueryLooksLikeReference", () => {
  it("detects colon references", () => {
    expect(referenceQueryLooksLikeReference("Genesis 1:4")).toBe(true);
    expect(referenceQueryLooksLikeReference("  John 3:16  ")).toBe(true);
  });

  it("detects book + chapter without colon", () => {
    expect(referenceQueryLooksLikeReference("John 3")).toBe(true);
    expect(referenceQueryLooksLikeReference("1 Kings 4")).toBe(true);
  });

  it("returns false for empty or plain text", () => {
    expect(referenceQueryLooksLikeReference("")).toBe(false);
    expect(referenceQueryLooksLikeReference("   ")).toBe(false);
    expect(referenceQueryLooksLikeReference("faith hope love")).toBe(false);
  });
});

describe("firstPassageFromReferenceResults", () => {
  it("returns first hit book/chapter/verse", () => {
    expect(
      firstPassageFromReferenceResults([
        {
          bookId: "genesis",
          bookTitle: "Genesis",
          chapter: 1,
          verse: "4",
          text: "…",
          relevanceScore: 100,
        },
      ]),
    ).toEqual({ bookId: "genesis", chapter: 1, verse: "4" });
  });

  it("returns null for empty or null", () => {
    expect(firstPassageFromReferenceResults(null)).toBeNull();
    expect(firstPassageFromReferenceResults([])).toBeNull();
  });
});
