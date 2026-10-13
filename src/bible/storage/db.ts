import Dexie, { type EntityTable, type Table } from "dexie";
import { getSavedReferenceKey } from "@/bible/utils/passage-reference";
import type { BibleBookmark, BibleList, ListItem, SavedVerse } from "./models";

export class BibleDatabase extends Dexie {
  savedVerses!: EntityTable<SavedVerse, "id">;
  lists!: EntityTable<BibleList, "id">;
  listItems!: Table<ListItem, [string, string]>;
  bookmarks!: EntityTable<BibleBookmark, "id">;

  constructor(name = "bible-local") {
    super(name);
    this.version(1).stores({
      savedVerses:
        "id, &[book_id+chapter+verse+translation], book_id, created_at",
      lists: "id, sort_order",
      listItems: "[list_id+verse_id], list_id, verse_id",
      bookmarks: "id, &location_key, updated_at",
    });
    this.version(2)
      .stores({
        savedVerses:
          "id, &[reference_key+translation], [book_id+chapter+verse+translation], book_id, created_at",
      })
      .upgrade((transaction) =>
        transaction
          .table<SavedVerse>("savedVerses")
          .toCollection()
          .modify((verse) => {
            verse.reference_key = getSavedReferenceKey(
              verse.book_id,
              verse.chapter,
              verse.verse,
              verse.end,
            );
          }),
      );
  }
}
export const db = new BibleDatabase();
export const DEFAULT_LIST_ID = "default-saved";
export function newRecord() {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), created_at: now, updated_at: now };
}
export async function ensureDefaultList() {
  const existing = await db.lists.get(DEFAULT_LIST_ID);
  if (existing) return existing;
  const list: BibleList = {
    ...newRecord(),
    id: DEFAULT_LIST_ID,
    name: "Saved",
    description: null,
    is_default: true,
    sort_order: 0,
  };
  await db.lists.put(list);
  return list;
}
