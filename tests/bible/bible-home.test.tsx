import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/bible/services/bible-service", () => ({
  bibleService: {
    getBooksList: vi
      .fn()
      .mockResolvedValue([{ id: "genesis", title: "Genesis", chapters: 50 }]),
    getChaptersForBook: vi.fn().mockResolvedValue(
      Array.from({ length: 50 }, (_, i) => ({
        number: i + 1,
        title: `Chapter ${i + 1}`,
      })),
    ),
  },
}));

import { BibleHome } from "@/bible/components/BibleHome";
import { DEFAULT_TRANSLATION_ID } from "@/bible/translations";

const defaultProps = {
  translationId: DEFAULT_TRANSLATION_ID,
  onTranslationChange: vi.fn(),
  onOpenInReader: vi.fn(),
};

describe("BibleHome", () => {
  it("renders the home page", async () => {
    render(
      <MemoryRouter>
        <BibleHome {...defaultProps} />
      </MemoryRouter>,
    );
    await screen.findByRole("heading", { name: "Bible Reader" });
    await screen.findByText(/No bookmarks yet/);
    await screen.findByText("Save verses as you read to find them here.");
    expect(screen.getByText("The Holy Bible")).toBeInTheDocument();
    expect(screen.queryByText("Random Verse")).not.toBeInTheDocument();
    expect(screen.queryByText("Evening Prayer")).not.toBeInTheDocument();
    expect(screen.queryByText("Battle Pack")).not.toBeInTheDocument();
  });
});
