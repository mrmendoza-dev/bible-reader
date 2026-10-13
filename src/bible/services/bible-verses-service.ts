import {
  DEFAULT_LIST_ID,
  db,
  ensureDefaultList,
  newRecord,
} from "@/bible/storage/db";
import type { SavedVerse } from "@/bible/storage/models";
import { validateLocation } from "@/bible/storage/validation";
import {
  isTranslationReferenceAvailable,
  requireTranslationId,
} from "@/bible/translations";
import {
  getSavedReferenceKey,
  MAX_SAVED_TEXT_LENGTH,
  type PassageReference,
  validatePassage,
} from "@/bible/utils/passage-reference";
import { loadPassageText } from "./bible-passages-service";

export type { SavedVerse } from "@/bible/storage/models";

export class BibleVersesService {
  getSavedVerses() {
    return db.savedVerses.orderBy("created_at").reverse().toArray();
  }
  getRecentSavedVerses() {
    return db.savedVerses.orderBy("created_at").reverse().limit(5).toArray();
  }
  getVersesByBook(bookId: string) {
    return db.savedVerses.where("book_id").equals(bookId).toArray();
  }
  async saveVerse(
    bookId: string,
    chapter: number,
    verse: string,
    verseText: string,
    translation?: string,
    end?: PassageReference,
  ): Promise<string> {
    const translationId = requireTranslationId(translation);
    validateLocation(bookId, chapter, verse);
    if (end) {
      if (!/^[1-9]\d*$/.test(verse))
        throw new Error("Passages need a single starting verse");
      validatePassage(
        { bookId, chapter, verse: Number(verse) },
        end,
        translationId,
      );
      if (
        !isTranslationReferenceAvailable(translationId, end.bookId, end.chapter)
      )
        throw new Error(
          "End reference is unavailable in the selected translation",
        );
    }
    if (!isTranslationReferenceAvailable(translationId, bookId, chapter))
      throw new Error("Reference is unavailable in the selected translation");
    if (!verseText.trim()) throw new Error("Cannot save an empty verse");
    if (verseText.length > MAX_SAVED_TEXT_LENGTH)
      throw new Error("Verse text is too long");
    return db.transaction(
      "rw",
      db.savedVerses,
      db.lists,
      db.listItems,
      async () => {
        await ensureDefaultList();
        const existing = await this.getSavedVerseByReference(
          bookId,
          chapter,
          verse,
          translationId,
          end,
        );
        const record: SavedVerse = existing ?? {
          ...newRecord(),
          book_id: bookId,
          chapter,
          verse,
          verse_text: verseText,
          translation: translationId,
          reference_key: getSavedReferenceKey(bookId, chapter, verse, end),
          ...(end ? { end } : {}),
        };
        if (!existing) await db.savedVerses.add(record);
        await db.listItems.put({
          list_id: DEFAULT_LIST_ID,
          verse_id: record.id,
        });
        return record.id;
      },
    );
  }
  async savePassage(
    start: PassageReference,
    end: PassageReference,
    translation?: string,
  ) {
    const translationId = requireTranslationId(translation);
    const text = await loadPassageText(start, end, translationId);
    return this.saveVerse(
      start.bookId,
      start.chapter,
      String(start.verse),
      text,
      translationId,
      end,
    );
  }
  async unsaveVerse(
    bookId: string,
    chapter: number,
    verse: string,
    translation?: string,
    end?: PassageReference,
  ) {
    const translationId = requireTranslationId(translation);
    return db.transaction("rw", db.savedVerses, db.listItems, async () => {
      const record = await this.getSavedVerseByReference(
        bookId,
        chapter,
        verse,
        translationId,
        end,
      );
      if (!record) return;
      await db.listItems.where("verse_id").equals(record.id).delete();
      await db.savedVerses.delete(record.id);
    });
  }
  getSavedVerseByReference(
    bookId: string,
    chapter: number,
    verse: string,
    translation?: string,
    end?: PassageReference,
  ) {
    return db.savedVerses
      .where("[reference_key+translation]")
      .equals([
        getSavedReferenceKey(bookId, chapter, verse, end),
        requireTranslationId(translation),
      ])
      .first()
      .then((record) => record ?? null);
  }
  async isVerseSaved(
    bookId: string,
    chapter: number,
    verse: string,
    translation?: string,
  ) {
    return Boolean(
      await this.getSavedVerseByReference(bookId, chapter, verse, translation),
    );
  }
  async getSavedVerseKeys() {
    return new Set(
      (await this.getSavedVerses()).map((v) =>
        getVerseKey(v.book_id, v.chapter, v.verse, v.translation, v.end),
      ),
    );
  }
}
export const getVerseKey = (
  bookId: string,
  chapter: number,
  verse: string,
  translation?: string,
  end?: PassageReference,
) =>
  `${getSavedReferenceKey(bookId, chapter, verse, end)}-${requireTranslationId(translation)}`;
export const bibleVersesService = new BibleVersesService();
