// Supabase service for managing saved Bible verses
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
import { normalizeTranslationId } from "@apps/production/bible-app/translations";
import { bibleListsService } from "./bible-lists-service";

// Interface for saved verses in Supabase (snake_case fields)
export interface SavedVerse extends AuthenticatedDocument {
  book_id: string;
  chapter: number;
  verse: string;
  verse_text: string; // Store full text for easy display
  translation?: string; // Catalog id from AVAILABLE_TRANSLATIONS
}

/**
 * What this table backs (v7 P1-T0).
 *
 * - **`q` searches `verse_text` and `book_id`.** The text is stored on the row precisely so a saved
 *   verse can be displayed without re-parsing a translation file, which also makes it the one
 *   column worth searching. `book_id` rides along so "john" finds what you saved in John.
 * - **No `status`.** A saved verse is saved; there is no second state.
 * - **No `tags`.** The column does not exist. Declaring it would make a tag filter silently match
 *   everything, which `ListQuerySupport` exists to prevent.
 * - **`since`/`until` bound `created_at`**, the shared default, and here it is also the right one:
 *   "verses I saved this month" is the question, and the row has no other date of its own.
 * - **`translation` is not a filter.** It is nullable; writes go through `normalizeTranslationId`.
 *   Legacy rows may use older casing — lookups normalize both sides so keys stay consistent.
 */
export const savedVersesListSupport: ListQuerySupport = {
  sort: ["created_at", "updated_at", "book_id"],
  defaultOrder: "desc",
  q: true,
};

const savedVersesListConfig: ListPageConfig = {
  support: savedVersesListSupport,
  searchColumns: ["verse_text", "book_id"],
};

// Service for managing saved Bible verses
export class BibleSupabaseService extends AuthenticatedService<SavedVerse> {
  constructor() {
    super("bible_verses");
  }

  /** A page of saved verses, text included — the row already carries it. */
  async listSavedVerses(query: ListQuery = {}): Promise<ListPage<SavedVerse>> {
    return this.listPage(query, savedVersesListConfig);
  }

  // Get all saved verses for current user
  async getSavedVerses(): Promise<SavedVerse[]> {
    return this.getAllOrdered("created_at", "desc");
  }

  // Save a verse
  async saveVerse(
    bookId: string,
    chapter: number,
    verse: string,
    verseText: string,
    translation?: string,
  ): Promise<string> {
    // Check if verse is already saved to avoid duplicates
    const existing = await this.getVerseByReference(
      bookId,
      chapter,
      verse,
      translation,
    );
    if (existing) {
      await bibleListsService.addVerseToDefaultList(existing.id);
      return existing.id;
    }

    const id = await this.create({
      book_id: bookId,
      chapter,
      verse,
      verse_text: verseText,
      translation: normalizeTranslationId(translation),
    });
    await bibleListsService.addVerseToDefaultList(id);
    return id;
  }

  // Unsave a verse by finding and deleting it
  async unsaveVerse(
    bookId: string,
    chapter: number,
    verse: string,
    translation?: string,
  ): Promise<void> {
    const savedVerse = await this.getVerseByReference(
      bookId,
      chapter,
      verse,
      translation,
    );
    if (savedVerse) {
      await this.delete(savedVerse.id);
    }
  }

  // Check if a verse is saved
  async isVerseSaved(
    bookId: string,
    chapter: number,
    verse: string,
    translation?: string,
  ): Promise<boolean> {
    const savedVerse = await this.getVerseByReference(
      bookId,
      chapter,
      verse,
      translation,
    );
    return !!savedVerse;
  }

  // Get all saved verses for a specific book
  async getVersesByBook(bookId: string): Promise<SavedVerse[]> {
    return this.queryByField("book_id", "eq", bookId);
  }

  async getSavedVerseByReference(
    bookId: string,
    chapter: number,
    verse: string,
    translation?: string,
  ): Promise<SavedVerse | null> {
    return this.getVerseByReference(bookId, chapter, verse, translation);
  }

  // Get a specific verse by reference
  private async getVerseByReference(
    bookId: string,
    chapter: number,
    verse: string,
    translation?: string,
  ): Promise<SavedVerse | null> {
    const verses = await this.getAll();
    return (
      verses.find(
        (v) =>
          v.book_id === bookId &&
          v.chapter === chapter &&
          v.verse === verse &&
          normalizeTranslationId(v.translation) ===
            normalizeTranslationId(translation),
      ) || null
    );
  }

  // Get saved verses as a Set of keys for quick lookup
  async getSavedVerseKeys(): Promise<Set<string>> {
    const savedVerses = await this.getSavedVerses();
    return new Set(
      savedVerses.map((v) =>
        getVerseKey(v.book_id, v.chapter, v.verse, v.translation),
      ),
    );
  }
}

// Shared verse key format for UI consistency (bookId-chapter-verse-translation)
export const getVerseKey = (
  bookId: string,
  chapter: number,
  verse: string,
  translation?: string,
): string =>
  `${bookId}-${chapter}-${verse}-${normalizeTranslationId(translation)}`;

// Export a singleton instance
export const bibleSupabaseService = new BibleSupabaseService();
