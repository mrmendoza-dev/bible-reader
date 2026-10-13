export const READING_FONT_GROUPS = [
  {
    label: "Sans",
    fonts: [
      {
        value: "sans",
        label: "System Sans",
        family: "system-ui, -apple-system, sans-serif",
      },
      {
        value: "geist",
        label: "Geist",
        family: '"Geist Variable", sans-serif',
      },
      {
        value: "inter",
        label: "Inter",
        family: '"Inter Variable", sans-serif',
      },
      {
        value: "noto-sans",
        label: "Noto Sans",
        family: '"Noto Sans Variable", sans-serif',
      },
      {
        value: "nunito-sans",
        label: "Nunito Sans",
        family: '"Nunito Sans Variable", sans-serif',
      },
      {
        value: "figtree",
        label: "Figtree",
        family: '"Figtree Variable", sans-serif',
      },
      {
        value: "roboto",
        label: "Roboto",
        family: '"Roboto Variable", sans-serif',
      },
      {
        value: "raleway",
        label: "Raleway",
        family: '"Raleway Variable", sans-serif',
      },
      {
        value: "dm-sans",
        label: "DM Sans",
        family: '"DM Sans Variable", sans-serif',
      },
      {
        value: "public-sans",
        label: "Public Sans",
        family: '"Public Sans Variable", sans-serif',
      },
      {
        value: "outfit",
        label: "Outfit",
        family: '"Outfit Variable", sans-serif',
      },
      {
        value: "oxanium",
        label: "Oxanium",
        family: '"Oxanium Variable", sans-serif',
      },
      {
        value: "manrope",
        label: "Manrope",
        family: '"Manrope Variable", sans-serif',
      },
      {
        value: "space-grotesk",
        label: "Space Grotesk",
        family: '"Space Grotesk Variable", sans-serif',
      },
      {
        value: "montserrat",
        label: "Montserrat",
        family: '"Montserrat Variable", sans-serif',
      },
      {
        value: "ibm-plex-sans",
        label: "IBM Plex Sans",
        family: '"IBM Plex Sans Variable", sans-serif',
      },
      {
        value: "source-sans-3",
        label: "Source Sans 3",
        family: '"Source Sans 3 Variable", sans-serif',
      },
      {
        value: "instrument-sans",
        label: "Instrument Sans",
        family: '"Instrument Sans Variable", sans-serif',
      },
    ],
  },
  {
    label: "Serif",
    fonts: [
      {
        value: "serif",
        label: "Georgia",
        family: "Georgia, 'Times New Roman', serif",
      },
      {
        value: "noto-serif",
        label: "Noto Serif",
        family: '"Noto Serif Variable", serif',
      },
      {
        value: "roboto-slab",
        label: "Roboto Slab",
        family: '"Roboto Slab Variable", serif',
      },
      {
        value: "merriweather",
        label: "Merriweather",
        family: '"Merriweather Variable", serif',
      },
      { value: "lora", label: "Lora", family: '"Lora Variable", serif' },
      {
        value: "playfair-display",
        label: "Playfair Display",
        family: '"Playfair Display Variable", serif',
      },
      {
        value: "eb-garamond",
        label: "EB Garamond",
        family: '"EB Garamond Variable", serif',
      },
      {
        value: "instrument-serif",
        label: "Instrument Serif",
        family: '"Instrument Serif", serif',
      },
    ],
  },
] as const;

export const READING_FONTS = READING_FONT_GROUPS.flatMap((group) => [
  ...group.fonts,
]);

export type FontStyle = (typeof READING_FONTS)[number]["value"];

export const isReadingFontStyle = (value: unknown): value is FontStyle =>
  READING_FONTS.some((font) => font.value === value);

export const getReadingFontFamily = (value: FontStyle): string =>
  READING_FONTS.find((font) => font.value === value)?.family ??
  "system-ui, sans-serif";
