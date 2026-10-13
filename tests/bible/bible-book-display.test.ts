import { describe, expect, it } from "vitest";
import { getBookDisplayTitle } from "@/bible/constants";

describe("getBookDisplayTitle", () => {
  it("formats numbered epistles", () => {
    expect(getBookDisplayTitle("2-timothy")).toBe("2 Timothy");
    expect(getBookDisplayTitle("1-corinthians")).toBe("1 Corinthians");
    expect(getBookDisplayTitle("3-john")).toBe("3 John");
  });

  it("lowercases joiners like of", () => {
    expect(getBookDisplayTitle("song-of-solomon")).toBe("Song of Solomon");
  });

  it("title-cases simple books", () => {
    expect(getBookDisplayTitle("genesis")).toBe("Genesis");
    expect(getBookDisplayTitle("psalm")).toBe("Psalm");
  });
});
