import type { TranslationId } from "@/bible/translations";
import type { PassageReference } from "@/bible/utils/passage-reference";

export interface LocalRecord {
  id: string;
  created_at: string;
  updated_at: string;
}
export interface SavedVerse extends LocalRecord {
  book_id: string;
  chapter: number;
  verse: string;
  verse_text: string;
  translation: TranslationId;
  end?: PassageReference;
  reference_key?: string;
}
export interface BibleList extends LocalRecord {
  name: string;
  description: string | null;
  is_default: boolean;
  sort_order: number;
}
export interface ListItem {
  list_id: string;
  verse_id: string;
}
export interface BibleBookmark extends LocalRecord {
  book_id: string;
  chapter: number;
  verse: string | null;
  name: string | null;
  color_hex: string;
  location_key: string;
}
