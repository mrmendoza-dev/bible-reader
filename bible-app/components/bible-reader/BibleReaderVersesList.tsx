import type { BibleBookmark } from "@apps/production/bible-app/services/bible-bookmarks-service";
import { getVerseKey } from "@apps/production/bible-app/services/bible-verses-service";
import type { Verse } from "@apps/production/bible-app/types/bible-reader";
import { ScrollArea } from "@omni/ui-base/scroll-area";
import type { CSSProperties, ReactNode } from "react";
import { useEffect } from "react";
import { BibleVerse } from "../BibleVerse";

const buildHighlightedText = (text: string, query: string): ReactNode => {
  if (!query.trim()) return undefined;
  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
  const parts = text.split(regex);
  if (parts.length === 1) return undefined;
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-yellow-300/70 text-foreground rounded-sm px-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
};

type BibleReaderVersesListProps = {
  verseStyle: CSSProperties;
  verses: Verse[];
  loadedBook: string;
  loadedChapter: number;
  activeTranslationId: string;
  savedVerseKeys: Set<string>;
  /** O(1) lookup: `${bookId}-${chapter}-${verse ?? ""}` → BibleBookmark */
  bookmarksByVerse: Map<string, BibleBookmark>;
  focusedVerseNumber: string | null;
  verseScrollNonce: number;
  highlightText: string;
  onSaveVerse: (
    bookId: string,
    chapter: number,
    verse: string,
    verseText: string,
  ) => void;
  onUnsaveVerse: (bookId: string, chapter: number, verse: string) => void;
  onVerseAddNote: (verseNum: string) => void;
  onAddBookmark: (bookId: string, chapter: number, verse: string) => void;
  onRemoveBookmark: (bookmarkId: string) => void;
  onMoveBookmark: (bookId: string, chapter: number, verse: string) => void;
  onAddToList: (
    bookId: string,
    chapter: number,
    verse: string,
    verseText: string,
  ) => void | Promise<void>;
  hasAnyBookmarks: boolean;
};

export const BibleReaderVersesList = ({
  verseStyle,
  verses,
  loadedBook,
  loadedChapter,
  activeTranslationId,
  savedVerseKeys,
  bookmarksByVerse,
  focusedVerseNumber,
  verseScrollNonce,
  highlightText,
  onSaveVerse,
  onUnsaveVerse,
  onVerseAddNote,
  onAddBookmark,
  onRemoveBookmark,
  onMoveBookmark,
  onAddToList,
  hasAnyBookmarks,
}: BibleReaderVersesListProps) => {
  useEffect(() => {
    if (focusedVerseNumber == null || verses.length === 0) return;
    if (!verses.some((v) => v.verse === focusedVerseNumber)) return;

    const id = `bible-verse-${loadedBook}-${loadedChapter}-${focusedVerseNumber}`;
    const run = () => {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, [focusedVerseNumber, loadedBook, loadedChapter, verses, verseScrollNonce]);

  return (
    <ScrollArea className="min-h-0 min-w-0 flex-1">
      <div
        className="mx-auto flex w-full max-w-3xl flex-col gap-2 p-2"
        style={verseStyle}
      >
          {verses.map((verse) => {
            const verseKey = getVerseKey(
              loadedBook,
              loadedChapter,
              verse.verse,
              activeTranslationId,
            );
            const isSaved = savedVerseKeys.has(verseKey);
            const bmKey = `${loadedBook}-${loadedChapter}-${verse.verse}`;
            const bookmarkOnVerse = bookmarksByVerse.get(bmKey) ?? null;

            return (
              <BibleVerse
                key={verse.verse}
                bookId={loadedBook}
                chapter={loadedChapter}
                verse={verse.verse}
                text={verse.text}
                isFocused={focusedVerseNumber === verse.verse}
                highlightedText={buildHighlightedText(
                  verse.text,
                  highlightText,
                )}
                isSaved={isSaved}
                bookmarkOnVerse={bookmarkOnVerse}
                hasAnyBookmarks={hasAnyBookmarks}
                onSave={() =>
                  onSaveVerse(
                    loadedBook,
                    loadedChapter,
                    verse.verse,
                    verse.text,
                  )
                }
                onUnsave={() =>
                  onUnsaveVerse(loadedBook, loadedChapter, verse.verse)
                }
                onAddNote={() => onVerseAddNote(verse.verse)}
                onAddBookmark={() =>
                  onAddBookmark(loadedBook, loadedChapter, verse.verse)
                }
                onRemoveBookmark={
                  bookmarkOnVerse
                    ? () => onRemoveBookmark(bookmarkOnVerse.id)
                    : undefined
                }
                onMoveBookmark={() =>
                  onMoveBookmark(loadedBook, loadedChapter, verse.verse)
                }
                onAddToList={() =>
                  void onAddToList(
                    loadedBook,
                    loadedChapter,
                    verse.verse,
                    verse.text,
                  )
                }
              />
            );
          })}
      </div>
    </ScrollArea>
  );
};
