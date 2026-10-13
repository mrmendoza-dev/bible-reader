import { bibleAssetUrl } from "@/bible/bible-assets";
import { ALL_BOOK_IDS, getBookDisplayTitle } from "@/bible/constants";
import {
  SEARCH_BOOK_CONCURRENCY,
  SEARCH_RESULT_LIMIT,
} from "@/bible/search-limits";
import { getBookChapterCount } from "@/bible/storage/validation";
import {
  DEFAULT_TRANSLATION_ID,
  getTranslationBookIds,
  normalizeSearchScope,
  requireTranslationId,
  TRANSLATION_IDS,
} from "@/bible/translations";
import {
  parseTranslationBook,
  verseContains,
} from "@/bible/utils/translation-data";

interface Verse {
  verse: string;
  text: string;
}

interface Chapter {
  chapter: string;
  verses: Verse[];
}

interface BibleData {
  book: string;
  chapters: Chapter[];
}

interface SearchResult {
  bookId: string;
  bookTitle: string;
  chapter: number;
  verse: string;
  text: string;
  relevanceScore: number;
  translation?: string;
}

// Books list is now a simple array of strings
type BooksList = string[];

class BibleService {
  private static instance: BibleService;
  private loadedBooks: Map<string, BibleData> = new Map();
  private loadingPromises: Map<string, Promise<BibleData>> = new Map();
  private booksListLoaded = false;

  private constructor() {}

  public static getInstance(): BibleService {
    if (!BibleService.instance) {
      BibleService.instance = new BibleService();
    }
    return BibleService.instance;
  }

  /**
   * Convert a book title to a file name for importing
   * All translations now use spaces in file names: "1 Corinthians" -> "1 Corinthians"
   */
  private bookTitleToFileName(bookTitle: string): string {
    // bookId is already the kebab-case file stem (e.g. "1-corinthians") — see BOOKS_LIST
    return bookTitle;
  }

  public async loadBooksList(
    translationId: string = DEFAULT_TRANSLATION_ID,
  ): Promise<BooksList> {
    const books = getTranslationBookIds(translationId);
    this.booksListLoaded = true;
    return books;
  }

  public async getAllBooksList() {
    const available = new Set(TRANSLATION_IDS.flatMap(getTranslationBookIds));
    return ALL_BOOK_IDS.filter((id) => available.has(id)).map((id) => ({
      id,
      title: getBookDisplayTitle(id),
      chapters: getBookChapterCount(id),
    }));
  }

  // Load a specific book on demand
  public async loadBook(
    bookId: string,
    translationId: string = DEFAULT_TRANSLATION_ID,
  ): Promise<BibleData> {
    if (!ALL_BOOK_IDS.includes(bookId))
      throw new Error(`Unknown book: ${bookId}`);
    const normalizedTranslationId = requireTranslationId(translationId);
    if (!getTranslationBookIds(normalizedTranslationId).includes(bookId))
      throw new Error(
        `Book ${bookId} is unavailable in ${normalizedTranslationId}`,
      );
    const cacheKey = `${normalizedTranslationId}:${bookId}`;

    // If already loaded, return cached data
    const cached = this.loadedBooks.get(cacheKey);
    if (cached) return cached;

    // If already loading, return the existing promise
    const pending = this.loadingPromises.get(cacheKey);
    if (pending) return pending;

    // Start loading
    const loadingPromise = this.fetchBook(bookId, normalizedTranslationId);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const bookData = await loadingPromise;
      this.loadedBooks.set(cacheKey, bookData);
      return bookData;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  private async fetchBook(
    bookId: string,
    translationId: string = DEFAULT_TRANSLATION_ID,
    signal?: AbortSignal,
  ): Promise<BibleData> {
    try {
      const normalizedTranslationId = requireTranslationId(translationId);
      const translationFolder = normalizedTranslationId;

      const fileName = this.bookTitleToFileName(bookId);
      const url = bibleAssetUrl(
        `/bible/data/translations/${translationFolder}/${fileName}.json`,
      );

      const response = await (signal ? fetch(url, { signal }) : fetch(url));
      if (!response.ok) {
        throw new Error(
          `Translation file not found: ${url} (${response.status})`,
        );
      }
      if (!(response.headers.get("content-type") ?? "").includes("json")) {
        throw new Error(
          `Translation data is unavailable: ${url}. Add the selected translation files and retry.`,
        );
      }
      const rawData: unknown = await response.json();

      const parsed = parseTranslationBook(bookId, rawData);
      return {
        ...parsed,
        chapters: parsed.chapters.filter((chapter) =>
          chapter.verses.some((verse) => verse.text.trim()),
        ),
      };
    } catch (error) {
      throw new Error(
        `Failed to load book "${bookId}" from translation "${translationId}": ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  public async getBook(
    bookId: string,
    translationId: string = DEFAULT_TRANSLATION_ID,
  ): Promise<BibleData> {
    return await this.loadBook(bookId, translationId);
  }

  public async getChapter(
    bookId: string,
    chapterNumber: number,
    translationId: string = DEFAULT_TRANSLATION_ID,
  ): Promise<Chapter | null> {
    const book = await this.getBook(bookId, translationId);
    if (!book?.chapters?.length) return null;

    return (
      book.chapters.find(
        (chapter) => chapter.chapter === chapterNumber.toString(),
      ) || null
    );
  }

  public async getBooksList(
    translationId: string = DEFAULT_TRANSLATION_ID,
  ): Promise<Array<{ id: string; title: string; chapters: number }>> {
    const normalizedTranslationId = requireTranslationId(translationId);
    const booksList = await this.loadBooksList(normalizedTranslationId);

    return booksList.map((bookName) => ({
      id: bookName,
      title: getBookDisplayTitle(bookName),
      chapters: getBookChapterCount(bookName),
    }));
  }

  public async getChaptersForBook(
    bookId: string,
    translationId: string = DEFAULT_TRANSLATION_ID,
  ): Promise<Array<{ number: number; title: string }>> {
    const book = await this.getBook(bookId, translationId);
    if (!book?.chapters?.length) return [];

    return book.chapters.map((chapter) => ({
      number: Number.parseInt(chapter.chapter, 10),
      title: `Chapter ${chapter.chapter}`,
    }));
  }

  public clearCache() {
    this.loadedBooks.clear();
    this.loadingPromises.clear();
    this.booksListLoaded = false;
  }

  // Get a specific verse
  public async getVerse(
    bookId: string,
    chapterNumber: number,
    verseNumber: number,
    translationId: string = DEFAULT_TRANSLATION_ID,
  ): Promise<Verse | null> {
    const chapter = await this.getChapter(bookId, chapterNumber, translationId);
    if (!chapter) return null;

    return (
      chapter.verses.find((verse) => verseContains(verse.verse, verseNumber)) ||
      null
    );
  }

  // Get all verses for a chapter
  public async getVersesForChapter(
    bookId: string,
    chapterNumber: number,
    translationId: string = DEFAULT_TRANSLATION_ID,
  ): Promise<Verse[]> {
    const chapter = await this.getChapter(bookId, chapterNumber, translationId);
    return chapter ? chapter.verses : [];
  }

  // Get cache statistics
  public getCacheStats() {
    return {
      loadedBooks: Array.from(this.loadedBooks.keys()),
      loadedBooksCount: this.loadedBooks.size,
      booksListLoaded: this.booksListLoaded,
    };
  }

  // Calculate relevance score for a verse based on search query
  private calculateRelevanceScore(verseText: string, query: string): number {
    const lowerText = verseText.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // No match
    if (!lowerText.includes(lowerQuery)) {
      return 0;
    }

    // Exact word match (whole word with word boundaries)
    const literalQuery = lowerQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const wordBoundaryRegex = new RegExp(`\\b${literalQuery}\\b`, "i");
    if (wordBoundaryRegex.test(lowerText)) {
      return 100;
    }

    // Start of word match
    const startOfWordRegex = new RegExp(`\\b${literalQuery}`, "i");
    if (startOfWordRegex.test(lowerText)) {
      return 50;
    }

    // Substring match (lowest priority)
    return 10;
  }

  // Normalize book name for matching (ignore spaces and hyphens, lowercase)
  private normalizeBookName(bookName: string): string {
    return bookName.replace(/[\s-]+/g, "").toLowerCase();
  }

  // Find book by matching normalized name
  private findBookByName(
    inputBookName: string,
    booksList: BooksList,
  ): { id: string; title: string } | null {
    const normalizedInput = this.normalizeBookName(inputBookName);

    for (const bookTitle of booksList) {
      const normalizedBook = this.normalizeBookName(bookTitle);
      if (normalizedInput === normalizedBook) {
        return {
          id: bookTitle,
          title: getBookDisplayTitle(bookTitle),
        };
      }
    }

    return null;
  }

  // Parse Bible reference (e.g., "John 3:16", "John 3:16-18", "John 3:30-4:2", "John 3")
  public async parseBibleReference(
    query: string,
    translationId: string = DEFAULT_TRANSLATION_ID,
  ): Promise<SearchResult[] | null> {
    if (!query.trim()) {
      return null;
    }

    const booksList = await this.loadBooksList(translationId);

    const trimmedQuery = query.trim();

    // Check for cross-chapter range first (e.g., "John 3:30-4:2")
    // Pattern: book chapter:verse-chapter:verse
    const crossChapterPattern =
      /^(\d+)?\s*([a-z]+)\s*(\d+):(\d+)-(\d+):(\d+)$/i;
    const crossChapterMatch = trimmedQuery.match(crossChapterPattern);

    if (crossChapterMatch) {
      const [
        ,
        leadingNumber,
        bookNamePart,
        chapterStr,
        verseStartStr,
        crossChapterStr,
        crossVerseStr,
      ] = crossChapterMatch;

      // Construct full book name
      const fullBookName = leadingNumber
        ? `${leadingNumber} ${bookNamePart}`
        : bookNamePart;

      // Find matching book
      const book = this.findBookByName(fullBookName, booksList);
      if (!book) {
        return null;
      }

      const chapter = Number.parseInt(chapterStr, 10);
      const startVerse = Number.parseInt(verseStartStr, 10);
      const endChapter = Number.parseInt(crossChapterStr, 10);
      const endVerse = Number.parseInt(crossVerseStr, 10);

      if (
        Number.isNaN(chapter) ||
        Number.isNaN(startVerse) ||
        Number.isNaN(endChapter) ||
        Number.isNaN(endVerse)
      ) {
        return null;
      }

      const results: SearchResult[] = [];

      try {
        const bookData = await this.loadBook(book.id, translationId);

        // Get verses from start chapter
        const startChapterData = await this.getChapter(
          book.id,
          chapter,
          translationId,
        );
        if (startChapterData) {
          const startChapterVerses = startChapterData.verses.filter(
            (verse) => Number(verse.verse.split("-").at(-1)) >= startVerse,
          );
          startChapterVerses.forEach((verse) => {
            results.push({
              bookId: book.id,
              bookTitle: bookData.book,
              chapter,
              verse: verse.verse,
              text: verse.text,
              relevanceScore: 100,
            });
          });
        }

        // Get verses from end chapter
        if (endChapter > chapter) {
          const endChapterData = await this.getChapter(
            book.id,
            endChapter,
            translationId,
          );
          if (endChapterData) {
            const endChapterVerses = endChapterData.verses.filter(
              (verse) => Number.parseInt(verse.verse, 10) <= endVerse,
            );
            endChapterVerses.forEach((verse) => {
              results.push({
                bookId: book.id,
                bookTitle: bookData.book,
                chapter: endChapter,
                verse: verse.verse,
                text: verse.text,
                relevanceScore: 100,
              });
            });
          }

          // Get all chapters in between
          for (let c = chapter + 1; c < endChapter; c++) {
            const middleChapterData = await this.getChapter(
              book.id,
              c,
              translationId,
            );
            if (middleChapterData) {
              middleChapterData.verses.forEach((verse) => {
                results.push({
                  bookId: book.id,
                  bookTitle: bookData.book,
                  chapter: c,
                  verse: verse.verse,
                  text: verse.text,
                  relevanceScore: 100,
                });
              });
            }
          }
        }

        return results.length > 0 ? results : null;
      } catch (error) {
        console.error("Error parsing cross-chapter Bible reference:", error);
        return null;
      }
    }

    // Pattern to match regular Bible references with flexible spacing
    // Matches: "John 3:16", "john3:16", "1Kings 4:6", "2kings2:3", "John 3:16-18", "John 3"
    // Groups:
    // 1: Optional leading number (for "1 Kings", "2 Samuel")
    // 2: Book name (letters only)
    // 3: Chapter number
    // 4: Optional verse number (single verse) - requires colon
    // 5: Optional end verse (for range like "16-18")
    const referencePattern =
      /^(\d+)?\s*([a-z]+)\s*(\d+)(?::(\d+)(?:-(\d+))?)?$/i;

    const match = trimmedQuery.match(referencePattern);
    if (!match) {
      return null;
    }

    const [
      ,
      leadingNumber,
      bookNamePart,
      chapterStr,
      verseStartStr,
      verseEndStr,
    ] = match;

    // Construct full book name
    const fullBookName = leadingNumber
      ? `${leadingNumber} ${bookNamePart}`
      : bookNamePart;

    // Find matching book
    const book = this.findBookByName(fullBookName, booksList);
    if (!book) {
      return null;
    }

    const chapter = Number.parseInt(chapterStr, 10);
    if (Number.isNaN(chapter)) {
      return null;
    }

    const results: SearchResult[] = [];

    try {
      const bookData = await this.loadBook(book.id, translationId);

      // Case 1: Chapter only (e.g., "John 3")
      if (!verseStartStr) {
        const chapterData = await this.getChapter(
          book.id,
          chapter,
          translationId,
        );
        if (chapterData) {
          chapterData.verses.forEach((verse) => {
            results.push({
              bookId: book.id,
              bookTitle: bookData.book,
              chapter,
              verse: verse.verse,
              text: verse.text,
              relevanceScore: 100,
            });
          });
        }
        return results.length > 0 ? results : null;
      }

      // Case 2: Single verse (e.g., "John 3:16")
      if (verseStartStr && !verseEndStr) {
        const verseNum = Number.parseInt(verseStartStr, 10);
        const verse = await this.getVerse(
          book.id,
          chapter,
          verseNum,
          translationId,
        );
        if (verse) {
          results.push({
            bookId: book.id,
            bookTitle: bookData.book,
            chapter,
            verse: verse.verse,
            text: verse.text,
            relevanceScore: 100,
          });
          return results;
        }
        return null;
      }

      // Case 3: Verse range within same chapter (e.g., "John 3:16-18")
      if (verseStartStr && verseEndStr) {
        const startVerse = Number.parseInt(verseStartStr, 10);
        const endVerse = Number.parseInt(verseEndStr, 10);
        const chapterData = await this.getChapter(
          book.id,
          chapter,
          translationId,
        );

        if (chapterData && startVerse <= endVerse) {
          for (const verse of chapterData.verses) {
            const [first, last = first] = verse.verse.split("-").map(Number);
            if (first <= endVerse && last >= startVerse) {
              results.push({
                bookId: book.id,
                bookTitle: bookData.book,
                chapter,
                verse: verse.verse,
                text: verse.text,
                relevanceScore: 100,
              });
            }
          }
          return results.length > 0 ? results : null;
        }
        return null;
      }

      return null;
    } catch (error) {
      console.error("Error parsing Bible reference:", error);
      return null;
    }
  }

  // Search in bounded batches and stop collecting at the result limit.
  public async searchBible(
    query: string,
    bookFilter?: string,
    translationId: string = DEFAULT_TRANSLATION_ID,
    options: { signal?: AbortSignal } = {},
  ): Promise<SearchResult[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];
    const { signal } = options;
    signal?.throwIfAborted();
    const scope = normalizeSearchScope(translationId);
    const translations = scope === "all" ? TRANSLATION_IDS : [scope];
    const tasks = translations.flatMap((translation) =>
      getTranslationBookIds(translation)
        .filter((bookId) => !bookFilter || bookId === bookFilter)
        .map((bookId) => ({ bookId, translation })),
    );
    const results: SearchResult[] = [];

    search: for (
      let offset = 0;
      offset < tasks.length;
      offset += SEARCH_BOOK_CONCURRENCY
    ) {
      signal?.throwIfAborted();
      const batch = tasks.slice(offset, offset + SEARCH_BOOK_CONCURRENCY);
      let books: BibleData[];
      try {
        books = await Promise.all(
          batch.map(({ bookId, translation }) => {
            const key = `${translation}:${bookId}`;
            // Reuse reader data, but do not retain entire search corpora in its cache.
            return (
              this.loadedBooks.get(key) ??
              this.loadingPromises.get(key) ??
              this.fetchBook(bookId, translation, signal)
            );
          }),
        );
      } catch {
        signal?.throwIfAborted();
        throw new Error(
          "Search could not load all selected books. Check the translation files or offline availability and retry.",
        );
      }
      signal?.throwIfAborted();
      for (const [index, book] of books.entries()) {
        const { bookId, translation } = batch[index];
        for (const chapter of book.chapters) {
          for (const verse of chapter.verses) {
            const score = this.calculateRelevanceScore(
              verse.text,
              trimmedQuery,
            );
            if (score <= 0) continue;
            results.push({
              bookId,
              bookTitle: book.book,
              chapter: Number(chapter.chapter),
              verse: verse.verse,
              text: verse.text,
              relevanceScore: score,
              translation,
            });
            if (results.length === SEARCH_RESULT_LIMIT) break search;
          }
        }
      }
      // Let the browser paint and handle cancellation between batches, even with cached books.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    signal?.throwIfAborted();
    const bookOrder = new Map(ALL_BOOK_IDS.map((id, index) => [id, index]));
    results.sort(
      (a, b) =>
        b.relevanceScore - a.relevanceScore ||
        (scope === "all"
          ? (a.translation ?? "").localeCompare(b.translation ?? "")
          : 0) ||
        (bookOrder.get(a.bookId) ?? 0) - (bookOrder.get(b.bookId) ?? 0) ||
        a.chapter - b.chapter ||
        Number.parseInt(a.verse, 10) - Number.parseInt(b.verse, 10),
    );
    return results;
  }
}

export const bibleService = BibleService.getInstance();
export type { BibleData, BooksList, Chapter, SearchResult, Verse };
