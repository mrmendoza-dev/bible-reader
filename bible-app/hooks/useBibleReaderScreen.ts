import { getBookDisplayTitle } from "@apps/production/bible-app/constants";
import { useBibleContext } from "@apps/production/bible-app/contexts/BibleContext";
import {
  type BibleBookmark,
  bibleBookmarksService,
} from "@apps/production/bible-app/services/bible-bookmarks-service";
import { bibleService } from "@apps/production/bible-app/services/bible-service";
import {
  bibleSupabaseService,
  getVerseKey,
} from "@apps/production/bible-app/services/bible-verses-service";
import {
  DEFAULT_TRANSLATION_ID,
  normalizeTranslationId,
} from "@apps/production/bible-app/translations";
import type {
  BibleReaderProps,
  Book,
  BookData,
} from "@apps/production/bible-app/types/bible-reader";
import { reportError } from "@omni/app-contracts/errors/error-sink";
import { useAuth } from "@omni/services/contexts/auth/AuthContext";
import { useLocalStorage } from "@omni/services/hooks/useLocalStorage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type BibleReaderScreenArgs = Pick<BibleReaderProps, "translationId">;

export const useBibleReaderScreen = ({
  translationId = DEFAULT_TRANSLATION_ID,
}: BibleReaderScreenArgs) => {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useLocalStorage(
    "selectedBook",
    "genesis",
  );
  const [selectedChapter, setSelectedChapter] = useLocalStorage<number>(
    "selectedChapter",
    1,
  );
  const [loadedBook, setLoadedBook] = useState<string>("genesis");
  const [loadedChapter, setLoadedChapter] = useState<number>(1);
  const [currentBookData, setCurrentBookData] = useState<BookData | null>(null);
  const [selectedBookChapters, setSelectedBookChapters] = useState<number[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedVerses, setSavedVerses] = useState<Set<string>>(new Set());
  const [selectedVerse, setSelectedVerse] = useState<{
    bookId: string;
    chapter: number;
    verse: string;
  } | null>(null);
  const [verseScrollNonce, setVerseScrollNonce] = useState(0);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<BibleBookmark[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { fontStyle, fontSize } = useBibleContext();
  const activeTranslationId = normalizeTranslationId(translationId);

  const handleSettingsSave = useCallback(() => {}, []);

  const fontFamilyStyle =
    fontStyle === "serif"
      ? { fontFamily: "Georgia, 'Times New Roman', serif" }
      : { fontFamily: "system-ui, -apple-system, sans-serif" };

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
    if (!user?.uid) return;
    try {
      const data = await bibleBookmarksService.getAllBookmarks();
      setBookmarks(data);
    } catch (err) {
      console.error("Failed to load bookmarks:", err);
    }
  }, [user?.uid]);

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
    const loadSavedVerses = async () => {
      try {
        const savedVerseKeys = await bibleSupabaseService.getSavedVerseKeys();
        setSavedVerses(savedVerseKeys);
      } catch (err) {
        console.error("Failed to load saved verses:", err);
      }
    };
    loadSavedVerses();
  }, [loadedBook, activeTranslationId]);

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
    const loadBook = async () => {
      setLoading(true);
      setError(null);
      try {
        const bookData = await bibleService.getBook(
          loadedBook,
          activeTranslationId,
        );
        setCurrentBookData(bookData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load book data",
        );
      } finally {
        setLoading(false);
      }
    };
    loadBook();
  }, [loadedBook, activeTranslationId]);

  useEffect(() => {
    const loadChapters = async () => {
      try {
        const chapters = await bibleService.getChaptersForBook(
          selectedBook,
          activeTranslationId,
        );
        setSelectedBookChapters(chapters.map((c) => c.number));
      } catch (err) {
        console.error("Failed to load chapters:", err);
      }
    };
    loadChapters();
  }, [selectedBook, activeTranslationId]);

  /** O(1) lookup: `${bookId}-${chapter}-${verse ?? ""}` → BibleBookmark */
  const bookmarksByVerse = useMemo(
    () => bibleBookmarksService.buildVerseMap(bookmarks),
    [bookmarks],
  );

  const handleLoadChapter = useCallback(async () => {
    setLoadedBook(selectedBook);
    setLoadedChapter(selectedChapter);
  }, [selectedBook, selectedChapter]);

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
    },
    [setSelectedBook, setSelectedChapter],
  );

  const handleChapterChange = useCallback(
    (chapter: number) => {
      setSelectedChapter(chapter);
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
      } else if (
        direction === "next" &&
        currentIndex < currentBookData.chapters.length - 1
      ) {
        const nextChapter = currentBookData.chapters[currentIndex + 1];
        const chapterNum = Number.parseInt(nextChapter.chapter, 10);
        setSelectedChapter(chapterNum);
        setLoadedChapter(chapterNum);
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
        await bibleSupabaseService.saveVerse(
          bookId,
          chapter,
          verse,
          verseText,
          activeTranslationId,
        );
        const verseKey = getVerseKey(
          bookId,
          chapter,
          verse,
          activeTranslationId,
        );
        setSavedVerses((prev) => new Set([...prev, verseKey]));
        toast.success("Success", { description: "Verse saved successfully." });
      } catch (saveErr) {
        console.error("Error saving verse:", saveErr);
        toast.error("Error", {
          description: "Failed to save verse. Please try again.",
        });
      }
    },
    [activeTranslationId],
  );

  const handleAddVerseToList = useCallback(
    async (
      bookId: string,
      chapter: number,
      verse: string,
      verseText: string,
    ): Promise<string | null> => {
      if (!user?.uid) {
        toast.error("Sign in required", {
          description: "Sign in to organize saved verses into lists.",
        });
        return null;
      }

      try {
        const verseId = await bibleSupabaseService.saveVerse(
          bookId,
          chapter,
          verse,
          verseText,
          activeTranslationId,
        );
        const verseKey = getVerseKey(
          bookId,
          chapter,
          verse,
          activeTranslationId,
        );
        setSavedVerses((prev) => new Set([...prev, verseKey]));
        return verseId;
      } catch (err) {
        reportError(err, {
          code: "bible/verse-save-for-lists",
          userMessage: "Failed to save verse. Please try again.",
        });
        return null;
      }
    },
    [activeTranslationId, user?.uid],
  );

  const handleUnsaveVerse = useCallback(
    async (bookId: string, chapter: number, verse: string) => {
      try {
        await bibleSupabaseService.unsaveVerse(
          bookId,
          chapter,
          verse,
          activeTranslationId,
        );
        const verseKey = getVerseKey(
          bookId,
          chapter,
          verse,
          activeTranslationId,
        );
        setSavedVerses((prev) => {
          const newSet = new Set(prev);
          newSet.delete(verseKey);
          return newSet;
        });
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
    [activeTranslationId],
  );

  const handleAddNote = useCallback(() => {
    setNoteDialogOpen(true);
  }, []);

  const handleVerseAddNote = useCallback(
    (verseNum: string) => {
      setSelectedVerse({
        bookId: loadedBook,
        chapter: loadedChapter,
        verse: verseNum,
      });
      handleAddNote();
    },
    [loadedBook, loadedChapter, handleAddNote],
  );

  // ---- Bookmark handlers ----

  const handleAddBookmark = useCallback(
    async (
      bookId: string,
      chapter: number,
      verse: string | null,
      colorHex?: string,
    ) => {
      if (!user?.uid) {
        toast.error("Error", {
          description: "Please sign in to use bookmarks.",
        });
        return;
      }
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
    [user?.uid, loadBookmarks],
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
    selectedVerse,
    noteDialogOpen,
    setNoteDialogOpen,
    bookmarks,
    bookmarksByVerse,
    settingsOpen,
    setSettingsOpen,
    activeTranslationId,
    verseStyle,
    currentChapter,
    verses,
    handleSettingsSave,
    handleLoadChapter,
    handleBookChange,
    handleChapterChange,
    navigateChapter,
    handleSaveVerse,
    handleAddVerseToList,
    handleUnsaveVerse,
    handleVerseAddNote,
    handleAddBookmark,
    handleDeleteBookmark,
    handleMoveBookmarkTo,
    handleRenameBookmark,
    handleRecolorBookmark,
    handleGoToBookmark,
    navigateToVerse,
    verseScrollNonce,
  };
};
