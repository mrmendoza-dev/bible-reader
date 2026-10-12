import type { Book } from "@apps/production/bible-app/components/saved-verses/types";
import {
  type FontSize,
  useBibleContext,
} from "@apps/production/bible-app/contexts/BibleContext";
import {
  type BibleList,
  bibleListsService,
} from "@apps/production/bible-app/services/bible-lists-service";
import { bibleService } from "@apps/production/bible-app/services/bible-service";
import {
  bibleSupabaseService,
  getVerseKey,
  type SavedVerse,
} from "@apps/production/bible-app/services/bible-verses-service";
import {
  DEFAULT_TRANSLATION_ID,
  normalizeTranslationId,
} from "@apps/production/bible-app/translations";
import { buildGroupedVerses } from "@apps/production/bible-app/utils/saved-verses/group-saved-verses";
import { savedVerseScrollId } from "@apps/production/bible-app/utils/saved-verses/saved-verses-utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type UseSavedVersesScreenArgs = {
  onBackToReader?: () => void;
};

export const useSavedVersesScreen = ({
  onBackToReader,
}: UseSavedVersesScreenArgs) => {
  const { fontStyle, fontSize } = useBibleContext();
  const [books, setBooks] = useState<Book[]>([]);
  const [allVerses, setAllVerses] = useState<SavedVerse[]>([]);
  const [versesByListId, setVersesByListId] = useState<
    Map<string, Set<string>>
  >(() => new Map());
  const [savedVerseKeys, setSavedVerseKeys] = useState<Set<string>>(new Set());
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<{
    bookId: string;
    chapter: number;
    verse: string;
  } | null>(null);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedTranslation, setSelectedTranslation] = useState<string>("all");
  const [selectedListId, setSelectedListId] = useState<string>("all");
  const [lists, setLists] = useState<BibleList[]>([]);
  const [listManagerOpen, setListManagerOpen] = useState(false);
  const [activeVerseId, setActiveVerseId] = useState<string | null>(null);

  const fontFamilyStyle = useMemo(
    () =>
      fontStyle === "serif"
        ? { fontFamily: "Georgia, 'Times New Roman', serif" }
        : { fontFamily: "system-ui, -apple-system, sans-serif" },
    [fontStyle],
  );

  const fontSizeOptions: Record<FontSize, string> = {
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
  };
  const fontSizeStyle = useMemo(
    () => ({ fontSize: fontSizeOptions[fontSize] }),
    [fontSize],
  );

  const verseStyle = useMemo(
    () => ({ ...fontFamilyStyle, ...fontSizeStyle }),
    [fontFamilyStyle, fontSizeStyle],
  );

  useEffect(() => {
    const loadBooks = async () => {
      try {
        const booksList = await bibleService.getBooksList();
        setBooks(booksList);
      } catch (err) {
        console.error("Failed to load books list:", err);
        setError("Failed to load books list");
      }
    };

    loadBooks();
  }, []);

  const loadSavedData = useCallback(async (options?: { refresh?: boolean }) => {
    if (options?.refresh) {
      setRefreshing(true);
    } else {
      setInitialLoading(true);
    }

    try {
      const verseLists = await bibleListsService.getLists();
      const verses = await bibleListsService.getVersesForListFilter("all");

      const membershipEntries = await Promise.all(
        verseLists.map(async (list) => {
          const verseIds = await bibleListsService.getVerseIdsForList(list.id);
          return [list.id, new Set(verseIds)] as const;
        }),
      );

      setLists(verseLists);
      setAllVerses(verses);
      setVersesByListId(new Map(membershipEntries));

      setError(null);
    } catch (err) {
      console.error("Failed to load saved verses:", err);
      setError("Failed to load saved verses");
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSavedData();
  }, [loadSavedData]);

  useEffect(() => {
    if (
      selectedListId !== "all" &&
      lists.length > 0 &&
      !lists.some((list) => list.id === selectedListId)
    ) {
      setSelectedListId("all");
    }
  }, [lists, selectedListId]);

  const savedVerses = useMemo(() => {
    if (selectedListId === "all") return allVerses;
    const verseIds = versesByListId.get(selectedListId);
    if (!verseIds) return [];
    return allVerses.filter((verse) => verseIds.has(verse.id));
  }, [allVerses, selectedListId, versesByListId]);

  useEffect(() => {
    const keys = new Set(
      savedVerses.map((v) =>
        getVerseKey(v.book_id, v.chapter, v.verse, v.translation),
      ),
    );
    setSavedVerseKeys(keys);
  }, [savedVerses]);

  const availableTranslations = useMemo(() => {
    const translations = new Set<string>();
    savedVerses.forEach((verse) => {
      const translation = normalizeTranslationId(verse.translation);
      if (translation === "all") return;
      translations.add(translation);
    });
    return Array.from(translations).sort();
  }, [savedVerses]);

  const filteredVerses = useMemo(() => {
    if (selectedTranslation === "all") return savedVerses;
    return savedVerses.filter(
      (verse) =>
        normalizeTranslationId(verse.translation) === selectedTranslation,
    );
  }, [savedVerses, selectedTranslation]);

  const groupedVerses = useMemo(
    () => buildGroupedVerses(filteredVerses, books),
    [filteredVerses, books],
  );

  const sortedOldTestamentBooks = useMemo(() => {
    return Object.keys(groupedVerses.oldTestament).sort((a, b) => {
      const indexA = books.findIndex((book) => book.id === a);
      const indexB = books.findIndex((book) => book.id === b);
      return indexA - indexB;
    });
  }, [groupedVerses.oldTestament, books]);

  const sortedNewTestamentBooks = useMemo(() => {
    return Object.keys(groupedVerses.newTestament).sort((a, b) => {
      const indexA = books.findIndex((book) => book.id === a);
      const indexB = books.findIndex((book) => book.id === b);
      return indexA - indexB;
    });
  }, [groupedVerses.newTestament, books]);

  const allOutlineBookIds = useMemo(
    () => [...sortedOldTestamentBooks, ...sortedNewTestamentBooks],
    [sortedOldTestamentBooks, sortedNewTestamentBooks],
  );

  const [openSidebarBookIds, setOpenSidebarBookIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    setOpenSidebarBookIds(new Set(allOutlineBookIds));
  }, [allOutlineBookIds]);

  const handleSidebarBookOpenChange = useCallback(
    (bookId: string, nextOpen: boolean) => {
      setOpenSidebarBookIds((prev) => {
        const next = new Set(prev);
        if (nextOpen) next.add(bookId);
        else next.delete(bookId);
        return next;
      });
    },
    [],
  );

  const expandAllSidebarBooks = useCallback(() => {
    setOpenSidebarBookIds(new Set(allOutlineBookIds));
  }, [allOutlineBookIds]);

  const collapseAllSidebarBooks = useCallback(() => {
    setOpenSidebarBookIds(new Set());
  }, []);

  const handleUnsaveVerse = useCallback(
    async (
      bookId: string,
      chapter: number,
      verse: string,
      translation: string = DEFAULT_TRANSLATION_ID,
    ) => {
      try {
        const normalizedTranslation = normalizeTranslationId(translation);
        await bibleSupabaseService.unsaveVerse(
          bookId,
          chapter,
          verse,
          normalizedTranslation,
        );

        let removedId: string | null = null;
        setAllVerses((prev) => {
          const match = prev.find(
            (v) =>
              v.book_id === bookId &&
              v.chapter === chapter &&
              v.verse === verse &&
              normalizeTranslationId(v.translation) === normalizedTranslation,
          );
          removedId = match?.id ?? null;
          return prev.filter((v) => v.id !== removedId);
        });
        if (removedId) {
          const id = removedId;
          setVersesByListId((prev) => {
            const next = new Map(prev);
            for (const [listId, verseIds] of next) {
              if (verseIds.has(id)) {
                const updated = new Set(verseIds);
                updated.delete(id);
                next.set(listId, updated);
              }
            }
            return next;
          });
        }

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
    [],
  );

  const openNoteForVerse = useCallback((v: SavedVerse) => {
    setSelectedVerse({
      bookId: v.book_id,
      chapter: v.chapter,
      verse: v.verse,
    });
    setNoteDialogOpen(true);
  }, []);

  const handleBackToReader = useCallback(() => {
    onBackToReader?.();
  }, [onBackToReader]);

  const jumpToSavedVerse = useCallback((verseId: string) => {
    setActiveVerseId(verseId);
    requestAnimationFrame(() => {
      document
        .getElementById(savedVerseScrollId(verseId))
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const unsaveSavedVerseRow = useCallback(
    (v: SavedVerse) =>
      handleUnsaveVerse(
        v.book_id,
        v.chapter,
        v.verse,
        normalizeTranslationId(v.translation),
      ),
    [handleUnsaveVerse],
  );

  return {
    error,
    initialLoading,
    refreshing,
    savedVerses,
    filteredVerses,
    availableTranslations,
    selectedTranslation,
    setSelectedTranslation,
    selectedListId,
    setSelectedListId,
    lists,
    listManagerOpen,
    setListManagerOpen,
    reloadSavedData: () => loadSavedData({ refresh: true }),
    groupedVerses,
    sortedOldTestamentBooks,
    sortedNewTestamentBooks,
    allOutlineBookIds,
    openSidebarBookIds,
    handleSidebarBookOpenChange,
    expandAllSidebarBooks,
    collapseAllSidebarBooks,
    verseStyle,
    savedVerseKeys,
    activeVerseId,
    jumpToSavedVerse,
    noteDialogOpen,
    setNoteDialogOpen,
    selectedVerse,
    unsaveSavedVerseRow,
    openNoteForVerse,
    handleBackToReader,
  };
};
