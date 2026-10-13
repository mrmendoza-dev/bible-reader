import { useLiveQuery } from "dexie-react-hooks";
import { List } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { bibleVersesService } from "@/bible/services/bible-verses-service";
import { getTranslationLabel } from "@/bible/translations";
import { getPassageDisplayRows } from "@/bible/utils/passage-display";
import { formatSavedPassage } from "@/bible/utils/passage-reference";
import { Button, buttonVariants } from "@/components/ui/button";
import { ListManagerDialog } from "./ListManagerDialog";
import { PassageText } from "./PassageText";

type HomeSavedVersesProps = {
  onOpenInReader: (
    bookId: string,
    chapter: number,
    verse: string,
    translationId?: string,
  ) => void;
};

export const HomeSavedVerses = ({ onOpenInReader }: HomeSavedVersesProps) => {
  const [listsOpen, setListsOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const result = useLiveQuery(async () => {
    try {
      return {
        verses: await bibleVersesService.getRecentSavedVerses(),
        error: false,
      };
    } catch {
      return { verses: [], error: true };
    }
  }, [retry]);

  return (
    <section
      aria-labelledby="home-saved-heading"
      className="rounded-xl border bg-card p-4 shadow-sm md:p-5"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="home-saved-heading" className="text-lg font-semibold">
            Saved Verses
          </h2>
          <p className="text-sm text-muted-foreground">
            Recently added to your collection
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setListsOpen(true)}
          >
            <List className="size-4" />
            Manage Lists
          </Button>
          <Link to="/saved" className={buttonVariants({ size: "sm" })}>
            View Saved Verses
          </Link>
        </div>
      </div>
      {result === undefined ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading saved verses…
        </p>
      ) : result.error ? (
        <div className="flex items-center gap-3">
          <p role="alert" className="text-sm text-destructive">
            Could not load saved verses.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRetry((value) => value + 1)}
          >
            Retry
          </Button>
        </div>
      ) : result.verses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Save verses as you read to find them here.
        </p>
      ) : (
        <ul className="divide-y">
          {result.verses.map((verse) => {
            const rows = getPassageDisplayRows(verse);
            const reference = formatSavedPassage(verse);
            const verseCount = rows?.reduce((count, row) => {
              const [first, last = first] = row.verse.split("-").map(Number);
              return count + last - first + 1;
            }, 0);
            return (
              <li key={verse.id}>
                <button
                  type="button"
                  aria-label={`Open ${reference} (${getTranslationLabel(verse.translation)}) in reader`}
                  className="w-full rounded-md px-2 py-3 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() =>
                    onOpenInReader(
                      verse.book_id,
                      verse.chapter,
                      verse.verse,
                      verse.translation,
                    )
                  }
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{reference}</span>
                    <span className="text-xs text-muted-foreground">
                      {getTranslationLabel(verse.translation)}
                    </span>
                  </span>
                  <span
                    className={
                      rows
                        ? "mt-2 block break-words text-sm leading-relaxed"
                        : "mt-1 line-clamp-2 block break-words text-sm text-muted-foreground"
                    }
                  >
                    {rows ? (
                      <PassageText rows={rows.slice(0, 3)} />
                    ) : (
                      verse.verse_text
                    )}
                  </span>
                </button>
                {rows && rows.length > 3 && (
                  <Link
                    to={`/saved?passage=${encodeURIComponent(verse.id)}`}
                    className="mb-3 ml-2 inline-block text-xs text-primary underline-offset-4 hover:underline"
                  >
                    View full passage ({verseCount} verses)
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <ListManagerDialog open={listsOpen} onOpenChange={setListsOpen} />
    </section>
  );
};
