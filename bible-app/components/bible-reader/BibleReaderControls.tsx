import { normalizeTranslationId } from "@apps/production/bible-app/translations";
import type { Book } from "@apps/production/bible-app/types/bible-reader";
import { Button } from "@omni/ui-base/button";
import { Spinner } from "@omni/ui-base/spinner";
import { BibleBookSelector } from "../BibleBookSelector";
import { BibleChapterSelector } from "../BibleChapterSelector";
import { BibleTranslationSelector } from "../BibleTranslationSelector";

type BibleReaderControlsProps = {
  books: Book[];
  selectedBook: string;
  selectedChapter: number;
  selectedBookChapters: number[];
  loading: boolean;
  activeTranslationId: string;
  onTranslationChange?: (translationId: string) => void;
  onBookChange: (bookId: string) => void;
  onChapterChange: (chapter: number) => void;
  onLoadChapter: () => void;
};

export const BibleReaderControls = ({
  books,
  selectedBook,
  selectedChapter,
  selectedBookChapters,
  loading,
  activeTranslationId,
  onTranslationChange,
  onBookChange,
  onChapterChange,
  onLoadChapter,
}: BibleReaderControlsProps) => {
  return (
    <div className="text-foreground shrink-0">
      <div className="flex gap-4 w-full items-end flex-wrap px-2">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Book</label>
          <BibleBookSelector
            books={books}
            selectedBook={selectedBook}
            onBookChange={onBookChange}
          />
        </div>

        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Chapter</label>
          <BibleChapterSelector
            chapters={selectedBookChapters}
            selectedChapter={selectedChapter}
            onChapterChange={onChapterChange}
            disabled={!selectedBook || selectedBookChapters.length === 0}
            className="w-full"
          />
        </div>

        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Translation</label>
          <BibleTranslationSelector
            value={activeTranslationId}
            onValueChange={(value) => {
              onTranslationChange?.(normalizeTranslationId(value));
            }}
            className="w-full"
          />
        </div>

        <Button onClick={onLoadChapter} disabled={loading} className="px-8">
          {loading ? (
            <>
              <Spinner className="h-4 w-4 mr-2 text-foreground" />
              Loading...
            </>
          ) : (
            "Load"
          )}
        </Button>
      </div>
    </div>
  );
};
