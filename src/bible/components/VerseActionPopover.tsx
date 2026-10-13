import {
  Bookmark,
  BookmarkCheck,
  BookmarkMinus,
  BookOpen,
  Copy,
  ListPlus,
  MapPin,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getBookDisplayTitle } from "@/bible/constants";
import type { BibleBookmark } from "@/bible/services/bible-bookmarks-service";
import type { PassageDisplayRow } from "@/bible/utils/passage-display";
import type { PassageReference } from "@/bible/utils/passage-reference";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PassageText } from "./PassageText";
import { SavePassageForm } from "./SavePassageForm";

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
  onSaveRange?: (end: PassageReference) => Promise<void>;
  referenceLabel?: string;
  passageRows?: PassageDisplayRow[];
  includedPassages?: { id: string; label: string }[];
  onOpenSavedPassage?: (id: string) => void;
  rangeTranslationId?: string;
  onUnsave: () => void;
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
  onSaveRange,
  referenceLabel,
  passageRows,
  includedPassages = [],
  onOpenSavedPassage,
  rangeTranslationId,
  onUnsave,
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
  const [rangeOpen, setRangeOpen] = useState(false);

  const verseReference =
    referenceLabel ??
    `${getBookDisplayTitle(bookId)} ${chapter}:${verse.verse}`;

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

  const handleGoToChapter = () => {
    if (onGoToChapter) onGoToChapter();
    setOpen(false);
  };

  const verseCopyText = `${verseReference} ${referenceLabel ? verse.text.trim() : verse.text.replace(/\s+/g, " ").trim()}`;

  const handleCopyVerse = async () => {
    try {
      await navigator.clipboard.writeText(verseCopyText);
      toast.success(
        referenceLabel
          ? "Passage copied to clipboard."
          : "Verse copied to clipboard.",
      );
      setOpen(false);
    } catch {
      toast.error("Could not copy verse.");
    }
  };

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          setRangeOpen(false);
        }}
      >
        <PopoverTrigger className="flex-1 text-left">{children}</PopoverTrigger>
        <PopoverContent
          className="w-72 max-h-(--available-height) overflow-y-auto overscroll-contain"
          align="start"
        >
          <div className="space-y-2">
            <div className="text-sm font-medium">{verseReference}</div>
            <div className="max-h-40 overflow-y-auto whitespace-pre-line text-xs text-muted-foreground">
              {passageRows ? <PassageText rows={passageRows} /> : verse.text}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {includedPassages.length > 0 && onOpenSavedPassage && (
                <div className="space-y-1 border-b pb-2">
                  <p className="text-xs text-muted-foreground">
                    Included in saved passages
                  </p>
                  {includedPassages.map((passage) => (
                    <Button
                      key={passage.id}
                      variant="ghost"
                      size="sm"
                      className="h-auto w-full justify-start whitespace-normal py-2 text-left"
                      onClick={() => {
                        onOpenSavedPassage(passage.id);
                        setOpen(false);
                      }}
                    >
                      <BookOpen className="mr-2 h-4 w-4 shrink-0" />
                      {passage.label}
                    </Button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant={
                    isSaved && !confirmBeforeUnsave ? "default" : "outline"
                  }
                  size="sm"
                  onClick={handleSaveToggle}
                  className={
                    isSaved && confirmBeforeUnsave
                      ? "flex-1 justify-start text-destructive border-destructive/40 hover:bg-destructive/10"
                      : "flex-1 justify-start"
                  }
                >
                  {isSaved ? (
                    confirmBeforeUnsave ? (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        {referenceLabel
                          ? "Delete saved passage"
                          : "Delete saved verse"}
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
                {onSaveRange && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-expanded={rangeOpen}
                    onClick={() => setRangeOpen((previous) => !previous)}
                  >
                    Range
                  </Button>
                )}
              </div>
              {rangeOpen && onSaveRange && (
                <SavePassageForm
                  bookId={bookId}
                  chapter={chapter}
                  verse={verse.verse}
                  translationId={rangeTranslationId}
                  onSave={async (end) => {
                    await onSaveRange(end);
                    setOpen(false);
                    setRangeOpen(false);
                  }}
                />
              )}

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
                onClick={() => void handleCopyVerse()}
                className="justify-start"
              >
                <Copy className="h-4 w-4 mr-2" />
                {referenceLabel ? "Copy Passage" : "Copy Verse"}
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
            <AlertDialogTitle>
              {referenceLabel ? "Delete saved passage?" : "Delete saved verse?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {verseReference} will be removed from every list. Use Add to List
              if you only want to move it between lists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              {referenceLabel ? "Delete passage" : "Delete verse"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
