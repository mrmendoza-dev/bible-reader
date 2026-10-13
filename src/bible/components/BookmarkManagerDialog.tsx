import { BookmarkX, MapPin, Pencil } from "lucide-react";
import { useState } from "react";
import { BOOKMARK_COLORS, getBookDisplayTitle } from "@/bible/constants";
import type { BibleBookmark } from "@/bible/services/bible-bookmarks-service";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BookmarkManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookmarks: BibleBookmark[];
  onJump: (bookId: string, chapter: number, verse: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string | null) => void;
  onRecolor: (id: string, colorHex: string) => void;
}

const getDefaultLabel = (bm: BibleBookmark): string =>
  `${getBookDisplayTitle(bm.book_id)} ${bm.chapter}${
    bm.verse ? `:${bm.verse}` : ""
  }`;

export const BookmarkManagerDialog = ({
  open,
  onOpenChange,
  bookmarks,
  onJump,
  onDelete,
  onRename,
  onRecolor,
}: BookmarkManagerDialogProps) => {
  // Track which bookmark row is in rename-edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (bm: BibleBookmark) => {
    setEditingId(bm.id);
    setEditValue(bm.name ?? "");
  };

  const commitEdit = (id: string) => {
    const trimmed = editValue.trim();
    onRename(id, trimmed || null);
    setEditingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bookmarks</DialogTitle>
        </DialogHeader>

        {bookmarks.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No bookmarks yet. Open a verse and press{" "}
            <strong>Add Bookmark</strong> to get started.
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-1">
            <div className="flex flex-col gap-2">
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="flex items-center gap-2 rounded-md border p-2"
                  style={{ borderLeftColor: bm.color_hex, borderLeftWidth: 3 }}
                >
                  {/* Color swatch → recolor popover */}
                  <Popover>
                    <PopoverTrigger>
                      <span
                        className="h-5 w-5 shrink-0 rounded-full border border-border focus:outline-none focus-visible:ring-2 inline-block cursor-pointer"
                        style={{ backgroundColor: bm.color_hex }}
                        title="Change color"
                      />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                      <div className="flex gap-1.5 flex-wrap max-w-[9rem]">
                        {BOOKMARK_COLORS.map((c) => (
                          <button
                            type="button"
                            key={c.id}
                            title={c.label}
                            onClick={() => onRecolor(bm.id, c.hex)}
                            className="h-5 w-5 rounded-full border border-border transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2"
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Label / rename field */}
                  <div className="flex-1 min-w-0">
                    {editingId === bm.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          autoFocus
                          className="h-7 text-sm"
                          value={editValue}
                          placeholder={getDefaultLabel(bm)}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(bm.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                        <Button
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => commitEdit(bm.id)}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {bm.name ?? getDefaultLabel(bm)}
                        </span>
                        {bm.name && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {getDefaultLabel(bm)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Rename"
                      className="h-7 w-7 p-0"
                      onClick={() => startEdit(bm)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Jump to verse"
                      className="h-7 w-7 p-0"
                      onClick={() =>
                        onJump(bm.book_id, bm.chapter, bm.verse ?? "1")
                      }
                    >
                      <MapPin className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Delete bookmark"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => onDelete(bm.id)}
                    >
                      <BookmarkX className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
