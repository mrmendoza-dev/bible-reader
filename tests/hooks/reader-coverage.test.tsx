import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BibleProvider } from "@/bible/contexts/BibleProvider";
import { useBibleReaderScreen } from "@/bible/hooks/useBibleReaderScreen";
import { bibleService } from "@/bible/services/bible-service";
import { db } from "@/bible/storage/db";

beforeEach(async () => {
  localStorage.clear();
  bibleService.clearCache();
  await db.delete();
  await db.open();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ "1": { "1": "Fixture text" } })),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  db.close();
});

it("switches from Genesis to Psalms when the new edition has no Genesis text", async () => {
  const { result, rerender } = renderHook(
    ({ translationId }) => useBibleReaderScreen({ translationId }),
    {
      wrapper: BibleProvider,
      initialProps: { translationId: "web" },
    },
  );
  await waitFor(() =>
    expect(result.current.currentChapter?.verses[0].text).toBe("Fixture text"),
  );
  rerender({ translationId: "oeb" });
  await waitFor(() => {
    expect(result.current.loadedBook).toBe("psalm");
    expect(result.current.selectedBook).toBe("psalm");
    expect(result.current.currentBookData?.book).toBe("Psalm");
    expect(result.current.error).toBeNull();
  });
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(([url]) => String(url).includes("/oeb/genesis")),
  ).toBe(false);
  expect(result.current.books).toHaveLength(28);
});

it("restores an additional book preference and resets it when switching to a 66-book edition", async () => {
  localStorage.setItem("bible:last-book", JSON.stringify({ value: "tobit" }));
  const { result, rerender } = renderHook(
    ({ translationId }) => useBibleReaderScreen({ translationId }),
    {
      wrapper: BibleProvider,
      initialProps: { translationId: "swe1917" },
    },
  );
  await waitFor(() =>
    expect(result.current.currentBookData?.book).toBe("Tobit"),
  );
  rerender({ translationId: "web" });
  await waitFor(() =>
    expect(result.current.currentBookData?.book).toBe("Genesis"),
  );
  expect(
    vi
      .mocked(fetch)
      .mock.calls.some(([url]) => String(url).includes("/web/tobit")),
  ).toBe(false);
});

it("opens book and chapter selections immediately and keeps the persisted location aligned", async () => {
  vi.mocked(fetch).mockImplementation(async () =>
    Response.json({
      "1": { "1": "First chapter" },
      "3": { "1": "Third chapter" },
    }),
  );
  const { result } = renderHook(
    () => useBibleReaderScreen({ translationId: "web" }),
    { wrapper: BibleProvider },
  );
  await waitFor(() =>
    expect(result.current.currentBookData?.book).toBe("Genesis"),
  );
  act(() => result.current.handleBookChange("john"));
  await waitFor(() =>
    expect(result.current.currentBookData?.book).toBe("John"),
  );
  expect(result.current.loadedBook).toBe("john");
  act(() => result.current.handleChapterChange(3));
  await waitFor(() => expect(result.current.currentChapter?.chapter).toBe("3"));
  expect(result.current.selectedChapter).toBe(3);
  expect(
    JSON.parse(localStorage.getItem("bible:last-book") ?? "null").value,
  ).toBe("john");
  expect(
    JSON.parse(localStorage.getItem("bible:last-chapter") ?? "null").value,
  ).toBe(3);
});
