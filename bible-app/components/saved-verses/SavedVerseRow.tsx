import { getVerseKey } from "@apps/production/bible-app/services/bible-verses-service";
import {
  getTranslationLabel,
  normalizeTranslationId,
  TRANSLATION_NAMES,
} from "@apps/production/bible-app/translations";
import { savedVerseScrollId } from "@apps/production/bible-app/utils/saved-verses/saved-verses-utils";
import { Badge } from "@omni/ui-base/badge";
import { cn } from "@omni/ui-base/lib/utils";
import { BibleVerse } from "../BibleVerse";
import type { SavedVerseRowProps } from "./types";

export const SavedVerseRow = ({
  verse,
  activeVerseId,
  verseStyle,
  savedVerseKeys,
  onUnsave,
  onAddNote,
  onAddToList,
}: SavedVerseRowProps) => {
  const translation = normalizeTranslationId(verse.translation);
  const verseKey = getVerseKey(
    verse.book_id,
    verse.chapter,
    verse.verse,
    translation,
  );
  const isSaved = savedVerseKeys.has(verseKey);
  const translationName =
    TRANSLATION_NAMES[translation] || getTranslationLabel(translation);

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
          isSaved={isSaved}
          badge={
            <Badge variant="outline" className="text-xs">
              {translationName}
            </Badge>
          }
          onUnsave={() => onUnsave(verse)}
          onAddNote={() => onAddNote(verse)}
          onAddToList={() => onAddToList(verse)}
          confirmBeforeUnsave
        />
      </div>
    </div>
  );
};
