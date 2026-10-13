import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined,
);

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "bible-reader-theme",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored === "dark" || stored === "light" || stored === "system"
        ? stored
        : defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = (next: Theme) => {
      root.classList.remove("light", "dark");
      const effectiveTheme =
        next === "system" ? (mediaQuery.matches ? "dark" : "light") : next;
      root.classList.add(effectiveTheme);
    };

    // Keep "system" in sync when the OS preference changes.
    const handleSystemThemeChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    applyTheme(theme);
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [theme]);

  const value = {
    theme,
    setTheme: (next: Theme) => {
      setTheme(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch (error) {
        console.warn("Could not persist theme preference", error);
      }
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
