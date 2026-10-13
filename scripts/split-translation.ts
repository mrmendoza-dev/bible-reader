import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { ALL_BOOK_IDS, getBookDisplayTitle } from "../src/bible/constants";
import { getBookChapterCount } from "../src/bible/storage/validation";
import { parseTranslationBook } from "../src/bible/utils/translation-data";

const chapterNumber = z
  .union([z.number().int().positive(), z.string().regex(/^[1-9]\d*$/)])
  .transform(String);
const verseNumber = z
  .union([
    z.number().int().positive(),
    z.string().regex(/^[1-9]\d*(?:-[1-9]\d*)?$/),
  ])
  .transform(String);
const sourceSchema = z
  .object({
    translation: z.string().min(1),
    books: z
      .array(
        z
          .object({
            name: z.string().min(1),
            chapters: z
              .array(
                z
                  .object({
                    chapter: chapterNumber,
                    verses: z
                      .array(
                        z
                          .object({ verse: verseNumber, text: z.string() })
                          .strict(),
                      )
                      .min(1),
                  })
                  .strict(),
              )
              .min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

const aliases: Record<string, string> = {
  psalms: "psalm",
  "song-of-songs": "song-of-solomon",
  "revelation-of-john": "revelation",
};
export function bookSlug(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(
      /^(iv|iii|ii|i)\s+/,
      (roman) =>
        `${{ i: 1, ii: 2, iii: 3, iv: 4 }[roman.trim() as "i" | "ii" | "iii" | "iv"]} `,
    )
    .replace(/[()]/g, "")
    .replace(/\s+/g, "-");
  const slug = Object.hasOwn(aliases, normalized)
    ? aliases[normalized]
    : normalized;
  if (!ALL_BOOK_IDS.includes(slug))
    throw new Error(`Unknown Bible book: ${name}`);
  return slug;
}

type Chapters = Record<string, Record<string, string>>;
type FormattedBook = { Info: { translation: string } } & Record<
  string,
  Chapters | { translation: string }
>;
export function splitTranslation(value: unknown) {
  const source = sourceSchema.parse(value);
  const books = new Map<string, FormattedBook>();
  let chapterCount = 0,
    verseCount = 0;
  const emptyVerses: string[] = [];
  for (const book of source.books) {
    const slug = bookSlug(book.name);
    if (books.has(slug)) throw new Error(`Duplicate Bible book: ${slug}`);
    const chapters: Chapters = {};
    for (const chapter of book.chapters) {
      if (Object.hasOwn(chapters, chapter.chapter))
        throw new Error(`Duplicate chapter: ${slug} ${chapter.chapter}`);
      if (Number(chapter.chapter) > getBookChapterCount(slug))
        throw new Error(`Invalid chapter: ${slug} ${chapter.chapter}`);
      const verses: Record<string, string> = {};
      for (const verse of chapter.verses) {
        if (Object.hasOwn(verses, verse.verse))
          throw new Error(
            `Duplicate verse: ${slug} ${chapter.chapter}:${verse.verse}`,
          );
        verses[verse.verse] = verse.text;
        verseCount++;
        if (!verse.text.trim())
          emptyVerses.push(`${slug} ${chapter.chapter}:${verse.verse}`);
      }
      chapters[chapter.chapter] = verses;
      chapterCount++;
    }
    if (book.chapters.length !== getBookChapterCount(slug))
      throw new Error(`Incomplete chapter coverage: ${slug}`);
    const formatted: FormattedBook = {
      [getBookDisplayTitle(slug)]: chapters,
      Info: { translation: source.translation },
    };
    // Apply the same structural checks as the app, including overlapping verse ranges.
    parseTranslationBook(slug, formatted);
    books.set(slug, formatted);
  }
  return {
    translation: source.translation,
    books,
    stats: {
      books: books.size,
      chapters: chapterCount,
      verses: verseCount,
      emptyVerses,
    },
  };
}

export async function verifySplitTranslation(
  source: unknown,
  directory: string,
) {
  const expected = splitTranslation(source);
  const names = await readdir(directory);
  const expectedNames = [...expected.books.keys()]
    .map((slug) => `${slug}.json`)
    .sort();
  if (!isDeepStrictEqual(names.sort(), expectedNames))
    throw new Error("Output must contain exactly the source book files");
  for (const [slug, book] of expected.books) {
    const actual: unknown = JSON.parse(
      await readFile(join(directory, `${slug}.json`), "utf8"),
    );
    if (!isDeepStrictEqual(actual, book))
      throw new Error(`Source/output mismatch: ${slug}.json`);
    parseTranslationBook(slug, actual);
  }
  return expected.stats;
}

async function requireNewDirectory(directory: string) {
  try {
    await lstat(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  throw new Error(
    `Output already exists; choose a new directory: ${directory}`,
  );
}

export async function writeSplitTranslation(
  source: unknown,
  directory: string,
) {
  const converted = splitTranslation(source);
  const destination = resolve(directory);
  await requireNewDirectory(destination);
  await mkdir(dirname(destination), { recursive: true });
  const staging = await mkdtemp(
    join(dirname(destination), `.${basename(destination)}-`),
  );
  try {
    for (const [slug, book] of converted.books) {
      await writeFile(
        join(staging, `${slug}.json`),
        `${JSON.stringify(book, null, 2)}\n`,
        { flag: "wx" },
      );
    }
    await verifySplitTranslation(source, staging);
    await requireNewDirectory(destination);
    await rename(staging, destination);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
  return converted.stats;
}

if (import.meta.main) {
  try {
    const args = process.argv.slice(2);
    const verifyOnly = args[0] === "--verify";
    if (verifyOnly) args.shift();
    if (args.length !== 2 || args.some((arg) => arg.startsWith("--")))
      throw new Error(
        "Usage: bun run data:split [--verify] <source.json> <output-directory>",
      );
    const [input, output] = args;
    const bytes = await readFile(input);
    const source: unknown = JSON.parse(bytes.toString("utf8"));
    const stats = verifyOnly
      ? await verifySplitTranslation(source, output)
      : await writeSplitTranslation(source, output);
    console.log(
      `${verifyOnly ? "Verified" : "Converted and verified"}: ${stats.books} books, ${stats.chapters} chapters, ${stats.verses} verse entries.`,
    );
    console.log(
      `Source SHA-256: ${createHash("sha256").update(bytes).digest("hex")}`,
    );
    console.log(
      `Empty entries preserved (${stats.emptyVerses.length}): ${stats.emptyVerses.join(", ") || "none"}`,
    );
    console.log(
      "Text and numbering preserved exactly; this checks conversion integrity, not source accuracy or publication rights.",
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
