import type {
  Book,
  GroupedVerses,
} from "@/bible/components/saved-verses/types";
import { isOldTestamentBook } from "@/bible/constants";
import type { SavedVerse } from "@/bible/services/bible-verses-service";
import { normalizeTranslationId } from "@/bible/translations";

export const buildGroupedVerses = (
  filteredVerses: SavedVerse[],
  books: Book[],
): GroupedVerses => {
  const result: GroupedVerses = {
    oldTestament: {},
    newTestament: {},
  };

  if (books.length === 0) return result;

  const bookIndexMap = new Map<string, number>();
  books.forEach((book, index) => {
    bookIndexMap.set(book.id, index);
  });

  filteredVerses.forEach((verse) => {
    const bookIndex = bookIndexMap.get(verse.book_id);
    if (bookIndex === undefined) return;

    const testament = isOldTestamentBook(verse.book_id)
      ? "oldTestament"
      : "newTestament";
    const book = books[bookIndex];

    if (!result[testament][verse.book_id]) {
      result[testament][verse.book_id] = {
        bookTitle: book.title,
        chapters: {},
      };
    }

    const chapterKey = verse.chapter.toString();
    if (!result[testament][verse.book_id].chapters[chapterKey]) {
      result[testament][verse.book_id].chapters[chapterKey] = [];
    }

    result[testament][verse.book_id].chapters[chapterKey].push(verse);
  });

  const sortChapterVerses = (verses: SavedVerse[]) => {
    verses.sort((a, b) => {
      const verseCompare =
        Number.parseInt(a.verse, 10) - Number.parseInt(b.verse, 10);
      if (verseCompare !== 0) return verseCompare;
      const transA = normalizeTranslationId(a.translation);
      const transB = normalizeTranslationId(b.translation);
      return transA.localeCompare(transB);
    });
  };

  Object.values(result.oldTestament).forEach((book) => {
    Object.values(book.chapters).forEach(sortChapterVerses);
  });

  Object.values(result.newTestament).forEach((book) => {
    Object.values(book.chapters).forEach(sortChapterVerses);
  });

  return result;
};
