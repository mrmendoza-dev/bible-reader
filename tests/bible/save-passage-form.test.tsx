import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { VerseActionPopover } from "@/bible/components/VerseActionPopover";

const props = {
  verse: { verse: "2", text: "Verse text" },
  bookId: "genesis",
  chapter: 1,
  isSaved: false,
  onSave: vi.fn(),
  onUnsave: vi.fn(),
  bookmarkOnVerse: null,
  hasAnyBookmarks: false,
  onAddBookmark: vi.fn(),
  onRemoveBookmark: vi.fn(),
  onMoveBookmark: vi.fn(),
};

it("expands Range, focuses the field, previews a cross-book passage, and saves with Enter", async () => {
  const user = userEvent.setup();
  const onSaveRange = vi.fn().mockResolvedValue(undefined);
  render(
    <VerseActionPopover {...props} onSaveRange={onSaveRange}>
      Open actions
    </VerseActionPopover>,
  );
  await user.click(screen.getByRole("button", { name: "Open actions" }));
  await user.click(screen.getByRole("button", { name: "Range" }));
  expect(screen.getByLabelText("End reference")).toHaveFocus();
  await user.type(screen.getByLabelText("End reference"), "Exodus 1:8");
  expect(screen.getByText("Genesis 1:2–Exodus 1:8")).toBeInTheDocument();
  await user.keyboard("{Enter}");
  await waitFor(() =>
    expect(onSaveRange).toHaveBeenCalledExactlyOnceWith({
      bookId: "exodus",
      chapter: 1,
      verse: 8,
    }),
  );
  await waitFor(() =>
    expect(screen.queryByLabelText("End reference")).not.toBeInTheDocument(),
  );
});

it("keeps the form open for invalid endpoints and failed saves, and lets the user retry", async () => {
  const user = userEvent.setup();
  const onSaveRange = vi
    .fn()
    .mockRejectedValueOnce(new Error("Verse is unavailable."))
    .mockResolvedValue(undefined);
  render(
    <VerseActionPopover {...props} onSaveRange={onSaveRange}>
      Open actions
    </VerseActionPopover>,
  );
  await user.click(screen.getByRole("button", { name: "Open actions" }));
  await user.click(screen.getByRole("button", { name: "Range" }));
  const input = screen.getByLabelText("End reference");
  await user.type(input, "1{Enter}");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "after the starting verse",
  );
  expect(onSaveRange).not.toHaveBeenCalled();
  await user.clear(input);
  await user.type(input, "99");
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Verse is unavailable",
  );
  expect(input).toHaveValue("99");
  await user.clear(input);
  await user.type(input, "3{Enter}");
  await waitFor(() => expect(onSaveRange).toHaveBeenCalledTimes(2));
});

it("copies a saved passage with its complete reference and line breaks", async () => {
  const user = userEvent.setup();
  const writeText = vi
    .spyOn(navigator.clipboard, "writeText")
    .mockResolvedValue();
  render(
    <VerseActionPopover
      {...props}
      referenceLabel="Genesis 1:2–Exodus 1:8"
      verse={{ verse: "2", text: "Genesis 1:2 First\nExodus 1:8 Last" }}
    >
      Open actions
    </VerseActionPopover>,
  );
  await user.click(screen.getByRole("button", { name: "Open actions" }));
  await user.click(screen.getByRole("button", { name: "Copy Passage" }));
  await waitFor(() =>
    expect(writeText).toHaveBeenCalledWith(
      "Genesis 1:2–Exodus 1:8 Genesis 1:2 First\nExodus 1:8 Last",
    ),
  );
});
