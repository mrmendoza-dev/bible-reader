import { Button } from "@omni/ui-base/button";
import { Input } from "@omni/ui-base/input";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  StickyNote,
} from "lucide-react";

type BibleReaderChapterBarProps = {
  bookTitle: string;
  loadedChapter: number;
  bookmarkCount: number;
  loadedChapterCount: number;
  highlightText: string;
  onHighlightTextChange: (text: string) => void;
  onAddNoteClick?: () => void;
  onSearchClick?: () => void;
  onSavedVersesClick?: () => void;
  onOpenBookmarks: () => void;
  onOpenSettings: () => void;
  onNavigateChapter: (direction: "prev" | "next") => void;
};

export const BibleReaderChapterBar = ({
  bookTitle,
  loadedChapter,
  bookmarkCount,
  loadedChapterCount,
  highlightText,
  onHighlightTextChange,
  onAddNoteClick,
  onSearchClick,
  onSavedVersesClick,
  onOpenBookmarks,
  onOpenSettings,
  onNavigateChapter,
}: BibleReaderChapterBarProps) => {
  return (
    <div className="shrink-0 border-b p-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold whitespace-nowrap">
          {bookTitle} - Chapter {loadedChapter}
        </h3>
        <div className="flex items-center gap-2">
          {onAddNoteClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddNoteClick}
              className="whitespace-nowrap flex items-center gap-2"
            >
              <StickyNote className="h-4 w-4" />
              <span className="hidden md:block">Note</span>
            </Button>
          )}
          {onSearchClick && (
            <>
              <Input
                value={highlightText}
                onChange={(e) => onHighlightTextChange(e.target.value)}
                placeholder="Highlight..."
                className="h-7 w-28 text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={onSearchClick}
                className="whitespace-nowrap flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                <span className="hidden md:block">Search</span>
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenBookmarks}
            className="whitespace-nowrap flex items-center gap-2 relative"
          >
            <Bookmark className="h-4 w-4" />
            <span className="hidden md:block">Bookmarks</span>
            {bookmarkCount > 0 && (
              <span className="ml-0.5 text-xs font-semibold tabular-nums">
                {bookmarkCount}
              </span>
            )}
          </Button>
          {onSavedVersesClick && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSavedVersesClick}
              className="whitespace-nowrap flex items-center gap-2"
            >
              <Bookmark className="h-4 w-4" />
              <span className="hidden md:block">Saved</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSettings}
            className="whitespace-nowrap flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden md:block">Settings</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateChapter("prev")}
            disabled={loadedChapter <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateChapter("next")}
            disabled={
              !loadedChapterCount || loadedChapter >= loadedChapterCount
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
