import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VerseActionPopover } from "@/bible/components/VerseActionPopover";
import type { BibleBookmark } from "@/bible/services/bible-bookmarks-service";

const baseProps = {
  verse: { verse: "1", text: "In the beginning…" },
  bookId: "genesis",
  chapter: 1,
  isSaved: false,
  onSave: vi.fn(),
  onUnsave: vi.fn(),
  onAddNote: vi.fn(),
  bookmarkOnVerse: null,
  hasAnyBookmarks: false,
  onAddBookmark: vi.fn(),
  onRemoveBookmark: vi.fn(),
  onMoveBookmark: vi.fn(),
};

const mockBookmark: BibleBookmark = {
  id: "bm-1",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  location_key: JSON.stringify(["genesis", 1, "1"]),
  book_id: "genesis",
  chapter: 1,
  verse: "1",
  name: null,
  color_hex: "#ff0000",
};

const openPopover = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: /open verse actions/i }));
};

describe("VerseActionPopover", () => {
  it("copies reference and verse text to the clipboard", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(
      <VerseActionPopover {...baseProps}>
        <div>Open verse actions</div>
      </VerseActionPopover>,
    );

    await openPopover(user);
    await user.click(screen.getByRole("button", { name: "Copy Verse" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("Genesis 1:1 In the beginning…");
    });
  });

  it("shows 'Save Verse' when the verse is not saved", async () => {
    const user = userEvent.setup();
    render(
      <VerseActionPopover {...baseProps} isSaved={false}>
        <div>Open verse actions</div>
      </VerseActionPopover>,
    );
    await openPopover(user);
    expect(
      screen.getByRole("button", { name: /save verse/i }),
    ).toBeInTheDocument();
  });

  it("shows 'Unsave Verse' when the verse is already saved", async () => {
    const user = userEvent.setup();
    render(
      <VerseActionPopover {...baseProps} isSaved={true}>
        <div>Open verse actions</div>
      </VerseActionPopover>,
    );
    await openPopover(user);
    expect(
      screen.getByRole("button", { name: /unsave verse/i }),
    ).toBeInTheDocument();
  });

  it("calls onSave when 'Save Verse' is clicked", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <VerseActionPopover {...baseProps} isSaved={false} onSave={onSave}>
        <div>Open verse actions</div>
      </VerseActionPopover>,
    );
    await openPopover(user);
    await user.click(screen.getByRole("button", { name: /save verse/i }));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("shows 'Add Bookmark' when no bookmark is on this verse", async () => {
    const user = userEvent.setup();
    render(
      <VerseActionPopover {...baseProps} bookmarkOnVerse={null}>
        <div>Open verse actions</div>
      </VerseActionPopover>,
    );
    await openPopover(user);
    expect(
      screen.getByRole("button", { name: /add bookmark/i }),
    ).toBeInTheDocument();
  });

  it("shows 'Remove Bookmark' when a bookmark exists on this verse", async () => {
    const user = userEvent.setup();
    render(
      <VerseActionPopover {...baseProps} bookmarkOnVerse={mockBookmark}>
        <div>Open verse actions</div>
      </VerseActionPopover>,
    );
    await openPopover(user);
    expect(
      screen.getByRole("button", { name: /remove bookmark/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /add bookmark/i }),
    ).not.toBeInTheDocument();
  });

  it("shows 'Move Bookmark Here' only when hasAnyBookmarks is true and no bookmark on verse", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <VerseActionPopover
        {...baseProps}
        hasAnyBookmarks={false}
        bookmarkOnVerse={null}
      >
        <div>Open verse actions</div>
      </VerseActionPopover>,
    );
    await openPopover(user);
    expect(
      screen.queryByRole("button", { name: /move bookmark here/i }),
    ).not.toBeInTheDocument();

    rerender(
      <VerseActionPopover
        {...baseProps}
        hasAnyBookmarks={true}
        bookmarkOnVerse={null}
      >
        <div>Open verse actions</div>
      </VerseActionPopover>,
    );
    expect(
      screen.getByRole("button", { name: /move bookmark here/i }),
    ).toBeInTheDocument();
  });

  it("shows 'Add to List' when onAddToList is provided", async () => {
    const user = userEvent.setup();
    const onAddToList = vi.fn();
    render(
      <VerseActionPopover {...baseProps} onAddToList={onAddToList}>
        <div>Open verse actions</div>
      </VerseActionPopover>,
    );
    await openPopover(user);
    await user.click(screen.getByRole("button", { name: /add to list/i }));
    expect(onAddToList).toHaveBeenCalledOnce();
  });

  it("confirms before unsaving when confirmBeforeUnsave is set", async () => {
    const user = userEvent.setup();
    const onUnsave = vi.fn();
    render(
      <VerseActionPopover
        {...baseProps}
        isSaved={true}
        onUnsave={onUnsave}
        confirmBeforeUnsave
      >
        <div>Open verse actions</div>
      </VerseActionPopover>,
    );
    await openPopover(user);
    await user.click(
      screen.getByRole("button", { name: /delete saved verse/i }),
    );
    expect(onUnsave).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete verse" }));
    expect(onUnsave).toHaveBeenCalledOnce();
  });
});
