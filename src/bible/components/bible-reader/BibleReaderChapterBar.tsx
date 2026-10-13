import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type BibleReaderChapterBarProps = {
  bookTitle: string;
  loadedChapter: number;
  loadedChapterCount: number;
  onNavigateChapter: (direction: "prev" | "next") => void;
};

export const BibleReaderChapterBar = ({
  bookTitle,
  loadedChapter,
  loadedChapterCount,
  onNavigateChapter,
}: BibleReaderChapterBarProps) => {
  return (
    <div className="shrink-0 border-b py-2">
      <div className="mx-auto flex w-full max-w-3xl items-center px-2">
        <div className="flex flex-1 justify-start">
          <Button
            variant="outline"
            size="sm"
            aria-label="Previous chapter"
            onClick={() => onNavigateChapter("prev")}
            disabled={loadedChapter <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <h3 className="shrink-0 text-lg font-semibold whitespace-nowrap text-center">
          {bookTitle} {loadedChapter}
        </h3>
        <div className="flex flex-1 justify-end">
          <Button
            variant="outline"
            size="sm"
            aria-label="Next chapter"
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
