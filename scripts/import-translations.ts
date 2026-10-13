import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { BOOKS_LIST } from "../src/bible/constants";
import { getBookChapterCount } from "../src/bible/storage/validation";
import { TRANSLATION_CATALOG } from "../src/bible/translation-catalog";
import { parseTranslationBook } from "../src/bible/utils/translation-data";
import {
  splitTranslation,
  verifySplitTranslation,
  writeSplitTranslation,
} from "./split-translation";

export interface TranslationCoverage {
  sourceBooks: string[];
  unavailableBooks: string[];
  unavailableChapters: Record<string, number[]>;
  chapters: number;
  verses: number;
  emptyVerses: number;
}

export async function importTranslations(root: string, verifyOnly = false) {
  const files = (await readdir(root)).filter(
    (file) => file.endsWith(".json") && file !== "import-report.json",
  );
  const sources = new Map<string, string>();
  for (const file of files) {
    const id = file.slice(0, -5).toLowerCase();
    if (!Object.hasOwn(TRANSLATION_CATALOG, id))
      throw new Error(`Register a name and language before importing ${file}`);
    if (sources.has(id)) throw new Error(`Duplicate translation source: ${id}`);
    sources.set(id, file);
  }
  const coverage: Record<string, TranslationCoverage> = {};
  const reports: Record<string, unknown> = {};
  for (const id of Object.keys(TRANSLATION_CATALOG)) {
    const folder = resolve(root, id);
    const file = sources.get(id);
    let sourceBooks = BOOKS_LIST;
    let sourceHash: string | undefined;
    if (file) {
      const bytes = await readFile(resolve(root, file));
      sourceHash = createHash("sha256").update(bytes).digest("hex");
      const source: unknown = JSON.parse(bytes.toString("utf8"));
      sourceBooks = [...splitTranslation(source).books.keys()];
      if (existsSync(folder) || verifyOnly)
        await verifySplitTranslation(source, folder);
      else await writeSplitTranslation(source, folder);
      if (!(await readFile(resolve(root, file))).equals(bytes))
        throw new Error(`Source changed during import: ${file}`);
    }
    const expectedFiles = sourceBooks.map((book) => `${book}.json`).sort();
    if (!isDeepStrictEqual((await readdir(folder)).sort(), expectedFiles))
      throw new Error(`${id}: source book files do not match`);
    const entry: TranslationCoverage = {
      sourceBooks,
      unavailableBooks: [],
      unavailableChapters: {},
      chapters: 0,
      verses: 0,
      emptyVerses: 0,
    };
    for (const book of sourceBooks) {
      const data = parseTranslationBook(
        book,
        JSON.parse(await readFile(resolve(folder, `${book}.json`), "utf8")),
      );
      if (
        data.chapters.length !== getBookChapterCount(book) ||
        data.chapters.some(
          (chapter, index) => Number(chapter.chapter) !== index + 1,
        )
      )
        throw new Error(`${id}/${book}: incomplete chapter coverage`);
      const emptyChapters: number[] = [];
      for (const chapter of data.chapters) {
        entry.chapters++;
        entry.verses += chapter.verses.length;
        entry.emptyVerses += chapter.verses.filter(
          (verse) => !verse.text.trim(),
        ).length;
        if (chapter.verses.every((verse) => !verse.text.trim()))
          emptyChapters.push(Number(chapter.chapter));
      }
      if (emptyChapters.length === data.chapters.length)
        entry.unavailableBooks.push(book);
      else if (emptyChapters.length)
        entry.unavailableChapters[book] = emptyChapters;
    }
    coverage[id] = entry;
    reports[id] = {
      sourceFile: file ?? null,
      sourceSha256: sourceHash ?? null,
      ...entry,
    };
    console.log(
      `${id}: ${sourceBooks.length - entry.unavailableBooks.length}/${sourceBooks.length} books with text; ${entry.verses} entries; ${entry.emptyVerses} empty; verified`,
    );
  }
  return { coverage, reports };
}

if (import.meta.main) {
  try {
    if (process.argv.slice(2).some((arg) => arg !== "--verify"))
      throw new Error("Usage: bun run data:import [--verify]");
    const verifyOnly = process.argv.includes("--verify");
    const { coverage, reports } = await importTranslations(
      resolve("translations"),
      verifyOnly,
    );
    const metadata = resolve("src/bible/data/translation-coverage.json");
    if (verifyOnly) {
      if (
        !isDeepStrictEqual(
          JSON.parse(await readFile(metadata, "utf8")),
          coverage,
        )
      )
        throw new Error("Catalog coverage is stale; run data:import");
    } else {
      await writeFile(metadata, `${JSON.stringify(coverage, null, 2)}\n`);
      const formatter = Bun.spawn(
        [
          "bun",
          "./node_modules/@biomejs/biome/bin/biome",
          "format",
          "--write",
          metadata,
        ],
        { stdout: "ignore", stderr: "inherit" },
      );
      if (await formatter.exited)
        throw new Error("Coverage metadata formatting failed");
      await writeFile(
        resolve("translations/import-report.json"),
        `${JSON.stringify(reports, null, 2)}\n`,
      );
    }
    console.log(
      "All sources preserved and outputs verified. Coverage metadata contains no scripture text.",
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
