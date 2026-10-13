import { DEFAULT_BOOKMARK_COLOR } from "@/bible/constants";
import { db, newRecord } from "@/bible/storage/db";
import type { BibleBookmark } from "@/bible/storage/models";
import {
  locationKey,
  validateColor,
  validateLocation,
  validateName,
} from "@/bible/storage/validation";

export type { BibleBookmark } from "@/bible/storage/models";

class BibleBookmarksService {
  getAllBookmarks() {
    return db.bookmarks.orderBy("updated_at").reverse().toArray();
  }
  async createBookmark(input: {
    bookId: string;
    chapter: number;
    verse?: string | null;
    name?: string | null;
    colorHex?: string;
  }) {
    const {
      bookId,
      chapter,
      verse = null,
      name = null,
      colorHex = DEFAULT_BOOKMARK_COLOR,
    } = input;
    validateLocation(bookId, chapter, verse);
    validateColor(colorHex);
    if (name !== null) validateName(name);
    return db.transaction("rw", db.bookmarks, async () => {
      if (await this.findByLocation(bookId, chapter, verse))
        throw new Error("A bookmark already exists at this location");
      const record = {
        ...newRecord(),
        book_id: bookId,
        chapter,
        verse,
        name,
        color_hex: colorHex,
        location_key: locationKey(bookId, chapter, verse),
      };
      await db.bookmarks.add(record);
      return record.id;
    });
  }
  async moveBookmark(
    id: string,
    bookId: string,
    chapter: number,
    verse: string | null,
  ) {
    validateLocation(bookId, chapter, verse);
    return db.transaction("rw", db.bookmarks, async () => {
      const existing = await this.findByLocation(bookId, chapter, verse);
      if (existing && existing.id !== id)
        throw new Error("Another bookmark already exists at this location");
      await this.update(id, {
        book_id: bookId,
        chapter,
        verse,
        location_key: locationKey(bookId, chapter, verse),
      });
    });
  }
  renameBookmark(id: string, name: string | null) {
    if (name !== null) validateName(name);
    return this.update(id, { name });
  }
  recolorBookmark(id: string, colorHex: string) {
    validateColor(colorHex);
    return this.update(id, { color_hex: colorHex });
  }
  delete(id: string) {
    return db.bookmarks.delete(id);
  }
  async findByLocation(bookId: string, chapter: number, verse?: string | null) {
    return (
      (await db.bookmarks
        .where("location_key")
        .equals(locationKey(bookId, chapter, verse))
        .first()) ?? null
    );
  }
  buildVerseMap(bookmarks: BibleBookmark[]) {
    return new Map(
      bookmarks.map((bm) => [
        `${bm.book_id}-${bm.chapter}-${bm.verse ?? ""}`,
        bm,
      ]),
    );
  }
  private async update(id: string, fields: Partial<BibleBookmark>) {
    const count = await db.bookmarks.update(id, {
      ...fields,
      updated_at: new Date().toISOString(),
    });
    if (!count) throw new Error("Bookmark not found");
  }
}
export const bibleBookmarksService = new BibleBookmarksService();
