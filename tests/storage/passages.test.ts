import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bibleListsService as lists } from "@/bible/services/bible-lists-service";
import { bibleService } from "@/bible/services/bible-service";
import { bibleVersesService as verses } from "@/bible/services/bible-verses-service";
import {
  exportBackup,
  restoreBackup,
  validateBackup,
} from "@/bible/storage/backup";
import { BibleDatabase, DEFAULT_LIST_ID, db } from "@/bible/storage/db";
import type { BookData } from "@/bible/types/bible-reader";

const start = { bookId: "genesis", chapter: 1, verse: 2 };
const end = { ...start, verse: 3 };
const crossStart = { bookId: "genesis", chapter: 50, verse: 25 };
const source: Record<string, BookData> = {
  genesis: {
    book: "Genesis",
    chapters: [
      {
        chapter: "1",
        verses: [
          { verse: "1", text: "First" },
          { verse: "2", text: "Second" },
          { verse: "3", text: "Third" },
        ],
      },
      {
        chapter: "2",
        verses: [
          { verse: "1", text: "Next chapter" },
          { verse: "2", text: "Next verse" },
        ],
      },
      {
        chapter: "50",
        verses: [
          { verse: "25", text: "Genesis closes" },
          { verse: "26", text: "Genesis ends" },
        ],
      },
    ],
  },
  exodus: {
    book: "Exodus",
    chapters: [
      {
        chapter: "1",
        verses: [
          { verse: "1", text: "Exodus begins" },
          { verse: "2", text: "Exodus continues" },
        ],
      },
    ],
  },
};
beforeEach(async () => {
  await db.delete();
  await db.open();
  vi.spyOn(bibleService, "getBook").mockImplementation(async (id) =>
    structuredClone(source[id]),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  db.close();
});

describe("saved passages", () => {
  it("saves one snapshot and list membership; singles, endpoints, and translations remain distinct", async () => {
    const [id, duplicate] = await Promise.all([
      verses.savePassage(start, end),
      verses.savePassage(start, end),
    ]);
    expect(id).toBe(duplicate);
    expect(await db.savedVerses.get(id)).toMatchObject({
      verse: "2",
      end,
      verse_text: "2 Second\n3 Third",
    });
    expect(await lists.getListIdsForVerse(id)).toEqual([DEFAULT_LIST_ID]);
    await verses.saveVerse("genesis", 1, "2", "Second");
    await verses.savePassage(start, { ...end, chapter: 2, verse: 1 });
    await verses.savePassage(start, end, "kjv");
    expect(await db.savedVerses.count()).toBe(4);
    expect((await verses.getSavedVerseKeys()).size).toBe(4);
  });
  it("collects cross-chapter and cross-book passages in order", async () => {
    const id = await verses.savePassage(crossStart, {
      bookId: "exodus",
      chapter: 1,
      verse: 1,
    });
    expect((await db.savedVerses.get(id))?.verse_text).toBe(
      "Genesis 50:25 Genesis closes\nGenesis 50:26 Genesis ends\nExodus 1:1 Exodus begins",
    );
  });
  it("does not write anything when an endpoint or interior chapter is unavailable", async () => {
    await expect(
      verses.savePassage(start, { ...end, verse: 4 }),
    ).rejects.toThrow("unavailable");
    await expect(
      verses.savePassage(start, { ...end, chapter: 3 }),
    ).rejects.toThrow("unavailable");
    expect(await db.savedVerses.count()).toBe(0);
    expect(await db.listItems.count()).toBe(0);
  });
  it("rejects source gaps and partial grouped verses, and saves full groups once", async () => {
    vi.mocked(bibleService.getBook).mockResolvedValue({
      book: "Genesis",
      chapters: [
        {
          chapter: "1",
          verses: [
            { verse: "1", text: "First" },
            { verse: "2-3", text: "Grouped text" },
            { verse: "4", text: "Last" },
          ],
        },
      ],
    });
    await expect(
      verses.savePassage({ ...start, verse: 1 }, { ...end, verse: 2 }),
    ).rejects.toThrow("groups verses");
    const id = await verses.savePassage(start, end);
    expect((await db.savedVerses.get(id))?.verse_text).toBe("2-3 Grouped text");
    vi.mocked(bibleService.getBook).mockResolvedValue({
      book: "Genesis",
      chapters: [
        {
          chapter: "1",
          verses: [
            { verse: "1", text: "First" },
            { verse: "3", text: "Last" },
          ],
        },
      ],
    });
    await expect(
      verses.savePassage({ ...start, verse: 1 }, end),
    ).rejects.toThrow("unavailable");
  });
  it("deletes only the selected passage and all of its list memberships", async () => {
    const id = await verses.savePassage(start, end);
    const other = await verses.savePassage(start, {
      ...end,
      chapter: 2,
      verse: 1,
    });
    const single = await verses.saveVerse("genesis", 1, "2", "Second");
    const list = await lists.createList("Study");
    await lists.addVerseToList(id, list);
    await verses.unsaveVerse("genesis", 1, "2", "web", end);
    expect(await db.savedVerses.get(id)).toBeUndefined();
    expect(await db.listItems.where("verse_id").equals(id).count()).toBe(0);
    expect(await db.savedVerses.get(other)).toBeDefined();
    expect(await db.savedVerses.get(single)).toBeDefined();
  });
  it("round trips cross-book passages and memberships; rejects invalid restores before replacing data", async () => {
    const id = await verses.savePassage(crossStart, {
      bookId: "exodus",
      chapter: 1,
      verse: 2,
    });
    const list = await lists.createList("Study");
    await lists.addVerseToList(id, list);
    const backup = await exportBackup();
    expect(backup.formatVersion).toBe(2);
    await verses.unsaveVerse(
      "genesis",
      50,
      "25",
      "web",
      backup.savedVerses[0].end,
    );
    await restoreBackup(backup);
    expect((await exportBackup()).savedVerses).toEqual(backup.savedVerses);
    expect(new Set(await lists.getListIdsForVerse(id))).toEqual(
      new Set([list, DEFAULT_LIST_ID]),
    );
    const invalid = structuredClone(backup);
    invalid.savedVerses[0].end = { bookId: "exodus", chapter: 1, verse: 99 };
    await expect(restoreBackup(invalid)).rejects.toThrow("unavailable");
    expect((await exportBackup()).savedVerses).toEqual(backup.savedVerses);
    invalid.savedVerses[0].end = { ...start, verse: 1 };
    expect(() => validateBackup(invalid)).toThrow("after");
  });
  it("imports version 1 backups and rebuilds identities instead of trusting backup keys", async () => {
    const id = await verses.saveVerse("genesis", 1, "2", "Original");
    const backup = await exportBackup();
    backup.formatVersion = 1;
    delete backup.savedVerses[0].reference_key;
    vi.spyOn(bibleService, "getChapter").mockResolvedValue(
      source.genesis.chapters[0],
    );
    await restoreBackup(backup);
    expect(
      await verses.getSavedVerseByReference("genesis", 1, "2"),
    ).toMatchObject({ id, verse_text: "Original" });
  });
  it("migrates version 1 databases without losing saved verses or memberships", async () => {
    const name = `passage-migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy.version(1).stores({
      savedVerses:
        "id, &[book_id+chapter+verse+translation], book_id, created_at",
      lists: "id, sort_order",
      listItems: "[list_id+verse_id], list_id, verse_id",
      bookmarks: "id, &location_key, updated_at",
    });
    await legacy.table("savedVerses").add({
      id: "old",
      book_id: "genesis",
      chapter: 1,
      verse: "2",
      verse_text: "Old text",
      translation: "web",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await legacy
      .table("listItems")
      .add({ list_id: DEFAULT_LIST_ID, verse_id: "old" });
    legacy.close();
    const upgraded = new BibleDatabase(name);
    try {
      await upgraded.open();
      expect(
        await upgraded.savedVerses
          .where("[reference_key+translation]")
          .equals(["genesis-1-2", "web"])
          .first(),
      ).toMatchObject({ id: "old", verse_text: "Old text" });
      expect(await upgraded.listItems.count()).toBe(1);
    } finally {
      await upgraded.delete();
    }
  });
});
