import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef } from "react";
import type { BibleBookmark } from "@/bible/services/bible-bookmarks-service";
import {
  getVerseKey,
  type SavedVerse,
} from "@/bible/services/bible-verses-service";
import type { Verse } from "@/bible/types/bible-reader";
import { getChapterPassageCoverage } from "@/bible/utils/passage-display";
import {
  formatSavedPassage,
  type PassageReference,
} from "@/bible/utils/passage-reference";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BibleVerse } from "../BibleVerse";

type BibleReaderVersesListProps = {
  verseStyle: CSSProperties;
  verses: Verse[];
  loadedBook: string;
  loadedChapter: number;
  activeTranslationId: string;
  savedVerseKeys: Set<string>;
  savedRecords?: SavedVerse[];
  onOpenSavedPassage?: (id: string) => void;
  /** O(1) lookup: `${bookId}-${chapter}-${verse ?? ""}` → BibleBookmark */
  bookmarksByVerse: Map<string, BibleBookmark>;
  focusedVerseNumber: string | null;
  verseScrollNonce: number;
  chapterScrollToTopNonce: number;
  onSaveVerse: (
    bookId: string,
    chapter: number,
    verse: string,
    verseText: string,
  ) => void;
  onUnsaveVerse: (bookId: string, chapter: number, verse: string) => void;
  onSavePassage?: (
    bookId: string,
    chapter: number,
    verse: string,
    end: PassageReference,
  ) => Promise<void>;
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
  savedRecords = [],
  onOpenSavedPassage,
  bookmarksByVerse,
  focusedVerseNumber,
  verseScrollNonce,
  chapterScrollToTopNonce,
  onSaveVerse,
  onUnsaveVerse,
  onSavePassage,
  onAddBookmark,
  onRemoveBookmark,
  onMoveBookmark,
  onAddToList,
  hasAnyBookmarks,
}: BibleReaderVersesListProps) => {
  const scrollAreaWrapRef = useRef<HTMLDivElement>(null);
  const coverage = useMemo(
    () =>
      getChapterPassageCoverage(
        savedRecords,
        loadedBook,
        loadedChapter,
        verses,
        activeTranslationId,
      ),
    [savedRecords, loadedBook, loadedChapter, verses, activeTranslationId],
  );
  const isHighlighted = (verse: Verse | undefined) =>
    Boolean(
      verse &&
        (coverage.has(verse.verse) ||
          savedVerseKeys.has(
            getVerseKey(
              loadedBook,
              loadedChapter,
              verse.verse,
              activeTranslationId,
            ),
          )),
    );

  // biome-ignore lint/correctness/useExhaustiveDependencies: nonce triggers scroll after prev/next chapter nav.
  useEffect(() => {
    if (chapterScrollToTopNonce === 0) return;

    const run = () => {
      const viewport = scrollAreaWrapRef.current?.querySelector(
        '[data-slot="scroll-area-viewport"]',
      );
      if (viewport instanceof HTMLElement) {
        viewport.scrollTop = 0;
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }, [chapterScrollToTopNonce, loadedChapter]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: The nonce repeats scrolling to the same selected verse.
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
    <div ref={scrollAreaWrapRef} className="min-h-0 min-w-0 flex-1">
      <ScrollArea className="h-full min-h-0">
        <div
          className="mx-auto flex w-full max-w-3xl flex-col p-2"
          style={verseStyle}
        >
          {verses.map((verse, index) => {
            const verseKey = getVerseKey(
              loadedBook,
              loadedChapter,
              verse.verse,
              activeTranslationId,
            );
            const isSaved = savedVerseKeys.has(verseKey);
            const bmKey = `${loadedBook}-${loadedChapter}-${verse.verse}`;
            const bookmarkOnVerse = bookmarksByVerse.get(bmKey) ?? null;
            const highlighted = isHighlighted(verse);
            const connection = {
              before: highlighted && isHighlighted(verses[index - 1]),
              after: highlighted && isHighlighted(verses[index + 1]),
            };

            return (
              <div
                key={verse.verse}
                className={connection.after ? undefined : "mb-2 last:mb-0"}
              >
                <BibleVerse
                  bookId={loadedBook}
                  chapter={loadedChapter}
                  verse={verse.verse}
                  text={verse.text}
                  rangeTranslationId={activeTranslationId}
                  isFocused={focusedVerseNumber === verse.verse}
                  isSaved={isSaved}
                  includedPassages={coverage
                    .get(verse.verse)
                    ?.map((passage) => ({
                      id: passage.id,
                      label: formatSavedPassage(passage),
                    }))}
                  onOpenSavedPassage={onOpenSavedPassage}
                  savedConnection={connection}
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
                  onSaveRange={
                    onSavePassage
                      ? (end) =>
                          onSavePassage(
                            loadedBook,
                            loadedChapter,
                            verse.verse,
                            end,
                          )
                      : undefined
                  }
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
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
