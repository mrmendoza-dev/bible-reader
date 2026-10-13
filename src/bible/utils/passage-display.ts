import { ALL_BOOK_IDS, getBookDisplayTitle } from "@/bible/constants";
import type { SavedVerse } from "@/bible/storage/models";
import { getTranslationSourceBooks } from "@/bible/translations";
import type { Verse } from "@/bible/types/bible-reader";
import type { SavedPassageLocation } from "@/bible/utils/passage-reference";

export interface PassageDisplayRow {
  bookId: string;
  chapter: number;
  verse: string;
  text: string;
}

export function getPassageDisplayRows(
  passage: SavedPassageLocation & { verse_text: string },
): PassageDisplayRow[] | undefined {
  if (!passage.end) return undefined;
  const rows: PassageDisplayRow[] = [];
  for (const line of passage.verse_text.split("\n")) {
    let bookId = passage.book_id;
    let chapter = passage.chapter;
    let match: RegExpMatchArray | null;
    if (passage.end.bookId !== passage.book_id) {
      match = line.match(/^(.+) ([1-9]\d*):([1-9]\d*(?:-[1-9]\d*)?)\s+(.+)$/);
      if (match) {
        const sourceBook = ALL_BOOK_IDS.find(
          (id) => getBookDisplayTitle(id) === match?.[1],
        );
        if (!sourceBook) return undefined;
        bookId = sourceBook;
        chapter = Number(match[2]);
        match = [match[0], match[3], match[4]];
      }
    } else if (passage.end.chapter !== passage.chapter) {
      match = line.match(/^([1-9]\d*):([1-9]\d*(?:-[1-9]\d*)?)\s+(.+)$/);
      if (match) {
        chapter = Number(match[1]);
        match = [match[0], match[2], match[3]];
      }
    } else {
      match = line.match(/^([1-9]\d*(?:-[1-9]\d*)?)\s+(.+)$/);
    }
    if (!match) {
      const previous = rows.at(-1);
      if (!previous) return undefined;
      previous.text += `\n${line}`;
      continue;
    }
    rows.push({ bookId, chapter, verse: match[1], text: match[2] });
  }
  return rows.length ? rows : undefined;
}

export function getChapterPassageCoverage(
  passages: SavedVerse[],
  bookId: string,
  chapter: number,
  verses: Verse[],
  translation: string,
): Map<string, SavedVerse[]> {
  const books = getTranslationSourceBooks(translation);
  const bookIndex = books.indexOf(bookId);
  const coverage = new Map<string, SavedVerse[]>();
  if (bookIndex < 0) return coverage;
  for (const passage of passages) {
    const end = passage.end;
    if (!end || passage.translation !== translation) continue;
    const startIndex = books.indexOf(passage.book_id);
    const endIndex = books.indexOf(end.bookId);
    if (startIndex < 0 || endIndex < 0) continue;
    if (
      bookIndex < startIndex ||
      bookIndex > endIndex ||
      (bookIndex === startIndex && chapter < passage.chapter) ||
      (bookIndex === endIndex && chapter > end.chapter)
    )
      continue;
    const first =
      bookId === passage.book_id && chapter === passage.chapter
        ? Number(passage.verse)
        : 1;
    const last =
      bookId === end.bookId && chapter === end.chapter
        ? end.verse
        : Number.POSITIVE_INFINITY;
    for (const verse of verses) {
      const [from, to = from] = verse.verse.split("-").map(Number);
      if (from > last || to < first) continue;
      const matches = coverage.get(verse.verse) ?? [];
      matches.push(passage);
      coverage.set(verse.verse, matches);
    }
  }
  return coverage;
}
