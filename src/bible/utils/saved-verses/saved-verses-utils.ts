import {
  getTranslationFullLabel,
  getTranslationLabel,
  normalizeTranslationId,
} from "@/bible/translations";

export const savedVerseScrollId = (verseId: string) => `saved-verse-${verseId}`;

export const translationShortLabel = (translation: string) =>
  getTranslationLabel(normalizeTranslationId(translation));

export const savedVersesTranslationSelectLabel = (translationId: string) =>
  translationId === "all"
    ? "All Translations"
    : getTranslationFullLabel(translationId);
