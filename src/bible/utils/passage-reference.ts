import { ALL_BOOK_IDS, getBookDisplayTitle } from "@/bible/constants";
import { validateLocation } from "@/bible/storage/validation";
import {
  DEFAULT_TRANSLATION_ID,
  getTranslationSourceBooks,
} from "@/bible/translations";

export interface PassageReference {
  bookId: string;
  chapter: number;
  verse: number;
}

export interface SavedPassageLocation {
  book_id: string;
  chapter: number;
  verse: string;
  end?: PassageReference;
}

export const MAX_SAVED_TEXT_LENGTH = 5_000_000;

export function validatePassage(
  start: PassageReference,
  end: PassageReference,
  translation: string = DEFAULT_TRANSLATION_ID,
) {
  for (const reference of [start, end])
    validateLocation(
      reference.bookId,
      reference.chapter,
      String(reference.verse),
    );
  const books = getTranslationSourceBooks(translation);
  if (!books.includes(start.bookId) || !books.includes(end.bookId))
    throw new Error(
      "This reference is unavailable in the selected translation.",
    );
  const order =
    books.indexOf(end.bookId) - books.indexOf(start.bookId) ||
    end.chapter - start.chapter ||
    end.verse - start.verse;
  if (order <= 0)
    throw new Error("End reference must come after the starting verse.");
}

export function parsePassageEnd(
  input: string,
  start: PassageReference,
  translation: string = DEFAULT_TRANSLATION_ID,
): PassageReference {
  const value = input.trim();
  let end: PassageReference;
  if (/^[1-9]\d*$/.test(value)) {
    end = { ...start, verse: Number(value) };
  } else if (/^[1-9]\d*:[1-9]\d*$/.test(value)) {
    const [chapter, verse] = value.split(":").map(Number);
    end = { bookId: start.bookId, chapter, verse };
  } else {
    const match = value.match(/^(.+?)\s+([1-9]\d*):([1-9]\d*)$/);
    if (!match)
      throw new Error("Enter a verse, chapter:verse, or Book chapter:verse.");
    const normalize = (name: string) =>
      name
        .toLowerCase()
        .replace(/[\s()-]/g, "")
        .replace(/^psalm$/, "psalms");
    const bookId = ALL_BOOK_IDS.find(
      (id) =>
        normalize(id) === normalize(match[1]) ||
        normalize(getBookDisplayTitle(id)) === normalize(match[1]),
    );
    if (!bookId)
      throw new Error("Unknown book. Use its full name, such as Exodus 1:8.");
    end = { bookId, chapter: Number(match[2]), verse: Number(match[3]) };
  }
  validatePassage(start, end, translation);
  return end;
}

export function formatSavedPassage(location: SavedPassageLocation): string {
  const start = `${getBookDisplayTitle(location.book_id)} ${location.chapter}:${location.verse}`;
  const end = location.end;
  if (!end) return start;
  if (end.bookId !== location.book_id)
    return `${start}–${getBookDisplayTitle(end.bookId)} ${end.chapter}:${end.verse}`;
  return end.chapter === location.chapter
    ? `${start}–${end.verse}`
    : `${start}–${end.chapter}:${end.verse}`;
}

export function getSavedReferenceKey(
  bookId: string,
  chapter: number,
  verse: string,
  end?: PassageReference,
) {
  const start = `${bookId}-${chapter}-${verse}`;
  return end ? `${start}~${end.bookId}-${end.chapter}-${end.verse}` : start;
}
