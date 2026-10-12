import {
  bibleService,
  type SearchResult,
} from "@apps/production/bible-app/services/bible-service";
import {
  bibleSupabaseService,
  getVerseKey,
} from "@apps/production/bible-app/services/bible-verses-service";
import {
  DEFAULT_TRANSLATION_ID,
  getTranslationLabel,
  normalizeTranslationId,
  TRANSLATION_NAMES,
} from "@apps/production/bible-app/translations";
import { parseBibleReferenceWhenLooksLikeReference } from "@apps/production/bible-app/utils/bible-reference-query";
import { Badge } from "@omni/ui-base/badge";
import { Button } from "@omni/ui-base/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@omni/ui-base/dialog";
import { Input } from "@omni/ui-base/input";
import { ScrollArea } from "@omni/ui-base/scroll-area";
import { Spinner } from "@omni/ui-base/spinner";
import { Search as SearchIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BibleBookSelector } from "./BibleBookSelector";
import { BibleTranslationSelector } from "./BibleTranslationSelector";
import { BibleVerse } from "./BibleVerse";

interface BibleSearchDialogProps {
  open: boolean;
  onClose: () => void;
  onNavigateToVerse: (bookId: string, chapter: number, verse: string) => void;
  translationId?: string;
}

export const BibleSearchDialog = ({
  open,
  onClose,
  onNavigateToVerse,
  translationId = DEFAULT_TRANSLATION_ID,
}: BibleSearchDialogProps) => {
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

  // Load books list when translation changes (skip if "all")
  useEffect(() => {
    if (selectedTranslation === "all") {
      // For "all", use the default translation for book list
      const loadBooks = async () => {
        try {
          const booksList = await bibleService.getBooksList(
            DEFAULT_TRANSLATION_ID,
          );
          setBooks(booksList);
        } catch (error) {
          console.error("Failed to load books list:", error);
        }
      };
      loadBooks();
    } else {
      const loadBooks = async () => {
        try {
          const booksList =
            await bibleService.getBooksList(selectedTranslation);
          setBooks(booksList);
        } catch (error) {
          console.error("Failed to load books list:", error);
        }
      };
      loadBooks();
    }
  }, [selectedTranslation]);

  // Update selected translation when translationId prop changes
  useEffect(() => {
    setSelectedTranslation(normalizeTranslationId(translationId));
  }, [translationId]);

  // Load saved verses
  useEffect(() => {
    const loadSavedVerses = async () => {
      try {
        const savedVerseKeys = await bibleSupabaseService.getSavedVerseKeys();
        setSavedVerses(savedVerseKeys);
      } catch (err) {
        console.error("Failed to load saved verses:", err);
      }
    };

    if (open) {
      loadSavedVerses();
    }
  }, [open]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const referenceResults = await parseBibleReferenceWhenLooksLikeReference(
        searchQuery,
        selectedTranslation,
      );
      if (referenceResults && referenceResults.length > 0) {
        setResults(referenceResults);
        setLoading(false);
        return;
      }

      // Regular text search
      const bookFilter = selectedBook === "all" ? undefined : selectedBook;
      const searchResults = await bibleService.searchBible(
        searchQuery,
        bookFilter,
        selectedTranslation,
      );
      setResults(searchResults);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedBook, selectedTranslation]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch],
  );

  const handleNavigateToVerse = useCallback(
    (bookId: string, chapter: number, verse: string) => {
      onNavigateToVerse(bookId, chapter, verse);
      onClose();
    },
    [onNavigateToVerse, onClose],
  );

  const handleGoToChapter = useCallback(
    (bookId: string, chapter: number) => {
      // Navigate to chapter (verse 1)
      onNavigateToVerse(bookId, chapter, "1");
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
        await bibleSupabaseService.saveVerse(
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
        await bibleSupabaseService.unsaveVerse(
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
          key={index}
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
  const groupedResults = results.reduce(
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Search the Bible</DialogTitle>
          <DialogDescription>
            Search for verses across the entire Bible or within a specific book
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 w-full">
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter search term..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              autoFocus
            />
            <Button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="px-8"
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

          {/* Book Filter and Translation Selector */}
          <div className="flex gap-4 w-full items-end flex-wrap">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Book</label>
              <BibleBookSelector
                books={books}
                selectedBook={selectedBook}
                onBookChange={setSelectedBook}
                includeAllOption={true}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                Translation
              </label>
              <BibleTranslationSelector
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

          {/* Results */}
          <div className="flex-1 min-h-[400px] h-full">
            {loading ? (
              <div className="flex items-center justify-center h-full">
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
                  in {Object.keys(groupedResults).length} book
                  {Object.keys(groupedResults).length !== 1 ? "s" : ""}
                </p>
                <ScrollArea className="min-h-[400px] h-full">
                  <div className="flex flex-col gap-4 pr-4">
                    {Object.entries(groupedResults).map(
                      ([bookId, { bookTitle, chapters }]) => (
                        <div key={bookId} className="space-y-3">
                          {/* Book Header */}
                          <h3 className="text-lg font-semibold sticky top-0 bg-background py-1 border-b">
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
                                  {verses.map((result, index) => {
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
                                      TRANSLATION_NAMES[resultTranslation] ||
                                      getTranslationLabel(resultTranslation);

                                    return (
                                      <div
                                        key={`${result.bookId}-${result.chapter}-${result.verse}-${resultTranslation}-${index}`}
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
