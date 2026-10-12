import { getBookDisplayTitle } from "@apps/production/bible-app/constants";
import type { BibleBookmark } from "@apps/production/bible-app/services/bible-bookmarks-service";
import { sendToAssistant } from "@omni/os-shell/components/assistant/assistant-inbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@omni/ui-base/alert-dialog";
import { Button } from "@omni/ui-base/button";
import { Popover, PopoverContent, PopoverTrigger } from "@omni/ui-base/popover";
import {
  Bookmark,
  BookmarkCheck,
  BookmarkMinus,
  BookOpen,
  Copy,
  ListPlus,
  MapPin,
  Sparkles,
  StickyNote,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface VerseActionPopoverProps {
  children: React.ReactNode;
  verse: {
    verse: string;
    text: string;
  };
  bookId: string;
  chapter: number;
  isSaved: boolean;
  onSave: () => void;
  onUnsave: () => void;
  onAddNote: () => void;
  onGoToChapter?: () => void;
  /** Bookmark currently placed on this exact verse (null if none). */
  bookmarkOnVerse: BibleBookmark | null;
  /** Whether the user has any bookmarks at all (drives "Move Bookmark" visibility). */
  hasAnyBookmarks: boolean;
  onAddBookmark: () => void;
  onRemoveBookmark: () => void;
  onMoveBookmark: () => void;
  onAddToList?: () => void;
  /** Saved-verses view: confirm before fully deleting the saved row. */
  confirmBeforeUnsave?: boolean;
}

export const VerseActionPopover: React.FC<VerseActionPopoverProps> = ({
  children,
  verse,
  bookId,
  chapter,
  isSaved,
  onSave,
  onUnsave,
  onAddNote,
  onGoToChapter,
  bookmarkOnVerse,
  hasAnyBookmarks,
  onAddBookmark,
  onRemoveBookmark,
  onMoveBookmark,
  onAddToList,
  confirmBeforeUnsave = false,
}) => {
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const verseReference = `${getBookDisplayTitle(bookId)} ${chapter}:${verse.verse}`;

  const handleSaveToggle = () => {
    if (isSaved) {
      if (confirmBeforeUnsave) {
        setOpen(false);
        setDeleteDialogOpen(true);
        return;
      }
      onUnsave();
    } else {
      onSave();
    }
    setOpen(false);
  };

  const handleConfirmDelete = () => {
    onUnsave();
    setDeleteDialogOpen(false);
  };

  const handleAddNote = () => {
    onAddNote();
    setOpen(false);
  };

  const handleGoToChapter = () => {
    if (onGoToChapter) onGoToChapter();
    setOpen(false);
  };

  const verseCopyText = `${getBookDisplayTitle(bookId)} ${chapter}:${
    verse.verse
  } ${verse.text.replace(/\s+/g, " ").trim()}`;

  const handleCopyVerse = async () => {
    try {
      await navigator.clipboard.writeText(verseCopyText);
      toast.success("Verse copied to clipboard.");
      setOpen(false);
    } catch {
      toast.error("Could not copy verse.");
    }
  };

  const handleExplain = () => {
    sendToAssistant(
      `Explain ${getBookDisplayTitle(bookId)} ${chapter}:${verse.verse} — "${verse.text
        .replace(/\s+/g, " ")
        .trim()}". Give the historical and theological context and what it means, in a few short paragraphs.`,
      { send: true },
    );
    setOpen(false);
  };

  return (
    <>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <div className="space-y-2">
          <div className="text-sm font-medium">
            {getBookDisplayTitle(bookId)} {chapter}:{verse.verse}
          </div>
          <div className="text-xs text-muted-foreground">
            {verse.text}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              variant={isSaved && !confirmBeforeUnsave ? "default" : "outline"}
              size="sm"
              onClick={handleSaveToggle}
              className={
                isSaved && confirmBeforeUnsave
                  ? "justify-start text-destructive border-destructive/40 hover:bg-destructive/10"
                  : "justify-start"
              }
            >
              {isSaved ? (
                confirmBeforeUnsave ? (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete saved verse
                  </>
                ) : (
                  <>
                    <BookmarkCheck className="h-4 w-4 mr-2" />
                    Unsave Verse
                  </>
                )
              ) : (
                <>
                  <Bookmark className="h-4 w-4 mr-2" />
                  Save Verse
                </>
              )}
            </Button>

            {onAddToList && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onAddToList();
                  setOpen(false);
                }}
                className="justify-start"
              >
                <ListPlus className="h-4 w-4 mr-2" />
                Add to List
              </Button>
            )}

            {bookmarkOnVerse ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onRemoveBookmark();
                  setOpen(false);
                }}
                className="justify-start text-destructive border-destructive/40 hover:bg-destructive/10"
              >
                <BookmarkMinus className="h-4 w-4 mr-2" />
                Remove Bookmark
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onAddBookmark();
                    setOpen(false);
                  }}
                  className="justify-start"
                >
                  <Bookmark className="h-4 w-4 mr-2" />
                  Add Bookmark
                </Button>
                {hasAnyBookmarks && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onMoveBookmark();
                      setOpen(false);
                    }}
                    className="justify-start"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Move Bookmark Here
                  </Button>
                )}
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddNote}
              className="justify-start"
            >
              <StickyNote className="h-4 w-4 mr-2" />
              Add Note
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleCopyVerse()}
              className="justify-start"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Verse
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExplain}
              className="justify-start"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Explain Verse
            </Button>

            {onGoToChapter && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoToChapter}
                className="justify-start"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Go to Chapter
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete saved verse?</AlertDialogTitle>
          <AlertDialogDescription>
            {verseReference} will be removed from every list. Use Add to List
            if you only want to move it between lists.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirmDelete}>
            Delete verse
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};
