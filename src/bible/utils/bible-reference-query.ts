import type { SearchResult } from "@/bible/services/bible-service";
import { bibleService } from "@/bible/services/bible-service";
import { normalizeSearchScope } from "@/bible/translations";

/**
 * Heuristic matching {@link BibleSearchDialog}: colon references or `Book 3`-style queries
 * before running {@link bibleService.parseBibleReference}.
 */
export const referenceQueryLooksLikeReference = (query: string): boolean => {
  const q = query.trim();
  if (!q) return false;
  return q.includes(":") || /^(\d+)?\s*[a-z]+\s*\d+$/i.test(q);
};

export const firstPassageFromReferenceResults = (
  results: SearchResult[] | null | undefined,
): { bookId: string; chapter: number; verse: string } | null => {
  if (!results?.length) return null;
  const r = results[0];
  return { bookId: r.bookId, chapter: r.chapter, verse: r.verse };
};

/**
 * When the query looks like a passage reference, parse it for the given translation.
 * Skips parsing for translation `"all"` (same as search dialog).
 */
export const parseBibleReferenceWhenLooksLikeReference = async (
  query: string,
  translationId: string,
): Promise<SearchResult[] | null> => {
  const normalized = normalizeSearchScope(translationId);
  if (normalized === "all") return null;

  const trimmed = query.trim();
  if (!trimmed) return null;
  if (!referenceQueryLooksLikeReference(trimmed)) return null;

  return bibleService.parseBibleReference(trimmed, normalized);
};
