import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getBookDisplayTitle } from "@/bible/constants";
import { useCollectionChanges } from "@/bible/hooks/useCollectionChanges";
import {
  type BibleBookmark,
  bibleBookmarksService,
} from "@/bible/services/bible-bookmarks-service";
import { bibleService } from "@/bible/services/bible-service";
import { normalizeTranslationId } from "@/bible/translations";
import type { Book } from "@/bible/types/bible-reader";
import {
  firstPassageFromReferenceResults,
  parseBibleReferenceWhenLooksLikeReference,
} from "@/bible/utils/bible-reference-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BibleBookSelector } from "./BibleBookSelector";
import { BibleChapterSelector } from "./BibleChapterSelector";
import { BibleTranslationSelector } from "./BibleTranslationSelector";
import { BookmarkManagerDialog } from "./BookmarkManagerDialog";
import { HomeSavedVerses } from "./HomeSavedVerses";

export type BibleHomeProps = {
  translationId: string;
  onTranslationChange: (translationId: string) => void;
  onOpenInReader: (
    bookId: string,
    chapter: number,
    verse: string,
    translationId?: string,
  ) => void;
};

const getBookmarkDisplayTitle = (bm: BibleBookmark): string => {
  if (bm.name?.trim()) return bm.name.trim();
  const ref = `${bm.chapter}${
    bm.verse != null && bm.verse !== "" ? `:${bm.verse}` : ""
  }`;
  return `${getBookDisplayTitle(bm.book_id)} ${ref}`;
};

export const BibleHome = ({
  translationId,
  onTranslationChange,
  onOpenInReader,
}: BibleHomeProps) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState("");
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedBookChapters, setSelectedBookChapters] = useState<number[]>(
    [],
  );
  const [verseInput, setVerseInput] = useState("");
  const [referenceJumpInput, setReferenceJumpInput] = useState("");
  const [referenceJumpLoading, setReferenceJumpLoading] = useState(false);

  const [bookmarks, setBookmarks] = useState<BibleBookmark[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);
  const [bookmarksError, setBookmarksError] = useState<string | null>(null);
  const [bookmarkManagerOpen, setBookmarkManagerOpen] = useState(false);

  const refreshBookmarks = useCallback(
    async (options?: { showLoading?: boolean }) => {
      const showLoading = options?.showLoading ?? true;
      if (showLoading) setBookmarksLoading(true);
      setBookmarksError(null);
      try {
        const list = await bibleBookmarksService.getAllBookmarks();
        setBookmarks(list);
      } catch {
        setBookmarks([]);
        setBookmarksError("Could not load bookmarks.");
      } finally {
        if (showLoading) setBookmarksLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setBooksError(null);
      try {
        const list = await bibleService.getBooksList(translationId);
        if (!cancelled) {
          setBooks(list);
          setSelectedBook((prev) => {
            if (prev && list.some((b) => b.id === prev)) return prev;
            return list[0]?.id ?? "";
          });
        }
      } catch {
        if (!cancelled) {
          setBooksError("Could not load books.");
          setBooks([]);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [translationId]);

  useEffect(() => {
    if (!selectedBook) {
      return;
    }

    let cancelled = false;
    const loadChapters = async () => {
      try {
        const chapters = await bibleService.getChaptersForBook(
          selectedBook,
          translationId,
        );
        if (!cancelled) {
          const nums = chapters.map((c) => c.number);
          setSelectedBookChapters(nums);
          setSelectedChapter((prev) => {
            if (nums.length === 0) return 1;
            if (nums.includes(prev)) return prev;
            return nums[0] ?? 1;
          });
        }
      } catch {
        if (!cancelled) {
          setSelectedBookChapters([]);
        }
      }
    };

    void loadChapters();
    return () => {
      cancelled = true;
    };
  }, [selectedBook, translationId]);

  useEffect(() => {
    void refreshBookmarks({ showLoading: true });
  }, [refreshBookmarks]);

  const handleBookmarkManagerDelete = useCallback(
    async (id: string) => {
      try {
        await bibleBookmarksService.delete(id);
        await refreshBookmarks({ showLoading: false });
        toast.success("Bookmark removed");
      } catch {
        toast.error("Failed to remove bookmark.");
      }
    },
    [refreshBookmarks],
  );

  const handleBookmarkManagerRename = useCallback(
    async (id: string, name: string | null) => {
      try {
        await bibleBookmarksService.renameBookmark(id, name);
        await refreshBookmarks({ showLoading: false });
      } catch {
        toast.error("Failed to rename bookmark.");
      }
    },
    [refreshBookmarks],
  );

  const handleBookmarkManagerRecolor = useCallback(
    async (id: string, colorHex: string) => {
      try {
        await bibleBookmarksService.recolorBookmark(id, colorHex);
        await refreshBookmarks({ showLoading: false });
      } catch {
        toast.error("Failed to update bookmark color.");
      }
    },
    [refreshBookmarks],
  );

  const handleBookChange = useCallback((bookId: string) => {
    setSelectedBook(bookId);
    setSelectedChapter(1);
    setSelectedBookChapters([]);
    setVerseInput("");
  }, []);

  const handleChapterChange = useCallback((chapter: number) => {
    setSelectedChapter(chapter);
  }, []);

  const handleOpenReader = () => {
    if (!selectedBook) return;
    const verse = verseInput.trim() || "1";
    onOpenInReader(selectedBook, selectedChapter, verse);
  };

  const handleReferenceJump = useCallback(async () => {
    const raw = referenceJumpInput.trim();
    if (!raw) return;

    setReferenceJumpLoading(true);
    try {
      const results = await parseBibleReferenceWhenLooksLikeReference(
        raw,
        translationId,
      );
      const target = firstPassageFromReferenceResults(results);
      if (target) {
        setSelectedBook(target.bookId);
        setSelectedChapter(target.chapter);
        setVerseInput(target.verse);
        setReferenceJumpInput("");
        onOpenInReader(target.bookId, target.chapter, target.verse);
        return;
      }
      toast.error("Could not open that reference", {
        description: "Try a format like Genesis 1:4, John 3, or 1 Kings 4:6.",
      });
    } finally {
      setReferenceJumpLoading(false);
    }
  }, [referenceJumpInput, translationId, onOpenInReader]);

  useCollectionChanges(() => {
    void refreshBookmarks({ showLoading: false });
  });

  return (
    <div className="flex flex-col h-full mx-auto max-w-6xl">
      <div className="shrink-0 px-6 py-4 border-b">
        <h1 className="text-2xl font-semibold">The Holy Bible</h1>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex flex-col gap-6 max-w-6xl">
          <main
            aria-labelledby="home-reader-heading"
            className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-4 md:p-5"
          >
            <div className="mb-4">
              <h2 id="home-reader-heading" className="text-lg font-semibold">
                Bible Reader
              </h2>
              <p className="text-sm text-muted-foreground">
                Pick a translation and passage, or jump from a reference
              </p>
            </div>
            {booksError ? (
              <p className="text-sm text-destructive">{booksError}</p>
            ) : (
              <>
                <div className="text-foreground flex w-full flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[10rem]">
                    <span className="text-sm font-medium mb-2 block">
                      Translation
                    </span>
                    <BibleTranslationSelector
                      compact
                      value={translationId}
                      onValueChange={(value) =>
                        onTranslationChange(normalizeTranslationId(value))
                      }
                      className="w-full"
                    />
                  </div>

                  <div className="flex-1 min-w-[10rem]">
                    <span className="text-sm font-medium mb-2 block">Book</span>
                    <BibleBookSelector
                      books={books}
                      selectedBook={selectedBook}
                      onBookChange={handleBookChange}
                      className="w-full"
                    />
                  </div>

                  <div className="flex-1 min-w-[8rem]">
                    <span className="text-sm font-medium mb-2 block">
                      Chapter
                    </span>
                    <BibleChapterSelector
                      chapters={selectedBookChapters}
                      selectedChapter={selectedChapter}
                      onChapterChange={handleChapterChange}
                      disabled={
                        !selectedBook || selectedBookChapters.length === 0
                      }
                      className="w-full"
                    />
                  </div>

                  <div className="flex-1 min-w-[6rem]">
                    <span className="text-sm font-medium mb-2 block">
                      Verse
                    </span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      aria-label="Verse"
                      placeholder="Optional"
                      value={verseInput}
                      onChange={(e) => setVerseInput(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  <Button
                    type="button"
                    className="w-full sm:w-auto shrink-0"
                    disabled={
                      !selectedBook || selectedBookChapters.length === 0
                    }
                    onClick={handleOpenReader}
                  >
                    Open reader
                  </Button>
                </div>

                <div className="mt-4 border-t border-border pt-4 space-y-2">
                  <div className="flex gap-2 items-center ">
                    <span className="text-sm font-medium block">
                      Or type a reference
                    </span>
                    <p className="text-xs text-muted-foreground">
                      e.g.{" "}
                      <span className="text-foreground/80">Genesis 1:4</span>,{" "}
                      <span className="text-foreground/80">John 3</span>, or{" "}
                      <span className="text-foreground/80">1 Kings 4:6</span>.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <Input
                      className="flex-1 min-w-0"
                      aria-label="Bible reference"
                      value={referenceJumpInput}
                      onChange={(e) => setReferenceJumpInput(e.target.value)}
                      placeholder="Genesis 1:4"
                      disabled={referenceJumpLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleReferenceJump();
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full sm:w-auto shrink-0"
                      disabled={
                        referenceJumpLoading || !referenceJumpInput.trim()
                      }
                      onClick={() => void handleReferenceJump()}
                    >
                      {referenceJumpLoading ? "Opening…" : "Open from text"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </main>

          <section
            aria-labelledby="home-bookmarks-heading"
            className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-4 md:p-5"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2
                  id="home-bookmarks-heading"
                  className="text-lg font-semibold"
                >
                  Bookmarks
                </h2>
                <p className="text-sm text-muted-foreground">
                  Quick access to places you marked in the reader
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => setBookmarkManagerOpen(true)}
              >
                Manage
              </Button>
            </div>

            {bookmarksLoading ? (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                aria-busy="true"
                aria-label="Loading bookmarks"
                role="status"
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={`bookmark-placeholder-${String.fromCharCode(65 + i)}`}
                    className="h-[4.5rem] rounded-lg border border-border bg-muted/40 animate-pulse"
                  />
                ))}
              </div>
            ) : bookmarksError ? (
              <p className="text-sm text-destructive">{bookmarksError}</p>
            ) : bookmarks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No bookmarks yet. Open the reader and add one from a verse.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {bookmarks.map((bm) => (
                  <button
                    key={bm.id}
                    type="button"
                    onClick={() =>
                      onOpenInReader(
                        bm.book_id,
                        bm.chapter,
                        bm.verse?.trim() || "1",
                      )
                    }
                    className="flex gap-0 text-left rounded-lg border border-border bg-background overflow-hidden transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div
                      className="w-1 shrink-0 self-stretch"
                      style={{ backgroundColor: bm.color_hex }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 p-3 pl-3 flex flex-row justify-between gap-2">
                      <p className="text-sm font-medium text-foreground line-clamp-2">
                        {getBookmarkDisplayTitle(bm)}
                      </p>
                      {bm.name?.trim() && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {getBookDisplayTitle(bm.book_id)} {bm.chapter}
                          {bm.verse != null && bm.verse !== ""
                            ? `:${bm.verse}`
                            : ""}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          <HomeSavedVerses onOpenInReader={onOpenInReader} />

          <BookmarkManagerDialog
            open={bookmarkManagerOpen}
            onOpenChange={setBookmarkManagerOpen}
            bookmarks={bookmarks}
            onJump={(bookId, chapter, verse) => {
              setBookmarkManagerOpen(false);
              onOpenInReader(bookId, chapter, verse);
            }}
            onDelete={handleBookmarkManagerDelete}
            onRename={handleBookmarkManagerRename}
            onRecolor={handleBookmarkManagerRecolor}
          />
        </div>
      </div>
    </div>
  );
};
