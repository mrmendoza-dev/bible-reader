"use client";

import { AddVerseToListDialog } from "@apps/production/bible-app/components/AddVerseToListDialog";
import { ListManagerDialog } from "@apps/production/bible-app/components/ListManagerDialog";
import { getBookDisplayTitle } from "@apps/production/bible-app/constants";
import { useSavedVersesScreen } from "@apps/production/bible-app/hooks/useSavedVersesScreen";
import type { SavedVerse } from "@apps/production/bible-app/services/bible-verses-service";
import { savedVersesTranslationSelectLabel } from "@apps/production/bible-app/utils/saved-verses/saved-verses-utils";
import { Button } from "@omni/ui-base/button";
import { selectValueHandler } from "@omni/ui-base/lib/value-change-adapters";
import { ScrollArea } from "@omni/ui-base/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@omni/ui-base/select";
import { Spinner } from "@omni/ui-base/spinner";
import { ArrowLeft, BookOpen, ChevronLeft, List } from "lucide-react";
import { useCallback, useState, type FC } from "react";
import { BibleNoteDialog } from "../BibleNoteDialog";
import { SavedVersesTestamentNav } from "./SavedVersesSidebarNav";
import { SavedVersesTestamentScroll } from "./SavedVersesTestamentScroll";
import type { SavedVersesProps } from "./types";

export const SavedVerses: FC<SavedVersesProps> = ({ onBackToReader }) => {
  const {
    error,
    initialLoading,
    refreshing,
    savedVerses,
    filteredVerses,
    availableTranslations,
    selectedTranslation,
    setSelectedTranslation,
    selectedListId,
    setSelectedListId,
    lists,
    listManagerOpen,
    setListManagerOpen,
    reloadSavedData,
    groupedVerses,
    sortedOldTestamentBooks,
    sortedNewTestamentBooks,
    allOutlineBookIds,
    openSidebarBookIds,
    handleSidebarBookOpenChange,
    expandAllSidebarBooks,
    collapseAllSidebarBooks,
    verseStyle,
    savedVerseKeys,
    activeVerseId,
    jumpToSavedVerse,
    noteDialogOpen,
    setNoteDialogOpen,
    selectedVerse,
    unsaveSavedVerseRow,
    openNoteForVerse,
    handleBackToReader,
  } = useSavedVersesScreen({ onBackToReader });

  const [addToListTarget, setAddToListTarget] = useState<{
    verseId: string;
    label: string;
  } | null>(null);

  const openAddToListForVerse = useCallback((verse: SavedVerse) => {
    setAddToListTarget({
      verseId: verse.id,
      label: `${getBookDisplayTitle(verse.book_id)} ${verse.chapter}:${verse.verse}`,
    });
  }, []);

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Spinner className="h-8 w-8 text-primary mb-2" />
        <p className="text-muted-foreground">Loading saved verses...</p>
      </div>
    );
  }

  const selectedListName =
    selectedListId === "all"
      ? null
      : lists.find((l) => l.id === selectedListId)?.name ?? "This list";

  const emptyMessage =
    selectedListId !== "all"
      ? `No verses in "${selectedListName}" yet. Save verses from the reader and add them to this list.`
      : selectedTranslation !== "all"
        ? "No verses match this translation filter."
        : "You haven't saved any verses yet. Start reading the Bible and save your favorite verses to see them here.";

  const showGlobalEmptyCta =
    selectedListId === "all" && selectedTranslation === "all";

  return (
    <div className="h-full flex flex-col gap-2 p-2">
      <div className="shrink-0 flex flex-wrap items-center justify-between px-2 pb-2 border-b gap-3">
        <div className="flex-1 min-w-[12rem]">
          <h2 className="text-2xl font-bold">Saved Verses</h2>
          <p className="text-sm text-muted-foreground">
            {filteredVerses.length}{" "}
            {filteredVerses.length === 1 ? "verse" : "verses"}{" "}
            {selectedTranslation !== "all" || selectedListId !== "all"
              ? "filtered"
              : "saved"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium whitespace-nowrap">List:</label>
            <Select
              value={selectedListId}
              onValueChange={selectValueHandler(setSelectedListId)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue>
                  {selectedListId === "all"
                    ? "All lists"
                    : lists.find((l) => l.id === selectedListId)?.name ??
                      "List"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All lists</SelectItem>
                {lists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availableTranslations.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium whitespace-nowrap">
                Translation:
              </label>
              <Select
                value={selectedTranslation}
                onValueChange={selectValueHandler(setSelectedTranslation)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue>
                    {savedVersesTranslationSelectLabel(selectedTranslation)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Translations</SelectItem>
                  {availableTranslations.map((translationId) => (
                    <SelectItem key={translationId} value={translationId}>
                      {savedVersesTranslationSelectLabel(translationId)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => setListManagerOpen(true)}
          >
            <List className="h-4 w-4 mr-2" />
            Manage Lists
          </Button>

          <Button onClick={handleBackToReader} variant="outline">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Reader
          </Button>
        </div>
      </div>

      {refreshing ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-4">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">Updating verses…</p>
        </div>
      ) : filteredVerses.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-4">
          <BookOpen className="h-16 w-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">
            {selectedListId !== "all" ? "Empty List" : "No Saved Verses"}
          </h2>
          <p className="text-muted-foreground text-center max-w-md">
            {emptyMessage}
          </p>
          {showGlobalEmptyCta && (
            <Button onClick={handleBackToReader} className="mt-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Bible Reader
            </Button>
          )}
        </div>
      ) : (
      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden rounded-md border">
        <aside className="flex w-36 shrink-0 flex-col border-r bg-muted/20 sm:w-[13.5rem] md:w-56">
          <div className="shrink-0 border-b px-2 py-2">
            <p className="text-xs font-medium text-foreground">Browse</p>
            <p className="text-[10px] text-muted-foreground leading-snug sm:text-[11px]">
              Tap a ref to scroll there
            </p>
            {allOutlineBookIds.length > 0 && (
              <div className="mt-1.5 flex flex-row gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 min-w-0 flex-1 px-1 text-[10px] sm:text-xs"
                  onClick={expandAllSidebarBooks}
                >
                  Expand all
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 min-w-0 flex-1 px-1 text-[10px] sm:text-xs"
                  onClick={collapseAllSidebarBooks}
                >
                  Collapse all
                </Button>
              </div>
            )}
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 p-2">
              <SavedVersesTestamentNav
                title="Old Testament"
                sortedBookIds={sortedOldTestamentBooks}
                bookMap={groupedVerses.oldTestament}
                activeVerseId={activeVerseId}
                selectedTranslation={selectedTranslation}
                openBookIds={openSidebarBookIds}
                onBookOpenChange={handleSidebarBookOpenChange}
                onJump={jumpToSavedVerse}
              />
              <SavedVersesTestamentNav
                title="New Testament"
                sortedBookIds={sortedNewTestamentBooks}
                bookMap={groupedVerses.newTestament}
                activeVerseId={activeVerseId}
                selectedTranslation={selectedTranslation}
                openBookIds={openSidebarBookIds}
                onBookOpenChange={handleSidebarBookOpenChange}
                onJump={jumpToSavedVerse}
              />
            </div>
          </ScrollArea>
        </aside>
        <ScrollArea className="min-h-0 min-w-0 flex-1">
          <div className="p-2 space-y-6">
            <SavedVersesTestamentScroll
              sectionTitle="Old Testament"
              sortedBookIds={sortedOldTestamentBooks}
              bookMap={groupedVerses.oldTestament}
              activeVerseId={activeVerseId}
              verseStyle={verseStyle}
              savedVerseKeys={savedVerseKeys}
              onUnsaveVerse={unsaveSavedVerseRow}
              onAddNoteForVerse={openNoteForVerse}
              onAddToListForVerse={openAddToListForVerse}
            />
            <SavedVersesTestamentScroll
              sectionTitle="New Testament"
              sortedBookIds={sortedNewTestamentBooks}
              bookMap={groupedVerses.newTestament}
              activeVerseId={activeVerseId}
              verseStyle={verseStyle}
              savedVerseKeys={savedVerseKeys}
              onUnsaveVerse={unsaveSavedVerseRow}
              onAddNoteForVerse={openNoteForVerse}
              onAddToListForVerse={openAddToListForVerse}
            />
          </div>
        </ScrollArea>
      </div>
      )}

      <AddVerseToListDialog
        open={addToListTarget !== null}
        onOpenChange={(open) => {
          if (!open) setAddToListTarget(null);
        }}
        verseId={addToListTarget?.verseId ?? null}
        verseLabel={addToListTarget?.label ?? ""}
        onSaved={() => void reloadSavedData()}
      />

      <ListManagerDialog
        open={listManagerOpen}
        onOpenChange={setListManagerOpen}
        onListsChanged={() => void reloadSavedData()}
      />

      <BibleNoteDialog
        open={noteDialogOpen}
        onClose={() => setNoteDialogOpen(false)}
        onSave={() => {
          // Refresh saved verses if needed
        }}
        verseContext={
          selectedVerse
            ? {
                bookId: selectedVerse.bookId,
                chapter: selectedVerse.chapter,
                verse: selectedVerse.verse,
                verseText:
                  savedVerses.find(
                    (v) =>
                      v.book_id === selectedVerse.bookId &&
                      v.chapter === selectedVerse.chapter &&
                      v.verse === selectedVerse.verse,
                  )?.verse_text || "",
              }
            : undefined
        }
      />
    </div>
  );
};
