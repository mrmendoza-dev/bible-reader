import { z } from "zod";
import { loadPassageText } from "@/bible/services/bible-passages-service";
import { bibleService } from "@/bible/services/bible-service";
import {
  DEFAULT_TRANSLATION_ID,
  getTranslationBookIds,
  isTranslationId,
  isTranslationReferenceAvailable,
  TRANSLATION_IDS,
  type TranslationId,
} from "@/bible/translations";
import {
  getSavedReferenceKey,
  MAX_SAVED_TEXT_LENGTH,
  validatePassage,
} from "@/bible/utils/passage-reference";
import { verseContains } from "@/bible/utils/translation-data";
import { DEFAULT_LIST_ID, db, ensureDefaultList } from "./db";
import { locationKey, validateLocation } from "./validation";

export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const record = z.object({
  id: z.string().min(1).max(200),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});
const location = {
  book_id: z.string(),
  chapter: z.number().int().positive(),
  verse: z.string().regex(/^[1-9]\d*(?:-[1-9]\d*)?$/),
};
const savedVerse = record
  .extend({
    ...location,
    verse_text: z.string().min(1).max(MAX_SAVED_TEXT_LENGTH),
    end: z
      .object({
        bookId: z.string(),
        chapter: z.number().int().positive(),
        verse: z.number().int().positive().max(176),
      })
      .strict()
      .optional(),
    reference_key: z.string().optional(),
    translation: z.custom<TranslationId>(
      isTranslationId,
      "Unsupported translation",
    ),
  })
  .strict();
const list = record
  .extend({
    name: z.string().trim().min(1).max(200),
    description: z.string().max(2000).nullable(),
    is_default: z.boolean(),
    sort_order: z.number().int().nonnegative(),
  })
  .strict();
const bookmark = record
  .extend({
    ...location,
    verse: location.verse.nullable(),
    name: z.string().max(200).nullable(),
    color_hex: z.string().regex(/^#[0-9a-f]{6}$/i),
    location_key: z.string(),
  })
  .strict();
const envelope = z
  .object({
    format: z.literal("bible-reader-backup"),
    formatVersion: z.union([z.literal(1), z.literal(2)]),
    exportedAt: z.iso.datetime(),
    appVersion: z.string(),
    savedVerses: z.array(savedVerse).max(20000),
    lists: z.array(list).max(2000),
    listItems: z
      .array(z.object({ list_id: z.string(), verse_id: z.string() }).strict())
      .max(100000),
    bookmarks: z.array(bookmark).max(10000),
  })
  .strict();
export type BibleBackup = z.infer<typeof envelope>;

function unique<T>(
  records: T[],
  identity: (record: T) => string,
  label: string,
) {
  const keys = records.map(identity);
  if (new Set(keys).size !== keys.length)
    throw new Error(`Duplicate ${label} in backup`);
}
export function validateBackup(value: unknown): BibleBackup {
  const result = envelope.safeParse(value);
  if (!result.success)
    throw new Error(
      `Invalid backup: ${result.error.issues[0]?.path.join(".") || "format"}: ${result.error.issues[0]?.message}`,
    );
  const backup = result.data;
  for (const verse of backup.savedVerses) {
    if (verse.end) {
      if (backup.formatVersion === 1)
        throw new Error("Passages require backup format version 2");
      if (!/^[1-9]\d*$/.test(verse.verse))
        throw new Error("Invalid passage starting verse");
      validatePassage(
        {
          bookId: verse.book_id,
          chapter: verse.chapter,
          verse: Number(verse.verse),
        },
        verse.end,
        verse.translation,
      );
      if (
        !isTranslationReferenceAvailable(
          verse.translation,
          verse.end.bookId,
          verse.end.chapter,
        )
      )
        throw new Error(
          "End reference is unavailable in the selected translation",
        );
    }
    verse.reference_key = getSavedReferenceKey(
      verse.book_id,
      verse.chapter,
      verse.verse,
      verse.end,
    );
  }
  unique(backup.savedVerses, (v) => v.id, "verse ID");
  unique(
    backup.savedVerses,
    (v) => JSON.stringify([v.reference_key, v.translation]),
    "verse reference",
  );
  unique(backup.lists, (v) => v.id, "list ID");
  unique(backup.bookmarks, (v) => v.id, "bookmark ID");
  unique(backup.bookmarks, (v) => v.location_key, "bookmark location");
  unique(
    backup.listItems,
    (v) => JSON.stringify([v.list_id, v.verse_id]),
    "list membership",
  );
  for (const entry of backup.lists) {
    if (
      entry.is_default !== (entry.id === DEFAULT_LIST_ID) ||
      (entry.is_default && entry.name !== "Saved")
    )
      throw new Error("Invalid system Saved list");
  }
  const verseIds = new Set(backup.savedVerses.map((v) => v.id));
  const listIds = new Set(backup.lists.map((v) => v.id));
  for (const item of backup.listItems) {
    if (!verseIds.has(item.verse_id) || !listIds.has(item.list_id))
      throw new Error("Backup contains a dangling list membership");
  }
  for (const item of [...backup.savedVerses, ...backup.bookmarks])
    validateLocation(item.book_id, item.chapter, item.verse);
  for (const item of backup.savedVerses)
    if (
      !isTranslationReferenceAvailable(
        item.translation,
        item.book_id,
        item.chapter,
      )
    )
      throw new Error("Reference is unavailable in the selected translation");
  for (const item of backup.bookmarks) {
    if (
      item.location_key !== locationKey(item.book_id, item.chapter, item.verse)
    )
      throw new Error("Invalid bookmark location identity");
  }
  return backup;
}
export function parseBackup(text: string) {
  if (new Blob([text]).size > MAX_BACKUP_BYTES)
    throw new Error("Backup must be smaller than 10 MiB");
  return validateBackup(JSON.parse(text));
}
export function exportBackup(): Promise<BibleBackup> {
  return db.transaction(
    "r",
    db.savedVerses,
    db.lists,
    db.listItems,
    db.bookmarks,
    async () => ({
      format: "bible-reader-backup",
      formatVersion: 2,
      exportedAt: new Date().toISOString(),
      appVersion: "0.0.0",
      savedVerses: await db.savedVerses.toArray(),
      lists: await db.lists.toArray(),
      listItems: await db.listItems.toArray(),
      bookmarks: await db.bookmarks.toArray(),
    }),
  );
}
export async function restoreBackup(value: unknown) {
  const backup = validateBackup(value);
  // Fetch and check source coverage before opening the write transaction.
  for (const item of [...backup.savedVerses, ...backup.bookmarks]) {
    const translation =
      "translation" in item
        ? item.translation
        : getTranslationBookIds(DEFAULT_TRANSLATION_ID).includes(item.book_id)
          ? DEFAULT_TRANSLATION_ID
          : TRANSLATION_IDS.find((id) =>
              getTranslationBookIds(id).includes(item.book_id),
            );
    if (!translation) throw new Error(`Book is unavailable: ${item.book_id}`);
    if ("end" in item && item.end) {
      await loadPassageText(
        {
          bookId: item.book_id,
          chapter: item.chapter,
          verse: Number(item.verse),
        },
        item.end,
        translation,
      );
      continue;
    }
    const chapter = await bibleService.getChapter(
      item.book_id,
      item.chapter,
      translation,
    );
    const [start, end = start] = (item.verse ?? "1").split("-").map(Number);
    const covered =
      item.verse === null ||
      ("translation" in item
        ? chapter?.verses.some((verse) => verse.verse === item.verse)
        : Array.from(
            { length: end - start + 1 },
            (_, offset) => start + offset,
          ).every((number) =>
            chapter?.verses.some((verse) => verseContains(verse.verse, number)),
          ));
    if (!chapter || !covered) {
      throw new Error(
        `Reference is unavailable in ${translation.toUpperCase()}: ${item.book_id} ${item.chapter}:${item.verse ?? "chapter"}`,
      );
    }
  }
  await db.transaction(
    "rw",
    db.savedVerses,
    db.lists,
    db.listItems,
    db.bookmarks,
    async () => {
      await db.listItems.clear();
      await db.savedVerses.clear();
      await db.lists.clear();
      await db.bookmarks.clear();
      await db.savedVerses.bulkAdd(backup.savedVerses);
      await db.lists.bulkAdd(backup.lists);
      await db.listItems.bulkAdd(backup.listItems);
      await db.bookmarks.bulkAdd(backup.bookmarks);
      await ensureDefaultList();
    },
  );
}
