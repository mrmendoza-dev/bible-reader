export interface Book {
  id: string;
  title: string;
  chapters: number;
}

export interface Verse {
  verse: string;
  text: string;
}

export interface Chapter {
  chapter: string;
  verses: Verse[];
}

export interface BookData {
  book: string;
  chapters: Chapter[];
}

export interface BibleReaderRef {
  navigateToVerse: (bookId: string, chapter: number, verse: string) => void;
}

export interface BibleReaderProps {
  translationId?: string;
  onTranslationChange?: (translationId: string) => void;
}
