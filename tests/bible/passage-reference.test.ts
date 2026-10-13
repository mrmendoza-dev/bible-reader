import { describe, expect, it } from "vitest";
import {
  formatSavedPassage,
  parsePassageEnd,
} from "@/bible/utils/passage-reference";

const start = { bookId: "genesis", chapter: 1, verse: 2 };
describe("passage references", () => {
  it.each([
    ["8", { ...start, verse: 8 }],
    ["2:8", { ...start, chapter: 2, verse: 8 }],
    [" exodus 1:8 ", { bookId: "exodus", chapter: 1, verse: 8 }],
    ["1 Corinthians 2:8", { bookId: "1-corinthians", chapter: 2, verse: 8 }],
    [
      "Song of Solomon 2:8",
      { bookId: "song-of-solomon", chapter: 2, verse: 8 },
    ],
  ])("parses %s", (input, end) => {
    expect(parsePassageEnd(input, start)).toEqual(end);
  });

  it.each([
    "",
    "0",
    "-2",
    "1",
    "2",
    "2.5",
    "2:0",
    "Genesis 51:1",
    "Exodus 1:999",
    "Unknown 1:1",
  ])("rejects %s", (input) => {
    expect(() => parsePassageEnd(input, start)).toThrow();
  });
  it("rejects an earlier book and uses the selected translation's book order", () => {
    expect(() =>
      parsePassageEnd("Genesis 50:26", {
        bookId: "exodus",
        chapter: 1,
        verse: 1,
      }),
    ).toThrow("after");
    expect(
      parsePassageEnd(
        "Matthew 1:1",
        { bookId: "tobit", chapter: 14, verse: 1 },
        "swe1917",
      ).bookId,
    ).toBe("matthew");
    expect(() => parsePassageEnd("Tobit 1:2", start, "web")).toThrow(
      "unavailable",
    );
  });
  it.each([
    [undefined, "Genesis 1:2"],
    [{ ...start, verse: 8 }, "Genesis 1:2–8"],
    [{ ...start, chapter: 2, verse: 8 }, "Genesis 1:2–2:8"],
    [{ bookId: "exodus", chapter: 1, verse: 8 }, "Genesis 1:2–Exodus 1:8"],
  ])("formats an endpoint %j", (end, expected) => {
    expect(
      formatSavedPassage({ book_id: "genesis", chapter: 1, verse: "2", end }),
    ).toBe(expected);
  });
});
