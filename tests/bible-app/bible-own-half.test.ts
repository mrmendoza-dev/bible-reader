/**
 * v7 P1-T0 — the Bible app's own half.
 *
 * For six versions this module published a public text to every host and kept the user's rows in a
 * browser tab. The endpoints that close that are mostly recipe boilerplate; what is *not*
 * boilerplate, and is what this file pins, is the three places the two halves meet:
 *
 * 1. **`save` resolves before it writes.** The service wants `bookId`/`chapter`/`verse`/`text`;
 *    a caller has "John 3:16". If `save` took the columns, a model would supply the text it
 *    remembered rather than the text in the translation, and the saved row would be plausible and
 *    wrong. So the reference is resolved through the public half and *that* is stored.
 * 2. **A reference naming no verse is a chapter bookmark.** `parseBibleReference("John 3")` answers
 *    with the chapter's *first verse* — perfectly reasonable for a reader, and silently wrong here:
 *    it would turn every chapter bookmark into a bookmark on verse 1. The literal string is the
 *    only thing that knows which the caller meant.
 * 3. **An unresolvable reference throws before touching the database.** The alternative is a row
 *    saved against a book that does not exist, which nothing downstream would question.
 *
 * The descriptions are pinned too. `search` and `saved` are one word apart in English and entirely
 * different in what they return, and a model choosing between them has only these sentences.
 */

import { DEFAULT_TRANSLATION_ID } from "@apps/production/bible-app/translations";
import { beforeEach, describe, expect, it, vi } from "vitest";

const parseBibleReference = vi.fn();
const saveVerse = vi.fn();
const createBookmark = vi.fn();
const listSavedVerses = vi.fn();
const listBookmarks = vi.fn();
const deleteVerse = vi.fn();
const deleteBookmark = vi.fn();
const listLists = vi.fn();
const createList = vi.fn();
const renameList = vi.fn();
const deleteList = vi.fn();
const setVerseLists = vi.fn();

vi.mock("@apps/production/bible-app/services/bible-service", () => ({
  bibleService: {
    parseBibleReference: (...args: unknown[]) => parseBibleReference(...args),
    searchBible: vi.fn(),
    getRandomVerse: vi.fn(),
  },
}));

vi.mock("@apps/production/bible-app/services/bible-verses-service", () => ({
  bibleSupabaseService: {
    listSavedVerses: (...args: unknown[]) => listSavedVerses(...args),
    saveVerse: (...args: unknown[]) => saveVerse(...args),
    delete: (...args: unknown[]) => deleteVerse(...args),
  },
}));

vi.mock("@apps/production/bible-app/services/bible-bookmarks-service", () => ({
  bibleBookmarksService: {
    listBookmarks: (...args: unknown[]) => listBookmarks(...args),
    createBookmark: (...args: unknown[]) => createBookmark(...args),
    delete: (...args: unknown[]) => deleteBookmark(...args),
  },
}));

vi.mock("@apps/production/bible-app/services/bible-lists-service", () => ({
  bibleListsService: {
    listLists: (...args: unknown[]) => listLists(...args),
    createList: (...args: unknown[]) => createList(...args),
    renameList: (...args: unknown[]) => renameList(...args),
    deleteList: (...args: unknown[]) => deleteList(...args),
    setVerseLists: (...args: unknown[]) => setVerseLists(...args),
  },
}));

const load = async () =>
  (await import("@apps/production/bible-app/endpoints")).default;

const johnThreeSixteen = {
  bookId: "john",
  bookTitle: "John",
  chapter: 3,
  verse: "16",
  text: "For God so loved the world…",
  relevanceScore: 1,
  translation: DEFAULT_TRANSLATION_ID,
};

beforeEach(() => {
  vi.clearAllMocks();
  parseBibleReference.mockResolvedValue([johnThreeSixteen]);
  saveVerse.mockResolvedValue("verse-id");
  createBookmark.mockResolvedValue("bookmark-id");
});

describe("the module's shape", () => {
  it("exposes both halves, in a stable order", async () => {
    const bible = await load();
    expect(Object.keys(bible.endpoints)).toEqual([
      "verse",
      "search",
      "random",
      "translations",
      "saved",
      "save",
      "unsave",
      "bookmarks",
      "bookmark",
      "unbookmark",
      "lists",
      "createList",
      "renameList",
      "deleteList",
      "addToLists",
    ]);
  });

  it("says whose data each endpoint returns, in the first clause", async () => {
    const bible = await load();
    // The one thing a model has to disambiguate `search` from `saved`.
    expect(bible.endpoints.search.description).toContain("The world's Bible");
    expect(bible.endpoints.verse.description).toContain("The world's Bible");
    expect(bible.endpoints.saved.description).toContain("YOUR saved verses");
    expect(bible.endpoints.bookmarks.description).toContain("YOUR bookmarks");
    expect(bible.endpoints.lists.description).toContain("YOUR verse lists");
  });

  it("distinguishes a bookmark from a saved verse in the usage text", async () => {
    const bible = await load();
    expect(bible.endpoints.bookmarks.description).toContain(
      "They are different lists",
    );
  });
});

describe("save", () => {
  it("stores the resolved text, not anything the caller supplied", async () => {
    const bible = await load();
    const result = await bible.endpoints.save.run("John 3:16");
    expect(saveVerse).toHaveBeenCalledWith(
      "john",
      3,
      "16",
      "For God so loved the world…",
      DEFAULT_TRANSLATION_ID,
    );
    expect(result).toEqual({ id: "verse-id", reference: "John 3:16" });
  });

  it("passes the caller's translation through to the lookup", async () => {
    const bible = await load();
    await bible.endpoints.save.run("John 3:16", "esv");
    expect(parseBibleReference).toHaveBeenCalledWith("John 3:16", "esv");
  });

  it("saves the first verse of a range rather than refusing", async () => {
    parseBibleReference.mockResolvedValue([
      johnThreeSixteen,
      { ...johnThreeSixteen, verse: "17", text: "For God sent not…" },
    ]);
    const bible = await load();
    await bible.endpoints.save.run("John 3:16-17");
    expect(saveVerse).toHaveBeenCalledWith(
      "john",
      3,
      "16",
      "For God so loved the world…",
      DEFAULT_TRANSLATION_ID,
    );
  });

  it("throws before writing when the reference does not resolve", async () => {
    parseBibleReference.mockResolvedValue(null);
    const bible = await load();
    await expect(bible.endpoints.save.run("Hezekiah 4:2")).rejects.toThrow(
      /did not resolve/,
    );
    expect(saveVerse).not.toHaveBeenCalled();
  });

  it("throws on an empty result array, not just on null", async () => {
    parseBibleReference.mockResolvedValue([]);
    const bible = await load();
    await expect(bible.endpoints.save.run("John 99:1")).rejects.toThrow();
    expect(saveVerse).not.toHaveBeenCalled();
  });
});

describe("bookmark", () => {
  it("keeps a chapter reference a chapter bookmark", async () => {
    /*
     * The resolver answers "John 3" with verse 16 — whatever the chapter's first match is. Reading
     * `verse` off that would make every chapter bookmark point at a verse, which is a wrong row
     * that looks completely normal.
     */
    const bible = await load();
    await bible.endpoints.bookmark.run("John 3");
    expect(createBookmark).toHaveBeenCalledWith(
      expect.objectContaining({ bookId: "john", chapter: 3, verse: null }),
    );
  });

  it("keeps a verse reference a verse bookmark", async () => {
    const bible = await load();
    await bible.endpoints.bookmark.run("John 3:16");
    expect(createBookmark).toHaveBeenCalledWith(
      expect.objectContaining({ verse: "16" }),
    );
  });

  it("tolerates whitespace around the colon", async () => {
    const bible = await load();
    await bible.endpoints.bookmark.run("John 3: 16");
    expect(createBookmark).toHaveBeenCalledWith(
      expect.objectContaining({ verse: "16" }),
    );
  });

  it("omits name and color entirely when not given, so the service defaults apply", async () => {
    const bible = await load();
    await bible.endpoints.bookmark.run("John 3");
    const arg = createBookmark.mock.calls[0]?.[0] as Record<string, unknown>;
    expect("name" in arg).toBe(false);
    expect("colorHex" in arg).toBe(false);
  });

  it("passes name and color when given", async () => {
    const bible = await load();
    await bible.endpoints.bookmark.run("John 3", {
      name: "the good bit",
      color: "#ff0000",
    });
    expect(createBookmark).toHaveBeenCalledWith(
      expect.objectContaining({ name: "the good bit", colorHex: "#ff0000" }),
    );
  });

  it("throws before writing when the reference does not resolve", async () => {
    parseBibleReference.mockResolvedValue(null);
    const bible = await load();
    await expect(bible.endpoints.bookmark.run("Nowhere 1")).rejects.toThrow(
      /did not resolve/,
    );
    expect(createBookmark).not.toHaveBeenCalled();
  });
});

describe("the reads pass the query straight through", () => {
  it("saved forwards its query object", async () => {
    const bible = await load();
    await bible.endpoints.saved.run({ limit: 5, q: "love" });
    expect(listSavedVerses).toHaveBeenCalledWith({ limit: 5, q: "love" });
  });

  it("bookmarks forwards its query object", async () => {
    const bible = await load();
    await bible.endpoints.bookmarks.run({ limit: 3 });
    expect(listBookmarks).toHaveBeenCalledWith({ limit: 3 });
  });

  it("unsave and unbookmark report what they removed", async () => {
    const bible = await load();
    expect(await bible.endpoints.unsave.run("v1")).toEqual({
      id: "v1",
      removed: true,
    });
    expect(await bible.endpoints.unbookmark.run("b1")).toEqual({
      id: "b1",
      removed: true,
    });
    expect(deleteVerse).toHaveBeenCalledWith("v1");
    expect(deleteBookmark).toHaveBeenCalledWith("b1");
  });

  it("lists forwards its query object", async () => {
    const bible = await load();
    await bible.endpoints.lists.run({ limit: 10, q: "favorites" });
    expect(listLists).toHaveBeenCalledWith({ limit: 10, q: "favorites" });
  });
});

describe("verse lists", () => {
  beforeEach(() => {
    createList.mockResolvedValue("list-id");
    setVerseLists.mockResolvedValue(undefined);
  });

  it("createList trims and returns the new id", async () => {
    const bible = await load();
    const result = await bible.endpoints.createList.run("  Favorites  ");
    expect(createList).toHaveBeenCalledWith("  Favorites  ");
    expect(result).toEqual({ id: "list-id", name: "Favorites" });
  });

  it("renameList forwards id and name", async () => {
    const bible = await load();
    await bible.endpoints.renameList.run("list-1", "New Name");
    expect(renameList).toHaveBeenCalledWith("list-1", "New Name");
  });

  it("deleteList defaults to move mode", async () => {
    const bible = await load();
    const result = await bible.endpoints.deleteList.run("list-1");
    expect(deleteList).toHaveBeenCalledWith("list-1", "move");
    expect(result).toEqual({ id: "list-1", removed: true, mode: "move" });
  });

  it("addToLists resolves a reference before setting list membership", async () => {
    const bible = await load();
    const result = await bible.endpoints.addToLists.run(
      "John 3:16",
      ["list-a", "list-b"],
      "esv",
    );
    expect(saveVerse).toHaveBeenCalledWith(
      "john",
      3,
      "16",
      "For God so loved the world…",
      DEFAULT_TRANSLATION_ID,
    );
    expect(setVerseLists).toHaveBeenCalledWith("verse-id", ["list-a", "list-b"]);
    expect(result).toEqual({ verseId: "verse-id", listIds: ["list-a", "list-b"] });
  });

  it("addToLists uses a verse id directly when given one", async () => {
    const bible = await load();
    await bible.endpoints.addToLists.run(
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      ["list-a"],
    );
    expect(saveVerse).not.toHaveBeenCalled();
    expect(setVerseLists).toHaveBeenCalledWith(
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      ["list-a"],
    );
  });
});
