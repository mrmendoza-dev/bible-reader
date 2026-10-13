import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ALL_BOOK_IDS, getBookDisplayTitle } from "@/bible/constants";
import { useBibleContext } from "@/bible/contexts/BibleContext";
import { useCollectionChanges } from "@/bible/hooks/useCollectionChanges";
import { getReadingFontFamily } from "@/bible/reading-fonts";
import {
  type BibleBookmark,
  bibleBookmarksService,
} from "@/bible/services/bible-bookmarks-service";
import { bibleService } from "@/bible/services/bible-service";
import {
  bibleVersesService,
  getVerseKey,
  type SavedVerse,
} from "@/bible/services/bible-verses-service";
import {
  DEFAULT_TRANSLATION_ID,
  getTranslationBookIds,
  normalizeTranslationId,
} from "@/bible/translations";
import type {
  BibleReaderProps,
  Book,
  BookData,
} from "@/bible/types/bible-reader";
import {
  formatSavedPassage,
  type PassageReference,
} from "@/bible/utils/passage-reference";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { reportError } from "@/lib/report-error";

type BibleReaderScreenArgs = Pick<BibleReaderProps, "translationId">;

export const useBibleReaderScreen = ({
  translationId = DEFAULT_TRANSLATION_ID,
}: BibleReaderScreenArgs) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useLocalStorage(
    "bible:last-book",
    "genesis",
    undefined,
    (value) => typeof value === "string" && ALL_BOOK_IDS.includes(value),
  );
  const [selectedChapter, setSelectedChapter] = useLocalStorage<number>(
    "bible:last-chapter",
    1,
    undefined,
    (value) =>
      typeof value === "number" &&
      Number.isInteger(value) &&
      value > 0 &&
      value <= 150,
  );
  const [loadedBook, setLoadedBook] = useState<string>(selectedBook);
  const [loadedChapter, setLoadedChapter] = useState<number>(selectedChapter);
  const [currentBookData, setCurrentBookData] = useState<BookData | null>(null);
  const [selectedBookChapters, setSelectedBookChapters] = useState<number[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedRecords, setSavedRecords] = useState<SavedVerse[]>([]);
  const savedVerses = useMemo(
    () =>
      new Set(
        savedRecords.map((record) =>
          getVerseKey(
            record.book_id,
            record.chapter,
            record.verse,
            record.translation,
            record.end,
          ),
        ),
      ),
    [savedRecords],
  );
  const loadSavedVerses = useCallback(async () => {
    setSavedRecords(await bibleVersesService.getSavedVerses());
  }, []);
  const [selectedVerse, setSelectedVerse] = useState<{
    bookId: string;
    chapter: number;
    verse: string;
  } | null>(null);
  const [verseScrollNonce, setVerseScrollNonce] = useState(0);
  const [chapterScrollToTopNonce, setChapterScrollToTopNonce] = useState(0);
  const [bookmarks, setBookmarks] = useState<BibleBookmark[]>([]);
  const { fontStyle, fontSize } = useBibleContext();
  const activeTranslationId = normalizeTranslationId(translationId);

  const fontFamilyStyle = { fontFamily: getReadingFontFamily(fontStyle) };

  const fontSizeOptions = {
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
  } as const;
  const fontSizeStyle = { fontSize: fontSizeOptions[fontSize] };
  const verseStyle = { ...fontFamilyStyle, ...fontSizeStyle };

  const navigateToVerse = useCallback(
    (bookId: string, chapter: number, verse: string) => {
      const trimmed = verse.trim();
      const normalizedVerse =
        trimmed === ""
          ? "1"
          : /^\d+$/.test(trimmed)
            ? String(Number.parseInt(trimmed, 10))
            : trimmed;

      setSelectedBook(bookId);
      setSelectedChapter(chapter);
      setLoadedBook(bookId);
      setLoadedChapter(chapter);
      setSelectedVerse({ bookId, chapter, verse: normalizedVerse });
      setVerseScrollNonce((n) => n + 1);

      toast.success("Navigation", {
        description: `Navigated to ${getBookDisplayTitle(
          bookId,
        )} ${chapter}:${normalizedVerse}`,
      });
    },
    [setSelectedBook, setSelectedChapter],
  );

  const loadBookmarks = useCallback(async () => {
    try {
      const data = await bibleBookmarksService.getAllBookmarks();
      setBookmarks(data);
    } catch (err) {
      console.error("Failed to load bookmarks:", err);
    }
  }, []);

  useEffect(() => {
    const loadBooks = async () => {
      try {
        const booksList = await bibleService.getBooksList(activeTranslationId);
        setBooks(booksList);
      } catch (err) {
        console.error("Failed to load books list:", err);
        setError("Failed to load books list");
      }
    };
    loadBooks();
  }, [activeTranslationId]);

  useEffect(() => {
    void loadSavedVerses().catch((error) =>
      console.error("Failed to load saved verses:", error),
    );
  }, [loadSavedVerses]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  useEffect(() => {
    setSelectedVerse((prev) => {
      if (!prev) return prev;
      if (prev.bookId !== loadedBook || prev.chapter !== loadedChapter) {
        return null;
      }
      return prev;
    });
  }, [loadedBook, loadedChapter]);

  useEffect(() => {
    let cancelled = false;
    setCurrentBookData(null);
    if (!getTranslationBookIds(activeTranslationId).includes(loadedBook)) {
      const fallback = getTranslationBookIds(activeTranslationId)[0];
      setLoadedBook(fallback);
      setLoadedChapter(1);
      setSelectedVerse(null);
      return;
    }
    const loadBook = async () => {
      setLoading(true);
      setError(null);
      try {
        const bookData = await bibleService.getBook(
          loadedBook,
          activeTranslationId,
        );
        if (!cancelled) {
          setCurrentBookData(bookData);
          setLoadedChapter((chapter) =>
            bookData.chapters.some((entry) => Number(entry.chapter) === chapter)
              ? chapter
              : Number(bookData.chapters[0]?.chapter ?? 1),
          );
        }
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "Failed to load book data",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadBook();
    return () => {
      cancelled = true;
    };
  }, [loadedBook, activeTranslationId]);

  useEffect(() => {
    let cancelled = false;
    setSelectedBookChapters([]);
    if (!getTranslationBookIds(activeTranslationId).includes(selectedBook)) {
      setSelectedBook(getTranslationBookIds(activeTranslationId)[0]);
      setSelectedChapter(1);
      return;
    }
    const loadChapters = async () => {
      try {
        const chapters = await bibleService.getChaptersForBook(
          selectedBook,
          activeTranslationId,
        );
        if (!cancelled) {
          const numbers = chapters.map((chapter) => chapter.number);
          setSelectedBookChapters(numbers);
          if (!numbers.includes(selectedChapter))
            setSelectedChapter(numbers[0] ?? 1);
        }
      } catch (error) {
        if (!cancelled) console.error("Failed to load chapters", error);
      }
    };
    void loadChapters();
    return () => {
      cancelled = true;
    };
  }, [
    selectedBook,
    activeTranslationId,
    selectedChapter,
    setSelectedChapter,
    setSelectedBook,
  ]);

  /** O(1) lookup: `${bookId}-${chapter}-${verse ?? ""}` → BibleBookmark */
  const bookmarksByVerse = useMemo(
    () => bibleBookmarksService.buildVerseMap(bookmarks),
    [bookmarks],
  );

  const currentChapter = useMemo(() => {
    if (!currentBookData?.chapters) return null;
    return currentBookData.chapters.find(
      (chapter) => chapter.chapter === loadedChapter.toString(),
    );
  }, [currentBookData, loadedChapter]);

  const handleBookChange = useCallback(
    (bookId: string) => {
      setSelectedBook(bookId);
      setSelectedChapter(1);
      setLoadedBook(bookId);
      setLoadedChapter(1);
    },
    [setSelectedBook, setSelectedChapter],
  );

  const handleChapterChange = useCallback(
    (chapter: number) => {
      setSelectedChapter(chapter);
      setLoadedChapter(chapter);
    },
    [setSelectedChapter],
  );

  const navigateChapter = useCallback(
    (direction: "prev" | "next") => {
      if (!currentBookData?.chapters) return;

      const currentIndex = currentBookData.chapters.findIndex(
        (chapter) => chapter.chapter === loadedChapter.toString(),
      );

      if (direction === "prev" && currentIndex > 0) {
        const prevChapter = currentBookData.chapters[currentIndex - 1];
        const chapterNum = Number.parseInt(prevChapter.chapter, 10);
        setSelectedChapter(chapterNum);
        setLoadedChapter(chapterNum);
        setChapterScrollToTopNonce((n) => n + 1);
      } else if (
        direction === "next" &&
        currentIndex < currentBookData.chapters.length - 1
      ) {
        const nextChapter = currentBookData.chapters[currentIndex + 1];
        const chapterNum = Number.parseInt(nextChapter.chapter, 10);
        setSelectedChapter(chapterNum);
        setLoadedChapter(chapterNum);
        setChapterScrollToTopNonce((n) => n + 1);
      }
    },
    [currentBookData, loadedChapter, setSelectedChapter],
  );

  const verses = useMemo(() => currentChapter?.verses || [], [currentChapter]);

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
          activeTranslationId,
        );
        await loadSavedVerses();
        toast.success("Success", { description: "Verse saved successfully." });
      } catch (saveErr) {
        console.error("Error saving verse:", saveErr);
        toast.error("Error", {
          description: "Failed to save verse. Please try again.",
        });
      }
    },
    [activeTranslationId, loadSavedVerses],
  );

  const handleSavePassage = useCallback(
    async (
      bookId: string,
      chapter: number,
      verse: string,
      end: PassageReference,
    ) => {
      const start = { bookId, chapter, verse: Number(verse.split("-")[0]) };
      await bibleVersesService.savePassage(start, end, activeTranslationId);
      await loadSavedVerses();
      toast.success("Passage saved", {
        description: formatSavedPassage({
          book_id: bookId,
          chapter,
          verse: String(start.verse),
          end,
        }),
      });
    },
    [activeTranslationId, loadSavedVerses],
  );

  const handleAddVerseToList = useCallback(
    async (
      bookId: string,
      chapter: number,
      verse: string,
      verseText: string,
    ): Promise<string | null> => {
      try {
        const verseId = await bibleVersesService.saveVerse(
          bookId,
          chapter,
          verse,
          verseText,
          activeTranslationId,
        );
        await loadSavedVerses();
        return verseId;
      } catch (err) {
        reportError(err, {
          code: "bible/verse-save-for-lists",
          userMessage: "Failed to save verse. Please try again.",
        });
        return null;
      }
    },
    [activeTranslationId, loadSavedVerses],
  );

  const handleUnsaveVerse = useCallback(
    async (bookId: string, chapter: number, verse: string) => {
      try {
        await bibleVersesService.unsaveVerse(
          bookId,
          chapter,
          verse,
          activeTranslationId,
        );
        await loadSavedVerses();
        toast.success("Success", {
          description: "Verse removed from saved verses.",
        });
      } catch (unsaveErr) {
        console.error("Error unsaving verse:", unsaveErr);
        toast.error("Error", {
          description: "Failed to remove verse. Please try again.",
        });
      }
    },
    [activeTranslationId, loadSavedVerses],
  );

  // ---- Bookmark handlers ----

  const handleAddBookmark = useCallback(
    async (
      bookId: string,
      chapter: number,
      verse: string | null,
      colorHex?: string,
    ) => {
      try {
        await bibleBookmarksService.createBookmark({
          bookId,
          chapter,
          verse,
          colorHex,
        });
        await loadBookmarks();
        toast.success("Bookmark added", {
          description: `${getBookDisplayTitle(bookId)} ${chapter}${
            verse ? `:${verse}` : ""
          }`,
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to add bookmark.";
        toast.error("Error", { description: msg });
      }
    },
    [loadBookmarks],
  );

  const handleDeleteBookmark = useCallback(
    async (id: string) => {
      try {
        await bibleBookmarksService.delete(id);
        await loadBookmarks();
        toast.success("Bookmark removed");
      } catch (err) {
        console.error("Error deleting bookmark:", err);
        toast.error("Error", { description: "Failed to remove bookmark." });
      }
    },
    [loadBookmarks],
  );

  const handleMoveBookmarkTo = useCallback(
    async (
      id: string,
      bookId: string,
      chapter: number,
      verse: string | null,
    ) => {
      try {
        await bibleBookmarksService.moveBookmark(id, bookId, chapter, verse);
        await loadBookmarks();
        toast.success("Bookmark moved", {
          description: `Moved to ${getBookDisplayTitle(bookId)} ${chapter}${
            verse ? `:${verse}` : ""
          }`,
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to move bookmark.";
        toast.error("Error", { description: msg });
      }
    },
    [loadBookmarks],
  );

  const handleRenameBookmark = useCallback(
    async (id: string, name: string | null) => {
      try {
        await bibleBookmarksService.renameBookmark(id, name);
        await loadBookmarks();
      } catch (err) {
        console.error("Error renaming bookmark:", err);
        toast.error("Error", { description: "Failed to rename bookmark." });
      }
    },
    [loadBookmarks],
  );

  const handleRecolorBookmark = useCallback(
    async (id: string, colorHex: string) => {
      try {
        await bibleBookmarksService.recolorBookmark(id, colorHex);
        await loadBookmarks();
      } catch (err) {
        console.error("Error recoloring bookmark:", err);
        toast.error("Error", {
          description: "Failed to update bookmark color.",
        });
      }
    },
    [loadBookmarks],
  );

  const handleGoToBookmark = useCallback(
    (bookmark: BibleBookmark) => {
      navigateToVerse(
        bookmark.book_id,
        bookmark.chapter,
        bookmark.verse ?? "1",
      );
    },
    [navigateToVerse],
  );

  useCollectionChanges(() => {
    void loadBookmarks();
    void loadSavedVerses().catch((error) =>
      console.error("Could not refresh saved verses", error),
    );
  });

  return {
    books,
    selectedBook,
    selectedChapter,
    loadedBook,
    loadedChapter,
    currentBookData,
    selectedBookChapters,
    loading,
    error,
    savedVerses,
    savedRecords,
    selectedVerse,
    bookmarks,
    bookmarksByVerse,
    activeTranslationId,
    verseStyle,
    currentChapter,
    verses,
    handleBookChange,
    handleChapterChange,
    navigateChapter,
    handleSaveVerse,
    handleAddVerseToList,
    handleUnsaveVerse,
    handleSavePassage,
    handleAddBookmark,
    handleDeleteBookmark,
    handleMoveBookmarkTo,
    handleRenameBookmark,
    handleRecolorBookmark,
    handleGoToBookmark,
    navigateToVerse,
    verseScrollNonce,
    chapterScrollToTopNonce,
  };
};
