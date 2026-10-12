import type { SavedVerse } from "@apps/production/bible-app/services/bible-verses-service";
import type { CSSProperties } from "react";
import { SavedVerseRow } from "./SavedVerseRow";
import type { TestamentBookMap } from "./types";

type SavedVersesTestamentScrollProps = {
  sectionTitle: string;
  sortedBookIds: string[];
  bookMap: TestamentBookMap;
  activeVerseId: string | null;
  verseStyle: CSSProperties;
  savedVerseKeys: Set<string>;
  onUnsaveVerse: (verse: SavedVerse) => void;
  onAddNoteForVerse: (verse: SavedVerse) => void;
  onAddToListForVerse: (verse: SavedVerse) => void;
};

export const SavedVersesTestamentScroll = ({
  sectionTitle,
  sortedBookIds,
  bookMap,
  activeVerseId,
  verseStyle,
  savedVerseKeys,
  onUnsaveVerse,
  onAddNoteForVerse,
  onAddToListForVerse,
}: SavedVersesTestamentScrollProps) => {
  if (sortedBookIds.length === 0) return null;

  return (
    <div>
      <h3 className="text-xl font-bold mb-4">{sectionTitle}</h3>
      <div className="space-y-6">
        {sortedBookIds.map((bookId) => {
          const bookData = bookMap[bookId];
          const sortedChapters = Object.keys(bookData.chapters).sort(
            (a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10),
          );

          return (
            <div key={bookId} className="space-y-4">
              <h4 className="text-lg font-semibold">{bookData.bookTitle}</h4>
              {sortedChapters.map((chapter) => {
                const verses = bookData.chapters[chapter];
                return (
                  <div key={`${bookId}-${chapter}`} className="space-y-2 pl-4">
                    <h5 className="text-md font-medium text-muted-foreground">
                      Chapter {chapter}
                    </h5>
                    <div className="space-y-2">
                      {verses.map((verse) => (
                        <SavedVerseRow
                          key={verse.id}
                          verse={verse}
                          activeVerseId={activeVerseId}
                          verseStyle={verseStyle}
                          savedVerseKeys={savedVerseKeys}
                          onUnsave={onUnsaveVerse}
                          onAddNote={onAddNoteForVerse}
                          onAddToList={onAddToListForVerse}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
