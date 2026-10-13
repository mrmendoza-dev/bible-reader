import { describe, expect, it } from "vitest";
import {
  AVAILABLE_TRANSLATIONS,
  DEFAULT_TRANSLATION_ID,
  getTranslationBookCountLabel,
  getTranslationBookIds,
  getTranslationOptionLabel,
  normalizeSearchScope,
  normalizeTranslationId,
  requireTranslationId,
  TRANSLATION_IDS,
} from "@/bible/translations";
import {
  parseTranslationBook,
  verseContains,
} from "@/bible/utils/translation-data";

describe("standalone catalog and data", () => {
  it("supports the multilingual catalog with WEB default and a distinct search scope", () => {
    expect(TRANSLATION_IDS).toHaveLength(21);
    expect(
      new Set(
        Object.values(AVAILABLE_TRANSLATIONS).map(
          (translation) => translation.language,
        ),
      ).size,
    ).toBe(8);
    expect(DEFAULT_TRANSLATION_ID).toBe("web");
    expect(normalizeTranslationId("unknown")).toBe("web");
    expect(normalizeTranslationId("all")).toBe("web");
    expect(normalizeSearchScope("all")).toBe("all");
    expect(requireTranslationId("KJV")).toBe("kjv");
    expect(() => requireTranslationId("niv")).toThrow("Unsupported");
    expect(() => requireTranslationId("constructor")).toThrow("Unsupported");
    expect(() => requireTranslationId("__proto__")).toThrow("Unsupported");
  });
  it("reports actual coverage and language without treating placeholders as available books", () => {
    expect(getTranslationBookCountLabel("web")).toBe("66 books");
    expect(getTranslationBookCountLabel("oeb")).toBe("28/66 books with text");
    expect(getTranslationBookCountLabel("dutsvv")).toBe(
      "67/80 books with text",
    );
    expect(getTranslationBookCountLabel("swe1917")).toBe(
      "78/83 books with text",
    );
    expect(getTranslationBookIds("oeb")).toEqual([
      "psalm",
      ...getTranslationBookIds("web").slice(39),
    ]);
    expect(getTranslationBookIds("swe1917")).toContain("tobit");
    expect(getTranslationBookIds("dutsvv")).not.toContain("tobit");
    expect(getTranslationOptionLabel("korhkjv")).toContain("Korean (KO)");
  });
  it("preserves wording, punctuation, grouped references and empty source entries", () => {
    const parsed = parseTranslationBook("john", {
      Info: { source: "test fixture" },
      John: {
        "3": {
          "16": "Text — punctuation.",
          "17-18": "Grouped source text",
          "19": "",
        },
      },
    });
    expect(parsed.chapters[0].verses).toEqual([
      { verse: "16", text: "Text — punctuation." },
      { verse: "17-18", text: "Grouped source text" },
      { verse: "19", text: "" },
    ]);
    expect(verseContains("17-18", 18)).toBe(true);
    expect(verseContains("17-18", 19)).toBe(false);
  });
  it("accepts direct chapter mappings and canonical source title variants", () => {
    expect(
      parseTranslationBook("genesis", { "1": { "1": "Fixture" } }).chapters,
    ).toHaveLength(1);
    expect(
      parseTranslationBook("psalm", { Psalms: { "1": { "1": "Fixture" } } })
        .book,
    ).toBe("Psalm");
  });
  it("rejects a wrong book, malformed keys, non-text values and overlapping ranges", () => {
    expect(() =>
      parseTranslationBook("john", { Genesis: { "1": { "1": "Wrong book" } } }),
    ).toThrow();
    expect(() =>
      parseTranslationBook("john", { John: { "3x": { "1": "Text" } } }),
    ).toThrow();
    expect(() =>
      parseTranslationBook("john", { John: { "3": { "1": 5 } } }),
    ).toThrow();
    expect(() =>
      parseTranslationBook("john", {
        John: { "3": { "1-3": "Grouped", "2": "Overlap" } },
      }),
    ).toThrow("Overlapping");
  });
});
