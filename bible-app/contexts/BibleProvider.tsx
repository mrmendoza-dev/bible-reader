import { useLocalStorage } from "@omni/services/hooks/useLocalStorage";
import type { ReactNode } from "react";
import type { FontSize, FontStyle } from "./BibleContext";
import { BibleContext } from "./BibleContext";

interface BibleProviderProps {
  children: ReactNode;
}

export const BibleProvider = ({ children }: BibleProviderProps) => {
  const [fontStyle, setFontStyle] = useLocalStorage<FontStyle>(
    "bible-font-style",
    "sans",
  );
  const [fontSize, setFontSize] = useLocalStorage<FontSize>(
    "bible-font-size",
    "base",
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
