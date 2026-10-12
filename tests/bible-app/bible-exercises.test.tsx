import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@omni/services/contexts/auth/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "test-user" } }),
}));

vi.mock("@apps/production/bible-app/components/RandomVerse", () => ({
  RandomVerse: () => null,
}));

vi.mock("@apps/production/bible-app/services/bible-service", () => ({
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

import { BibleHome } from "@apps/production/bible-app/components/BibleHome";
import { DEFAULT_TRANSLATION_ID } from "@apps/production/bible-app/translations";

const defaultProps = {
  translationId: DEFAULT_TRANSLATION_ID,
  onTranslationChange: vi.fn(),
  onOpenInReader: vi.fn(),
};

describe("BibleHome", () => {
  it("renders the home page", async () => {
    render(<BibleHome {...defaultProps} />);
    await screen.findByText("Open in reader");
    expect(screen.getByText("The Holy Bible")).toBeInTheDocument();
    expect(screen.getByText("Evening Prayer")).toBeInTheDocument();
  });

  it("shows evening prayer description", async () => {
    render(<BibleHome {...defaultProps} />);
    await screen.findByText("Open in reader");
    expect(screen.getByText(/5-step guided reflection/i)).toBeInTheDocument();
  });
});
