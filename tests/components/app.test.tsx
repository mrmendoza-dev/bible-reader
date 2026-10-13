import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { App } from "@/App";
import { bibleService } from "@/bible/services/bible-service";
import { bibleVersesService } from "@/bible/services/bible-verses-service";
import { db } from "@/bible/storage/db";

beforeEach(async () => {
  window.history.replaceState(null, "", "/");
  localStorage.clear();
  bibleService.clearCache();
  await db.delete();
  await db.open();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ "1": { "1": "Standalone fixture text." } }),
    ),
  );
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  cleanup();
  db.close();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("saves and deletes a cross-book passage through the reader and Saved view", async () => {
  const user = userEvent.setup();
  localStorage.setItem("bible:last-chapter", JSON.stringify({ value: 50 }));
  vi.mocked(fetch).mockImplementation(async (url) =>
    Response.json(
      String(url).includes("exodus")
        ? { "1": { "1": "Exodus begins.", "2": "Exodus continues." } }
        : { "50": { "25": "Genesis closes.", "26": "Genesis ends." } },
    ),
  );
  render(<App />);
  await user.click(screen.getByRole("link", { name: "Reader" }));
  await user.click(await screen.findByText("Genesis closes."));
  await user.click(screen.getByRole("button", { name: "Range" }));
  await user.type(screen.getByLabelText("End reference"), "Exodus 1:2{Enter}");
  await waitFor(async () => expect(await db.savedVerses.count()).toBe(1));
  expect((await db.savedVerses.toArray())[0]).toMatchObject({
    book_id: "genesis",
    chapter: 50,
    verse: "25",
    end: { bookId: "exodus", chapter: 1, verse: 2 },
  });
  expect(await db.listItems.count()).toBe(1);
  await user.click(screen.getByRole("link", { name: "Home" }));
  const homePreview = await screen.findByRole("button", {
    name: /Open Genesis 50:25–Exodus 1:2 .* in reader/,
  });
  expect(homePreview.querySelectorAll("[data-passage-verse]")).toHaveLength(3);
  expect(within(homePreview).getByText("Genesis 50")).toBeInTheDocument();
  expect(within(homePreview).getByText("Exodus 1")).toBeInTheDocument();
  await user.click(
    screen.getByRole("link", { name: "View full passage (4 verses)" }),
  );
  const reference = "Genesis 50:25–Exodus 1:2";
  const passageTrigger = await screen.findByRole("button", {
    name: new RegExp(`${reference}.*Genesis closes`),
  });
  await user.click(passageTrigger);
  await user.click(await screen.findByRole("button", { name: "Add to List" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText(reference)).toBeInTheDocument();
  await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await user.click(
    screen.getByRole("button", {
      name: new RegExp(`${reference}.*Genesis closes`),
    }),
  );
  await user.click(
    screen.getByRole("button", { name: "Delete saved passage" }),
  );
  expect(screen.getByRole("alertdialog")).toHaveTextContent(reference);
  await user.click(screen.getByRole("button", { name: "Delete passage" }));
  await waitFor(async () => expect(await db.savedVerses.count()).toBe(0));
  expect(await db.listItems.count()).toBe(0);
}, 15000);

it("keeps overlapping passages distinct while linking reader coverage and formatting home previews", async () => {
  const user = userEvent.setup();
  localStorage.setItem("bible:translation", JSON.stringify({ value: "kjv" }));
  const texts = {
    "1": "Outside passage.",
    "2": "Second saved verse.",
    "3": "Overlapping verse.",
    "4": "Fourth saved verse.",
    "5": "Last saved verse.",
  };
  vi.mocked(fetch).mockImplementation(async () =>
    Response.json({ "1": texts }),
  );
  localStorage.setItem("bible:translation", JSON.stringify({ value: "kjv" }));
  const first = await bibleVersesService.saveVerse(
    "genesis",
    1,
    "2",
    "2 Second saved verse.\n3 Overlapping verse.\n4 Fourth saved verse.",
    "kjv",
    { bookId: "genesis", chapter: 1, verse: 4 },
  );
  const second = await bibleVersesService.saveVerse(
    "genesis",
    1,
    "3",
    "3 Overlapping verse.\n4 Fourth saved verse.\n5 Last saved verse.",
    "kjv",
    { bookId: "genesis", chapter: 1, verse: 5 },
  );
  window.history.replaceState(null, "", "/reader");
  const { container } = render(<App />);
  const row = () => container.querySelector("#bible-verse-genesis-1-3");
  await waitFor(() =>
    expect(row()).toHaveAttribute("data-saved-highlight", "true"),
  );
  expect(row()).toHaveClass("rounded-t-none", "rounded-b-none");
  expect(
    container.querySelector("#bible-verse-genesis-1-1"),
  ).not.toHaveAttribute("data-saved-highlight");
  await user.click(
    within(row() as HTMLElement).getByText("Overlapping verse."),
  );
  expect(
    screen.getByRole("button", { name: "Genesis 1:2–4" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Genesis 1:3–5" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Save Verse" }));
  await waitFor(async () => expect(await db.savedVerses.count()).toBe(3));
  await user.click(
    within(row() as HTMLElement).getByText("Overlapping verse."),
  );
  await user.click(await screen.findByRole("button", { name: "Unsave Verse" }));
  await waitFor(async () => expect(await db.savedVerses.count()).toBe(2));
  expect(row()).toHaveAttribute("data-saved-highlight", "true");
  await user.click(
    within(row() as HTMLElement).getByText("Overlapping verse."),
  );
  await user.click(screen.getByRole("button", { name: "Genesis 1:3–5" }));
  expect(window.location.search).toBe(`?passage=${second}`);
  const savedTrigger = await screen.findByRole("button", {
    name: /Genesis 1:3–5.*Overlapping verse/,
  });
  await user.click(savedTrigger);
  await user.click(
    screen.getByRole("button", { name: "Delete saved passage" }),
  );
  await user.click(screen.getByRole("button", { name: "Delete passage" }));
  await waitFor(async () =>
    expect((await db.savedVerses.toArray()).map((saved) => saved.id)).toEqual([
      first,
    ]),
  );
  await user.click(screen.getByRole("link", { name: "Home" }));
  const recent = await screen.findByRole("button", {
    name: "Open Genesis 1:2–4 (KJV) in reader",
  });
  expect(recent.querySelectorAll("[data-passage-verse]")).toHaveLength(3);
  expect(within(recent).getByText("2.")).toHaveClass("text-muted-foreground");
  await user.click(screen.getByRole("link", { name: "Reader" }));
  await waitFor(() =>
    expect(row()).toHaveAttribute("data-saved-highlight", "true"),
  );
  expect(
    container.querySelector("#bible-verse-genesis-1-5"),
  ).not.toHaveAttribute("data-saved-highlight");
}, 20000);

it("reads and saves a verse through the real app without an account or backend", async () => {
  const user = userEvent.setup();
  const { container } = render(<App />);
  await user.click(screen.getByRole("link", { name: "Reader" }));
  await screen.findByText("Standalone fixture text.");
  expect(window.location.pathname).toBe("/reader");
  expect(screen.getByRole("link", { name: "Reader" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const header = within(container.querySelector("header") as HTMLElement);
  const repositoryLink = header.getByRole("link", {
    name: "Bible Reader on GitHub",
  });
  expect(repositoryLink).toHaveAttribute(
    "href",
    "https://github.com/mrmendoza-dev/bible-reader",
  );
  expect(repositoryLink).toHaveAttribute("target", "_blank");
  expect(screen.getAllByRole("button", { name: /search/i })).toHaveLength(1);
  expect(
    header.getByRole("button", { name: "Reading settings" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Saved" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByPlaceholderText("Highlight...")).not.toBeInTheDocument();
  expect(container.querySelector("button button")).toBeNull();
  await user.click(screen.getByText("Standalone fixture text."));
  await user.click(await screen.findByRole("button", { name: "Save Verse" }));
  await waitFor(async () => expect(await db.savedVerses.count()).toBe(1));
  expect((await db.savedVerses.toArray())[0]).toMatchObject({
    book_id: "genesis",
    chapter: 1,
    verse: "1",
    translation: "web",
  });
  expect(await db.listItems.count()).toBe(1);
  await user.click(screen.getByRole("link", { name: "Saved" }));
  await screen.findByText("Standalone fixture text.");
  expect(screen.queryByText("Explain Verse")).toBeNull();
  for (const [url] of vi.mocked(fetch).mock.calls)
    expect(String(url)).toMatch(
      /^\/bible\/data\/translations\/(web|asv|ylt|kjv)\//,
    );
});

it("returns to home when the header brand is clicked", async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("link", { name: "Reader" }));
  await screen.findByText("Standalone fixture text.");
  await user.click(screen.getByRole("link", { name: "Bible Reader home" }));
  await screen.findByRole("heading", { name: "The Holy Bible" });
  expect(window.location.pathname).toBe("/");
});

it("loads a direct saved route and supports browser back and forward", async () => {
  window.history.replaceState(null, "", "/saved");
  const user = userEvent.setup();
  render(<App />);
  await screen.findByRole("heading", { name: "Saved Verses" });
  expect(screen.getByRole("link", { name: "Saved" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await user.click(screen.getByRole("link", { name: "Reader" }));
  await screen.findByText("Standalone fixture text.");
  window.history.back();
  await screen.findByRole("heading", { name: "Saved Verses" });
  expect(window.location.pathname).toBe("/saved");
  window.history.forward();
  await screen.findByText("Standalone fixture text.");
  expect(window.location.pathname).toBe("/reader");
});

it("opens a passage from home after the reader route mounts", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        "1": { "1": "Standalone fixture text." },
        "3": { "16": "Target passage text." },
      }),
    ),
  );
  const user = userEvent.setup();
  render(<App />);
  await user.type(screen.getByPlaceholderText("Genesis 1:4"), "John 3:16");
  await user.click(screen.getByRole("button", { name: "Open from text" }));
  await screen.findByRole("heading", { name: "John 3" });
  await screen.findByText("Target passage text.");
  expect(window.location.pathname).toBe("/reader");
  expect(window.history.state.usr).toEqual({
    bookId: "john",
    chapter: 3,
    verse: "16",
  });
});

it("applies header reading settings to saved verses and the reader", async () => {
  await bibleVersesService.saveVerse(
    "john",
    3,
    "16",
    "Saved fixture text.",
    "web",
  );
  window.history.replaceState(null, "", "/saved");
  const user = userEvent.setup();
  render(<App />);
  await screen.findByText("Saved fixture text.");
  await user.click(screen.getByRole("button", { name: "Reading settings" }));
  const dialog = within(
    await screen.findByRole("dialog", { name: "Bible Settings" }),
  );
  await user.click(dialog.getByRole("combobox", { name: "Font Size" }));
  await user.click(await screen.findByRole("option", { name: "Large" }));
  await user.click(dialog.getByRole("combobox", { name: "Reading Font" }));
  expect(
    await screen.findByText("Sans", { selector: "[data-slot=select-label]" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Serif", { selector: "[data-slot=select-label]" }),
  ).toBeInTheDocument();
  await user.click(await screen.findByRole("option", { name: "Lora" }));
  await user.click(dialog.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(
      screen.getByText("Saved fixture text.").closest("[style]"),
    ).toHaveStyle({
      fontSize: "1.125rem",
      fontFamily: '"Lora Variable", serif',
    }),
  );
  await user.click(screen.getByRole("link", { name: "Reader" }));
  expect(
    (await screen.findByText("Standalone fixture text.")).closest("[style]"),
  ).toHaveStyle({
    fontSize: "1.125rem",
    fontFamily: '"Lora Variable", serif',
  });
  expect(
    JSON.parse(localStorage.getItem("bible:font-style") ?? "null").value,
  ).toBe("lora");
  expect(
    JSON.parse(localStorage.getItem("bible:font-size") ?? "null").value,
  ).toBe("lg");
});

it("redirects unknown paths to home", async () => {
  window.history.replaceState(null, "", "/unknown");
  render(<App />);
  await screen.findByRole("heading", { name: "The Holy Bible" });
  expect(window.location.pathname).toBe("/");
});

it("keeps navigation and assets under the configured deployment base", async () => {
  vi.stubEnv("BASE_URL", "/bible/");
  window.history.replaceState(null, "", "/bible/reader");
  const user = userEvent.setup();
  const { container } = render(<App />);
  await screen.findByText("Standalone fixture text.");
  expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
    "href",
    "/bible/",
  );
  expect(container.querySelector("header img")).toHaveAttribute(
    "src",
    "/bible/images/logo.png",
  );
  await user.click(screen.getByRole("link", { name: "Saved" }));
  await screen.findByRole("heading", { name: "Saved Verses" });
  expect(window.location.pathname).toBe("/bible/saved");
});

it("opens a search result in its source translation through the reader route", async () => {
  vi.spyOn(bibleService, "searchBible").mockResolvedValue([
    {
      bookId: "tobit",
      bookTitle: "Tobit",
      chapter: 1,
      verse: "1",
      text: "Swedish search fixture",
      relevanceScore: 100,
      translation: "swe1917",
    },
  ]);
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Search the Bible" }));
  const dialog = within(
    await screen.findByRole("dialog", { name: "Search the Bible" }),
  );
  await user.click(dialog.getByRole("combobox", { name: "Translation" }));
  await user.click(
    await screen.findByRole("option", { name: /Swedish Bible/ }),
  );
  await user.type(
    dialog.getByPlaceholderText("Enter search term..."),
    "Swedish",
  );
  await user.click(dialog.getByRole("button", { name: "Search" }));
  await user.click(await dialog.findByText(/search fixture/));
  await user.click(
    await screen.findByRole("button", { name: "Go to Chapter" }),
  );
  await screen.findByRole("heading", { name: "Tobit 1" });
  expect(window.location.pathname).toBe("/reader");
  expect(
    JSON.parse(localStorage.getItem("bible:translation") ?? "null").value,
  ).toBe("swe1917");
  expect(fetch).toHaveBeenCalledWith(
    "/bible/data/translations/swe1917/tobit.json",
  );
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(([url]) => String(url).includes("/web/tobit.json")),
  ).toBe(false);
});

it("shows recent saves on home, opens their translation, and links to Saved and lists", async () => {
  const user = userEvent.setup();
  render(<App />);
  const section = within(screen.getByRole("region", { name: "Saved Verses" }));
  await section.findByText("Save verses as you read to find them here.");
  await bibleVersesService.saveVerse(
    "john",
    3,
    "16",
    "Recently saved KJV verse",
    "kjv",
  );
  await section.findByText("Recently saved KJV verse");
  await user.click(section.getByRole("button", { name: "Manage Lists" }));
  const dialog = await screen.findByRole("dialog");
  expect(
    within(dialog).getByRole("heading", { name: "Manage Lists" }),
  ).toBeInTheDocument();
  await user.keyboard("{Escape}");
  await user.click(section.getByRole("button", { name: /John 3:16.*KJV/ }));
  await screen.findByText("Standalone fixture text.");
  expect(window.location.pathname).toBe("/reader");
  expect(
    screen.getByRole("combobox", { name: "Translation" }),
  ).toHaveTextContent("KJV");
  expect(
    screen.queryByRole("button", { name: "Load" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Home" }));
  await user.click(screen.getByRole("link", { name: "View Saved Verses" }));
  await screen.findByText("Recently saved KJV verse");
  expect(window.location.pathname).toBe("/saved");
  expect(
    screen.queryByRole("button", { name: /Back to Reader/ }),
  ).not.toBeInTheDocument();
});

it("shows search loading and paginates capped results without rendering the whole set", async () => {
  let finish!: (
    results: Awaited<ReturnType<typeof bibleService.searchBible>>,
  ) => void;
  vi.spyOn(bibleService, "searchBible").mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Search the Bible" }));
  const dialog = within(
    await screen.findByRole("dialog", { name: "Search the Bible" }),
  );
  await user.type(
    dialog.getByPlaceholderText("Enter search term..."),
    "Fixture",
  );
  await user.click(dialog.getByRole("button", { name: "Search" }));
  expect(
    await dialog.findByRole("status", { name: "Searching the Bible" }),
  ).toBeInTheDocument();
  expect(dialog.getByRole("button", { name: /Searching/ })).toBeDisabled();
  finish(
    Array.from({ length: 600 }, (_, index) => ({
      bookId: "genesis",
      bookTitle: "Genesis",
      chapter: Math.floor(index / 100) + 1,
      verse: String((index % 100) + 1),
      text: `Search result fixture ${index + 1}.`,
      relevanceScore: 100,
      translation: "web",
    })),
  );
  await dialog.findByText(/Result limit reached/);
  expect(dialog.getByText("Page 1 of 10")).toBeInTheDocument();
  expect(dialog.getAllByText(/^Search result/)).toHaveLength(50);
  expect(dialog.queryByText(/Search result\s+51\./)).not.toBeInTheDocument();
  await user.click(dialog.getByRole("button", { name: "Next" }));
  await dialog.findByText(/Search result\s+51\./);
  expect(dialog.getAllByText(/^Search result/)).toHaveLength(50);
  expect(dialog.queryByText(/Search result\s+1\./)).not.toBeInTheDocument();
  await user.click(dialog.getByRole("button", { name: "Previous" }));
  await dialog.findByText(/Search result\s+1\./);
  await user.type(
    dialog.getByPlaceholderText("Enter search term..."),
    " changed",
  );
  expect(
    dialog.queryByRole("navigation", { name: "Search result pages" }),
  ).not.toBeInTheDocument();
  await user.click(dialog.getByRole("button", { name: "Search" }));
  const options = vi.mocked(bibleService.searchBible).mock.calls.at(-1)?.[3];
  expect(options?.signal?.aborted).toBe(false);
  await user.keyboard("{Escape}");
  await waitFor(() => expect(options?.signal?.aborted).toBe(true));
});
