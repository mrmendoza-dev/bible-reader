import { describe, expect, it } from "vitest";
import type { SavedVerse } from "@/bible/storage/models";
import {
  getChapterPassageCoverage,
  getPassageDisplayRows,
} from "@/bible/utils/passage-display";

const passage = (overrides: Partial<SavedVerse> = {}): SavedVerse => ({
  id: "range",
  book_id: "genesis",
  chapter: 1,
  verse: "2",
  end: { bookId: "genesis", chapter: 1, verse: 4 },
  translation: "kjv",
  verse_text: "2 Second verse.\n3 Third verse.\n4 Fourth verse.",
  created_at: "2026-10-12T00:00:00Z",
  updated_at: "2026-10-12T00:00:00Z",
  ...overrides,
});
const verses = [1, 2, 3, 4, 5].map((verse) => ({
  verse: String(verse),
  text: "Text.",
}));

describe("passage display snapshots", () => {
  it("separates verse labels from text and preserves continuation lines", () => {
    expect(
      getPassageDisplayRows(
        passage({
          verse_text: "2 Second verse.\ncontinued\n3-4 Grouped verses.",
        }),
      ),
    ).toEqual([
      {
        bookId: "genesis",
        chapter: 1,
        verse: "2",
        text: "Second verse.\ncontinued",
      },
      { bookId: "genesis", chapter: 1, verse: "3-4", text: "Grouped verses." },
    ]);
  });

  it("keeps chapter and book transitions separate from verse numbers", () => {
    expect(
      getPassageDisplayRows(
        passage({
          end: { bookId: "genesis", chapter: 2, verse: 1 },
          verse_text: "1:31 Last verse.\n2:1 Next chapter.",
        }),
      ),
    ).toEqual([
      { bookId: "genesis", chapter: 1, verse: "31", text: "Last verse." },
      { bookId: "genesis", chapter: 2, verse: "1", text: "Next chapter." },
    ]);
    expect(
      getPassageDisplayRows(
        passage({
          end: { bookId: "exodus", chapter: 1, verse: 1 },
          verse_text: "Genesis 50:26 Last verse.\nExodus 1:1 Next book.",
        }),
      ),
    ).toEqual([
      { bookId: "genesis", chapter: 50, verse: "26", text: "Last verse." },
      { bookId: "exodus", chapter: 1, verse: "1", text: "Next book." },
    ]);
  });

  it("leaves single verses and unrecognized snapshots available as plain text", () => {
    expect(getPassageDisplayRows(passage({ end: undefined }))).toBeUndefined();
    expect(
      getPassageDisplayRows(
        passage({ verse_text: "Unformatted backup text." }),
      ),
    ).toBeUndefined();
  });
});

describe("reader passage coverage", () => {
  it("includes both endpoints and retains each overlapping passage", () => {
    const first = passage();
    const second = passage({
      id: "overlap",
      verse: "3",
      end: { bookId: "genesis", chapter: 1, verse: 5 },
    });
    const coverage = getChapterPassageCoverage(
      [first, second],
      "genesis",
      1,
      verses,
      "kjv",
    );
    expect([...coverage.keys()]).toEqual(["2", "3", "4", "5"]);
    expect(coverage.get("3")?.map((saved) => saved.id)).toEqual([
      "range",
      "overlap",
    ]);
    expect(coverage.get("2")).toEqual([first]);
    expect(coverage.get("5")).toEqual([second]);
  });

  it("clips ranges at book/chapter boundaries and ignores other translations and singles", () => {
    const range = passage({
      chapter: 50,
      verse: "3",
      end: { bookId: "exodus", chapter: 2, verse: 2 },
    });
    const saved = [
      range,
      passage({ end: undefined }),
      passage({ translation: "web" }),
    ];
    const keys = (book: string, chapter: number) => [
      ...getChapterPassageCoverage(saved, book, chapter, verses, "kjv").keys(),
    ];
    expect(keys("genesis", 49)).toEqual([]);
    expect(keys("genesis", 50)).toEqual(["3", "4", "5"]);
    expect(keys("exodus", 1)).toEqual(["1", "2", "3", "4", "5"]);
    expect(keys("exodus", 2)).toEqual(["1", "2"]);
    expect(keys("exodus", 3)).toEqual([]);
    expect(keys("leviticus", 1)).toEqual([]);
  });

  it("uses the translation's book order and supports grouped source verses", () => {
    const range = passage({
      book_id: "tobit",
      translation: "swe1917",
      end: { bookId: "matthew", chapter: 1, verse: 2 },
    });
    expect(
      getChapterPassageCoverage([range], "matthew", 1, verses, "swe1917").size,
    ).toBe(2);
    const coverage = getChapterPassageCoverage(
      [passage()],
      "genesis",
      1,
      [
        { verse: "2-3", text: "Grouped." },
        { verse: "5-6", text: "Outside." },
      ],
      "kjv",
    );
    expect([...coverage.keys()]).toEqual(["2-3"]);
  });
});
