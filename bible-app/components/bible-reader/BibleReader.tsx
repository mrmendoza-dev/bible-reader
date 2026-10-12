"use client";

import { useBibleReaderScreen } from "@apps/production/bible-app/hooks/useBibleReaderScreen";
import type {
  BibleReaderProps,
  BibleReaderRef,
} from "@apps/production/bible-app/types/bible-reader";
import { Button } from "@omni/ui-base/button";
import { forwardRef, useImperativeHandle, useState } from "react";
import { getBookDisplayTitle } from "@apps/production/bible-app/constants";
import { AddVerseToListDialog } from "../AddVerseToListDialog";
import { BibleNoteDialog } from "../BibleNoteDialog";
import { BibleSettings } from "../BibleSettings";
import { BookmarkManagerDialog } from "../BookmarkManagerDialog";
import { MoveBookmarkDialog } from "../MoveBookmarkDialog";
import { BibleReaderChapterBar } from "./BibleReaderChapterBar";
import { BibleReaderControls } from "./BibleReaderControls";
import { BibleReaderVersesList } from "./BibleReaderVersesList";

export const BibleReader = forwardRef<BibleReaderRef, BibleReaderProps>(
  (
    {
      translationId,
      onTranslationChange,
      onSearchClick,
      onSavedVersesClick,
      onAddNoteClick,
    },
    ref,
  ) => {
    const screen = useBibleReaderScreen({ translationId });

    const [highlightText, setHighlightText] = useState("");
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
          loading={screen.loading}
          activeTranslationId={screen.activeTranslationId}
          onTranslationChange={onTranslationChange}
          onBookChange={screen.handleBookChange}
          onChapterChange={screen.handleChapterChange}
          onLoadChapter={screen.handleLoadChapter}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-foreground">
          {screen.currentChapter && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-foreground">
              <BibleReaderChapterBar
                bookTitle={screen.currentBookData?.book ?? ""}
                loadedChapter={screen.loadedChapter}
                bookmarkCount={screen.bookmarks.length}
                loadedChapterCount={loadedChapterCount}
                highlightText={highlightText}
                onHighlightTextChange={setHighlightText}
                onAddNoteClick={onAddNoteClick}
                onSearchClick={onSearchClick}
                onSavedVersesClick={onSavedVersesClick}
                onOpenBookmarks={() => setBookmarkManagerOpen(true)}
                onOpenSettings={() => screen.setSettingsOpen(true)}
                onNavigateChapter={screen.navigateChapter}
              />
              <BibleReaderVersesList
                verseStyle={screen.verseStyle}
                verses={screen.verses}
                loadedBook={screen.loadedBook}
                loadedChapter={screen.loadedChapter}
                activeTranslationId={screen.activeTranslationId}
                savedVerseKeys={screen.savedVerses}
                bookmarksByVerse={screen.bookmarksByVerse}
                focusedVerseNumber={focusedVerseNumber}
                verseScrollNonce={screen.verseScrollNonce}
                highlightText={highlightText}
                hasAnyBookmarks={screen.bookmarks.length > 0}
                onSaveVerse={screen.handleSaveVerse}
                onUnsaveVerse={screen.handleUnsaveVerse}
                onVerseAddNote={screen.handleVerseAddNote}
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

        <BibleNoteDialog
          open={screen.noteDialogOpen}
          onClose={() => screen.setNoteDialogOpen(false)}
          onSave={() => {}}
          verseContext={
            screen.selectedVerse && screen.currentChapter
              ? {
                  bookId: screen.selectedVerse.bookId,
                  chapter: screen.selectedVerse.chapter,
                  verse: screen.selectedVerse.verse,
                  verseText:
                    screen.currentChapter.verses.find(
                      (v) => v.verse === screen.selectedVerse?.verse,
                    )?.text || "",
                }
              : undefined
          }
        />

        <BibleSettings
          open={screen.settingsOpen}
          onOpenChange={screen.setSettingsOpen}
          onSave={screen.handleSettingsSave}
        />

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
