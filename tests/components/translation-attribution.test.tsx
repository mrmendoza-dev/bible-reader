import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it } from "vitest";
import { TranslationAttributionControls } from "@/bible/components/TranslationAttributionControls";
import { BIBLE_DATABASES_SOURCE_URL } from "@/bible/constants/translation-sources";

afterEach(() => {
  cleanup();
});

it("shows translation attribution and links to bible_databases", async () => {
  const user = userEvent.setup();
  render(<TranslationAttributionControls />);
  await user.click(screen.getByRole("button", { name: "About" }));
  expect(
    screen.getByRole("heading", { name: "About this reader" }),
  ).toBeTruthy();
  expect(screen.getByText(/Translation attribution/i)).toBeTruthy();
  const creatorLink = screen.getByRole("link", { name: "mrmendoza.dev" });
  expect(creatorLink.getAttribute("href")).toBe(
    "https://github.com/mrmendoza-dev",
  );
  const repositoryLink = screen.getByRole("link", {
    name: "project repository",
  });
  expect(repositoryLink.getAttribute("href")).toBe(
    "https://github.com/mrmendoza-dev/bible-reader",
  );
  const sourceLink = screen.getByRole("link", {
    name: "scrollmapper/bible_databases",
  });
  expect(sourceLink.getAttribute("href")).toBe(BIBLE_DATABASES_SOURCE_URL);
});
