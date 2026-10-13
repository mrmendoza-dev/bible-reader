import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { validateLocation } from "../src/bible/storage/validation";
import {
  getTranslationSourceBooks,
  isTranslationId,
  TRANSLATION_COVERAGE,
  TRANSLATION_IDS,
  type TranslationId,
} from "../src/bible/translations";
import { parseTranslationBook } from "../src/bible/utils/translation-data";

const inputs = process.argv.includes("--inputs");
const directory = resolve(
  inputs ? "translations" : "public/bible/data/translations",
);
const allowlist = TRANSLATION_IDS;
const errors: string[] = [];
const checksums: Record<string, Record<string, string>> = {};
const manifestSchema = z.object({
  translations: z
    .array(
      z.object({
        id: z.custom<TranslationId>(isTranslationId, "Unsupported translation"),
        edition: z.string().trim().min(1),
        sourceUrl: z.url().optional(),
        rightsUrl: z.url().optional(),
        rightsStatement: z.string().trim().min(1).optional(),
        retrievedAt: z.union([z.iso.date(), z.iso.datetime()]).optional(),
        checksums: z.record(z.string(), z.string().regex(/^[0-9a-f]{64}$/i)),
        omissions: z.array(z.string().trim().min(1)).optional(),
      }),
    )
    .length(TRANSLATION_IDS.length),
});
try {
  const folders = await readdir(directory, { withFileTypes: true });
  for (const folder of folders) {
    if (
      folder.isDirectory() &&
      !(inputs
        ? /^[a-z][a-z0-9-]*$/.test(folder.name)
        : allowlist.includes(folder.name as (typeof allowlist)[number]))
    )
      errors.push(`Unsupported translation folder: ${folder.name}`);
  }
  const translations = inputs
    ? [
        ...new Set([
          ...allowlist,
          ...folders
            .filter(
              (folder) =>
                folder.isDirectory() && /^[a-z][a-z0-9-]*$/.test(folder.name),
            )
            .map((folder) => folder.name),
        ]),
      ]
    : allowlist;
  for (const translation of translations) {
    if (!isTranslationId(translation)) {
      errors.push(`Unregistered translation: ${translation}`);
      continue;
    }
    const books = getTranslationSourceBooks(translation);
    let chapters = 0,
      verses = 0,
      empty = 0;
    const folder = resolve(directory, translation);
    checksums[translation] = {};
    const files = await readdir(folder);
    const expected = new Set(books.map((id) => `${id}.json`));
    for (const file of files.filter((file) => file.endsWith(".json")))
      if (!expected.has(file))
        errors.push(`${translation}: unexpected book ${file}`);
    for (const book of books) {
      try {
        const bytes = await readFile(resolve(folder, `${book}.json`));
        checksums[translation][`${book}.json`] = createHash("sha256")
          .update(bytes)
          .digest("hex");
        const data = parseTranslationBook(
          book,
          JSON.parse(bytes.toString("utf8")),
        );
        for (const chapter of data.chapters) {
          validateLocation(book, Number(chapter.chapter));
          chapters++;
          verses += chapter.verses.length;
          empty += chapter.verses.filter((verse) => !verse.text.trim()).length;
        }
      } catch (error) {
        errors.push(
          `${translation}/${book}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    const coverage = TRANSLATION_COVERAGE[translation];
    if (
      chapters !== coverage.chapters ||
      verses !== coverage.verses ||
      empty !== coverage.emptyVerses
    )
      errors.push(
        `${translation}: coverage counts differ from the verified import`,
      );
    console.log(
      `${translation.toUpperCase()}: ${files.filter((file) => expected.has(file)).length} books, ${chapters} chapters, ${verses} verse entries, ${empty} empty entries`,
    );
  }
  if (!inputs) {
    const manifest = manifestSchema.parse(
      JSON.parse(
        await readFile(
          resolve("public/bible/translations-manifest.json"),
          "utf8",
        ),
      ),
    );
    if (
      new Set(manifest.translations.map(({ id }) => id)).size !==
      TRANSLATION_IDS.length
    )
      errors.push(
        "Release manifest must describe each translation exactly once",
      );
    for (const translation of manifest.translations) {
      const expected = checksums[translation.id];
      if (
        Object.keys(translation.checksums).length !==
        getTranslationSourceBooks(translation.id).length
      )
        errors.push(
          `${translation.id}: checksums must cover exactly the source books`,
        );
      for (const [file, checksum] of Object.entries(expected)) {
        if (translation.checksums[file]?.toLowerCase() !== checksum)
          errors.push(`${translation.id}/${file}: checksum mismatch`);
      }
    }
  }
} catch (error) {
  errors.push(error instanceof Error ? error.message : String(error));
}
if (errors.length) {
  console.error(errors.slice(0, 12).join("\n"));
  console.error(`Data validation failed: ${errors.length} issue(s).`);
  process.exitCode = 1;
} else
  console.log(
    inputs
      ? "Development input structure passed; source editions and omissions remain unverified."
      : "Release data structure and checksums passed.",
  );
