/**
 * Bible constants - Testament divisions and book information
 */

export const TESTAMENT_DIVISIONS = {
  OLD_TESTAMENT_BOOK_COUNT: 39,
  NEW_TESTAMENT_START_INDEX: 39,
} as const;

/**
 * Determine if a book belongs to the Old Testament based on its index
 */
export const isOldTestament = (bookIndex: number): boolean => {
  return bookIndex < TESTAMENT_DIVISIONS.OLD_TESTAMENT_BOOK_COUNT;
};

/**
 * Determine if a book belongs to the New Testament based on its index
 */
export const isNewTestament = (bookIndex: number): boolean => {
  return bookIndex >= TESTAMENT_DIVISIONS.NEW_TESTAMENT_START_INDEX;
};

/**
 * Get testament name for a book index
 */
export const getTestamentForBookIndex = (
  bookIndex: number,
): "Old Testament" | "New Testament" => {
  return isOldTestament(bookIndex) ? "Old Testament" : "New Testament";
};

export const BOOKS_LIST: string[] = [
  "genesis",
  "exodus",
  "leviticus",
  "numbers",
  "deuteronomy",
  "joshua",
  "judges",
  "ruth",
  "1-samuel",
  "2-samuel",
  "1-kings",
  "2-kings",
  "1-chronicles",
  "2-chronicles",
  "ezra",
  "nehemiah",
  "esther",
  "job",
  "psalm",
  "proverbs",
  "ecclesiastes",
  "song-of-solomon",
  "isaiah",
  "jeremiah",
  "lamentations",
  "ezekiel",
  "daniel",
  "hosea",
  "joel",
  "amos",
  "obadiah",
  "jonah",
  "micah",
  "nahum",
  "habakkuk",
  "zephaniah",
  "haggai",
  "zechariah",
  "malachi",
  "matthew",
  "mark",
  "luke",
  "john",
  "acts",
  "romans",
  "1-corinthians",
  "2-corinthians",
  "galatians",
  "ephesians",
  "philippians",
  "colossians",
  "1-thessalonians",
  "2-thessalonians",
  "1-timothy",
  "2-timothy",
  "titus",
  "philemon",
  "hebrews",
  "james",
  "1-peter",
  "2-peter",
  "1-john",
  "2-john",
  "3-john",
  "jude",
  "revelation",
];

/** Joiners that stay lowercase when not the first segment (e.g. Song of Solomon). */
const BOOK_DISPLAY_TITLE_SMALL_WORDS = new Set(["of", "and", "or", "the"]);

export const BOOKMARK_COLORS = [
  { id: "blue", hex: "#3B82F6", label: "Blue" },
  { id: "gold", hex: "#EAB308", label: "Gold" },
  { id: "green", hex: "#22C55E", label: "Green" },
  { id: "red", hex: "#EF4444", label: "Red" },
  { id: "purple", hex: "#A855F7", label: "Purple" },
  { id: "orange", hex: "#F97316", label: "Orange" },
  { id: "pink", hex: "#EC4899", label: "Pink" },
  { id: "gray", hex: "#6B7280", label: "Gray" },
] as const;

export const DEFAULT_BOOKMARK_COLOR = BOOKMARK_COLORS[0].hex;

/**
 * Canonical book id (see {@link BOOKS_LIST}, e.g. `2-timothy`) → human-readable title for UI.
 * Storage, APIs, and verse keys keep using the id; use this only for display.
 */
export const getBookDisplayTitle = (bookId: string): string => {
  const segments = bookId.split("-").filter((s) => s.length > 0);
  if (segments.length === 0) return bookId;

  return segments
    .map((segment, index) => {
      const lower = segment.toLowerCase();
      if (/^\d+$/.test(lower)) return lower;
      if (index > 0 && BOOK_DISPLAY_TITLE_SMALL_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
};
