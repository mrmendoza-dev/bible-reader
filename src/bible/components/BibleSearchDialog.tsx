import { Search as SearchIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SEARCH_PAGE_SIZE, SEARCH_RESULT_LIMIT } from "@/bible/search-limits";
import {
  bibleService,
  type SearchResult,
} from "@/bible/services/bible-service";
import {
  bibleVersesService,
  getVerseKey,
} from "@/bible/services/bible-verses-service";
import {
  DEFAULT_TRANSLATION_ID,
  getTranslationLabel,
  normalizeTranslationId,
} from "@/bible/translations";
import { parseBibleReferenceWhenLooksLikeReference } from "@/bible/utils/bible-reference-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { BibleBookSelector } from "./BibleBookSelector";
import { BibleTranslationSelector } from "./BibleTranslationSelector";
import { BibleVerse } from "./BibleVerse";

interface BibleSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onNavigateToVerse: (
    bookId: string,
    chapter: number,
    verse: string,
    translationId?: string,
  ) => void;
  translationId?: string;
}

export const BibleSearchDialog = ({
  open,
  onClose,
  onNavigateToVerse,
  translationId = DEFAULT_TRANSLATION_ID,
}: BibleSearchDialogProps) => {
  const searchSequence = useRef(0);
  const activeSearch = useRef<AbortController | null>(null);
  const [page, setPage] = useState(0);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<string>("all");
  const [selectedTranslation, setSelectedTranslation] = useState<string>(
    normalizeTranslationId(translationId),
  );
  const [books, setBooks] = useState<Array<{ id: string; title: string }>>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [savedVerses, setSavedVerses] = useState<Set<string>>(new Set());

  // Load the selected edition's coverage, or the union when searching all editions.
  useEffect(() => {
    let cancelled = false;
    const loadBooks = async () => {
      try {
        const booksList =
          selectedTranslation === "all"
            ? await bibleService.getAllBooksList()
            : await bibleService.getBooksList(selectedTranslation);
        if (cancelled) return;
        setBooks(booksList);
        setSelectedBook((book) =>
          book === "all" || booksList.some((entry) => entry.id === book)
            ? book
            : "all",
        );
      } catch (error) {
        if (!cancelled) console.error("Failed to load books list:", error);
      }
    };
    void loadBooks();
    return () => {
      cancelled = true;
    };
  }, [selectedTranslation]);

  // Update selected translation when translationId prop changes
  useEffect(() => {
    setSelectedTranslation(normalizeTranslationId(translationId));
  }, [translationId]);

  // Load saved verses
  useEffect(() => {
    const loadSavedVerses = async () => {
      try {
        const savedVerseKeys = await bibleVersesService.getSavedVerseKeys();
        setSavedVerses(savedVerseKeys);
      } catch (err) {
        console.error("Failed to load saved verses:", err);
      }
    };

    if (open) {
      loadSavedVerses();
    }
  }, [open]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Input changes must invalidate pending searches.
  useEffect(() => {
    searchSequence.current++;
    activeSearch.current?.abort();
    setPage(0);
    setLoading(false);
    setResults([]);
    setHasSearched(false);
    setSearchError(null);
    return () => {
      searchSequence.current++;
      activeSearch.current?.abort();
    };
  }, [searchQuery, selectedBook, selectedTranslation, open]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    if (loading) return;
    activeSearch.current?.abort();
    const controller = new AbortController();
    activeSearch.current = controller;
    const sequence = ++searchSequence.current;
    setPage(0);
    setLoading(true);
    setHasSearched(true);
    setSearchError(null);
    try {
      const references = await parseBibleReferenceWhenLooksLikeReference(
        searchQuery,
        selectedTranslation,
      );
      controller.signal.throwIfAborted();
      const matches = references?.length
        ? references
        : await bibleService.searchBible(
            searchQuery,
            selectedBook === "all" ? undefined : selectedBook,
            selectedTranslation,
            { signal: controller.signal },
          );
      if (sequence === searchSequence.current)
        setResults(matches.slice(0, SEARCH_RESULT_LIMIT));
    } catch (error) {
      if (sequence === searchSequence.current) {
        setResults([]);
        setSearchError(
          error instanceof Error
            ? error.message
            : "Search failed. Please retry.",
        );
      }
    } finally {
      if (sequence === searchSequence.current) setLoading(false);
    }
  }, [searchQuery, selectedBook, selectedTranslation, loading]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch],
  );

  const handleNavigateToVerse = useCallback(
    (bookId: string, chapter: number, verse: string, translation: string) => {
      onNavigateToVerse(bookId, chapter, verse, translation);
      onClose();
    },
    [onNavigateToVerse, onClose],
  );

  const handleGoToChapter = useCallback(
    (bookId: string, chapter: number, translation: string) => {
      // Navigate to chapter (verse 1)
      onNavigateToVerse(bookId, chapter, "1", translation);
      onClose();
    },
    [onNavigateToVerse, onClose],
  );

  const handleSaveVerse = useCallback(
    async (
      bookId: string,
      chapter: number,
      verse: string,
      verseText: string,
    ) => {
      try {
        await bibleVersesService.saveVerse(
          bookId,
          chapter,
          verse,
          verseText,
          selectedTranslation,
        );
        const verseKey = getVerseKey(
          bookId,
          chapter,
          verse,
          selectedTranslation,
        );
        setSavedVerses((prev) => new Set([...prev, verseKey]));
        toast.success("Success", {
          description: "Verse saved successfully.",
        });
      } catch (error) {
        console.error("Error saving verse:", error);
        toast.error("Error", {
          description: "Failed to save verse. Please try again.",
        });
      }
    },
    [selectedTranslation],
  );

  const handleUnsaveVerse = useCallback(
    async (
      bookId: string,
      chapter: number,
      verse: string,
      translation: string,
    ) => {
      try {
        await bibleVersesService.unsaveVerse(
          bookId,
          chapter,
          verse,
          translation,
        );
        const verseKey = getVerseKey(bookId, chapter, verse, translation);
        setSavedVerses((prev) => {
          const newSet = new Set(prev);
          newSet.delete(verseKey);
          return newSet;
        });
        toast.success("Success", {
          description: "Verse removed from saved verses.",
        });
      } catch (error) {
        console.error("Error unsaving verse:", error);
        toast.error("Error", {
          description: "Failed to remove verse. Please try again.",
        });
      }
    },
    [],
  );

  const highlightText = useCallback((text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <span
          key={`${part}-${parts.slice(0, index).join("").length}`}
          className="bg-golden/50 text-foreground/90 border-1 border-golden-accent/10 rounded-none px-0.5"
        >
          {part}
        </span>
      ) : (
        part
      ),
    );
  }, []);

  // Group results by book, then by chapter
  const bookCount = new Set(results.map((result) => result.bookId)).size;
  const pageCount = Math.ceil(results.length / SEARCH_PAGE_SIZE);
  const groupedResults = results
    .slice(page * SEARCH_PAGE_SIZE, (page + 1) * SEARCH_PAGE_SIZE)
    .reduce(
      (acc, result) => {
        if (!acc[result.bookId]) {
          acc[result.bookId] = {
            bookTitle: result.bookTitle,
            chapters: {},
          };
        }
        if (!acc[result.bookId].chapters[result.chapter]) {
          acc[result.bookId].chapters[result.chapter] = [];
        }
        acc[result.bookId].chapters[result.chapter].push(result);
        return acc;
      },
      {} as Record<
        string,
        { bookTitle: string; chapters: Record<number, SearchResult[]> }
      >,
    );

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedBook("all");
      setSelectedTranslation(normalizeTranslationId(translationId));
      setResults([]);
      setHasSearched(false);
    }
  }, [open, translationId]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Search the Bible</DialogTitle>
          <DialogDescription>
            Search for verses across the entire Bible or within a specific book
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-2 w-full">
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter search term..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="min-w-0 flex-1"
              autoFocus
            />
            <Button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="px-3 sm:px-6"
            >
              {loading ? (
                <>
                  <Spinner className="h-4 w-4 mr-2 text-foreground" />
                  Searching...
                </>
              ) : (
                <>
                  <SearchIcon className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          <div className="grid w-full grid-cols-[minmax(0,1fr)_6rem] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
            <div className="min-w-0">
              <span className="sr-only">Book</span>
              <BibleBookSelector
                books={books}
                selectedBook={selectedBook}
                onBookChange={setSelectedBook}
                includeAllOption={true}
                className="w-full"
              />
            </div>
            <div className="min-w-0">
              <span className="sr-only">Translation</span>
              <BibleTranslationSelector
                compact
                value={selectedTranslation}
                onValueChange={(value) => {
                  setSelectedTranslation(
                    value === "all" ? value : normalizeTranslationId(value),
                  );
                }}
                includeAllOption={true}
                className="w-full"
              />
            </div>
          </div>

          {searchError && (
            <p role="alert" className="text-sm text-destructive">
              {searchError}
            </p>
          )}
          {/* Results */}
          <div className="min-h-0" aria-busy={loading}>
            {loading ? (
              <div
                role="status"
                aria-label="Searching the Bible"
                className="flex min-h-32 items-center justify-center"
              >
                <Spinner className="size-8 text-primary" />
              </div>
            ) : hasSearched && results.length === 0 ? (
              <div className="flex flex-col gap-2 items-center justify-center h-full text-muted-foreground">
                <p>No results found for "{searchQuery}"</p>
                <p className="text-xs">Try a different search term</p>
              </div>
            ) : hasSearched && results.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  Found {results.length} result{results.length !== 1 ? "s" : ""}{" "}
                  in {bookCount} book
                  {bookCount !== 1 ? "s" : ""}
                </p>
                {results.length === SEARCH_RESULT_LIMIT && (
                  <p className="text-xs text-muted-foreground" role="status">
                    Result limit reached ({SEARCH_RESULT_LIMIT}). Narrow your
                    query, book, or translation to find more specific matches.
                  </p>
                )}
                <ScrollArea key={page} className="h-[min(50dvh,400px)] min-h-0">
                  <div className="flex min-w-0 flex-col gap-4 break-words pr-4">
                    {Object.entries(groupedResults).map(
                      ([bookId, { bookTitle, chapters }]) => (
                        <div key={bookId} className="space-y-3">
                          {/* Book Header */}
                          <h3 className="text-lg font-semibold sticky top-0 z-10 bg-popover py-1 border-b">
                            {bookTitle}
                          </h3>

                          {/* Chapters in this book */}
                          {Object.entries(chapters)
                            .sort(
                              ([a], [b]) =>
                                Number.parseInt(a, 10) - Number.parseInt(b, 10),
                            )
                            .map(([chapterNum, verses]) => (
                              <div key={chapterNum} className="space-y-2 pl-4">
                                {/* Chapter Header */}
                                <h4 className="text-sm font-medium text-muted-foreground py-1">
                                  Chapter {chapterNum}
                                </h4>

                                {/* Verses in this chapter */}
                                <div className="space-y-2 pl-4">
                                  {verses.map((result) => {
                                    const resultTranslation =
                                      selectedTranslation === "all"
                                        ? normalizeTranslationId(
                                            result.translation,
                                          )
                                        : normalizeTranslationId(
                                            selectedTranslation,
                                          );
                                    const verseKey = getVerseKey(
                                      result.bookId,
                                      result.chapter,
                                      result.verse,
                                      resultTranslation,
                                    );
                                    const isSaved = savedVerses.has(verseKey);
                                    const translationName =
                                      getTranslationLabel(resultTranslation);

                                    return (
                                      <div
                                        key={`${result.bookId}-${result.chapter}-${result.verse}-${resultTranslation}}`}
                                        className="border-l-2 border-muted pl-3"
                                      >
                                        <BibleVerse
                                          bookId={result.bookId}
                                          chapter={result.chapter}
                                          verse={result.verse}
                                          text={result.text}
                                          isSaved={isSaved}
                                          highlightedText={highlightText(
                                            result.text,
                                            searchQuery,
                                          )}
                                          badge={
                                            selectedTranslation === "all" ? (
                                              <Badge
                                                variant="outline"
                                                className="text-xs"
                                              >
                                                {translationName}
                                              </Badge>
                                            ) : undefined
                                          }
                                          onClick={() =>
                                            handleNavigateToVerse(
                                              result.bookId,
                                              result.chapter,
                                              result.verse,
                                              resultTranslation,
                                            )
                                          }
                                          onSave={() =>
                                            handleSaveVerse(
                                              result.bookId,
                                              result.chapter,
                                              result.verse,
                                              result.text,
                                            )
                                          }
                                          onUnsave={() =>
                                            handleUnsaveVerse(
                                              result.bookId,
                                              result.chapter,
                                              result.verse,
                                              resultTranslation,
                                            )
                                          }
                                          onGoToChapter={() =>
                                            handleGoToChapter(
                                              result.bookId,
                                              result.chapter,
                                              resultTranslation,
                                            )
                                          }
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                        </div>
                      ),
                    )}
                  </div>
                </ScrollArea>
                {pageCount > 1 && (
                  <nav
                    aria-label="Search result pages"
                    className="flex items-center justify-between gap-2 pt-1"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((value) => value - 1)}
                    >
                      Previous
                    </Button>
                    <span
                      className="text-xs text-muted-foreground"
                      aria-live="polite"
                    >
                      Page {page + 1} of {pageCount}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page + 1 === pageCount}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      Next
                    </Button>
                  </nav>
                )}
              </div>
            ) : (
              <div className="text-sm flex items-center justify-center h-full text-muted-foreground">
                <p>Enter a search term and click Search to begin</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
