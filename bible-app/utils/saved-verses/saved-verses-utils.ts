import {
  AVAILABLE_TRANSLATIONS,
  getTranslationLabel,
  normalizeTranslationId,
  TRANSLATION_NAMES,
} from "@apps/production/bible-app/translations";

export const savedVerseScrollId = (verseId: string) => `saved-verse-${verseId}`;

export const translationShortLabel = (translation: string) => {
  const normalized = normalizeTranslationId(translation);
  const known = AVAILABLE_TRANSLATIONS.find((t) => t.id === normalized);
  if (known) return known.label;
  const full = TRANSLATION_NAMES[normalized] || getTranslationLabel(normalized);
  const compact = normalized
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 4)
    .toUpperCase();
  return (
    full.length <= 5 ? full : compact || normalized.slice(0, 4)
  ).toUpperCase();
};

export const savedVersesTranslationSelectLabel = (translationId: string) =>
  translationId === "all"
    ? "All Translations"
    : AVAILABLE_TRANSLATIONS.find((t) => t.id === translationId)?.fullLabel ||
      TRANSLATION_NAMES[translationId] ||
      getTranslationLabel(translationId);
