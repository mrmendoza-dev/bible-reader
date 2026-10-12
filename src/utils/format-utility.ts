// Number, currency, and text formatting utilities
export interface CurrencyFormatOptions {
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useExponential?: boolean;
}

export interface NumberFormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  locale?: string;
}

export interface AbbreviationOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Format currency with flexible options and automatic precision
 */
export const formatCurrency = (
  value: number | string | null | undefined,
  options: CurrencyFormatOptions = {},
): string => {
  const {
    currency = "USD",
    minimumFractionDigits = 0,
    maximumFractionDigits,
    useExponential = false,
  } = options;

  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && Number.isNaN(Number(value)))
  ) {
    return "--";
  }

  const numValue = typeof value === "string" ? Number(value) : value;

  if (Number.isNaN(numValue)) {
    return "--";
  }

  const autoMaxFractionDigits = (() => {
    if (Math.abs(numValue) >= 1) return 2;
    if (Math.abs(numValue) >= 0.1) return 3;
    if (Math.abs(numValue) >= 0.01) return 4;
    if (Math.abs(numValue) >= 0.001) return 5;
    return 8;
  })();

  try {
    // For very small numbers, use exponential notation if the flag is true
    if (useExponential && Math.abs(numValue) < 0.001) {
      // Extract currency symbol
      const currencySymbol = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
        .format(0)
        .replace(/0/g, "")
        .trim();

      // Format the number with scientific notation
      const formattedNumber = new Intl.NumberFormat("en-US", {
        notation: "scientific",
        minimumFractionDigits,
        maximumFractionDigits: maximumFractionDigits ?? 4,
      }).format(numValue);

      return `${currencySymbol}${formattedNumber}`;
    }

    // Regular currency formatting
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits,
      maximumFractionDigits: maximumFractionDigits ?? autoMaxFractionDigits,
    }).format(numValue);
  } catch (error) {
    console.error("Error formatting currency:", error);
    return "--";
  }
};

/**
 * Format numbers with automatic precision and locale support
 */
export const formatNumber = (
  value: number | string | null | undefined,
  options: NumberFormatOptions = {},
): string => {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits,
    locale = "en-US",
  } = options;

  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && Number.isNaN(Number(value)))
  ) {
    return "--";
  }

  const numValue = typeof value === "string" ? Number(value) : value;

  if (Number.isNaN(numValue)) {
    return "--";
  }

  const autoMaxFractionDigits = (() => {
    if (Math.abs(numValue) >= 1) return 2;
    if (Math.abs(numValue) >= 0.1) return 3;
    if (Math.abs(numValue) >= 0.01) return 4;
    if (Math.abs(numValue) >= 0.001) return 5;
    return 8;
  })();

  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits: maximumFractionDigits ?? autoMaxFractionDigits,
    }).format(numValue);
  } catch (error) {
    console.error("Error formatting number:", error);
    return "--";
  }
};

/**
 * Abbreviate large numbers with K, M, B, T suffixes
 */
export const abbreviateNumber = (
  number: number | null | undefined,
  options: AbbreviationOptions = {},
): string => {
  const { minimumFractionDigits = 0, maximumFractionDigits = 0 } = options;

  if (number === null || number === undefined || Number.isNaN(number)) {
    return "--";
  }

  const absNumber = Math.abs(number);
  const abbreviations = [
    { value: 1e12, symbol: "T" },
    { value: 1e9, symbol: "B" },
    { value: 1e6, symbol: "M" },
    { value: 1e3, symbol: "K" },
  ];

  const abbreviation = abbreviations.find((item) => absNumber >= item.value);

  if (abbreviation) {
    const abbreviated = number / abbreviation.value;
    return (
      formatNumber(abbreviated, {
        minimumFractionDigits,
        maximumFractionDigits,
      }) + abbreviation.symbol
    );
  }

  return formatNumber(number, { minimumFractionDigits, maximumFractionDigits });
};

/**
 * Format wallet addresses with prefix and suffix
 */
export const formatAddress = (
  address: string | null | undefined,
  prefixLength: number = 6,
  suffixLength: number = 4,
): string => {
  if (!address) {
    return "No address found";
  }

  if (address.length <= prefixLength + suffixLength + 3) {
    return address;
  }

  const prefix = address.slice(0, prefixLength);
  const suffix = address.slice(-suffixLength);
  return `${prefix}...${suffix}`;
};

/**
 * Split address into prefix, middle, and suffix parts
 */
export const splitAddress = (
  address: string,
): {
  prefix: string;
  middle: string;
  suffix: string;
} => {
  const prefix = address.slice(0, 6);
  const suffix = address.slice(-4);
  const middle = address.slice(6, -4);

  return { prefix, middle, suffix };
};

/**
 * Capitalize first letter of a string
 */
export const capitalize = (str: string): string => {
  if (typeof str !== "string") return "";
  if (!str) return str;
  const trimmedStr = str.trim();
  if (trimmedStr.length === 1) return trimmedStr.toUpperCase();
  return trimmedStr.charAt(0).toUpperCase() + trimmedStr.slice(1).toLowerCase();
};

/**
 * Format category names with special cases (DeFi, NFT, etc.)
 */
export const formatProper = (category: string): string => {
  if (typeof category !== "string") return "";
  if (!category) return category;

  const trimmedCategory = category.trim().toLowerCase();

  // Handle special cases
  const specialCases: Record<string, string> = {
    defi: "DeFi",
    nft: "NFT",
    dao: "DAO",
    dex: "DEX",
    cefi: "CeFi",
  };

  if (specialCases[trimmedCategory]) {
    return specialCases[trimmedCategory];
  }

  // Handle hyphenated words - capitalize each part
  if (trimmedCategory.includes("-")) {
    return trimmedCategory
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("-");
  }

  // Handle regular words - just capitalize first letter
  return trimmedCategory.charAt(0).toUpperCase() + trimmedCategory.slice(1);
};

/**
 * Convert YouTube URL to embed URL
 */
export const convertToEmbedURL = (youtubeURL: string): string => {
  try {
    const url = new URL(youtubeURL);
    const videoId = url.searchParams.get("v");
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return "";
  } catch (error) {
    console.error("Invalid YouTube URL:", error);
    return "";
  }
};

/**
 * Remove protocol from URL
 */
export const stripProtocol = (url: string): string => {
  return url.replace(/^(https?:\/\/)/, "");
};

/**
 * Normalize unix timestamp to seconds from milliseconds
 */
export const normalizeUnixTime = (timestamp: number): number => {
  if (timestamp.toString().length === 13) {
    return Math.floor(timestamp / 1000);
  }
  return timestamp;
};

/**
 * Sort array of strings alphabetically
 */
export const sortAlphabetically = (array: string[]): string[] => {
  // Check if the input is an array
  if (!Array.isArray(array)) {
    console.error("sortAlphabetically: Input is not an array");
    return [];
  }

  // Filter out non-string elements and sort the remaining strings
  return array
    .filter((item) => typeof item === "string")
    .sort((a: string, b: string) => {
      try {
        return a.toLowerCase().localeCompare(b.toLowerCase());
      } catch (error) {
        console.error("sortAlphabetically: Error comparing strings", error);
        return 0; // Return 0 to keep the order unchanged in case of error
      }
    });
};
