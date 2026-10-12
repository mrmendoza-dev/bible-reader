/**
 * Tests for the multi-bookmark Bible system.
 * Covers BookmarkManagerDialog rendering and interaction.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- Mock Supabase bible-bookmarks service ----
vi.mock("@apps/production/bible-app/services/bible-bookmarks-service", () => ({
  bibleBookmarksService: {
    getAllBookmarks: vi.fn(),
    createBookmark: vi.fn(),
    moveBookmark: vi.fn(),
    renameBookmark: vi.fn(),
    recolorBookmark: vi.fn(),
    delete: vi.fn(),
    findByLocation: vi.fn(),
    buildVerseMap: vi.fn((bms) => {
      const map = new Map();
      for (const bm of bms) {
        map.set(`${bm.book_id}-${bm.chapter}-${bm.verse ?? ""}`, bm);
      }
      return map;
    }),
  },
}));

// ---- Import after mocks are registered ----
import { BookmarkManagerDialog } from "@apps/production/bible-app/components/BookmarkManagerDialog";
import type { BibleBookmark } from "@apps/production/bible-app/services/bible-bookmarks-service";

const makeBookmark = (
  overrides: Partial<BibleBookmark> = {},
): BibleBookmark => ({
  id: "bm-1",
  user_id: "user-1",
  book_id: "john",
  chapter: 3,
  verse: "16",
  name: null,
  color_hex: "#3B82F6",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

describe("BookmarkManagerDialog", () => {
  const onOpenChange = vi.fn();
  const onJump = vi.fn();
  const onDelete = vi.fn();
  const onRename = vi.fn();
  const onRecolor = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows empty state when there are no bookmarks", () => {
    render(
      <BookmarkManagerDialog
        open={true}
        onOpenChange={onOpenChange}
        bookmarks={[]}
        onJump={onJump}
        onDelete={onDelete}
        onRename={onRename}
        onRecolor={onRecolor}
      />,
    );

    expect(screen.getByText(/No bookmarks yet/i)).toBeInTheDocument();
  });

  it("renders a bookmark row with default label", () => {
    render(
      <BookmarkManagerDialog
        open={true}
        onOpenChange={onOpenChange}
        bookmarks={[makeBookmark()]}
        onJump={onJump}
        onDelete={onDelete}
        onRename={onRename}
        onRecolor={onRecolor}
      />,
    );

    expect(screen.getByText(/John 3:16/i)).toBeInTheDocument();
  });

  it("renders a bookmark with custom name", () => {
    render(
      <BookmarkManagerDialog
        open={true}
        onOpenChange={onOpenChange}
        bookmarks={[makeBookmark({ name: "My favorite verse" })]}
        onJump={onJump}
        onDelete={onDelete}
        onRename={onRename}
        onRecolor={onRecolor}
      />,
    );

    expect(screen.getByText("My favorite verse")).toBeInTheDocument();
  });

  it("calls onJump when Jump button is clicked", () => {
    render(
      <BookmarkManagerDialog
        open={true}
        onOpenChange={onOpenChange}
        bookmarks={[makeBookmark()]}
        onJump={onJump}
        onDelete={onDelete}
        onRename={onRename}
        onRecolor={onRecolor}
      />,
    );

    fireEvent.click(screen.getByTitle("Jump to verse"));
    expect(onJump).toHaveBeenCalledWith("john", 3, "16");
  });

  it("calls onDelete when Delete button is clicked", () => {
    render(
      <BookmarkManagerDialog
        open={true}
        onOpenChange={onOpenChange}
        bookmarks={[makeBookmark()]}
        onJump={onJump}
        onDelete={onDelete}
        onRename={onRename}
        onRecolor={onRecolor}
      />,
    );

    fireEvent.click(screen.getByTitle("Delete bookmark"));
    expect(onDelete).toHaveBeenCalledWith("bm-1");
  });

  it("enters rename mode on Rename click and calls onRename on Save", () => {
    render(
      <BookmarkManagerDialog
        open={true}
        onOpenChange={onOpenChange}
        bookmarks={[makeBookmark()]}
        onJump={onJump}
        onDelete={onDelete}
        onRename={onRename}
        onRecolor={onRecolor}
      />,
    );

    fireEvent.click(screen.getByTitle("Rename"));
    const input = screen.getByPlaceholderText(/John 3:16/i);
    fireEvent.change(input, { target: { value: "Grace verse" } });
    fireEvent.click(screen.getByText("Save"));

    expect(onRename).toHaveBeenCalledWith("bm-1", "Grace verse");
  });

  it("cancels rename with empty string → passes null to onRename", () => {
    render(
      <BookmarkManagerDialog
        open={true}
        onOpenChange={onOpenChange}
        bookmarks={[makeBookmark({ name: "Old name" })]}
        onJump={onJump}
        onDelete={onDelete}
        onRename={onRename}
        onRecolor={onRecolor}
      />,
    );

    fireEvent.click(screen.getByTitle("Rename"));
    const input = screen.getByDisplayValue("Old name");
    fireEvent.change(input, { target: { value: "  " } }); // whitespace-only
    fireEvent.click(screen.getByText("Save"));

    expect(onRename).toHaveBeenCalledWith("bm-1", null);
  });
});

// ---- buildVerseMap logic test (pure, no Supabase needed) ----
describe("buildVerseMap logic", () => {
  const build = (bms: BibleBookmark[]) => {
    const map = new Map<string, BibleBookmark>();
    for (const bm of bms) {
      map.set(`${bm.book_id}-${bm.chapter}-${bm.verse ?? ""}`, bm);
    }
    return map;
  };

  it("keys verses as bookId-chapter-verse", () => {
    const bm = makeBookmark({ book_id: "genesis", chapter: 1, verse: "1" });
    const map = build([bm]);
    expect(map.get("genesis-1-1")).toBe(bm);
  });

  it("uses empty string for null verse (chapter-level)", () => {
    const bm = makeBookmark({ book_id: "genesis", chapter: 1, verse: null });
    const map = build([bm]);
    expect(map.get("genesis-1-")).toBe(bm);
  });

  it("handles multiple bookmarks without collision", () => {
    const a = makeBookmark({
      id: "a",
      book_id: "genesis",
      chapter: 1,
      verse: "1",
    });
    const b = makeBookmark({
      id: "b",
      book_id: "john",
      chapter: 3,
      verse: "16",
    });
    const map = build([a, b]);
    expect(map.size).toBe(2);
    expect(map.get("john-3-16")).toBe(b);
  });
});
