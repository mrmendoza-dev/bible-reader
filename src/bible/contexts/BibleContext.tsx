import { createContext, useContext } from "react";

import type { FontStyle } from "@/bible/reading-fonts";

export type { FontStyle } from "@/bible/reading-fonts";
export type FontSize = "sm" | "base" | "lg" | "xl" | "2xl";

interface BibleContextType {
  fontStyle: FontStyle;
  fontSize: FontSize;
  setFontStyle: (style: FontStyle) => void;
  setFontSize: (size: FontSize) => void;
}

export const BibleContext = createContext<BibleContextType | undefined>(
  undefined,
);

export const useBibleContext = () => {
  const context = useContext(BibleContext);
  if (!context) {
    throw new Error("useBibleContext must be used within a BibleProvider");
  }
  return context;
};
