import { getBookDisplayTitle } from "@/bible/constants";
import type { PassageDisplayRow } from "@/bible/utils/passage-display";

export function PassageText({ rows }: { rows: PassageDisplayRow[] }) {
  const hasSections = rows.some(
    (row) => row.bookId !== rows[0].bookId || row.chapter !== rows[0].chapter,
  );
  return (
    <span
      className="grid grid-cols-[minmax(1rem,max-content)_minmax(0,1fr)] items-baseline gap-x-2 gap-y-2"
      data-passage-text
    >
      {rows.map((row, index) => {
        const previous = rows[index - 1];
        const sectionStart =
          hasSections &&
          (!previous ||
            previous.bookId !== row.bookId ||
            previous.chapter !== row.chapter);
        return (
          <span
            key={`${row.bookId}-${row.chapter}-${row.verse}`}
            className="contents"
            data-passage-verse
          >
            {sectionStart && (
              <span className="col-span-2 mt-2 first:mt-0 font-sans text-xs font-medium text-muted-foreground">
                {getBookDisplayTitle(row.bookId)} {row.chapter}
              </span>
            )}
            <span
              className="font-bold text-muted-foreground"
              data-passage-number
            >
              {row.verse}.
            </span>
            <span className="min-w-0 whitespace-pre-line">{row.text}</span>
          </span>
        );
      })}
    </span>
  );
}
