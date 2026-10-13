import { getVerseKey } from "@/bible/services/bible-verses-service";
import {
  getTranslationLabel,
  normalizeTranslationId,
} from "@/bible/translations";
import { getPassageDisplayRows } from "@/bible/utils/passage-display";
import { formatSavedPassage } from "@/bible/utils/passage-reference";
import { savedVerseScrollId } from "@/bible/utils/saved-verses/saved-verses-utils";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BibleVerse } from "../BibleVerse";
import type { SavedVerseRowProps } from "./types";

export const SavedVerseRow = ({
  verse,
  activeVerseId,
  verseStyle,
  savedVerseKeys,
  onUnsave,
  onAddToList,
}: SavedVerseRowProps) => {
  const translation = normalizeTranslationId(verse.translation);
  const verseKey = getVerseKey(
    verse.book_id,
    verse.chapter,
    verse.verse,
    translation,
    verse.end,
  );
  const isSaved = savedVerseKeys.has(verseKey);
  const translationName = getTranslationLabel(translation);

  return (
    <div
      id={savedVerseScrollId(verse.id)}
      className={cn(
        "scroll-mt-3 rounded-lg p-1 -m-1 transition-[box-shadow,background-color]",
        activeVerseId === verse.id &&
          "bg-primary/5 ring-2 ring-primary/35 ring-offset-2 ring-offset-background",
      )}
    >
      <div className="space-y-2" style={verseStyle}>
        <BibleVerse
          bookId={verse.book_id}
          chapter={verse.chapter}
          verse={verse.verse}
          text={verse.verse_text}
          referenceLabel={verse.end ? formatSavedPassage(verse) : undefined}
          passageRows={getPassageDisplayRows(verse)}
          isSaved={isSaved}
          badge={
            <Badge variant="outline" className="text-xs">
              {translationName}
            </Badge>
          }
          onUnsave={() => onUnsave(verse)}
          onAddToList={() => onAddToList(verse)}
          confirmBeforeUnsave
        />
      </div>
    </div>
  );
};
