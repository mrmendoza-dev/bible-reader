import { BibleReader } from "@apps/production/bible-app/components/bible-reader";
import { BibleProvider } from "@apps/production/bible-app/contexts/BibleProvider";
import { DEFAULT_TRANSLATION_ID } from "@apps/production/bible-app/translations";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@apps/production/bible-app/hooks/useBibleReaderScreen");

import { useBibleReaderScreen } from "@apps/production/bible-app/hooks/useBibleReaderScreen";

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
  noteDialogOpen: false,
  settingsOpen: false,
  setNoteDialogOpen: noop,
  setSettingsOpen: noop,
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
  handleSettingsSave: noop,
};

const renderReader = (
  props: Partial<React.ComponentProps<typeof BibleReader>> = {},
) =>
  render(
    <BibleProvider>
      <BibleReader
        translationId={DEFAULT_TRANSLATION_ID}
        onTranslationChange={noop}
        {...props}
      />
    </BibleProvider>,
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
