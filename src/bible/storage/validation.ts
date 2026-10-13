import {
  ADDITIONAL_BOOK_CHAPTERS,
  ALL_BOOK_IDS,
  BOOKS_LIST,
} from "@/bible/constants";

const chapterCounts = [
  50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150,
  31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4, 28, 16,
  24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1,
  22,
];
export function getBookChapterCount(book: string): number {
  if (Object.hasOwn(ADDITIONAL_BOOK_CHAPTERS, book))
    return ADDITIONAL_BOOK_CHAPTERS[book];
  const index = BOOKS_LIST.indexOf(book);
  if (index < 0) throw new Error(`Unknown Bible book: ${book}`);
  return chapterCounts[index];
}
export function validateLocation(
  book: string,
  chapter: number,
  verse?: string | null,
) {
  if (
    !ALL_BOOK_IDS.includes(book) ||
    !Number.isInteger(chapter) ||
    chapter < 1 ||
    chapter > getBookChapterCount(book)
  ) {
    throw new Error("Invalid book or chapter reference");
  }
  if (
    verse != null &&
    (!/^[1-9]\d*(?:-[1-9]\d*)?$/.test(verse) ||
      verse.split("-").some((part) => Number(part) > 176) ||
      (verse.includes("-") &&
        Number(verse.split("-")[0]) > Number(verse.split("-")[1])))
  ) {
    throw new Error("Invalid verse reference");
  }
}
export function validateColor(color: string) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error("Invalid bookmark color");
}
export function validateName(name: string) {
  if (!name.trim() || name.length > 200)
    throw new Error("Name must contain 1–200 characters");
}
export const locationKey = (
  book: string,
  chapter: number,
  verse?: string | null,
) => JSON.stringify([book, chapter, verse ?? null]);
