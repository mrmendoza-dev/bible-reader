import { ChevronDown } from "lucide-react";
import type { SavedVerse } from "@/bible/services/bible-verses-service";
import {
  getTranslationLabel,
  normalizeTranslationId,
} from "@/bible/translations";
import { formatSavedPassage } from "@/bible/utils/passage-reference";
import { translationShortLabel } from "@/bible/utils/saved-verses/saved-verses-utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { TestamentBookMap } from "./types";

type SavedVersesBookNavProps = {
  bookId: string;
  bookTitle: string;
  chapters: Record<string, SavedVerse[]>;
  activeVerseId: string | null;
  selectedTranslation: string;
  open: boolean;
  onOpenChange: (bookId: string, nextOpen: boolean) => void;
  onJump: (verseId: string) => void;
};

const SavedVersesBookNav = ({
  bookId,
  bookTitle,
  chapters,
  activeVerseId,
  selectedTranslation,
  open,
  onOpenChange,
  onJump,
}: SavedVersesBookNavProps) => {
  const sortedChapters = Object.keys(chapters).sort(
    (a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10),
  );

  return (
    <Collapsible
      open={open}
      onOpenChange={(nextOpen) => onOpenChange(bookId, nextOpen)}
    >
      <CollapsibleTrigger className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-sm font-medium text-foreground hover:bg-muted/80">
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{bookTitle}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-1.5 flex flex-col gap-2 border-l border-border/60 py-1 pl-2">
          {sortedChapters.map((chapter) => (
            <div key={chapter}>
              <p className="mb-1 px-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Ch. {chapter}
              </p>
              <div className="flex flex-col items-start gap-1">
                {chapters[chapter].map((verse) => {
                  const translation = normalizeTranslationId(verse.translation);
                  const refLabel = verse.end
                    ? formatSavedPassage(verse)
                    : `${verse.chapter}:${verse.verse}`;
                  const title = `${formatSavedPassage(verse)}${
                    selectedTranslation === "all"
                      ? ` (${getTranslationLabel(translation)})`
                      : ""
                  }`;
                  return (
                    <Button
                      key={verse.id}
                      type="button"
                      variant={
                        activeVerseId === verse.id ? "secondary" : "ghost"
                      }
                      size="sm"
                      className="w-full h-auto min-h-7 flex gap-2 px-1.5 py-1 text-xs leading-tight justify-between"
                      title={title}
                      onClick={() => onJump(verse.id)}
                    >
                      <span className="min-w-0 whitespace-normal break-words text-left font-mono tabular-nums">
                        {refLabel}
                      </span>
                      {selectedTranslation === "all" && (
                        <span className="max-w-[3.5rem] truncate text-[9px] text-muted-foreground">
                          {/* translationShortLabel normalizes a falsy input to DEFAULT_TRANSLATION_ID */}
                          {translationShortLabel(verse.translation ?? "")}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

type SavedVersesTestamentNavProps = {
  title: string;
  sortedBookIds: string[];
  bookMap: TestamentBookMap;
  activeVerseId: string | null;
  selectedTranslation: string;
  openBookIds: Set<string>;
  onBookOpenChange: (bookId: string, nextOpen: boolean) => void;
  onJump: (verseId: string) => void;
};

export const SavedVersesTestamentNav = ({
  title,
  sortedBookIds,
  bookMap,
  activeVerseId,
  selectedTranslation,
  openBookIds,
  onBookOpenChange,
  onJump,
}: SavedVersesTestamentNavProps) => {
  if (sortedBookIds.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1">
        {sortedBookIds.map((bookId) => {
          const bookData = bookMap[bookId];
          return (
            <SavedVersesBookNav
              key={bookId}
              bookId={bookId}
              bookTitle={bookData.bookTitle}
              chapters={bookData.chapters}
              activeVerseId={activeVerseId}
              selectedTranslation={selectedTranslation}
              open={openBookIds.has(bookId)}
              onOpenChange={onBookOpenChange}
              onJump={onJump}
            />
          );
        })}
      </div>
    </div>
  );
};
