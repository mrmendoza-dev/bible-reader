import { describe, expect, it } from "vitest";
import type { Book } from "@/bible/components/saved-verses/types";
import type { SavedVerse } from "@/bible/services/bible-verses-service";
import { DEFAULT_TRANSLATION_ID } from "@/bible/translations";
import { buildGroupedVerses } from "@/bible/utils/saved-verses/group-saved-verses";

const genesisBook: Book = { id: "genesis", title: "Genesis", chapters: 50 };

describe("buildGroupedVerses", () => {
  it("groups by book identity when editions have partial or additional book lists", () => {
    const books = [
      { id: "psalm", title: "Psalm", chapters: 150 },
      { id: "matthew", title: "Matthew", chapters: 28 },
      { id: "tobit", title: "Tobit", chapters: 14 },
    ];
    const verses = books.map(
      (book) =>
        ({
          id: book.id,
          book_id: book.id,
          chapter: 1,
          verse: "1",
          verse_text: "Test",
          translation: "swe1917",
        }) as SavedVerse,
    );
    const grouped = buildGroupedVerses(verses, books);
    expect(Object.keys(grouped.oldTestament)).toEqual(["psalm", "tobit"]);
    expect(Object.keys(grouped.newTestament)).toEqual(["matthew"]);
  });
  it("returns empty testament maps when books list is empty", () => {
    const verse = {
      id: "1",
      book_id: "genesis",
      chapter: 1,
      verse: "1",
      verse_text: "In the beginning",
      translation: DEFAULT_TRANSLATION_ID,
    } as SavedVerse;

    const result = buildGroupedVerses([verse], []);
    expect(Object.keys(result.oldTestament)).toHaveLength(0);
    expect(Object.keys(result.newTestament)).toHaveLength(0);
  });

  it("places Genesis chapter 1 verses in Old Testament and sorts by verse number", () => {
    const books: Book[] = [genesisBook];
    const verses: SavedVerse[] = [
      {
        id: "b",
        book_id: "genesis",
        chapter: 1,
        verse: "2",
        verse_text: "b",
        translation: DEFAULT_TRANSLATION_ID,
      } as SavedVerse,
      {
        id: "a",
        book_id: "genesis",
        chapter: 1,
        verse: "1",
        verse_text: "a",
        translation: DEFAULT_TRANSLATION_ID,
      } as SavedVerse,
    ];

    const result = buildGroupedVerses(verses, books);
    const ch1 = result.oldTestament.genesis.chapters["1"];
    expect(ch1.map((v) => v.verse)).toEqual(["1", "2"]);
  });
});
