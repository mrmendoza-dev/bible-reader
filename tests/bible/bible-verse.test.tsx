import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BibleVerse } from "@/bible/components/BibleVerse";
import { BibleProvider } from "@/bible/contexts/BibleProvider";

const renderVerse = (
  props: Partial<React.ComponentProps<typeof BibleVerse>> = {},
) =>
  render(
    <BibleProvider>
      <BibleVerse
        bookId="genesis"
        chapter={1}
        verse="3"
        text="And God said, Let there be light."
        {...props}
      />
    </BibleProvider>,
  );

describe("BibleVerse", () => {
  it("exposes a stable DOM id for scroll targeting", () => {
    const { container } = renderVerse();
    expect(
      container.querySelector("#bible-verse-genesis-1-3"),
    ).toBeInTheDocument();
  });

  it("renders the verse number and text", () => {
    renderVerse();
    expect(screen.getByText("3.")).toBeInTheDocument();
    expect(
      screen.getByText("And God said, Let there be light."),
    ).toBeInTheDocument();
  });

  it("applies a focus ring when isFocused is true", () => {
    const { container } = renderVerse({ isFocused: true });
    const row = container.querySelector("[data-bible-verse-row]");
    expect(row?.className).toMatch(/ring-/);
  });

  it("does not apply a focus ring when isFocused is false", () => {
    const { container } = renderVerse({ isFocused: false });
    const row = container.querySelector("[data-bible-verse-row]");
    expect(row?.className).not.toMatch(/ring-/);
  });

  it("shows saved checkmark when isSaved is true", () => {
    renderVerse({ isSaved: true });
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("does not show checkmark when not saved", () => {
    renderVerse({ isSaved: false });
    expect(screen.queryByText("✓")).not.toBeInTheDocument();
  });

  it("calls onClick when the verse number is clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderVerse({ onClick });
    await user.click(screen.getByText("3."));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders highlighted text in place of plain verse text when provided", () => {
    renderVerse({ highlightedText: <mark>highlighted content</mark> });
    expect(screen.getByText("highlighted content")).toBeInTheDocument();
    expect(
      screen.queryByText("And God said, Let there be light."),
    ).not.toBeInTheDocument();
  });

  it("renders a saved passage with separate muted verse numbers", () => {
    const { container } = renderVerse({
      referenceLabel: "Genesis 1:3–4",
      passageRows: [
        {
          bookId: "genesis",
          chapter: 1,
          verse: "3",
          text: "First saved verse.",
        },
        {
          bookId: "genesis",
          chapter: 1,
          verse: "4",
          text: "Second saved verse.",
        },
      ],
    });
    expect(screen.getByText("Genesis 1:3–4")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-passage-verse]")).toHaveLength(2);
    expect(screen.getByText("4.")).toHaveClass("text-muted-foreground");
    expect(screen.getByText("Second saved verse.")).not.toHaveClass(
      "text-muted-foreground",
    );
  });

  it("highlights coverage without marking the verse individually saved", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onUnsave = vi.fn();
    const onOpenSavedPassage = vi.fn();
    const { container } = renderVerse({
      includedPassages: [
        { id: "range-1", label: "Genesis 1:2–4" },
        { id: "range-2", label: "Genesis 1:3–5" },
      ],
      savedConnection: { before: true, after: true },
      onSave,
      onUnsave,
      onOpenSavedPassage,
    });
    expect(container.querySelector("[data-bible-verse-row]")).toHaveClass(
      "bg-golden/10",
      "rounded-t-none",
      "rounded-b-none",
    );
    expect(screen.queryByText("✓")).not.toBeInTheDocument();
    await user.click(screen.getByText("And God said, Let there be light."));
    expect(
      screen.getByRole("button", { name: "Save Verse" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Unsave Verse" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Genesis 1:3–5" }));
    expect(onOpenSavedPassage).toHaveBeenCalledWith("range-2");
    expect(onSave).not.toHaveBeenCalled();
    expect(onUnsave).not.toHaveBeenCalled();
  });
});
