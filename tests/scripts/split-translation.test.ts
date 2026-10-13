import { existsSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BOOKS_LIST, getBookDisplayTitle } from "@/bible/constants";
import { getBookChapterCount } from "@/bible/storage/validation";
import { parseTranslationBook } from "@/bible/utils/translation-data";
import {
  bookSlug,
  splitTranslation,
  verifySplitTranslation,
  writeSplitTranslation,
} from "../../scripts/split-translation";

function fixture() {
  return {
    translation: "Synthetic test translation",
    books: BOOKS_LIST.map((slug) => ({
      name: getBookDisplayTitle(slug),
      chapters: Array.from(
        { length: getBookChapterCount(slug) },
        (_, index) => ({
          chapter: index + 1,
          verses: [{ verse: "1", text: `${slug} ${index + 1}:1` }],
        }),
      ),
    })),
  };
}

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "bible-split-test-"));
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("translation splitting", () => {
  it.each([
    ["I Samuel", "1-samuel"],
    ["II Corinthians", "2-corinthians"],
    ["III John", "3-john"],
    ["Psalms", "psalm"],
    ["Song of Songs", "song-of-solomon"],
    ["Revelation of John", "revelation"],
    ["  1   Kings  ", "1-kings"],
    ["2-timothy", "2-timothy"],
  ])("maps %s to the existing %s slug", (name, slug) => {
    expect(bookSlug(name)).toBe(slug);
  });

  it("uses names rather than book positions and preserves source ordering", () => {
    const source = fixture();
    source.books.reverse();
    const converted = splitTranslation(source);
    expect([...converted.books.keys()]).toEqual([...BOOKS_LIST].reverse());
    expect(converted.stats).toMatchObject({
      books: 66,
      chapters: 1189,
      verses: 1189,
    });
    expect(
      parseTranslationBook("genesis", converted.books.get("genesis"))
        .chapters[0].verses[0].text,
    ).toBe("genesis 1:1");
  });

  it("supports partial editions and additional books without merging Esther identities", async () => {
    const slugs = [
      "tobit",
      "esther",
      "esther-greek",
      "additions-to-esther",
      "4-maccabees",
    ];
    const source = {
      translation: "Multilingual fixture",
      books: slugs.map((slug) => ({
        name:
          slug === "4-maccabees" ? "IV Maccabees" : getBookDisplayTitle(slug),
        chapters: Array.from(
          { length: getBookChapterCount(slug) },
          (_, index) => ({
            chapter: index + 1,
            verses: [{ verse: 1, text: `한글 — français — svenska ${slug}` }],
          }),
        ),
      })),
    };
    const output = join(directory, "additional");
    await writeSplitTranslation(source, output);
    expect((await readdir(output)).sort()).toEqual(
      slugs.map((slug) => `${slug}.json`).sort(),
    );
    expect((await verifySplitTranslation(source, output)).books).toBe(5);
    const parsed = parseTranslationBook(
      "esther-greek",
      JSON.parse(await readFile(join(output, "esther-greek.json"), "utf8")),
    );
    expect(parsed.book).toBe("Esther (Greek)");
    expect(parsed.chapters[0].verses[0].text).toBe(
      "한글 — français — svenska esther-greek",
    );
  });

  it("preserves Unicode, whitespace, empty text and grouped verse identities exactly", async () => {
    const source = fixture();
    const chapter = source.books[0].chapters[0];
    chapter.verses = [
      { verse: "1", text: "  Text — ‘quoted’\nwith\ttabs.  " },
      { verse: "2-3", text: "" },
    ];
    const snapshot = structuredClone(source);
    const output = join(directory, "formatted");
    const stats = await writeSplitTranslation(source, output);
    expect(source).toEqual(snapshot);
    expect(stats.emptyVerses).toEqual(["genesis 1:2-3"]);
    const book = JSON.parse(
      await readFile(join(output, "genesis.json"), "utf8"),
    );
    expect(book).toEqual({
      Genesis: {
        ...Object.fromEntries(
          source.books[0].chapters.map((entry) => [
            String(entry.chapter),
            Object.fromEntries(
              entry.verses.map((verse) => [verse.verse, verse.text]),
            ),
          ]),
        ),
      },
      Info: { translation: source.translation },
    });
    expect(parseTranslationBook("genesis", book).chapters[0].verses).toEqual(
      chapter.verses,
    );
    await expect(verifySplitTranslation(source, output)).resolves.toEqual(
      stats,
    );
  });

  it.each([
    "empty book list",
    "unknown book",
    "duplicate book",
    "duplicate chapter",
    "missing chapter",
    "invalid chapter",
    "duplicate verse",
    "overlapping verses",
    "invalid verse",
    "extra verse metadata",
  ])("rejects %s before writing files", async (problem) => {
    const source = fixture();
    const book = source.books[0];
    const chapter = book.chapters[0];
    switch (problem) {
      case "empty book list":
        source.books = [];
        break;
      case "unknown book":
        book.name = "../../Genesis";
        break;
      case "duplicate book":
        source.books[1] = structuredClone(book);
        break;
      case "duplicate chapter":
        book.chapters.push(structuredClone(chapter));
        break;
      case "missing chapter":
        book.chapters.pop();
        break;
      case "invalid chapter":
        chapter.chapter = 51;
        break;
      case "duplicate verse":
        chapter.verses.push({ ...chapter.verses[0] });
        break;
      case "overlapping verses":
        chapter.verses.push({ verse: "1-2", text: "Overlapping" });
        break;
      case "invalid verse":
        chapter.verses[0].verse = "01";
        break;
      case "extra verse metadata":
        Object.assign(chapter.verses[0], {
          footnote: "Must not be silently discarded",
        });
        break;
    }
    const output = join(directory, "invalid");
    await expect(writeSplitTranslation(source, output)).rejects.toThrow();
    expect(existsSync(output)).toBe(false);
    expect(await readdir(directory)).toEqual([]);
  });

  it("refuses existing output directories and leaves their files untouched", async () => {
    const output = join(directory, "existing");
    await mkdir(output);
    await expect(writeSplitTranslation(fixture(), output)).rejects.toThrow(
      "Output already exists",
    );
    await writeFile(join(output, "genesis.json"), "keep existing data");
    await expect(writeSplitTranslation(fixture(), output)).rejects.toThrow(
      "Output already exists",
    );
    expect(await readFile(join(output, "genesis.json"), "utf8")).toBe(
      "keep existing data",
    );
  });

  it("detects changed text, missing files and extra output files during verification", async () => {
    const source = fixture();
    const output = join(directory, "verified");
    await writeSplitTranslation(source, output);
    const path = join(output, "genesis.json");
    const original = await readFile(path, "utf8");
    const book = JSON.parse(original);
    book.Genesis["1"]["1"] = "Changed text";
    await writeFile(path, JSON.stringify(book));
    await expect(verifySplitTranslation(source, output)).rejects.toThrow(
      "Source/output mismatch: genesis.json",
    );
    await writeFile(path, original);
    await writeFile(join(output, "unexpected.json"), "{}");
    await expect(verifySplitTranslation(source, output)).rejects.toThrow(
      "exactly the source",
    );
    await rm(join(output, "unexpected.json"));
    await rm(path);
    await expect(verifySplitTranslation(source, output)).rejects.toThrow(
      "exactly the source",
    );
  });
});

const darbyPath = resolve("translations/Darby.json");
it.skipIf(!existsSync(darbyPath))(
  "matches every verse of the actual Darby input after writing and loading all 66 files",
  async () => {
    const bytes = await readFile(darbyPath);
    const source = JSON.parse(bytes.toString("utf8")) as {
      translation: string;
      books: {
        name: string;
        chapters: {
          chapter: number;
          verses: { verse: number; text: string }[];
        }[];
      }[];
    };
    const output = join(directory, "darby");
    const stats = await writeSplitTranslation(source, output);
    expect(stats).toEqual({
      books: 66,
      chapters: 1189,
      verses: 31102,
      emptyVerses: ["matthew 23:14", "acts 8:37", "acts 15:34"],
    });
    expect((await readdir(output)).sort()).toEqual(
      BOOKS_LIST.map((slug) => `${slug}.json`).sort(),
    );
    // Darby's source uses canonical order; use that independent of the converter's name mapping.
    for (const [index, sourceBook] of source.books.entries()) {
      const slug = BOOKS_LIST[index];
      const raw = JSON.parse(
        await readFile(join(output, `${slug}.json`), "utf8"),
      );
      const parsed = parseTranslationBook(slug, raw);
      expect(raw.Info).toEqual({ translation: source.translation });
      expect(parsed.chapters).toEqual(
        sourceBook.chapters.map((chapter) => ({
          chapter: String(chapter.chapter),
          verses: chapter.verses.map((verse) => ({
            verse: String(verse.verse),
            text: verse.text,
          })),
        })),
      );
    }
    expect((await readFile(darbyPath)).equals(bytes)).toBe(true);
    await expect(verifySplitTranslation(source, output)).resolves.toEqual(
      stats,
    );
  },
  30000,
);
