"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBookDisplayTitle } from "@/bible/constants";
import { useReaderChrome } from "@/bible/contexts/ReaderChromeContext";
import { useBibleReaderScreen } from "@/bible/hooks/useBibleReaderScreen";
import type {
  BibleReaderProps,
  BibleReaderRef,
} from "@/bible/types/bible-reader";
import { Button } from "@/components/ui/button";
import { AddVerseToListDialog } from "../AddVerseToListDialog";
import { BookmarkManagerDialog } from "../BookmarkManagerDialog";
import { MoveBookmarkDialog } from "../MoveBookmarkDialog";
import { BibleReaderChapterBar } from "./BibleReaderChapterBar";
import { BibleReaderControls } from "./BibleReaderControls";
import { BibleReaderVersesList } from "./BibleReaderVersesList";

export const BibleReader = forwardRef<BibleReaderRef, BibleReaderProps>(
  ({ translationId, onTranslationChange }, ref) => {
    const screen = useBibleReaderScreen({ translationId });
    const navigate = useNavigate();
    const { setReaderChrome } = useReaderChrome();

    const [bookmarkManagerOpen, setBookmarkManagerOpen] = useState(false);
    // moveBookmarkTarget tracks which verse is the destination for a move
    const [moveBookmarkTarget, setMoveBookmarkTarget] = useState<{
      bookId: string;
      chapter: number;
      verse: string;
    } | null>(null);
    const [addToListTarget, setAddToListTarget] = useState<{
      verseId: string;
      label: string;
    } | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        navigateToVerse: screen.navigateToVerse,
      }),
      [screen.navigateToVerse],
    );

    useEffect(() => {
      if (!screen.currentChapter) {
        setReaderChrome(null);
        return;
      }
      setReaderChrome({
        bookmarkCount: screen.bookmarks.length,
        openBookmarks: () => setBookmarkManagerOpen(true),
      });
      return () => setReaderChrome(null);
    }, [screen.currentChapter, screen.bookmarks.length, setReaderChrome]);

    if (screen.error) {
      return (
        <div className="text-foreground">
          <div className="text-center">
            <p className="text-destructive mb-4">{screen.error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      );
    }

    const loadedChapterCount = screen.currentBookData?.chapters?.length ?? 0;

    const focusedVerseNumber =
      screen.selectedVerse &&
      screen.selectedVerse.bookId === screen.loadedBook &&
      screen.selectedVerse.chapter === screen.loadedChapter
        ? screen.selectedVerse.verse
        : null;

    return (
      <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden p-2">
        <BibleReaderControls
          books={screen.books}
          selectedBook={screen.selectedBook}
          selectedChapter={screen.selectedChapter}
          selectedBookChapters={screen.selectedBookChapters}
          activeTranslationId={screen.activeTranslationId}
          onTranslationChange={onTranslationChange}
          onBookChange={screen.handleBookChange}
          onChapterChange={screen.handleChapterChange}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-foreground">
          {screen.currentChapter && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-foreground">
              <BibleReaderChapterBar
                bookTitle={screen.currentBookData?.book ?? ""}
                loadedChapter={screen.loadedChapter}
                loadedChapterCount={loadedChapterCount}
                onNavigateChapter={screen.navigateChapter}
              />
              <BibleReaderVersesList
                verseStyle={screen.verseStyle}
                verses={screen.verses}
                loadedBook={screen.loadedBook}
                loadedChapter={screen.loadedChapter}
                activeTranslationId={screen.activeTranslationId}
                savedVerseKeys={screen.savedVerses}
                savedRecords={screen.savedRecords}
                onOpenSavedPassage={(id) =>
                  navigate(`/saved?passage=${encodeURIComponent(id)}`)
                }
                bookmarksByVerse={screen.bookmarksByVerse}
                focusedVerseNumber={focusedVerseNumber}
                verseScrollNonce={screen.verseScrollNonce}
                chapterScrollToTopNonce={screen.chapterScrollToTopNonce}
                hasAnyBookmarks={screen.bookmarks.length > 0}
                onSaveVerse={screen.handleSaveVerse}
                onSavePassage={screen.handleSavePassage}
                onUnsaveVerse={screen.handleUnsaveVerse}
                onAddBookmark={(bookId, chapter, verse) =>
                  screen.handleAddBookmark(bookId, chapter, verse)
                }
                onRemoveBookmark={(id) => screen.handleDeleteBookmark(id)}
                onMoveBookmark={(bookId, chapter, verse) =>
                  setMoveBookmarkTarget({ bookId, chapter, verse })
                }
                onAddToList={async (bookId, chapter, verse, verseText) => {
                  const verseId = await screen.handleAddVerseToList(
                    bookId,
                    chapter,
                    verse,
                    verseText,
                  );
                  if (verseId) {
                    setAddToListTarget({
                      verseId,
                      label: `${getBookDisplayTitle(bookId)} ${chapter}:${verse}`,
                    });
                  }
                }}
              />
            </div>
          )}
        </div>

        <BookmarkManagerDialog
          open={bookmarkManagerOpen}
          onOpenChange={setBookmarkManagerOpen}
          bookmarks={screen.bookmarks}
          onJump={(bookId, chapter, verse) => {
            setBookmarkManagerOpen(false);
            screen.navigateToVerse(bookId, chapter, verse);
          }}
          onDelete={(id) => screen.handleDeleteBookmark(id)}
          onRename={(id, name) => screen.handleRenameBookmark(id, name)}
          onRecolor={(id, hex) => screen.handleRecolorBookmark(id, hex)}
        />

        <AddVerseToListDialog
          open={addToListTarget !== null}
          onOpenChange={(open) => {
            if (!open) setAddToListTarget(null);
          }}
          verseId={addToListTarget?.verseId ?? null}
          verseLabel={addToListTarget?.label ?? ""}
        />

        {moveBookmarkTarget && (
          <MoveBookmarkDialog
            open={!!moveBookmarkTarget}
            onOpenChange={(o) => {
              if (!o) setMoveBookmarkTarget(null);
            }}
            bookmarks={screen.bookmarks}
            targetBookId={moveBookmarkTarget.bookId}
            targetChapter={moveBookmarkTarget.chapter}
            targetVerse={moveBookmarkTarget.verse}
            onMove={(bookmarkId) => {
              screen.handleMoveBookmarkTo(
                bookmarkId,
                moveBookmarkTarget.bookId,
                moveBookmarkTarget.chapter,
                moveBookmarkTarget.verse,
              );
              setMoveBookmarkTarget(null);
            }}
          />
        )}
      </div>
    );
  },
);

BibleReader.displayName = "BibleReader";
