import { Bookmark, Search } from "lucide-react";
import { type CSSProperties, useState } from "react";
import { BrowserRouter, Link, NavLink } from "react-router-dom";
import { Toaster } from "sonner";
import { BackupControls } from "@/bible/components/BackupControls";
import { BibleApp } from "@/bible/components/BibleApp";
import { ReadingSettingsControls } from "@/bible/components/ReadingSettingsControls";
import { TranslationAttributionControls } from "@/bible/components/TranslationAttributionControls";
import { BibleProvider } from "@/bible/contexts/BibleProvider";
import {
  ReaderChromeProvider,
  useOptionalReaderChrome,
} from "@/bible/contexts/ReaderChromeContext";
import { BIBLE_NAV_ROUTES } from "@/bible/types/bible-app";
import { ErrorBoundary } from "@/components/feedback/ErrorBoundary";
import { ThemeControls } from "@/components/ThemeControls";
import { Button } from "@/components/ui/button";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

const AppShell = () => {
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const { theme } = useTheme();
  const readerChrome = useOptionalReaderChrome();

  return (
    <>
      <main className="flex h-full min-h-0 flex-col">
        <header className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b px-4 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/"
              className="flex h-8 shrink-0 items-center gap-2 rounded-md text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              aria-label="Bible Reader home"
            >
              <img
                src={`${import.meta.env.BASE_URL}images/logo.png`}
                alt=""
                width={32}
                height={32}
                className="size-8 shrink-0 rounded-sm object-contain"
              />
              <h1 className="hidden font-semibold sm:block">Bible Reader</h1>
            </Link>
            <nav aria-label="Main" className="flex items-center gap-0.5">
              {BIBLE_NAV_ROUTES.map(({ id, label, path }) => (
                <NavLink
                  key={id}
                  to={path}
                  end
                  className={({ isActive }) =>
                    cn(
                      "inline-flex h-7 shrink-0 items-center justify-center rounded-md px-2.5 text-[0.8rem] font-medium transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      isActive ? "bg-muted text-foreground" : "bg-transparent",
                    )
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {readerChrome && (
              <Button
                variant="outline"
                size="sm"
                aria-label="Bookmarks"
                onClick={readerChrome.openBookmarks}
                className="relative flex items-center gap-2 whitespace-nowrap"
              >
                <Bookmark className="h-4 w-4" />
                <span className="hidden md:inline">Bookmarks</span>
                {readerChrome.bookmarkCount > 0 && (
                  <span className="ml-0.5 text-xs font-semibold tabular-nums">
                    {readerChrome.bookmarkCount}
                  </span>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              aria-label="Search the Bible"
              onClick={() => setSearchDialogOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span className="hidden md:inline">Search</span>
            </Button>
            <ReadingSettingsControls />
            <TranslationAttributionControls />
            <BackupControls />
            <ThemeControls />
            <a
              href="https://github.com/mrmendoza-dev/bible-reader"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Bible Reader on GitHub"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="sr-only">GitHub</span>
              <svg
                viewBox="0 0 24 24"
                className="size-4 fill-current"
                aria-hidden="true"
              >
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.035.81 2.085 0 1.5-.015 2.7-.015 3.075 0 .315.225.69.825.57C20.565 21.795 24 17.31 24 12c0-6.63-5.37-12-12-12Z" />
              </svg>
            </a>
          </div>
        </header>
        <div className="min-h-0 flex-1">
          <BibleApp
            searchDialogOpen={searchDialogOpen}
            onSearchDialogOpenChange={setSearchDialogOpen}
          />
        </div>
      </main>
      <Toaster
        theme={theme}
        className="app-toaster"
        style={
          {
            "--normal-bg": "var(--popover)",
            "--normal-text": "var(--popover-foreground)",
            "--normal-border": "var(--border)",
            "--border-radius": "var(--radius)",
          } as CSSProperties
        }
      />
    </>
  );
};

export const App = () => (
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <ThemeProvider>
      <BibleProvider>
        <ReaderChromeProvider>
          <ErrorBoundary label="Bible Reader">
            <AppShell />
          </ErrorBoundary>
        </ReaderChromeProvider>
      </BibleProvider>
    </ThemeProvider>
  </BrowserRouter>
);
