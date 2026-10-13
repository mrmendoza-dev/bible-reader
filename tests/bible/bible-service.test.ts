import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SEARCH_BOOK_CONCURRENCY,
  SEARCH_RESULT_LIMIT,
} from "@/bible/search-limits";
import { bibleService } from "@/bible/services/bible-service";
import { getTranslationBookIds, TRANSLATION_IDS } from "@/bible/translations";

const fixture = { "1": { "1": "Fixture (literal)", "2-3": "Grouped text" } };
beforeEach(() => bibleService.clearCache());
afterEach(() => vi.unstubAllGlobals());

describe("standalone translation loader", () => {
  it("deduplicates requests and isolates translation caches", async () => {
    const fetcher = vi.fn(async () => Response.json(fixture));
    vi.stubGlobal("fetch", fetcher);
    const [first, second] = await Promise.all([
      bibleService.getBook("genesis", "web"),
      bibleService.getBook("genesis", "WEB"),
    ]);
    expect(first).toBe(second);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledWith(
      "/bible/data/translations/web/genesis.json",
    );
    await bibleService.getBook("genesis", "kjv");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("rejects unknown identities before fetching", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(bibleService.getBook("genesis", "all")).rejects.toThrow();
    await expect(bibleService.getBook("genesis", "niv")).rejects.toThrow();
    await expect(bibleService.getBook("unknown", "web")).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("reports missing files and allows retry after an HTML fallback", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("<html></html>", {
          headers: { "Content-Type": "text/html" },
        }),
      )
      .mockResolvedValueOnce(Response.json(fixture));
    vi.stubGlobal("fetch", fetcher);
    await expect(bibleService.getBook("genesis")).rejects.toThrow(
      "Translation data is unavailable",
    );
    expect((await bibleService.getBook("genesis")).chapters).toHaveLength(1);
  });
  it("loads additional books only in editions with text and excludes blank chapters", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ "1": { "1": "Text" }, "2": { "1": "" } }),
    );
    vi.stubGlobal("fetch", fetcher);
    expect((await bibleService.getBooksList("oeb"))[0].id).toBe("psalm");
    expect(await bibleService.loadBooksList("swe1917")).toContain("tobit");
    await expect(bibleService.getBook("genesis", "oeb")).rejects.toThrow(
      "unavailable",
    );
    await expect(bibleService.getBook("tobit", "web")).rejects.toThrow(
      "unavailable",
    );
    expect(fetcher).not.toHaveBeenCalled();
    expect(await bibleService.getChaptersForBook("tobit", "swe1917")).toEqual([
      { number: 1, title: "Chapter 1" },
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      "/bible/data/translations/swe1917/tobit.json",
    );
    const results = await bibleService.searchBible("Text", "tobit", "all");
    expect(results.map((entry) => entry.translation)).toEqual(["swe1917"]);
  });
  it("preserves grouped identities in reference lookups without duplicating text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(fixture)),
    );
    expect(
      (await bibleService.parseBibleReference("Genesis 1:3"))?.[0].verse,
    ).toBe("2-3");
    expect(
      (await bibleService.parseBibleReference("Genesis 1:2-3"))?.map(
        (verse) => verse.verse,
      ),
    ).toEqual(["2-3"]);
  });
  it("searches literal punctuation and only editions containing the selected book", async () => {
    const fetcher = vi.fn(async () => Response.json(fixture));
    vi.stubGlobal("fetch", fetcher);
    const results = await bibleService.searchBible("(", "genesis", "all");
    expect(new Set(results.map((result) => result.translation))).toEqual(
      new Set(
        TRANSLATION_IDS.filter((id) =>
          getTranslationBookIds(id).includes("genesis"),
        ),
      ),
    );
    expect(fetcher).toHaveBeenCalledTimes(20);
  });
  it("fails visibly when a search corpus is incomplete", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("/asv/")
          ? new Response("", { status: 404 })
          : Response.json(fixture),
      ),
    );
    await expect(
      bibleService.searchBible("Fixture", "genesis", "all"),
    ).rejects.toThrow("Search could not load all selected books");
  });
});

describe("bounded search", () => {
  it("caps results across all translations and stops scheduling books", async () => {
    const verses = Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => [String(i + 1), "Common match"]),
    );
    const fetcher = vi.fn(async () => Response.json({ "1": verses }));
    vi.stubGlobal("fetch", fetcher);
    const results = await bibleService.searchBible("Common", "genesis", "all");
    expect(results).toHaveLength(SEARCH_RESULT_LIMIT);
    expect(new Set(results.map((result) => result.translation)).size).toBe(5);
    expect(fetcher).toHaveBeenCalledTimes(8);
  });
  it("limits concurrent book loads and avoids caching the search corpus", async () => {
    let active = 0;
    let peak = 0;
    const fetcher = vi.fn(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return Response.json(fixture);
    });
    vi.stubGlobal("fetch", fetcher);
    await expect(
      bibleService.searchBible("No match", "genesis", "all"),
    ).resolves.toEqual([]);
    expect(peak).toBe(SEARCH_BOOK_CONCURRENCY);
    const calls = fetcher.mock.calls.length;
    await bibleService.getBook("genesis", "web");
    expect(fetcher).toHaveBeenCalledTimes(calls + 1);
  });
  it("cancels in-flight fetches without scheduling another batch", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(
      (_url, options: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          options.signal?.addEventListener(
            "abort",
            () => reject(options.signal?.reason),
            { once: true },
          );
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    const pending = bibleService.searchBible("Fixture", undefined, "all", {
      signal: controller.signal,
    });
    expect(fetcher).toHaveBeenCalledTimes(SEARCH_BOOK_CONCURRENCY);
    const assertion = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    controller.abort();
    await assertion;
    expect(fetcher).toHaveBeenCalledTimes(SEARCH_BOOK_CONCURRENCY);
  });
  it("preserves relevance ordering within the retained results", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ "1": { "1": "testing", "2": "contest", "3": "test" } }),
      ),
    );
    const results = await bibleService.searchBible("test", "genesis", "web");
    expect(results.map((result) => result.verse)).toEqual(["3", "1", "2"]);
  });
});
