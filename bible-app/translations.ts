/**
 * Bible translation catalog + id helpers. Extracted from `contexts/BibleContext.tsx`
 * so that file stays a clean React Fast Refresh boundary (components + hooks
 * only) — this is plain data with no React dependency.
 */
export type TranslationCategory = "Literal" | "Balanced" | "Readable";
export type TranslationFamily =
  | "KJV Family"
  | "Legacy Literal"
  | "Tyndale Lineage"
  | "Evangelical Modern";

/** Canonical default translation id — the only place this string is declared. */
export const DEFAULT_TRANSLATION_ID = "kjv";

// Helper function to group translations by family
export const groupTranslationsByFamily = () => {
  const grouped = new Map<
    TranslationFamily,
    Array<{
      id: string;
      label: string;
      fullLabel: string;
      category: TranslationCategory;
      family: TranslationFamily;
      readingLevel: number;
    }>
  >();

  for (const translation of AVAILABLE_TRANSLATIONS) {
    const family = translation.family;
    const bucket = grouped.get(family) ?? [];
    bucket.push(translation);
    grouped.set(family, bucket);
  }

  return grouped;
};

export const AVAILABLE_TRANSLATIONS = [
  {
    id: "kjv",
    label: "KJV",
    fullLabel: "KJV - King James Version",
    category: "Literal",
    family: "KJV Family",
    readingLevel: 10,
  },
  {
    id: "nkjv",
    label: "NKJV",
    fullLabel: "NKJV - New King James Version",
    category: "Literal",
    family: "KJV Family",
    readingLevel: 7,
  },
  {
    id: "mev",
    label: "MEV",
    fullLabel: "MEV - Modern English Version",
    category: "Literal",
    family: "KJV Family",
    readingLevel: 6,
  },

  {
    id: "nasb",
    label: "NASB",
    fullLabel: "NASB - New American Standard Bible",
    category: "Literal",
    family: "Legacy Literal",
    readingLevel: 8,
  },
  {
    id: "asv",
    label: "ASV",
    fullLabel: "ASV - American Standard Version",
    category: "Literal",
    family: "Legacy Literal",
    readingLevel: 9,
  },
  {
    id: "ylt",
    label: "YLT",
    fullLabel: "YLT - Young's Literal Translation",
    category: "Literal",
    family: "Legacy Literal",
    readingLevel: 9,
  },
  {
    id: "web",
    label: "WEB",
    fullLabel: "WEB - World English Bible",
    category: "Literal",
    family: "Legacy Literal",
    readingLevel: 6,
  },

  {
    id: "esv",
    label: "ESV",
    fullLabel: "ESV - English Standard Version",
    category: "Balanced",
    family: "Tyndale Lineage",
    readingLevel: 7,
  },
  {
    id: "nrsv",
    label: "NRSV",
    fullLabel: "NRSV - New Revised Standard Version",
    category: "Balanced",
    family: "Tyndale Lineage",
    readingLevel: 7,
  },

  {
    id: "csb",
    label: "CSB",
    fullLabel: "CSB - Christian Standard Bible",
    category: "Balanced",
    family: "Evangelical Modern",
    readingLevel: 5,
  },
  {
    id: "net",
    label: "NET",
    fullLabel: "NET - New English Translation",
    category: "Balanced",
    family: "Evangelical Modern",
    readingLevel: 6,
  },

  {
    id: "niv",
    label: "NIV",
    fullLabel: "NIV - New International Version",
    category: "Readable",
    family: "Evangelical Modern",
    readingLevel: 5,
  },
] as const;

export const capitalizeTranslationId = (value: string): string =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const AVAILABLE_TRANSLATION_IDS: Set<string> = new Set(
  AVAILABLE_TRANSLATIONS.map((translation) => translation.id),
);

export const normalizeTranslationId = (value?: string): string => {
  if (!value) return DEFAULT_TRANSLATION_ID;
  const normalized = value.toLowerCase();
  if (normalized === "all") return "all";
  return AVAILABLE_TRANSLATION_IDS.has(normalized)
    ? normalized
    : DEFAULT_TRANSLATION_ID;
};

export const getTranslationLabel = (translationId: string): string =>
  capitalizeTranslationId(normalizeTranslationId(translationId));

// Translation ID to display name mapping (derived from AVAILABLE_TRANSLATIONS)
export const TRANSLATION_NAMES: Record<string, string> = Object.fromEntries(
  AVAILABLE_TRANSLATIONS.map((translation) => [
    translation.id,
    getTranslationLabel(translation.id),
  ]),
) as Record<string, string>;
