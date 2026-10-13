import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Theme } from "@/contexts/ThemeContext";
import { useTheme } from "@/contexts/ThemeContext";

function useIsDarkMode(theme: Theme): boolean {
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  if (theme === "dark") return true;
  if (theme === "light") return false;
  return systemPrefersDark;
}

export function ThemeControls() {
  const { theme, setTheme } = useTheme();
  const isDark = useIsDarkMode(theme);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
