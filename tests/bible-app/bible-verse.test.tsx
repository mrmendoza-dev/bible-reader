import { BibleVerse } from "@apps/production/bible-app/components/BibleVerse";
import { BibleProvider } from "@apps/production/bible-app/contexts/BibleProvider";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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
});
