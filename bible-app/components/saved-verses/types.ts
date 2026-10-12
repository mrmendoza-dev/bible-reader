import type { SavedVerse } from "@apps/production/bible-app/services/bible-verses-service";
import type { CSSProperties } from "react";

export interface SavedVersesProps {
  onBackToReader?: () => void;
}

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
  onAddNote: (verse: SavedVerse) => void;
  onAddToList: (verse: SavedVerse) => void;
};
