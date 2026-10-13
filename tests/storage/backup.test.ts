import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bibleBookmarksService as bookmarks } from "@/bible/services/bible-bookmarks-service";
import { bibleListsService as lists } from "@/bible/services/bible-lists-service";
import { bibleService } from "@/bible/services/bible-service";
import { bibleVersesService as verses } from "@/bible/services/bible-verses-service";
import {
  exportBackup,
  parseBackup,
  restoreBackup,
  validateBackup,
} from "@/bible/storage/backup";
import { DEFAULT_LIST_ID, db } from "@/bible/storage/db";

beforeEach(async () => {
  await db.delete();
  await db.open();
  vi.spyOn(bibleService, "getChapter").mockResolvedValue({
    chapter: "3",
    verses: [{ verse: "16", text: "Source text" }],
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  db.close();
});
async function populate() {
  const verse = await verses.saveVerse(
    "john",
    3,
    "16",
    "Saved snapshot",
    "kjv",
  );
  const list = await lists.createList("Study");
  await lists.addVerseToList(verse, list);
  await bookmarks.createBookmark({
    bookId: "john",
    chapter: 3,
    name: "Reading",
    colorHex: "#abcdef",
  });
}

describe("collection backups", () => {
  it("round trips multilingual additional-book verses and translation-independent bookmarks", async () => {
    vi.mocked(bibleService.getChapter).mockResolvedValue({
      chapter: "1",
      verses: [{ verse: "1", text: "Swedish source" }],
    });
    const id = await verses.saveVerse(
      "tobit",
      1,
      "1",
      "Svensk text åäö",
      "swe1917",
    );
    const bookmarkId = await bookmarks.createBookmark({
      bookId: "tobit",
      chapter: 1,
      verse: "1",
    });
    const backup = parseBackup(JSON.stringify(await exportBackup()));
    await restoreBackup(backup);
    expect((await db.savedVerses.get(id))?.verse_text).toBe("Svensk text åäö");
    expect((await db.bookmarks.get(bookmarkId))?.book_id).toBe("tobit");
    expect(bibleService.getChapter).toHaveBeenCalledWith("tobit", 1, "swe1917");
    await expect(
      verses.saveVerse("tobit", 1, "1", "Test", "web"),
    ).rejects.toThrow("unavailable");
    await expect(
      verses.saveVerse("genesis", 1, "1", "Test", "oeb"),
    ).rejects.toThrow("unavailable");
    await expect(
      verses.saveVerse("esther-greek", 8, "1", "Test", "swe1917"),
    ).rejects.toThrow("unavailable");
  });
  it("round trips text, translations, timestamps, memberships and chapter bookmarks", async () => {
    await populate();
    const backup = parseBackup(JSON.stringify(await exportBackup()));
    await db.transaction("rw", db.tables, () =>
      Promise.all(db.tables.map((table) => table.clear())),
    );
    await restoreBackup(backup);
    const restored = await exportBackup();
    expect(restored.savedVerses).toEqual(backup.savedVerses);
    expect(restored.lists).toEqual(backup.lists);
    expect(restored.listItems).toEqual(backup.listItems);
    expect(restored.bookmarks).toEqual(backup.bookmarks);
  });
  it("restores translation-independent grouped bookmarks against numeric WEB entries", async () => {
    const id = await bookmarks.createBookmark({
      bookId: "john",
      chapter: 3,
      verse: "16-17",
    });
    const backup = await exportBackup();
    vi.mocked(bibleService.getChapter).mockResolvedValue({
      chapter: "3",
      verses: [
        { verse: "16", text: "First" },
        { verse: "17", text: "Second" },
      ],
    });
    await restoreBackup(backup);
    expect((await db.bookmarks.get(id))?.verse).toBe("16-17");
    vi.mocked(bibleService.getChapter).mockResolvedValue({
      chapter: "3",
      verses: [{ verse: "16", text: "First" }],
    });
    await expect(restoreBackup(backup)).rejects.toThrow(
      "Reference is unavailable",
    );
    expect((await db.bookmarks.get(id))?.verse).toBe("16-17");
  });
  it("restores empty collections and recreates the Saved list", async () => {
    const backup = await exportBackup();
    await populate();
    await restoreBackup(backup);
    expect(await db.savedVerses.count()).toBe(0);
    expect(await db.bookmarks.count()).toBe(0);
    expect((await db.lists.toArray()).map((list) => list.id)).toEqual([
      DEFAULT_LIST_ID,
    ]);
  });
  it("rejects unsupported formats, translations, duplicate identities and dangling memberships", async () => {
    await populate();
    const backup = await exportBackup();
    expect(() => validateBackup({ ...backup, formatVersion: 3 })).toThrow(
      "Invalid backup",
    );
    expect(() =>
      validateBackup({
        ...backup,
        savedVerses: [{ ...backup.savedVerses[0], translation: "all" }],
      }),
    ).toThrow("Invalid backup");
    expect(() =>
      validateBackup({
        ...backup,
        savedVerses: [...backup.savedVerses, backup.savedVerses[0]],
      }),
    ).toThrow("Duplicate");
    expect(() =>
      validateBackup({
        ...backup,
        listItems: [{ list_id: "missing", verse_id: backup.savedVerses[0].id }],
      }),
    ).toThrow("dangling");
    expect(() =>
      validateBackup({
        ...backup,
        bookmarks: [{ ...backup.bookmarks[0], location_key: "wrong" }],
      }),
    ).toThrow("location identity");
    expect(await db.savedVerses.count()).toBe(1);
  });
  it("rejects false system lists and invalid references", async () => {
    await populate();
    const backup = await exportBackup();
    expect(() =>
      validateBackup({
        ...backup,
        lists: backup.lists.map((list) => ({ ...list, is_default: true })),
      }),
    ).toThrow("system Saved list");
    expect(() =>
      validateBackup({
        ...backup,
        savedVerses: [{ ...backup.savedVerses[0], chapter: 99 }],
      }),
    ).toThrow("Invalid book or chapter");
  });
  it("leaves existing data intact if translation coverage is missing", async () => {
    await populate();
    const backup = await exportBackup();
    vi.mocked(bibleService.getChapter).mockResolvedValue(null);
    await expect(restoreBackup(backup)).rejects.toThrow(
      "Reference is unavailable",
    );
    expect((await exportBackup()).savedVerses).toEqual(backup.savedVerses);
  });
  it("rolls back collection replacement if insertion fails after clearing stores", async () => {
    await populate();
    const backup = await exportBackup();
    const fail = () => {
      throw new Error("Injected restore failure");
    };
    db.bookmarks.hook("creating", fail);
    try {
      await expect(restoreBackup(backup)).rejects.toThrow(
        "Injected restore failure",
      );
    } finally {
      db.bookmarks.hook("creating").unsubscribe(fail);
    }
    const current = await exportBackup();
    expect(current.savedVerses).toEqual(backup.savedVerses);
    expect(current.lists).toEqual(backup.lists);
    expect(current.listItems).toEqual(backup.listItems);
    expect(current.bookmarks).toEqual(backup.bookmarks);
  });
  it("rejects malformed JSON and oversized input", () => {
    expect(() => parseBackup("{")).toThrow();
    expect(() => parseBackup(" ".repeat(10 * 1024 * 1024 + 1))).toThrow(
      "10 MiB",
    );
  });
});
