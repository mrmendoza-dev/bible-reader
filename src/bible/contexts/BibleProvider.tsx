import type { ReactNode } from "react";
import { isReadingFontStyle } from "@/bible/reading-fonts";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { FontSize, FontStyle } from "./BibleContext";
import { BibleContext } from "./BibleContext";

interface BibleProviderProps {
  children: ReactNode;
}

export const BibleProvider = ({ children }: BibleProviderProps) => {
  const [fontStyle, setFontStyle] = useLocalStorage<FontStyle>(
    "bible:font-style",
    "sans",
    undefined,
    isReadingFontStyle,
  );
  const [fontSize, setFontSize] = useLocalStorage<FontSize>(
    "bible:font-size",
    "base",
    undefined,
    (value) =>
      typeof value === "string" &&
      ["sm", "base", "lg", "xl", "2xl"].includes(value),
  );

  return (
    <BibleContext.Provider
      value={{
        fontStyle,
        fontSize,
        setFontStyle,
        setFontSize,
      }}
    >
      {children}
    </BibleContext.Provider>
  );
};
