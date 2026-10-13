import { ALL_BOOK_IDS, getBookDisplayTitle } from "@/bible/constants";
import type { BookData } from "@/bible/types/bible-reader";

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const bookKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/^psalms$/, "psalm")
    .replace(/^songofsongs$/, "songofsolomon");
export function parseTranslationBook(bookId: string, raw: unknown): BookData {
  if (!ALL_BOOK_IDS.includes(bookId) || !object(raw))
    throw new Error("Invalid Bible book data");
  const key = Object.keys(raw).find(
    (key) => key !== "Info" && bookKey(key) === bookKey(bookId),
  );
  const data = key
    ? raw[key]
    : Object.keys(raw).every((key) => /^[1-9]\d*$/.test(key))
      ? raw
      : null;
  if (!object(data) || !Object.keys(data).length)
    throw new Error(`No chapter data for ${bookId}`);
  const chapters = Object.entries(data)
    .map(([chapter, values]) => {
      if (!/^[1-9]\d*$/.test(chapter) || !object(values))
        throw new Error(`Invalid chapter in ${bookId}`);
      const occupied = new Set<number>();
      const verses = Object.entries(values)
        .map(([verse, text]) => {
          if (
            !/^[1-9]\d*(?:-[1-9]\d*)?$/.test(verse) ||
            typeof text !== "string"
          )
            throw new Error(
              `Invalid verse data at ${bookId} ${chapter}:${verse}`,
            );
          const [start, end = start] = verse.split("-").map(Number);
          if (end < start || end > 176)
            throw new Error(`Invalid verse range: ${verse}`);
          for (let number = start; number <= end; number++) {
            if (occupied.has(number))
              throw new Error(
                `Overlapping verses at ${bookId} ${chapter}:${verse}`,
              );
            occupied.add(number);
          }
          return { verse, text };
        })
        .sort(
          (a, b) => Number.parseInt(a.verse, 10) - Number.parseInt(b.verse, 10),
        );
      if (!verses.length)
        throw new Error(`Empty chapter at ${bookId} ${chapter}`);
      return { chapter, verses };
    })
    .sort((a, b) => Number(a.chapter) - Number(b.chapter));
  return { book: getBookDisplayTitle(bookId), chapters };
}
export function verseContains(verse: string, number: number) {
  const [start, end = start] = verse.split("-").map(Number);
  return number >= start && number <= end;
}
