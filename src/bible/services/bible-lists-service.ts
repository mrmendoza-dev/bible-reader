import {
  DEFAULT_LIST_ID,
  db,
  ensureDefaultList,
  newRecord,
} from "@/bible/storage/db";
import { validateName } from "@/bible/storage/validation";

export type { BibleList } from "@/bible/storage/models";
export const DEFAULT_BIBLE_LIST_NAME = "Saved";
export type DeleteListMode = "move" | "delete-verses";

class BibleListsService {
  async getLists() {
    return db.transaction("rw", db.lists, async () => {
      await ensureDefaultList();
      return db.lists.orderBy("sort_order").toArray();
    });
  }
  ensureDefaultList() {
    return db.transaction("rw", db.lists, ensureDefaultList);
  }
  getDefaultList() {
    return this.ensureDefaultList();
  }
  async createList(name: string) {
    validateName(name);
    return db.transaction("rw", db.lists, async () => {
      await ensureDefaultList();
      const last = await db.lists.orderBy("sort_order").last();
      const list = {
        ...newRecord(),
        name: name.trim(),
        description: null,
        is_default: false,
        sort_order: (last?.sort_order ?? 0) + 1,
      };
      await db.lists.add(list);
      return list.id;
    });
  }
  async renameList(id: string, name: string) {
    validateName(name);
    return db.transaction("rw", db.lists, async () => {
      await this.requireList(id);
      if (id === DEFAULT_LIST_ID)
        throw new Error("The Saved list cannot be renamed");
      await db.lists.update(id, {
        name: name.trim(),
        updated_at: new Date().toISOString(),
      });
    });
  }
  async deleteList(id: string, mode: DeleteListMode) {
    if (id === DEFAULT_LIST_ID)
      throw new Error("The Saved list cannot be deleted");
    if (mode !== "move" && mode !== "delete-verses")
      throw new Error("Invalid list deletion mode");
    return db.transaction(
      "rw",
      db.lists,
      db.savedVerses,
      db.listItems,
      async () => {
        await this.requireList(id);
        await ensureDefaultList();
        const items = await db.listItems.where("list_id").equals(id).toArray();
        for (const item of items) {
          if (mode === "move") {
            await db.listItems.put({
              list_id: DEFAULT_LIST_ID,
              verse_id: item.verse_id,
            });
          } else {
            const shared = await db.listItems
              .where("verse_id")
              .equals(item.verse_id)
              .filter((entry) => entry.list_id !== id)
              .count();
            if (!shared) {
              await db.savedVerses.delete(item.verse_id);
              await db.listItems
                .where("verse_id")
                .equals(item.verse_id)
                .delete();
            }
          }
        }
        await db.listItems.where("list_id").equals(id).delete();
        await db.lists.delete(id);
      },
    );
  }
  async addVerseToLists(verseId: string, listIds: string[]) {
    return db.transaction(
      "rw",
      db.savedVerses,
      db.lists,
      db.listItems,
      async () => {
        if (!(await db.savedVerses.get(verseId)))
          throw new Error("Saved verse not found");
        for (const listId of new Set(listIds)) {
          await this.requireList(listId);
          await db.listItems.put({ list_id: listId, verse_id: verseId });
        }
      },
    );
  }
  addVerseToList(verseId: string, listId: string) {
    return this.addVerseToLists(verseId, [listId]);
  }
  async addVerseToDefaultList(verseId: string) {
    await this.ensureDefaultList();
    return this.addVerseToList(verseId, DEFAULT_LIST_ID);
  }
  removeVerseFromList(verseId: string, listId: string) {
    return db.listItems.delete([listId, verseId]);
  }
  async setVerseLists(verseId: string, listIds: string[]) {
    return db.transaction(
      "rw",
      db.savedVerses,
      db.lists,
      db.listItems,
      async () => {
        await this.addVerseToLists(verseId, listIds);
        await db.listItems
          .where("verse_id")
          .equals(verseId)
          .filter((item) => !listIds.includes(item.list_id))
          .delete();
      },
    );
  }
  async getListIdsForVerse(verseId: string) {
    return (await db.listItems.where("verse_id").equals(verseId).toArray()).map(
      (item) => item.list_id,
    );
  }
  async getListsForVerse(verseId: string) {
    return (
      await db.lists.bulkGet(await this.getListIdsForVerse(verseId))
    ).filter((list) => list !== undefined);
  }
  async getVerseIdsForList(listId: string) {
    return (await db.listItems.where("list_id").equals(listId).toArray()).map(
      (item) => item.verse_id,
    );
  }
  async getVersesForListFilter(listId: string) {
    if (listId === "all")
      return db.savedVerses.orderBy("created_at").reverse().toArray();
    await this.requireList(listId);
    return (await db.savedVerses.bulkGet(await this.getVerseIdsForList(listId)))
      .filter((verse) => verse !== undefined)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  private async requireList(id: string) {
    const list = await db.lists.get(id);
    if (!list) throw new Error("List not found");
    return list;
  }
}
export const bibleListsService = new BibleListsService();
