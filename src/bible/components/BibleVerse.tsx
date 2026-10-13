import { type FontSize, useBibleContext } from "@/bible/contexts/BibleContext";
import { getReadingFontFamily } from "@/bible/reading-fonts";
import type { BibleBookmark } from "@/bible/services/bible-bookmarks-service";
import type { PassageDisplayRow } from "@/bible/utils/passage-display";
import type { PassageReference } from "@/bible/utils/passage-reference";
import { PassageText } from "./PassageText";
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
  onSaveRange?: (end: PassageReference) => Promise<void>;
  referenceLabel?: string;
  passageRows?: PassageDisplayRow[];
  includedPassages?: { id: string; label: string }[];
  onOpenSavedPassage?: (id: string) => void;
  savedConnection?: { before: boolean; after: boolean };
  rangeTranslationId?: string;
  onUnsave?: () => void;
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
  onSaveRange,
  referenceLabel,
  passageRows,
  includedPassages = [],
  onOpenSavedPassage,
  savedConnection,
  rangeTranslationId,
  onUnsave,
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
    onSave || onUnsave || onAddBookmark || onGoToChapter || onAddToList;

  const fontFamilyStyle = { fontFamily: getReadingFontFamily(fontStyle) };

  const fontSizeOptions: Record<FontSize, string> = {
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
  };
  const fontSizeStyle = { fontSize: fontSizeOptions[fontSize] };
  const verseTextStyle = { ...fontFamilyStyle, ...fontSizeStyle };
  const hasSavedHighlight = isSaved || includedPassages.length > 0;

  // Build dynamic bookmark highlight styles
  const bookmarkStyle = bookmarkOnVerse
    ? {
        borderLeftColor: bookmarkOnVerse.color_hex,
        backgroundColor: `${bookmarkOnVerse.color_hex}1A`,
      }
    : undefined;

  const verseText = (
    <span className="leading-relaxed min-w-0 flex-1" style={verseTextStyle}>
      {referenceLabel && (
        <span className="mb-1 block font-sans text-xs font-medium text-muted-foreground">
          {referenceLabel}
        </span>
      )}
      {passageRows ? (
        <PassageText rows={passageRows} />
      ) : (
        <span className={referenceLabel ? "whitespace-pre-line" : undefined}>
          {highlightedText || text}
        </span>
      )}
    </span>
  );

  const verseContent = (
    <div
      id={`bible-verse-${bookId}-${chapter}-${verse}`}
      data-bible-verse-row
      data-saved-highlight={hasSavedHighlight || undefined}
      className={`flex ${referenceLabel ? "flex-col" : ""} gap-2 p-2 rounded-md transition-colors text-left ${
        hasPopoverActions ? "cursor-pointer hover:bg-muted/50" : ""
      } ${isFocused ? "ring-2 ring-ring/70 bg-muted/50 shadow-sm" : ""} ${
        hasSavedHighlight
          ? "bg-golden/10 border-l-2 border-golden"
          : bookmarkOnVerse
            ? "border-l-2"
            : ""
      } ${savedConnection?.before ? "rounded-t-none" : ""} ${savedConnection?.after ? "rounded-b-none" : ""}`}
      style={bookmarkOnVerse && !hasSavedHighlight ? bookmarkStyle : undefined}
    >
      {!referenceLabel && (
        <span
          className={`font-bold text-muted-foreground min-w-[1rem] ${
            onClick ? "hover:underline cursor-pointer" : ""
          }`}
          style={verseTextStyle}
        >
          {onClick ? (
            <button
              type="button"
              aria-label={`Go to verse ${verse}`}
              onClick={(event) => {
                event.stopPropagation();
                onClick();
              }}
            >
              {verse}.
            </button>
          ) : (
            `${verse}.`
          )}
        </span>
      )}
      {hasPopoverActions ? (
        <VerseActionPopover
          verse={{ verse, text }}
          bookId={bookId}
          chapter={chapter}
          isSaved={isSaved}
          onSave={onSave || (() => {})}
          onSaveRange={onSaveRange}
          referenceLabel={referenceLabel}
          passageRows={passageRows}
          includedPassages={includedPassages}
          onOpenSavedPassage={onOpenSavedPassage}
          rangeTranslationId={rangeTranslationId}
          onUnsave={onUnsave || (() => {})}
          onGoToChapter={onGoToChapter}
          bookmarkOnVerse={bookmarkOnVerse}
          hasAnyBookmarks={hasAnyBookmarks}
          onAddBookmark={onAddBookmark || (() => {})}
          onRemoveBookmark={onRemoveBookmark || (() => {})}
          onMoveBookmark={onMoveBookmark || (() => {})}
          onAddToList={onAddToList}
          confirmBeforeUnsave={confirmBeforeUnsave}
        >
          {verseText}
        </VerseActionPopover>
      ) : (
        verseText
      )}
      <div
        className={`flex items-center gap-2 ${referenceLabel ? "justify-end" : ""}`}
      >
        {badge}
        {isSaved && <span className="text-golden text-xs">✓</span>}
      </div>
    </div>
  );

  return verseContent;
};
