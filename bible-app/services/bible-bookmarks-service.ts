// Supabase service for Bible bookmarks (multi-bookmark support)
import { DEFAULT_BOOKMARK_COLOR } from "@apps/production/bible-app/constants";
import type {
  ListPage,
  ListQuery,
  ListQuerySupport,
} from "@omni/app-contracts/data/list-query";
import {
  type AuthenticatedDocument,
  AuthenticatedService,
  type ListPageConfig,
} from "@omni/services/supabase/authenticated-service";

export interface BibleBookmark extends AuthenticatedDocument {
  book_id: string;
  chapter: number;
  verse: string | null;
  name: string | null;
  color_hex: string;
}

/**
 * What this table backs (v7 P1-T0).
 *
 * - **`q` searches `name` and `book_id`.** `name` is nullable — an unnamed bookmark is the common
 *   case — so a free-text search that only covered it would miss most rows; `book_id` is what makes
 *   "genesis" work.
 * - **`since`/`until` bound `created_at`**, but note the app orders by `updated_at` (a bookmark is
 *   *moved*, and the move is the event you remember). Both are in `sort`, so a caller can ask for
 *   either; only the default filter column had to pick one.
 * - **No `status`, no `tags`.** Neither column exists.
 */
export const bibleBookmarksListSupport: ListQuerySupport = {
  sort: ["created_at", "updated_at", "name"],
  defaultOrder: "desc",
  q: true,
};

const bibleBookmarksListConfig: ListPageConfig = {
  support: bibleBookmarksListSupport,
  searchColumns: ["name", "book_id"],
};

class BibleBookmarksService extends AuthenticatedService<BibleBookmark> {
  constructor() {
    super("bible_bookmarks");
  }

  /** A page of bookmarks. `getAllBookmarks` stays for the reader, which wants every one. */
  async listBookmarks(query: ListQuery = {}): Promise<ListPage<BibleBookmark>> {
    return this.listPage(query, bibleBookmarksListConfig);
  }

  async getAllBookmarks(): Promise<BibleBookmark[]> {
    return this.getAllOrdered("updated_at", "desc");
  }

  async createBookmark(input: {
    bookId: string;
    chapter: number;
    verse?: string | null;
    name?: string | null;
    colorHex?: string;
  }): Promise<string> {
    const {
      bookId,
      chapter,
      verse = null,
      name = null,
      colorHex = DEFAULT_BOOKMARK_COLOR,
    } = input;

    // Check for existing bookmark at this location before inserting
    const existing = await this.findByLocation(bookId, chapter, verse);
    if (existing) {
      throw new Error(
        `A bookmark already exists at ${bookId} ${chapter}${
          verse ? `:${verse}` : ""
        }`,
      );
    }

    return this.create({
      book_id: bookId,
      chapter,
      verse,
      name,
      color_hex: colorHex,
    });
  }

  async moveBookmark(
    id: string,
    bookId: string,
    chapter: number,
    verse: string | null,
  ): Promise<void> {
    // Check if another bookmark already occupies the target location
    const existing = await this.findByLocation(bookId, chapter, verse);
    if (existing && existing.id !== id) {
      throw new Error(
        `Another bookmark already exists at ${bookId} ${chapter}${
          verse ? `:${verse}` : ""
        }`,
      );
    }

    return this.update(id, {
      book_id: bookId,
      chapter,
      verse,
    });
  }

  async renameBookmark(id: string, name: string | null): Promise<void> {
    return this.update(id, { name });
  }

  async recolorBookmark(id: string, colorHex: string): Promise<void> {
    return this.update(id, { color_hex: colorHex });
  }

  /** Find a bookmark at a specific location for the current user. */
  async findByLocation(
    bookId: string,
    chapter: number,
    verse: string | null | undefined,
  ): Promise<BibleBookmark | null> {
    const all = await this.getAllBookmarks();
    return (
      all.find(
        (b) =>
          b.book_id === bookId &&
          b.chapter === chapter &&
          (b.verse ?? null) === (verse ?? null),
      ) ?? null
    );
  }

  /**
   * Build a quick-lookup map keyed by `${bookId}-${chapter}-${verse ?? ""}`.
   * Used in the reader to highlight bookmarked verses in O(1).
   */
  buildVerseMap(bookmarks: BibleBookmark[]): Map<string, BibleBookmark> {
    const map = new Map<string, BibleBookmark>();
    for (const bm of bookmarks) {
      map.set(`${bm.book_id}-${bm.chapter}-${bm.verse ?? ""}`, bm);
    }
    return map;
  }
}

export const bibleBookmarksService = new BibleBookmarksService();
