import type { ListQuery } from "@omni/app-contracts/data/list-query";
import { defineEndpoints } from "@omni/app-contracts/registry/define-endpoints";
import { bibleBookmarksService } from "./services/bible-bookmarks-service";
import { bibleListsService } from "./services/bible-lists-service";
import { bibleService } from "./services/bible-service";
import { bibleSupabaseService } from "./services/bible-verses-service";
import { AVAILABLE_TRANSLATIONS } from "./translations";

/**
 * Endpoints exposed by the Bible app. Thin wrappers over the shared `bibleService` so the
 * same lookup/search/random logic powers the app UI and any external caller (e.g. the Omni
 * Terminal `bible` command). `translation` is an optional param on every call (defaults to
 * `DEFAULT_TRANSLATION_ID` in the service layer) —
 * see `translations` for valid ids. Keep this file React-free — it is eager-imported at
 * startup (the service lazy-loads translation JSON, so this stays light).
 *
 * ## Two halves, and until v7 only one of them existed
 *
 * `verse` / `search` / `random` / `translations` are **the world's** Bible: a public text, the same
 * for everyone, needing no session. `saved` / `bookmarks` and their writes are **yours**: rows in
 * `bible_verses` and `bible_bookmarks`, RLS-scoped to the signed-in user.
 *
 * For six versions this module published the first half and not the second, so an agent could
 * quote John 3:16 at you and could not tell you that you had saved it. That is backwards, and it
 * was invisible: a *missing* endpoint has no failure mode — the data is simply unreachable outside
 * a browser tab, which looks identical to a table nobody wanted to expose.
 * `tools/codemod/check-endpoint-parity.ts` (v7 P0-T1) is what makes the next one of these loud.
 *
 * **The descriptions below say which half each endpoint is in, in its first clause.** A model
 * choosing between `search` and `saved` has nothing else to go on, and "search the Bible" versus
 * "search your Bible" is a one-word difference with an entirely different answer.
 *
 * ## `save` takes a reference, not five columns
 *
 * `bibleSupabaseService.saveVerse` wants `bookId`, `chapter`, `verse` and the verse *text* — which
 * a caller would have to look up first, in a separate call, and could get wrong. So `save` composes
 * the two halves this module already has: it resolves the reference through `bibleService` and
 * stores what that returns. A saved verse therefore always carries the real text, and the caller
 * only has to know the thing a person would say out loud.
 */
const bible = defineEndpoints(
  "bible",
  {
    verse: {
      description:
        'The world\'s Bible: look up a verse or range by reference (e.g. "John 3:16", "John 3:16-18"). Not your saved verses — see saved().',
      usage: "verse(reference, translation?)",
      readOnly: true,
      run: (reference: string, translation?: string) =>
        bibleService.parseBibleReference(reference, translation),
    },
    search: {
      description:
        "The world's Bible: full-text search across the whole text. Not your saved verses — see saved().",
      usage: "search(query, { book?, translation? })",
      readOnly: true,
      run: (query: string, opts?: { book?: string; translation?: string }) =>
        bibleService.searchBible(query, opts?.book, opts?.translation),
    },
    random: {
      description: "The world's Bible: a random verse.",
      usage: "random(translation?)",
      readOnly: true,
      run: (translation?: string) => bibleService.getRandomVerse(translation),
    },
    translations: {
      description: "The world's Bible: available translations (id + label)",
      usage: "translations()",
      readOnly: true,
      run: () =>
        AVAILABLE_TRANSLATIONS.map((t) => ({
          id: t.id,
          label: t.label,
          name: t.fullLabel,
        })),
    },
    saved: {
      description:
        "YOUR saved verses — a page of what the signed-in user has saved, newest first, each with the verse text as it was when saved.",
      usage:
        "saved({ limit?, page?, sort?: 'created_at'|'updated_at'|'book_id', order?: 'asc'|'desc', q?, since?: 'YYYY-MM-DD', until?: 'YYYY-MM-DD' }) — q searches the verse text and the book id; since/until bound when you saved it, not when it was written",
      readOnly: true,
      run: (query?: ListQuery) => bibleSupabaseService.listSavedVerses(query),
    },
    save: {
      description:
        "Save a verse to YOUR list, by reference. Resolves the reference first, so the stored row carries the real text. Saving something already saved returns the existing id rather than duplicating it.",
      usage:
        "save(reference, translation?) — reference is what a person would say: 'John 3:16'. A range saves its first verse.",
      run: async (reference: string, translation?: string) => {
        const found = await bibleService.parseBibleReference(
          reference,
          translation,
        );
        const first = found?.[0];
        if (first === undefined) {
          throw new Error(
            `bible.save: "${reference}" did not resolve to a verse — try the form "John 3:16"`,
          );
        }
        const id = await bibleSupabaseService.saveVerse(
          first.bookId,
          first.chapter,
          first.verse,
          first.text,
          first.translation ?? translation,
        );
        return {
          id,
          reference: `${first.bookTitle} ${first.chapter}:${first.verse}`,
        };
      },
    },
    unsave: {
      description: "Remove one verse from YOUR saved list, by id.",
      usage: "unsave(id) — the id comes from saved()",
      run: async (id: string) => {
        await bibleSupabaseService.delete(id);
        return { id, removed: true };
      },
    },
    bookmarks: {
      description:
        "YOUR bookmarks — a page of the places the signed-in user has marked in the text. A bookmark is a location (book, chapter, optionally a verse); a saved verse is text. They are different lists.",
      usage:
        "bookmarks({ limit?, page?, sort?: 'created_at'|'updated_at'|'name', order?: 'asc'|'desc', q?, since?: 'YYYY-MM-DD', until?: 'YYYY-MM-DD' }) — q searches the bookmark name and the book id; most bookmarks have no name",
      readOnly: true,
      run: (query?: ListQuery) => bibleBookmarksService.listBookmarks(query),
    },
    bookmark: {
      description:
        "Add a bookmark to YOUR list at a reference. Refuses when a bookmark already exists at that exact location rather than creating a second one.",
      usage:
        "bookmark(reference, { name?, color? }) — reference like 'John 3' for a chapter or 'John 3:16' for a verse; color is a hex string and defaults to the app's",
      run: async (
        reference: string,
        options?: { name?: string; color?: string },
      ) => {
        const found = await bibleService.parseBibleReference(reference);
        const first = found?.[0];
        if (first === undefined) {
          throw new Error(
            `bible.bookmark: "${reference}" did not resolve — try "John 3" or "John 3:16"`,
          );
        }
        /*
         * A reference naming no verse ("John 3") resolves to the chapter's first verse, which would
         * silently make a chapter bookmark into a verse bookmark. The literal is what decides.
         */
        const namesAVerse = /:\s*\d/.test(reference);
        const id = await bibleBookmarksService.createBookmark({
          bookId: first.bookId,
          chapter: first.chapter,
          verse: namesAVerse ? first.verse : null,
          ...(options?.name === undefined ? {} : { name: options.name }),
          ...(options?.color === undefined ? {} : { colorHex: options.color }),
        });
        return {
          id,
          bookId: first.bookId,
          chapter: first.chapter,
          verse: namesAVerse ? first.verse : null,
        };
      },
    },
    unbookmark: {
      description: "Remove one bookmark from YOUR list, by id.",
      usage: "unbookmark(id) — the id comes from bookmarks()",
      run: async (id: string) => {
        await bibleBookmarksService.delete(id);
        return { id, removed: true };
      },
    },
    lists: {
      description:
        "YOUR verse lists — named collections that organize saved verses. The default 'Saved' list receives quick-saves.",
      usage:
        "lists({ limit?, page?, sort?: 'created_at'|'updated_at'|'name'|'sort_order', order?: 'asc'|'desc', q? })",
      readOnly: true,
      run: (query?: ListQuery) => bibleListsService.listLists(query),
    },
    createList: {
      description: "Create a new verse list with a name.",
      usage: "createList(name)",
      run: async (name: string) => {
        const id = await bibleListsService.createList(name);
        return { id, name: name.trim() };
      },
    },
    renameList: {
      description:
        "Rename one of YOUR verse lists. The default 'Saved' list cannot be renamed.",
      usage: "renameList(id, name) — id comes from lists()",
      run: async (id: string, name: string) => {
        await bibleListsService.renameList(id, name);
        return { id, name: name.trim() };
      },
    },
    deleteList: {
      description:
        "Delete one of YOUR verse lists. mode 'move' re-links verses to the default Saved list; mode 'delete-verses' deletes verses that only belonged to this list.",
      usage:
        "deleteList(id, mode?: 'move' | 'delete-verses') — defaults to 'move'",
      run: async (id: string, mode: "move" | "delete-verses" = "move") => {
        await bibleListsService.deleteList(id, mode);
        return { id, removed: true, mode };
      },
    },
    addToLists: {
      description:
        "Add a saved verse to one or more lists by verse id, or save by reference first then add. Passing listIds replaces membership — unchecked lists are removed.",
      usage:
        "addToLists(verseIdOrReference, listIds, translation?) — reference form resolves and saves first; listIds is the full desired set",
      run: async (
        verseIdOrReference: string,
        listIds: string[],
        translation?: string,
      ) => {
        let verseId = verseIdOrReference;

        const looksLikeUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            verseIdOrReference,
          );

        if (!looksLikeUuid) {
          const found = await bibleService.parseBibleReference(
            verseIdOrReference,
            translation,
          );
          const first = found?.[0];
          if (first === undefined) {
            throw new Error(
              `bible.addToLists: "${verseIdOrReference}" did not resolve to a verse`,
            );
          }
          verseId = await bibleSupabaseService.saveVerse(
            first.bookId,
            first.chapter,
            first.verse,
            first.text,
            first.translation ?? translation,
          );
        }

        await bibleListsService.setVerseLists(verseId, listIds);
        return { verseId, listIds };
      },
    },
  },
  {
    source: {
      provider: "OmniOS",
      attribution:
        "Public-domain scripture translations; bookmarks and saved verses are yours",
      licence: "Public domain (the translations carried); your rows are yours",
      homepage: "https://supabase.com/docs",
      keyless: true,
      freshness: "on write",
    },
  },
);

export default bible;

declare module "@omni/app-contracts/registry/define-endpoints" {
  interface EndpointMap {
    bible: typeof bible.endpoints;
  }
}
