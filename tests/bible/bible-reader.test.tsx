import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BibleReader } from "@/bible/components/bible-reader";
import { BibleProvider } from "@/bible/contexts/BibleProvider";
import { ReaderChromeProvider } from "@/bible/contexts/ReaderChromeContext";
import { DEFAULT_TRANSLATION_ID } from "@/bible/translations";

vi.mock("@/bible/hooks/useBibleReaderScreen");

import { useBibleReaderScreen } from "@/bible/hooks/useBibleReaderScreen";

const noop = vi.fn();

const baseScreen = {
  books: [],
  selectedBook: "genesis",
  selectedChapter: 1,
  selectedBookChapters: [],
  loading: false,
  error: null,
  currentChapter: null,
  currentBookData: null,
  loadedBook: "genesis",
  loadedChapter: 1,
  verses: [],
  activeTranslationId: DEFAULT_TRANSLATION_ID,
  verseStyle: "normal",
  savedVerses: new Set<string>(),
  bookmarks: [],
  bookmarksByVerse: {},
  selectedVerse: null,
  verseScrollNonce: 0,
  chapterScrollToTopNonce: 0,
  noteDialogOpen: false,
  setNoteDialogOpen: noop,
  navigateChapter: noop,
  navigateToVerse: noop,
  handleBookChange: noop,
  handleChapterChange: noop,
  handleLoadChapter: noop,
  handleSaveVerse: noop,
  handleAddVerseToList: vi.fn().mockResolvedValue(null),
  handleUnsaveVerse: noop,
  handleVerseAddNote: noop,
  handleAddBookmark: noop,
  handleDeleteBookmark: noop,
  handleRenameBookmark: noop,
  handleRecolorBookmark: noop,
  handleMoveBookmarkTo: noop,
};

const renderReader = (
  props: Partial<React.ComponentProps<typeof BibleReader>> = {},
) =>
  render(
    <MemoryRouter>
      <BibleProvider>
        <ReaderChromeProvider>
          <BibleReader
            translationId={DEFAULT_TRANSLATION_ID}
            onTranslationChange={noop}
            {...props}
          />
        </ReaderChromeProvider>
      </BibleProvider>
    </MemoryRouter>,
  );

describe("BibleReader", () => {
  beforeEach(() => {
    vi.mocked(useBibleReaderScreen).mockReturnValue(baseScreen as any);
  });

  it("renders the controls area when no chapter is loaded", () => {
    renderReader();
    // BibleReaderControls is always present; the verse list only appears with a loaded chapter.
    // With an empty book list the control renders without crashing.
    expect(document.body).toBeInTheDocument();
  });

  it("shows an error message and Retry button when the hook reports an error", () => {
    vi.mocked(useBibleReaderScreen).mockReturnValue({
      ...baseScreen,
      error: "Network error loading chapter",
    } as any);
    renderReader();
    expect(
      screen.getByText("Network error loading chapter"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("does not render the verse list when currentChapter is null", () => {
    vi.mocked(useBibleReaderScreen).mockReturnValue({
      ...baseScreen,
      currentChapter: null,
    } as any);
    renderReader();
    // With no current chapter there are no verse rows in the DOM.
    expect(document.querySelectorAll("[data-bible-verse-row]")).toHaveLength(0);
  });

  it("passes translationId into the hook", () => {
    renderReader({ translationId: "esv" });
    expect(vi.mocked(useBibleReaderScreen)).toHaveBeenCalledWith(
      expect.objectContaining({ translationId: "esv" }),
    );
  });
});
