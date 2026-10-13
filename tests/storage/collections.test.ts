import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bibleBookmarksService as bookmarks } from "@/bible/services/bible-bookmarks-service";
import { bibleListsService as lists } from "@/bible/services/bible-lists-service";
import { bibleVersesService as verses } from "@/bible/services/bible-verses-service";
import { BibleDatabase, DEFAULT_LIST_ID, db } from "@/bible/storage/db";

beforeEach(async () => {
  await db.delete();
  await db.open();
});
afterEach(() => db.close());
const save = (verse = "16", translation = "web") =>
  verses.saveVerse("john", 3, verse, "Test Scripture snapshot", translation);

describe("saved verses and lists", () => {
  it("returns only the five most recently added verses", async () => {
    for (let i = 1; i <= 7; i++) {
      const id = await save(String(i));
      await db.savedVerses.update(id, {
        created_at: `2026-01-0${i}T00:00:00.000Z`,
      });
    }
    expect(
      (await verses.getRecentSavedVerses()).map((verse) => verse.verse),
    ).toEqual(["7", "6", "5", "4", "3"]);
  });

  it("deduplicates concurrent saves and initializes one system list", async () => {
    const ids = await Promise.all([save(), save(), save()]);
    expect(new Set(ids).size).toBe(1);
    expect(await db.savedVerses.count()).toBe(1);
    expect(await db.lists.count()).toBe(1);
    expect(await lists.getListIdsForVerse(ids[0])).toEqual([DEFAULT_LIST_ID]);
  });
  it("keeps translations distinct and rejects unsupported identities", async () => {
    await Promise.all([save(), save("16", "asv"), save("16", "kjv")]);
    expect(await db.savedVerses.count()).toBe(3);
    await expect(save("16", "all")).rejects.toThrow("Unsupported translation");
    await expect(save("16", "niv")).rejects.toThrow("Unsupported translation");
    await expect(save("0")).rejects.toThrow("Invalid verse");
  });
  it("protects the system list and permits duplicate user list names", async () => {
    await lists.getLists();
    await expect(lists.renameList(DEFAULT_LIST_ID, "Other")).rejects.toThrow();
    await expect(lists.deleteList(DEFAULT_LIST_ID, "move")).rejects.toThrow();
    const first = await lists.createList("Study");
    expect(await lists.createList("Study")).not.toBe(first);
  });
  it("removes membership without unsaving, then unsaves all memberships", async () => {
    const id = await save();
    const list = await lists.createList("Study");
    await lists.addVerseToLists(id, [list, list]);
    expect(await db.listItems.count()).toBe(2);
    await lists.removeVerseFromList(id, list);
    expect(await db.savedVerses.count()).toBe(1);
    await lists.addVerseToList(id, list);
    await verses.unsaveVerse("john", 3, "16", "web");
    expect(await db.savedVerses.count()).toBe(0);
    expect(await db.listItems.count()).toBe(0);
  });
  it("keeps unlisted verses visible under All", async () => {
    const id = await save();
    await lists.setVerseLists(id, []);
    expect(await lists.getListIdsForVerse(id)).toEqual([]);
    expect((await lists.getVersesForListFilter("all"))[0].id).toBe(id);
  });
  it("moves deleted list members to Saved and preserves other memberships", async () => {
    const id = await save();
    const first = await lists.createList("First");
    const second = await lists.createList("Second");
    await lists.setVerseLists(id, [first, second]);
    await lists.deleteList(first, "move");
    expect(new Set(await lists.getListIdsForVerse(id))).toEqual(
      new Set([DEFAULT_LIST_ID, second]),
    );
    expect(await db.savedVerses.count()).toBe(1);
  });
  it("deletes only exclusive verses in delete-verses mode", async () => {
    const exclusive = await save("16");
    const shared = await save("17");
    const first = await lists.createList("First");
    const second = await lists.createList("Second");
    await lists.setVerseLists(exclusive, [first]);
    await lists.setVerseLists(shared, [first, second]);
    await lists.deleteList(first, "delete-verses");
    expect(await db.savedVerses.get(exclusive)).toBeUndefined();
    expect(await lists.getListIdsForVerse(shared)).toEqual([second]);
    expect(await db.listItems.count()).toBe(1);
  });
  it("rejects dangling memberships and rolls back replacement", async () => {
    const id = await save();
    await expect(
      lists.addVerseToList("missing", DEFAULT_LIST_ID),
    ).rejects.toThrow();
    await expect(lists.setVerseLists(id, ["missing"])).rejects.toThrow();
    expect(await lists.getListIdsForVerse(id)).toEqual([DEFAULT_LIST_ID]);
  });
  it("rolls back save and default-list creation if membership insertion fails", async () => {
    const fail = () => {
      throw new Error("Injected membership failure");
    };
    db.listItems.hook("creating", fail);
    try {
      await expect(save()).rejects.toThrow("Injected membership failure");
    } finally {
      db.listItems.hook("creating").unsubscribe(fail);
    }
    expect(await db.savedVerses.count()).toBe(0);
    expect(await db.lists.count()).toBe(0);
    expect(await db.listItems.count()).toBe(0);
  });
  it("persists across connections and reopening", async () => {
    const id = await save();
    const second = new BibleDatabase();
    try {
      expect((await second.savedVerses.get(id))?.verse_text).toBe(
        "Test Scripture snapshot",
      );
    } finally {
      second.close();
    }
    db.close();
    await db.open();
    expect(await db.savedVerses.get(id)).toBeDefined();
  });
});

describe("bookmarks", () => {
  it("distinguishes chapter bookmarks and deduplicates concurrent locations", async () => {
    await bookmarks.createBookmark({ bookId: "john", chapter: 3 });
    const results = await Promise.allSettled([
      bookmarks.createBookmark({ bookId: "john", chapter: 3, verse: "16" }),
      bookmarks.createBookmark({ bookId: "john", chapter: 3, verse: "16" }),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(await db.bookmarks.count()).toBe(2);
  });
  it("moves, renames and recolors while preserving identity", async () => {
    const id = await bookmarks.createBookmark({ bookId: "john", chapter: 3 });
    await bookmarks.moveBookmark(id, "john", 4, "1");
    await bookmarks.renameBookmark(id, "Next reading");
    await bookmarks.recolorBookmark(id, "#abcdef");
    expect(await bookmarks.findByLocation("john", 3, null)).toBeNull();
    expect(await bookmarks.findByLocation("john", 4, "1")).toMatchObject({
      id,
      name: "Next reading",
      color_hex: "#abcdef",
    });
  });
  it("rejects collisions and invalid colors without changing the original", async () => {
    const id = await bookmarks.createBookmark({ bookId: "john", chapter: 3 });
    await bookmarks.createBookmark({ bookId: "john", chapter: 4 });
    await expect(bookmarks.moveBookmark(id, "john", 4, null)).rejects.toThrow();
    expect((await db.bookmarks.get(id))?.chapter).toBe(3);
    expect(() => bookmarks.recolorBookmark(id, "red")).toThrow(
      "Invalid bookmark color",
    );
  });
});
