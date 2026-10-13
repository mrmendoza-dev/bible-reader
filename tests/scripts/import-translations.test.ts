import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { expect, it } from "vitest";
import { BOOKS_LIST } from "@/bible/constants";
import { TRANSLATION_COVERAGE } from "@/bible/translations";
import { parseTranslationBook } from "@/bible/utils/translation-data";
import { importTranslations } from "../../scripts/import-translations";
import { writeSplitTranslation } from "../../scripts/split-translation";

const extras: Record<string, string[]> = {
  DutSVV: [
    "1-esdras",
    "2-esdras",
    "tobit",
    "judith",
    "additions-to-esther",
    "wisdom",
    "sirach",
    "baruch",
    "prayer-of-azariah",
    "susanna",
    "bel-and-the-dragon",
    "prayer-of-manasses",
    "1-maccabees",
    "2-maccabees",
  ],
  Swe1917: [
    "tobit",
    "judith",
    "esther-greek",
    "wisdom",
    "sirach",
    "baruch",
    "prayer-of-azariah",
    "susanna",
    "bel-and-the-dragon",
    "1-maccabees",
    "2-maccabees",
    "1-esdras",
    "prayer-of-manasses",
    "additional-psalm",
    "3-maccabees",
    "2-esdras",
    "4-maccabees",
  ],
};
const sourceFiles = [
  "AKJV",
  "BBE",
  "BSB",
  "Darby",
  "DutSVV",
  "FreBBB",
  "FreBDM1744",
  "GerElb1871",
  "GerElb1905",
  "KorHKJV",
  "OEB",
  "SpaRV",
  "SpaRV1865",
  "Swe1917",
  "TagAngBiblia",
  "UKJV",
  "Webster",
];

it.skipIf(
  !sourceFiles.every((id) => existsSync(resolve(`translations/${id}.json`))),
)(
  "preserves every source book, chapter and Unicode verse in all 17 actual datasets",
  async () => {
    const temporary = await mkdtemp(join(tmpdir(), "bible-all-inputs-"));
    try {
      for (const id of sourceFiles) {
        const input = resolve(`translations/${id}.json`);
        const bytes = await readFile(input);
        const source = JSON.parse(bytes.toString("utf8")) as {
          translation: string;
          books: {
            name: string;
            chapters: {
              chapter: string | number;
              verses: { verse: string | number; text: string }[];
            }[];
          }[];
        };
        const directory = join(temporary, id);
        await writeSplitTranslation(source, directory);
        // Independent source-order oracle: all inputs use these 39 OT + optional extras + 27 NT slots.
        const slugs = [
          ...BOOKS_LIST.slice(0, 39),
          ...(extras[id] ?? []),
          ...BOOKS_LIST.slice(39),
        ];
        expect(source.books.length, id).toBe(slugs.length);
        expect((await readdir(directory)).sort(), id).toEqual(
          slugs.map((slug) => `${slug}.json`).sort(),
        );
        for (const [index, sourceBook] of source.books.entries()) {
          const slug = slugs[index];
          const raw = JSON.parse(
            await readFile(join(directory, `${slug}.json`), "utf8"),
          );
          const expectedChapters = sourceBook.chapters.map((chapter) => ({
            chapter: String(chapter.chapter),
            verses: chapter.verses.map((verse) => ({
              verse: String(verse.verse),
              text: verse.text,
            })),
          }));
          expect(raw.Info.translation, `${id}/${slug}`).toBe(
            source.translation,
          );
          expect(
            isDeepStrictEqual(
              parseTranslationBook(slug, raw).chapters,
              expectedChapters,
            ),
            `${id}/${slug}: exact chapter/verse/text equality`,
          ).toBe(true);
        }
        expect(
          (await readFile(input)).equals(bytes),
          `${id}: untouched original`,
        ).toBe(true);
      }
      const { coverage } = await importTranslations(
        resolve("translations"),
        true,
      );
      expect(coverage).toEqual(TRANSLATION_COVERAGE);
    } finally {
      await rm(temporary, { recursive: true, force: true });
    }
  },
  120000,
);
