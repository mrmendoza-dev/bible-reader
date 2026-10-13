import { getBookDisplayTitle } from "@/bible/constants";
import { getBookChapterCount } from "@/bible/storage/validation";
import {
  getTranslationBookIds,
  getTranslationSourceBooks,
  isTranslationReferenceAvailable,
  requireTranslationId,
} from "@/bible/translations";
import {
  MAX_SAVED_TEXT_LENGTH,
  type PassageReference,
  validatePassage,
} from "@/bible/utils/passage-reference";
import { verseContains } from "@/bible/utils/translation-data";
import { bibleService } from "./bible-service";

export async function loadPassageText(
  start: PassageReference,
  end: PassageReference,
  translation: string,
): Promise<string> {
  const translationId = requireTranslationId(translation);
  validatePassage(start, end, translationId);
  const availableBooks = getTranslationBookIds(translationId);
  const books = getTranslationSourceBooks(translationId);
  const firstBook = books.indexOf(start.bookId);
  const lastBook = books.indexOf(end.bookId);
  if (
    firstBook < 0 ||
    lastBook < firstBook ||
    books
      .slice(firstBook, lastBook + 1)
      .some((id) => !availableBooks.includes(id))
  )
    throw new Error("This passage is unavailable in the selected translation.");
  const lines: string[] = [];
  let length = 0;
  for (const bookId of books.slice(firstBook, lastBook + 1)) {
    const book = await bibleService.getBook(bookId, translationId);
    const firstChapter = bookId === start.bookId ? start.chapter : 1;
    const lastChapter =
      bookId === end.bookId ? end.chapter : getBookChapterCount(bookId);
    if (!Number.isInteger(lastChapter) || lastChapter < firstChapter)
      throw new Error(
        `Chapter is unavailable: ${getBookDisplayTitle(bookId)} ${firstChapter}.`,
      );
    for (let number = firstChapter; number <= lastChapter; number++) {
      const chapter = book.chapters.find(
        (chapter) => Number(chapter.chapter) === number,
      );
      if (
        !chapter ||
        !isTranslationReferenceAvailable(translationId, bookId, number)
      )
        throw new Error(
          `Chapter is unavailable: ${getBookDisplayTitle(bookId)} ${number}.`,
        );
      const first =
        bookId === start.bookId && number === start.chapter
          ? start.verse
          : Number(chapter.verses[0]?.verse.split("-")[0]);
      const last =
        bookId === end.bookId && number === end.chapter
          ? end.verse
          : Number(chapter.verses.at(-1)?.verse.split("-").at(-1));
      const firstSource = chapter.verses.find((verse) =>
        verseContains(verse.verse, first),
      );
      const lastSource = chapter.verses.find((verse) =>
        verseContains(verse.verse, last),
      );
      if (!firstSource?.text.trim() || !lastSource?.text.trim())
        throw new Error(
          `Verse is unavailable in ${getBookDisplayTitle(bookId)} ${number}.`,
        );
      for (let verse = first; verse <= last; verse++)
        if (
          !chapter.verses.some((source) => verseContains(source.verse, verse))
        )
          throw new Error(
            `Verse is unavailable: ${getBookDisplayTitle(bookId)} ${number}:${verse}.`,
          );
      if (
        Number(firstSource.verse.split("-")[0]) !== first ||
        Number(lastSource.verse.split("-").at(-1)) !== last
      )
        throw new Error(
          `This translation groups verses. Use the full ${firstSource.verse === lastSource.verse ? firstSource.verse : `${firstSource.verse}–${lastSource.verse}`} range in ${getBookDisplayTitle(bookId)} ${number}.`,
        );
      for (const verse of chapter.verses) {
        if (
          Number(verse.verse.split("-")[0]) < first ||
          Number(verse.verse.split("-").at(-1)) > last ||
          !verse.text.trim()
        )
          continue;
        const label =
          start.bookId !== end.bookId
            ? `${getBookDisplayTitle(bookId)} ${number}:${verse.verse}`
            : start.chapter !== end.chapter
              ? `${number}:${verse.verse}`
              : verse.verse;
        const line = `${label} ${verse.text.trim()}`;
        length += line.length + 1;
        if (length > MAX_SAVED_TEXT_LENGTH)
          throw new Error("Passage text is too long to save.");
        lines.push(line);
      }
    }
  }
  return lines.join("\n");
}
