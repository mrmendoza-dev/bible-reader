import coverageData from "./data/translation-coverage.json";
import {
  TRANSLATION_CATALOG,
  TRANSLATION_LANGUAGES,
} from "./translation-catalog";

export const AVAILABLE_TRANSLATIONS = TRANSLATION_CATALOG;

export type TranslationId = keyof typeof AVAILABLE_TRANSLATIONS;
export type SearchScope = TranslationId | "all";
export const TRANSLATION_IDS = Object.keys(
  AVAILABLE_TRANSLATIONS,
) as readonly TranslationId[];
export const DEFAULT_TRANSLATION_ID: TranslationId = "web";

export function isTranslationId(value: unknown): value is TranslationId {
  return (
    typeof value === "string" && Object.hasOwn(AVAILABLE_TRANSLATIONS, value)
  );
}

export function requireTranslationId(
  value: string = DEFAULT_TRANSLATION_ID,
): TranslationId {
  const normalized = value.toLowerCase();
  if (!isTranslationId(normalized)) {
    throw new Error(`Unsupported translation: ${value}`);
  }
  return normalized;
}

export function normalizeTranslationId(value?: string): TranslationId {
  try {
    return requireTranslationId(value);
  } catch {
    return DEFAULT_TRANSLATION_ID;
  }
}

export function normalizeSearchScope(value: string): SearchScope {
  return value === "all" ? "all" : requireTranslationId(value);
}

export const getTranslationLabel = (value: string): string =>
  requireTranslationId(value).toUpperCase();
export function getTranslationFullLabel(value: string): string {
  const id = requireTranslationId(value);
  return `${id.toUpperCase()} - ${AVAILABLE_TRANSLATIONS[id].name}`;
}

export const TRANSLATION_COVERAGE = coverageData as Record<
  TranslationId,
  {
    sourceBooks: string[];
    unavailableBooks: string[];
    unavailableChapters: Record<string, number[]>;
    chapters: number;
    verses: number;
    emptyVerses: number;
  }
>;
export function getTranslationSourceBooks(value: string): string[] {
  return [...TRANSLATION_COVERAGE[requireTranslationId(value)].sourceBooks];
}
export function getTranslationBookIds(value: string): string[] {
  const coverage = TRANSLATION_COVERAGE[requireTranslationId(value)];
  return coverage.sourceBooks.filter(
    (book) => !coverage.unavailableBooks.includes(book),
  );
}
export function getTranslationBookCountLabel(value: string): string {
  const id = requireTranslationId(value);
  const total = TRANSLATION_COVERAGE[id].sourceBooks.length;
  const available = getTranslationBookIds(id).length;
  return available === total
    ? `${total} books`
    : `${available}/${total} books with text`;
}
export function getTranslationOptionLabel(value: string): string {
  return `${getTranslationFullLabel(value)} · ${getTranslationDetailsLabel(value)}`;
}
export function getTranslationDetailsLabel(value: string): string {
  const id = requireTranslationId(value);
  return `${TRANSLATION_LANGUAGES[AVAILABLE_TRANSLATIONS[id].language]} (${AVAILABLE_TRANSLATIONS[id].language.toUpperCase()}) · ${getTranslationBookCountLabel(id)}`;
}
export function isTranslationReferenceAvailable(
  value: string,
  book: string,
  chapter: number,
): boolean {
  const id = requireTranslationId(value);
  return (
    getTranslationBookIds(id).includes(book) &&
    !TRANSLATION_COVERAGE[id].unavailableChapters[book]?.includes(chapter)
  );
}
