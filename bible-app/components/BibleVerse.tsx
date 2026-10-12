import {
  type FontSize,
  useBibleContext,
} from "@apps/production/bible-app/contexts/BibleContext";
import type { BibleBookmark } from "@apps/production/bible-app/services/bible-bookmarks-service";
import { VerseActionPopover } from "./VerseActionPopover";

interface BibleVerseProps {
  bookId: string;
  chapter: number;
  verse: string;
  text: string;
  isFocused?: boolean;
  isSaved?: boolean;
  /** Bookmark placed exactly on this verse (null/undefined if none). */
  bookmarkOnVerse?: BibleBookmark | null;
  /** Whether the user has any bookmarks (for "Move Bookmark" visibility). */
  hasAnyBookmarks?: boolean;
  onSave?: () => void;
  onUnsave?: () => void;
  onAddNote?: () => void;
  onAddBookmark?: () => void;
  onRemoveBookmark?: () => void;
  onMoveBookmark?: () => void;
  onAddToList?: () => void;
  confirmBeforeUnsave?: boolean;
  onGoToChapter?: () => void;
  onClick?: () => void;
  highlightedText?: React.ReactNode;
  badge?: React.ReactNode;
}

export const BibleVerse = ({
  verse,
  text,
  isFocused = false,
  isSaved = false,
  bookmarkOnVerse = null,
  hasAnyBookmarks = false,
  onSave,
  onUnsave,
  onAddNote,
  onAddBookmark,
  onRemoveBookmark,
  onMoveBookmark,
  onAddToList,
  confirmBeforeUnsave,
  onGoToChapter,
  onClick,
  highlightedText,
  badge,
  bookId,
  chapter,
}: BibleVerseProps) => {
  const { fontStyle, fontSize } = useBibleContext();
  const hasPopoverActions =
    onSave ||
    onUnsave ||
    onAddNote ||
    onAddBookmark ||
    onGoToChapter ||
    onAddToList;

  const fontFamilyStyle =
    fontStyle === "serif"
      ? { fontFamily: "Georgia, 'Times New Roman', serif" }
      : { fontFamily: "system-ui, -apple-system, sans-serif" };

  const fontSizeOptions: Record<FontSize, string> = {
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
  };
  const fontSizeStyle = { fontSize: fontSizeOptions[fontSize] };
  const verseTextStyle = { ...fontFamilyStyle, ...fontSizeStyle };

  // Build dynamic bookmark highlight styles
  const bookmarkStyle = bookmarkOnVerse
    ? {
        borderLeftColor: bookmarkOnVerse.color_hex,
        backgroundColor: `${bookmarkOnVerse.color_hex}1A`,
      }
    : undefined;

  const handleVerseNumberClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.stopPropagation();
      onClick();
    }
  };

  const verseContent = (
    <div
      id={`bible-verse-${bookId}-${chapter}-${verse}`}
      data-bible-verse-row
      className={`flex gap-2 p-2 rounded-md transition-colors text-left ${
        hasPopoverActions ? "cursor-pointer hover:bg-muted/50" : ""
      } ${isFocused ? "ring-2 ring-ring/70 bg-muted/50 shadow-sm" : ""} ${
        isSaved
          ? "bg-golden/10 border-l-2 border-golden"
          : bookmarkOnVerse
            ? "border-l-2"
            : ""
      }`}
      style={bookmarkOnVerse && !isSaved ? bookmarkStyle : undefined}
      onClick={!hasPopoverActions ? onClick : undefined}
    >
      <span
        className={`font-bold text-muted-foreground min-w-[1rem] ${
          onClick ? "hover:underline cursor-pointer" : ""
        }`}
        onClick={handleVerseNumberClick}
        style={verseTextStyle}
      >
        {verse}.
      </span>
      <span className="leading-relaxed flex-1" style={verseTextStyle}>
        {highlightedText || text}
      </span>
      <div className="flex items-center gap-2">
        {badge}
        {isSaved && <span className="text-golden text-xs">✓</span>}
      </div>
    </div>
  );

  if (!hasPopoverActions) {
    return verseContent;
  }

  return (
    <VerseActionPopover
      verse={{ verse, text }}
      bookId={bookId}
      chapter={chapter}
      isSaved={isSaved}
      onSave={onSave || (() => {})}
      onUnsave={onUnsave || (() => {})}
      onAddNote={onAddNote || (() => {})}
      onGoToChapter={onGoToChapter}
      bookmarkOnVerse={bookmarkOnVerse}
      hasAnyBookmarks={hasAnyBookmarks}
      onAddBookmark={onAddBookmark || (() => {})}
      onRemoveBookmark={onRemoveBookmark || (() => {})}
      onMoveBookmark={onMoveBookmark || (() => {})}
      onAddToList={onAddToList}
      confirmBeforeUnsave={confirmBeforeUnsave}
    >
      {verseContent}
    </VerseActionPopover>
  );
};
