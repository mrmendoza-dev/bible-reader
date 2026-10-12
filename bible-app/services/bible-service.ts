import {
  BOOKS_LIST,
  getBookDisplayTitle,
} from "@apps/production/bible-app/constants";
import {
  AVAILABLE_TRANSLATIONS,
  DEFAULT_TRANSLATION_ID,
  normalizeTranslationId,
} from "@apps/production/bible-app/translations";
import { assetUrl } from "@omni/app-contracts/runtime/app-runtime";

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

// Translation data format: chapter-keyed object with verse-keyed objects
type TranslationBookData = Record<string, Record<string, string>>;

class BibleService {
  private static instance: BibleService;
  private loadedBooks: Map<string, BibleData> = new Map();
  private loadingPromises: Map<string, Promise<BibleData>> = new Map();
  private booksList: BooksList | null = null;
  private booksListLoadingPromise: Promise<BooksList> | null = null;

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

  /**
   * Convert translation data (chapter-keyed object) to BibleData format
   */
  private convertTranslationDataToBibleData(
    bookTitle: string,
    translationData: TranslationBookData,
  ): BibleData {
    const chapters: Chapter[] = [];

    // Sort chapters by number
    const chapterNumbers = Object.keys(translationData)
      .map((ch) => Number.parseInt(ch, 10))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    for (const chapterNum of chapterNumbers) {
      const chapterKey = chapterNum.toString();
      const versesData = translationData[chapterKey];
      if (!versesData) continue;

      const verses: Verse[] = [];
      const verseNumbers = Object.keys(versesData)
        .map((v) => Number.parseInt(v, 10))
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);

      for (const verseNum of verseNumbers) {
        const verseKey = verseNum.toString();
        const verseText = versesData[verseKey];
        if (verseText) {
          verses.push({
            verse: verseKey,
            text: verseText,
          });
        }
      }

      chapters.push({
        chapter: chapterKey,
        verses,
      });
    }

    return {
      book: getBookDisplayTitle(bookTitle),
      chapters,
    };
  }

  // Load the books list (lightweight, ~1KB)
  // Note: translationId parameter kept for API consistency, but all translations use the same book list
  public async loadBooksList(
    _translationId: string = DEFAULT_TRANSLATION_ID,
  ): Promise<BooksList> {
    if (this.booksList) {
      return this.booksList;
    }

    if (this.booksListLoadingPromise) {
      return this.booksListLoadingPromise;
    }

    this.booksListLoadingPromise = (async () => {
      this.booksList = BOOKS_LIST;
      return this.booksList!;
    })();

    return this.booksListLoadingPromise;
  }

  // Load a specific book on demand
  public async loadBook(
    bookId: string,
    translationId: string = DEFAULT_TRANSLATION_ID,
  ): Promise<BibleData> {
    const normalizedTranslationId = normalizeTranslationId(translationId);
    const cacheKey = `${normalizedTranslationId}:${bookId}`;

    // If already loaded, return cached data
    if (this.loadedBooks.has(cacheKey)) {
      return this.loadedBooks.get(cacheKey)!;
    }

    // If already loading, return the existing promise
    if (this.loadingPromises.has(cacheKey)) {
      return this.loadingPromises.get(cacheKey)!;
    }

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
  ): Promise<BibleData> {
    try {
      const normalizedTranslationId = normalizeTranslationId(translationId);
      const translationFolder = normalizedTranslationId;

      const fileName = this.bookTitleToFileName(bookId);
      const url = assetUrl(
        `/bible/data/translations/${translationFolder}/${fileName}.json`,
      );

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Translation file not found: ${url} (${response.status})`,
        );
      }
      const rawData = await response.json();

      // All translations use the format: { "Book Name": { "chapter": { "verse": "text" } } }
      // Some may have an "Info" key, so we skip it
      let translationData: TranslationBookData;
      if (typeof rawData === "object" && rawData !== null) {
        // Find the book data by matching the bookId (skip "Info" key if present)
        const bookKey = Object.keys(rawData).find(
          (key) => key !== "Info" && key.toLowerCase() === bookId.toLowerCase(),
        );
        if (bookKey) {
          translationData = rawData[bookKey] as TranslationBookData;
        } else {
          // Fallback: use first non-Info key if exact match not found
          const firstKey = Object.keys(rawData).find((key) => key !== "Info");
          if (firstKey) {
            translationData = rawData[firstKey] as TranslationBookData;
          } else {
            throw new Error(
              `Could not find book data for "${bookId}" in translation "${translationId}"`,
            );
          }
        }
      } else {
        throw new Error(
          `Invalid data format for "${bookId}" in translation "${translationId}"`,
        );
      }

      // Convert to BibleData format
      return this.convertTranslationDataToBibleData(bookId, translationData);
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
    if (!book || !book.chapters || book.chapters.length === 0) return null;

    return (
      book.chapters.find(
        (chapter) => chapter.chapter === chapterNumber.toString(),
      ) || null
    );
  }

  public async getBooksList(
    translationId: string = DEFAULT_TRANSLATION_ID,
  ): Promise<Array<{ id: string; title: string; chapters: number }>> {
    const normalizedTranslationId = normalizeTranslationId(translationId);
    const booksList = await this.loadBooksList(normalizedTranslationId);

    // Chapter counts come from loaded book files via getChaptersForBook — no index.json on CDN.
    return booksList.map((bookName) => ({
      id: bookName,
      title: getBookDisplayTitle(bookName),
      chapters: 0,
    }));
  }

  public async getChaptersForBook(
    bookId: string,
    translationId: string = DEFAULT_TRANSLATION_ID,
  ): Promise<Array<{ number: number; title: string }>> {
    const book = await this.getBook(bookId, translationId);
    if (!book || !book.chapters || book.chapters.length === 0) return [];

    return book.chapters.map((chapter) => ({
      number: Number.parseInt(chapter.chapter, 10),
      title: `Chapter ${chapter.chapter}`,
    }));
  }

  public clearCache() {
    this.loadedBooks.clear();
    this.loadingPromises.clear();
    this.booksList = null;
    this.booksListLoadingPromise = null;
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
      chapter.verses.find((verse) => verse.verse === verseNumber.toString()) ||
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

  // Get a random verse (random book → chapter → verse). Retries a few books in case a
  // given translation is missing some, returning null only if nothing loads.
  public async getRandomVerse(
    translationId: string = DEFAULT_TRANSLATION_ID,
  ): Promise<SearchResult | null> {
    const normalizedTranslationId = normalizeTranslationId(translationId);
    const booksList = await this.loadBooksList(normalizedTranslationId);
    if (booksList.length === 0) return null;

    const pick = <T>(arr: T[]): T =>
      arr[Math.floor(Math.random() * arr.length)];

    for (let attempt = 0; attempt < 5; attempt++) {
      const bookId = pick(booksList);
      try {
        const bookData = await this.loadBook(bookId, normalizedTranslationId);
        const chaptersWithVerses = bookData.chapters.filter(
          (c) => c.verses.length > 0,
        );
        if (chaptersWithVerses.length === 0) continue;

        const chapter = pick(chaptersWithVerses);
        const verse = pick(chapter.verses);
        return {
          bookId,
          bookTitle: bookData.book,
          chapter: Number.parseInt(chapter.chapter, 10),
          verse: verse.verse,
          text: verse.text,
          relevanceScore: 100,
          translation: normalizedTranslationId,
        };
      } catch {
        // Book missing for this translation — try another.
      }
    }

    return null;
  }

  // Get cache statistics
  public getCacheStats() {
    return {
      loadedBooks: Array.from(this.loadedBooks.keys()),
      loadedBooksCount: this.loadedBooks.size,
      booksListLoaded: this.booksList !== null,
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
    const wordBoundaryRegex = new RegExp(`\\b${lowerQuery}\\b`, "i");
    if (wordBoundaryRegex.test(lowerText)) {
      return 100;
    }

    // Start of word match
    const startOfWordRegex = new RegExp(`\\b${lowerQuery}`, "i");
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
        isNaN(chapter) ||
        isNaN(startVerse) ||
        isNaN(endChapter) ||
        isNaN(endVerse)
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
            (verse) => Number.parseInt(verse.verse, 10) >= startVerse,
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
    if (isNaN(chapter)) {
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
          for (let v = startVerse; v <= endVerse; v++) {
            const verse = chapterData.verses.find(
              (verse) => verse.verse === v.toString(),
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

  // Search the Bible for a query
  public async searchBible(
    query: string,
    bookFilter?: string,
    translationId: string = DEFAULT_TRANSLATION_ID,
  ): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    const normalizedTranslationId = normalizeTranslationId(translationId);

    // If translationId is "all", search across all available translations
    if (normalizedTranslationId === "all") {
      return this.searchBibleAllTranslations(query, bookFilter);
    }

    const results: SearchResult[] = [];
    const booksList = await this.loadBooksList(normalizedTranslationId);

    // Determine which books to search
    const booksToSearch = bookFilter ? [bookFilter] : booksList; // Use full titles now

    // Load all books in parallel
    const bookDataPromises = booksToSearch.map((bookId) =>
      this.loadBook(bookId, normalizedTranslationId).catch((error) => {
        // Only log errors that aren't missing file errors (which are expected for some translations)
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes("Translation file not found")) {
          console.error(
            `Failed to load book ${bookId} from ${normalizedTranslationId}:`,
            error,
          );
        }
        return null;
      }),
    );

    const booksData = await Promise.all(bookDataPromises);

    // Search through all verses
    booksData.forEach((bookData, index) => {
      if (!bookData) return;

      const bookId = booksToSearch[index];
      const bookTitle = bookData.book;

      bookData.chapters.forEach((chapter) => {
        chapter.verses.forEach((verse) => {
          const score = this.calculateRelevanceScore(verse.text, query);
          if (score > 0) {
            results.push({
              bookId,
              bookTitle,
              chapter: Number.parseInt(chapter.chapter, 10),
              verse: verse.verse,
              text: verse.text,
              relevanceScore: score,
              translation: normalizedTranslationId,
            });
          }
        });
      });
    });

    // Sort by relevance score (descending), then by biblical order
    results.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      // If same score, maintain biblical order
      const aIndex = booksToSearch.indexOf(a.bookId);
      const bIndex = booksToSearch.indexOf(b.bookId);
      if (aIndex !== bIndex) return aIndex - bIndex;
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return Number.parseInt(a.verse, 10) - Number.parseInt(b.verse, 10);
    });

    return results;
  }

  // Search across all available translations
  private async searchBibleAllTranslations(
    query: string,
    bookFilter?: string,
  ): Promise<SearchResult[]> {
    // Get translation IDs from AVAILABLE_TRANSLATIONS
    const translations = AVAILABLE_TRANSLATIONS.map((t) => t.id);

    // Search all translations in parallel
    const searchPromises = translations.map((translationId) =>
      this.searchBible(query, bookFilter, translationId).catch((error) => {
        // Only log unexpected errors (missing translations are handled gracefully)
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes("Translation file not found")) {
          console.error(`Failed to search ${translationId}:`, error);
        }
        return [] as SearchResult[];
      }),
    );

    const allResults = await Promise.all(searchPromises);

    // Flatten and combine all results
    const combinedResults = allResults.flat();

    // Get books list for sorting
    const booksList = await this.loadBooksList(DEFAULT_TRANSLATION_ID);

    // Sort by relevance score (descending), then by translation, then by biblical order
    combinedResults.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      // If same score, sort by translation for grouping
      const transA = a.translation || "";
      const transB = b.translation || "";
      if (transA !== transB) return transA.localeCompare(transB);
      // Then by biblical order
      const aIndex = booksList.indexOf(a.bookId);
      const bIndex = booksList.indexOf(b.bookId);
      if (aIndex !== bIndex && aIndex !== -1 && bIndex !== -1)
        return aIndex - bIndex;
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return Number.parseInt(a.verse, 10) - Number.parseInt(b.verse, 10);
    });

    return combinedResults;
  }
}

export const bibleService = BibleService.getInstance();
export type { BibleData, BooksList, Chapter, SearchResult, Verse };
