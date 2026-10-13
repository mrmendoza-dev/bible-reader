import type { CSSProperties } from "react";
import type { SavedVerse } from "@/bible/services/bible-verses-service";

export interface Book {
  id: string;
  title: string;
  chapters: number;
}

export interface GroupedVerses {
  oldTestament: {
    [bookId: string]: {
      bookTitle: string;
      chapters: {
        [chapter: string]: SavedVerse[];
      };
    };
  };
  newTestament: {
    [bookId: string]: {
      bookTitle: string;
      chapters: {
        [chapter: string]: SavedVerse[];
      };
    };
  };
}

export type TestamentBookMap = GroupedVerses["oldTestament"];

export type SavedVerseRowProps = {
  verse: SavedVerse;
  activeVerseId: string | null;
  verseStyle: CSSProperties;
  savedVerseKeys: Set<string>;
  onUnsave: (verse: SavedVerse) => void;
  onAddToList: (verse: SavedVerse) => void;
};
