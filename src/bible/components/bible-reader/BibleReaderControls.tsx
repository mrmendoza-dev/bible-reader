import { normalizeTranslationId } from "@/bible/translations";
import type { Book } from "@/bible/types/bible-reader";
import { BibleBookSelector } from "../BibleBookSelector";
import { BibleChapterSelector } from "../BibleChapterSelector";
import { BibleTranslationSelector } from "../BibleTranslationSelector";

type BibleReaderControlsProps = {
  books: Book[];
  selectedBook: string;
  selectedChapter: number;
  selectedBookChapters: number[];
  activeTranslationId: string;
  onTranslationChange?: (translationId: string) => void;
  onBookChange: (bookId: string) => void;
  onChapterChange: (chapter: number) => void;
};

export const BibleReaderControls = ({
  books,
  selectedBook,
  selectedChapter,
  selectedBookChapters,
  activeTranslationId,
  onTranslationChange,
  onBookChange,
  onChapterChange,
}: BibleReaderControlsProps) => {
  return (
    <div className="mx-auto w-full max-w-3xl shrink-0 px-2 text-foreground">
      <div className="grid grid-cols-[minmax(0,1fr)_5rem_6rem] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_8rem]">
        <div className="min-w-0">
          <span className="sr-only">Book</span>
          <BibleBookSelector
            books={books}
            selectedBook={selectedBook}
            onBookChange={onBookChange}
          />
        </div>

        <div className="min-w-0">
          <span className="sr-only">Chapter</span>
          <BibleChapterSelector
            chapters={selectedBookChapters}
            selectedChapter={selectedChapter}
            onChapterChange={onChapterChange}
            disabled={!selectedBook || selectedBookChapters.length === 0}
            className="w-full"
          />
        </div>

        <div className="min-w-0">
          <span className="sr-only">Translation</span>
          <BibleTranslationSelector
            compact
            value={activeTranslationId}
            onValueChange={(value) => {
              onTranslationChange?.(normalizeTranslationId(value));
            }}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};
