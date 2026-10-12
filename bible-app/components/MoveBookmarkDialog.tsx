import { getBookDisplayTitle } from "@apps/production/bible-app/constants";
import type { BibleBookmark } from "@apps/production/bible-app/services/bible-bookmarks-service";
import { Button } from "@omni/ui-base/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@omni/ui-base/dialog";
import { ScrollArea } from "@omni/ui-base/scroll-area";
import { ArrowRight } from "lucide-react";

interface MoveBookmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmarks: BibleBookmark[];
  /** The destination verse — the bookmark will be moved here. */
  targetBookId: string;
  targetChapter: number;
  targetVerse: string;
  onMove: (bookmarkId: string) => void;
}

const getLabel = (bm: BibleBookmark): string =>
  bm.name ??
  `${getBookDisplayTitle(bm.book_id)} ${bm.chapter}${
    bm.verse ? `:${bm.verse}` : ""
  }`;

export const MoveBookmarkDialog = ({
  open,
  onOpenChange,
  bookmarks,
  targetBookId,
  targetChapter,
  targetVerse,
  onMove,
}: MoveBookmarkDialogProps) => {
  const targetLabel = `${getBookDisplayTitle(
    targetBookId,
  )} ${targetChapter}:${targetVerse}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Move Bookmark</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Select which bookmark to move to{" "}
          <span className="font-medium text-foreground">{targetLabel}</span>.
        </p>

        {bookmarks.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No bookmarks to move.
          </div>
        ) : (
          <ScrollArea className="max-h-[50vh] pr-1">
            <div className="flex flex-col gap-1.5">
              {bookmarks.map((bm) => (
                <button
                  key={bm.id}
                  onClick={() => {
                    onMove(bm.id);
                    onOpenChange(false);
                  }}
                  className="flex items-center gap-2 rounded-md border p-2.5 text-left hover:bg-muted/50 transition-colors"
                  style={{ borderLeftColor: bm.color_hex, borderLeftWidth: 3 }}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: bm.color_hex }}
                  />
                  <span className="flex-1 text-sm font-medium truncate">
                    {getLabel(bm)}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground shrink-0">
                    {targetLabel}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
};
