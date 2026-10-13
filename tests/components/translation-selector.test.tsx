import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { BibleTranslationSelector } from "@/bible/components/BibleTranslationSelector";

afterEach(() => vi.unstubAllGlobals());

it("shows language and honest book counts, and searches by language name", async () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
  const user = userEvent.setup();
  const select = vi.fn();
  render(<BibleTranslationSelector value="oeb" onValueChange={select} />);
  const trigger = screen.getByRole("combobox", { name: "Translation" });
  expect(
    within(trigger).getByText("English (EN) · 28/66 books with text"),
  ).toBeInTheDocument();
  await user.click(trigger);
  await user.type(
    screen.getByPlaceholderText("Search translations..."),
    "Korean",
  );
  const option = await screen.findByRole("option", {
    name: /Hangul King James Version/,
  });
  expect(
    within(option).getByText("Korean (KO) · 66 books"),
  ).toBeInTheDocument();
  await user.click(option);
  expect(select).toHaveBeenCalledWith("korhkjv");
});
