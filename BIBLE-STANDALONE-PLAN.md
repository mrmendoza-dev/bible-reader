# Standalone Bible app: translation review and implementation plan

Prepared: **2026-10-12**. Source repository inspected at commit `c84707a0b`.

This is a portable handoff for a new repository. It records the investigation and the proposed implementation; it does **not** mean the standalone app has been built. Paths described as “source” are relative to the OmniOS repository, currently `/home/smend/dev/omnios`. Paths described as “destination” are relative to the new repository.

## 1. Recommendation and project boundary

Create a single React + TypeScript + Vite application. Copy the Bible feature and its small UI dependency closure into it, then implement local persistence directly in the new repository. The two applications diverge at this point: no shared package, workspace dependency, submodule, synchronization script, or upstream compatibility requirement.

The first-release catalog is **WEB, ASV, YLT, and KJV**, with **WEB as the default**. The owner added KJV on 2026-10-12. WEB, ASV, and YLT are the strongest matches for unrestricted redistribution; KJV is included with the UK rights exception documented below. Use verified source editions and document their provenance before publishing the generated JSON. Do not assume the existing scraped files are already the best release artifacts.

KJV is included by owner decision, with its UK Crown-rights exception retained in the source and distribution notices. NET has generous free-use permissions but is not an unrestricted public-domain or permissively licensed translation. The other seven translations require permissions beyond the published quotation allowances for distributing an entire Bible. The evidence and individual decisions are in section 3.

### Proposed first-release scope

- Home, reader, book/chapter/translation selection, reference lookup, random verse, and text search.
- Saving verses and organizing them into multiple lists.
- Multiple named and colored bookmarks, including chapter-level bookmarks; moving, renaming, recoloring, and deleting them.
- Reading preferences, theme, selected translation, and last reading location stored locally.
- Local JSON backup export/import.
- Static hosting and local development without accounts, API keys, a database server, or the OmniOS asset CDN.
- Offline reopening and reading after the app and bundled translations finish caching, implemented after the basic extraction works.

The smallest initial scope removes the Notes integration and “Explain Verse” action. Local notes can be a later feature with their own IndexedDB store and management screen. Keeping a note editor that saves into another app is not a standalone implementation.

No existing OmniOS user data is automatically migrated. A separate, explicit export adapter can be added later if needed; it must never become a runtime dependency of the public app.

## 2. What exists today

### Inventory

| Item | Observed state |
| --- | --- |
| Feature directory | `packages/apps/src/production/bible-app/` |
| Size | 52 files; approximately 8,829 lines of TS/TSX/CSS |
| Entry | `components/BibleApp.tsx`, wrapping Home, Reader, and Saved Verses tabs |
| Bible text reader | `services/bible-service.ts`; browser-side fetch, parsing, memory caching, reference resolution, search, and random verse |
| User storage | `bible-verses-service.ts`, `bible-lists-service.ts`, `bible-bookmarks-service.ts` |
| Existing preferences | `BibleProvider.tsx`, `BibleApp.tsx`, and `useBibleReaderScreen.ts` use a shared localStorage hook |
| Auth dependency | `BibleHome.tsx` and `useBibleReaderScreen.ts` import `useAuth`; several actions and loading effects require `user.uid` |
| Cross-app dependencies | Notes service and OS assistant inbox |
| UI dependency closure | 23 shared UI/helper files, approximately 1,819 lines before removing unused feature controls |
| Text assets | `packages/assets/store/bible/data/translations/`; 12 folders, each with 66 JSON book files |
| Total current text assets | Approximately 52.13 MiB, uncompressed |
| Tests | `packages/apps/tests/bible-app/`: 10 files, 69 tests |

The asset store is **gitignored** in OmniOS. It is populated through the project's asset mirrors. Copying the feature directory or cloning the source repository does not carry the Bible text into the new application.

### What can remain substantially intact

The reader components, dialogs for lists and bookmarks, saved-verse grouping utilities, book constants, reference parser, exercises, and most of the feature's state hooks are reusable. There is no need to replace the reader or introduce a new application framework.

`bible-service.ts` already reads static files. It is not a server-side Bible API. Its important host dependency is `assetUrl()`, which currently resolves `/bible/data/translations/<translation>/<book>.json` against the OmniOS asset configuration.

The storage services already give the UI an asynchronous boundary. Preserve the relevant method signatures and return shapes while replacing their implementation. Do not recreate `AuthenticatedService` locally or emulate a signed-in user.

## 3. Translation rights review

### What “safe to bundle” means for this project

The intended distribution includes full translation text in a public Git repository, in downloadable source archives, and in static builds. Unrestricted downstream redistribution, including commercial use, remains the goal for WEB/ASV/YLT. The owner's addition of KJV introduces a documented UK territorial exception; do not describe the entire four-translation bundle as unconditionally unrestricted worldwide.

Free online reading, a free API, permission for church slides, or permission to quote several hundred verses does not establish permission to redistribute an entire translation. The application code's license also cannot grant rights in third-party Scripture text.

The findings below are a source-backed release recommendation, not a guarantee about every jurisdiction or every third-party edition. Translation rights and the provenance of a particular digital dataset must both be checked. All source links were researched on 2026-10-12.

### Decisions for all twelve existing translations

Sizes are measurements of the current local JSON, not promised sizes of newly generated files.

| ID | Translation | Current size | Decision for baseline repo | Evidence and reason |
| --- | --- | ---: | --- | --- |
| `web` | World English Bible | 4.35 MiB | **Include from a verified source** | eBible.org explicitly dedicates the text to the public domain and permits redistribution and sale. Its translation name remains a trademark: preserve the text and identify the edition accurately. [WEB rights](https://ebible.org/eng-web/copyright.htm). |
| `asv` | American Standard Version, 1901 | 4.43 MiB | **Include from a verified source** | eBible.org identifies the 1901 translation as public domain and permits copying. Use the historical ASV text, not a later copyrighted revision or added study material. [ASV rights](https://ebible.org/eng-asv/copyright.htm). |
| `ylt` | Young's Literal Translation | 4.44 MiB | **Include from a verified source** | eBible.org identifies its Robert Young text as public domain. Bible Gateway identifies its YLT text as the 1898 edition; the source edition used in the new repo must be recorded explicitly. [YLT source rights](https://ebible.org/engylt/copyright.htm), [edition information](https://www.biblegateway.com/versions/Youngs-Literal-Translation-YLT-Bible/). |
| `kjv` | King James Version | 4.41 MiB | **Include by owner decision; document UK exception** | The historical text is public domain in the US, but Cambridge publishes a UK Crown-rights notice with limited quotation permissions and a permission requirement for other uses. Do not describe a full bundled KJV as unconditionally unrestricted worldwide. [Cambridge rights notice, page 2](https://www.cambridge.org/sites/default/files/media/documents/Sample%20Text%20Pages.pdf), [eBible discussion of public domain and letters patent](https://ebible.org/publicdomain.htm). |
| `net` | NET Bible | 4.34 MiB | **Omit from unrestricted baseline** | Current published permissions distinguish noncommercial use, quotations in apps, attribution/link requirements, and commercial licensing. They do not provide the unrestricted downstream commercial rights sought here. [NET permissions](https://netbible.com/copyright/). |
| `nkjv` | New King James Version | 4.36 MiB | **Omit without an explicit redistribution license** | The published permission covers up to 500 verses, subject to limits including no complete book. It does not authorize distribution of the whole translation. [Published NKJV rights notice](https://www.biblegateway.com/versions/New-King-James-Version-NKJV-Bible/). |
| `mev` | Modern English Version | 4.35 MiB | **Omit without an explicit redistribution license** | The published notice reserves rights and provides a limited printed quotation allowance, not a general whole-text software distribution grant. [Published MEV rights notice](https://www.biblegateway.com/versions/Modern-English-Version-MEV-Bible/). |
| `nasb` | New American Standard Bible | 4.43 MiB | **Omit without an explicit redistribution license** | Lockman's current allowance is up to 1,000 verses with additional conditions, including a limit on electronic retrieval storage. A complete Bible exceeds it. [Lockman permissions](https://www.lockman.org/permission-to-quote-copyright-trademark-information/). |
| `esv` | English Standard Version | 4.30 MiB | **Omit without an explicit redistribution license** | Crossway's standard digital allowance is limited to 500 verses with additional conditions. Free noncommercial API access is not a grant to commit the complete text. [Crossway permissions](https://www.crossway.org/permissions/). |
| `nrsv` | New Revised Standard Version | 4.28 MiB | **Omit** | Friendship Press says downloadable Bibles/software require permission or a license. Its current policy also says the NRSV, except NRSV-CE, is no longer available for new licenses or permission agreements. [NRSV/RSV/NRSVue policy](https://www.friendshippress.org/pages/nrsvue-quick-faq). |
| `csb` | Christian Standard Bible | 4.20 MiB | **Omit without an explicit redistribution license** | Holman's published allowance is up to 1,000 verses and excludes a complete book; a bundled complete translation exceeds that permission. [Publisher sample, copyright page](https://readersbible.csbible.com/wp-content/themes/csbrb-theme/assets/sample.pdf). |
| `niv` | New International Version | 4.23 MiB | **Omit without an explicit redistribution license** | Biblica says app/website use requires written permission and full-text licenses are granted to registered legal entities. General quotation permissions do not cover this use. [Biblica permissions](https://www.biblica.com/permissions/). |

### Recommended bundle

Ship `web`, `asv`, `ylt`, and `kjv`. Their current files total approximately **17.63 MiB across 264 books**. New source editions or output formatting may change that size.

Set `DEFAULT_TRANSLATION_ID = "web"`. Remove the excluded entries from the UI catalog, all-translations search, examples, fixtures that imply supported translations, and static asset output. A hidden dropdown entry is not sufficient if the excluded files remain in `public/` or Git history.

KJV is part of the implementation scope by owner decision. That decision does not resolve the UK rights exception or grant additional redistribution rights. Preserve the exception in translation metadata and notices, and assess it for the intended distribution before publication. Do not contact a rights holder automatically; any correspondence would be a separate user-authorized action.

NET deserves particular care: its name and free availability are not evidence of an open-source-compatible text license. A separately licensed or noncommercial distribution could be considered later, but it is outside this baseline.

### Current file provenance is incomplete

The inspected book metadata contains `Language`, `Meaningless`, `Timestamp`, and `Translation`. The CSB sample additionally includes a Bible Gateway copyright URL. The other inspected translation samples do not identify their exact source edition or provide a redistribution grant.

The `Meaningless` field is consistent with output from [daniel-tran/meaningless](https://github.com/daniel-tran/meaningless), whose own documentation describes retrieving and processing Bible Gateway passages and shows the same metadata shape. This is a provenance inference, not proof of the exact commands used to obtain every local file. A scraper's software license would not license the Bible translations it retrieves.

**Preferred release path:** regenerate the four selected translations from verified source distributions, recording KJV's UK exception separately. Use current local JSON as a compatibility and comparison reference, rather than publishing it without further verification. This avoids making the new project's content supply depend on undocumented scraping.

### Sources to use when preparing release data

| New repo ID | Proposed source | Source handling |
| --- | --- | --- |
| `web` | [eBible WEB Classic](https://ebible.org/eng-web/) | Select and record the Classic text edition; retain the 66 books supported by the current app. The source also has additional books, which must not leak into a catalog that assumes 66. Do not silently switch between Classic and Updated WEB under the same undocumented label. |
| `asv` | [eBible ASV 1901](https://ebible.org/eng-asv/) | Prefer the downloadable structured source. Record the source package/date and preserve verse text. |
| `ylt` | [eBible Young's Literal Translation](https://ebible.org/engylt/) | Confirm the edition metadata of the selected download. If a structured source is unavailable, use a documented conversion of the downloadable HTML text with fixtures for boundaries and formatting. |
| `kjv` | Historical KJV text; exact source edition to be selected | Pin a verified digital source and edition, record source/rights URLs and checksums, retain the supported 66 books, and document the UK Crown-rights exception. Omit publisher-added study material and other additions without a separate redistribution basis. |

Preserve Scripture wording. Format conversion, selecting the supported canon, and separating footnotes from verse text must be documented. For WEB, do not publish an altered translation under the World English Bible name. Source headings, notes, illustrations, audio, and other additions need their own rights assessment; the default importer should not copy them.

### Data-quality observations that must survive the handoff

A structural scan of the original three candidate local datasets found (KJV was not included in this scan and needs the same validation):

| Dataset | Books | Chapters | Verse-key entries | Empty text entries |
| --- | ---: | ---: | ---: | ---: |
| ASV | 66 | 1,189 | 31,102 | 16 |
| YLT | 66 | 1,189 | 31,102 | 0 |
| WEB | 66 | 1,189 | 31,103 | 5 |

ASV empty references: Acts 8:37, 15:34, 24:7, 28:29; John 5:4; Luke 17:36, 23:17; Mark 7:16, 9:44, 9:46, 11:26, 15:28; Matthew 17:21, 18:11, 23:14; Romans 16:24.

WEB empty references: Acts 8:37, 15:34, 24:7; Luke 17:36; Romans 16:25.

These are observations, not a finding that every empty entry is a corrupt verse. Textual omissions and grouped verses vary by edition. Compare them to the selected source, explicitly record legitimate omissions or ranges, and fix extraction loss where confirmed. Never fill an empty verse with another translation or force every edition to have the same verse count.

No invalid chapter/verse numeric keys or non-string verse values were found in this scan. The marker scan found no HTML tags or superscript digits in the three candidates; that narrow scan does not prove textual fidelity. The largest current book file among the candidates is approximately 263 KiB.

### Licensing files in the destination repo

Plan to create:

- `LICENSE`: proposed MIT license for project-owned application code, subject to the owner's final license choice.
- `THIRD_PARTY_NOTICES.md`: actual copied component origins, required upstream notices, package/font credits, and the distinction between code and Scripture rights.
- `public/bible/translations-manifest.json`: machine-readable IDs, labels, editions, source URLs, rights URLs, retrieval dates, conversion version, checksums, canon, and documented omissions/ranges.
- A small text notice distributed with each translation, describing its public-domain status and source. Do not claim the application license creates a copyright over public-domain Scripture.
- An About/Translations panel exposing the relevant source and rights information to users.

Do not label old app artwork, photographs, or logos as MIT merely because they were copied with the source. The existing `images/` and `data/artwork.json` appear outside the active reader dependency path; omit them initially unless a verified use and redistribution basis is established. Exercise material also needs review: the current battle packs embed KJV wording. Resolve displayed Scripture from the selected catalog so its edition, wording, and translation label stay consistent.

## 4. Destination architecture

Keep one package and a conventional directory layout:

```text
new-repo/
  package.json
  bun.lock
  index.html
  vite.config.ts
  tsconfig.json
  biome.json
  LICENSE
  THIRD_PARTY_NOTICES.md
  README.md
  BIBLE-STANDALONE-PLAN.md
  public/
    bible/
      translations-manifest.json
      data/translations/{web,asv,ylt,kjv}/<book-id>.json
  scripts/
    import-translations.ts
    validate-translations.ts
    check-standalone-boundaries.ts
  src/
    main.tsx
    App.tsx
    styles/{index,theme}.css
    components/ui/
    hooks/{useLocalStorage,useSwipeIndicator}.ts
    lib/{utils,value-change-adapters,report-error}.ts
    storage/
      db.ts
      models.ts
      backup.ts
    features/bible/
      components/
      contexts/
      hooks/
      services/
      constants/
      types/
      utils/
      styles/
      translations.ts
  tests/
    bible/
    storage/
    data/
    browser/
```

The exact small-file placement can follow the new repo's conventions. The boundaries matter more: feature code uses local UI, local storage services, and same-origin static data; nothing imports an OmniOS package or reaches outside the repository.

Use one `@/` alias for `src/`, configured consistently in TypeScript, Vite, and Vitest. Rewrite `@apps/production/bible-app/...` to `@/features/bible/...`; rewrite shared UI imports to their local equivalents.

Do not carry over Turborepo, project-reference declaration output, endpoint discovery, Supabase, auth providers, server proxies, asset restore scripts, or the monorepo test bootstrap.

### Dependencies

Use the current compatible major versions for the extraction, then update independently. The source catalog currently uses React 19, Vite 7, TypeScript 5.9, Base UI 1.4, Tailwind 4.1, and Vitest 3.2. Resolve ordinary package versions in the new repo; `catalog:` and `workspace:` references cannot be copied into its `package.json`.

Runtime dependencies expected from the current closure: `react`, `react-dom`, `@base-ui/react`, `lucide-react`, `sonner`, `cmdk`, `class-variance-authority`, `clsx`, `tailwind-merge`, and `react-swipeable`; add `dexie` and `dexie-react-hooks` for persistence. Keep `react-swipeable` only if the exercise/swipe screens remain.

Tooling: Vite and its React plugin, TypeScript/types, Tailwind's Vite plugin, the animation CSS actually used by copied components, Biome, Vitest, Testing Library, jsdom, and `fake-indexeddb`. Add a browser test runner and `vite-plugin-pwa` when implementing the browser/offline phases. Add schema validation for backup input, preferably Zod, rather than importing the monorepo's schemas package.

Do not install TanStack Query, a router, a global state library, or a generic persistence framework merely to mirror the host. The current app's tab state and repository-sized services are sufficient.

## 5. Exact extraction inventory

### Copy from the Bible feature

Copy the feature's components, hooks, contexts, constants, types, utils, services, styles, and `translations.ts` into `src/features/bible/`.

Exclude `manifest.ts` and `endpoints.ts`. Exclude unneeded artwork and images. Remove `BibleNoteDialog.tsx` if taking the proposed minimal scope, along with its triggers, callback props, state, and imports. Keep the remaining exercise layout/content after replacing embedded Scripture text as described below.

Rewrite the copied services rather than replacing the entire UI. Rename `BibleSupabaseService`/`bibleSupabaseService` to a storage-neutral name such as `BibleVersesService`/`bibleVersesService` and update its importers. Remove endpoint-only `ListQuery`, `ListPage`, support descriptors, and pagination functions after confirming the UI does not call them.

### Copy the shared UI closure

The current closure from `packages/ui-base/src/` is:

```text
alert-dialog.tsx
badge.tsx
button.tsx
card.tsx
checkbox.tsx
collapsible.tsx
command.tsx
dialog.tsx
input-group.tsx
input.tsx
label.tsx
popover.tsx
progress.tsx
radio-group.tsx
scroll-area.tsx
select.tsx
spinner.tsx
swipe-indicator.tsx
tabs.tsx
textarea.tsx
hooks/useSwipeIndicator.ts
lib/utils.ts
lib/value-change-adapters.ts
```

Place components in `src/components/ui/`, and the hook/helpers in their local locations; adjust relative imports. Recompute the closure after removing Notes: for example, `textarea.tsx` is also imported by `input-group.tsx`, so deleting the note editor does not prove it is unused.

Copying this small set preserves the current **Base UI** APIs. Installing an arbitrary new set of shadcn/Radix components under the same names risks different prop and event semantics. Review copied upstream attribution before assigning the new code license.

### Copy or replace the preferences hook

Source: `packages/services/src/hooks/useLocalStorage.ts`. It imports React only and includes same-tab subscription and cross-tab storage handling. It can be copied locally, with project-specific comments and error handling adapted, instead of bringing the services package with it.

The source hook stores a `{ value, expiry? }` wrapper. Preserve that shape if retaining the hook; do not mix wrapped and unwrapped values under a key. New namespaced keys avoid collisions with other apps running on the same development origin.

### Carry the base styling

Copy the relevant design tokens from `packages/ui-base/theme.css` to `src/styles/theme.css`, and retain the feature's gold-accent stylesheet. Provide Tailwind, the dark variant, animation utilities required by the components, and small document-level resets/layout rules.

Do not copy all of `apps/web/src/styles/index.css`: it imports several workspaces and OS-specific styling. Local files under `src/` can be scanned normally by Tailwind; the monorepo's `@source` registrations and package stylesheets are unnecessary.

Set `html`, `body`, and `#root` to fill the viewport. Ensure the app's `h-full` and internal scrolling have a definite height and that flex children have the required `min-h-0`. Add local light/dark/system theme ownership; it currently comes from the host. The reader already uses system serif/sans font stacks, so remote font fetching is unnecessary.

## 6. Local data model and invariants

### Storage division

| Data | Storage | Reason |
| --- | --- | --- |
| Saved verses, lists, list membership, bookmarks | IndexedDB through Dexie | Structured records, indexes, atomic multi-store changes, and reactive reads |
| Font style/size, theme, preferred translation, last reading location | localStorage | Small preference state available immediately on startup |
| Source Bible text | Versioned static JSON plus browser Cache Storage for offline delivery | Immutable shipped content; avoid a second identical corpus in IndexedDB |
| Dialogs, active popovers, selection, pending operations | React state | Transient UI |

Use one exported Dexie database instance with a stable name such as `bible-local`. Dexie's React live queries can observe repository methods and changes from another tab. Use them where storage-backed screens need to stay current. [Dexie React integration](https://dexie.org/docs/Tutorial/React).

### Records

Retain the existing UI-facing snake_case fields initially to reduce extraction churn. Replace the inherited authenticated document with a local base record containing `id`, `created_at`, and `updated_at`. New records have no `user_id`; IDs can use `crypto.randomUUID()`, and timestamps remain ISO strings for compatibility with current sorting/display code.

| Store | Important fields and indexes |
| --- | --- |
| `savedVerses` | `id`; unique compound `[book_id+chapter+verse+translation]`; `verse_text`; `book_id` and `created_at` indexes |
| `lists` | `id`; `name`; nullable `description`; `is_default`; `sort_order` index |
| `listItems` | compound primary key `[list_id+verse_id]`; indexes on `list_id` and `verse_id` |
| `bookmarks` | `id`; `book_id`; `chapter`; nullable `verse`; nullable `name`; `color_hex`; unique `location_key`; `updated_at` index |

Use a deterministic system-list ID such as `default-saved`. Its identity is the ID, not its display name. Keep existing behavior that user-created lists cannot rename or delete the system Saved list. Preserve acceptance of duplicate user list names unless deliberately changing that UX; the current service does not enforce name uniqueness.

Encode bookmark `location_key` unambiguously, for example `JSON.stringify([book_id, chapter, verse ?? null])`. IndexedDB keys do not support null as a compound-key member, so do not index `[book_id+chapter+verse]` directly for chapter bookmarks. Likewise, do not rely on an IndexedDB index of the boolean `is_default`.

### Semantics to preserve

1. A saved verse is unique per translation and location. Saving the same reference twice returns the existing record rather than duplicating it.
2. Store `verse_text` as a snapshot along with its translation. Saved items can render without fetching the book again.
3. A verse can belong to multiple lists. Saving adds membership in Saved, matching the current service. All Saved Verses is the complete verse store, not merely the Saved list's memberships.
4. Removing list membership does not unsave the verse. A verse with no list membership remains visible under All.
5. Unsave deletes the saved verse and every membership referring to it.
6. Deleting a list in “move” mode adds its verses to Saved, removes its memberships, and deletes the list. Existing memberships in other lists remain.
7. Deleting a list in “delete verses” mode deletes verses belonging **only** to that list; shared verses survive in their other lists. Membership cleanup must be explicit.
8. Bookmarks are currently translation-independent navigation references. Preserve that behavior, including chapter-level bookmarks.
9. Multiple bookmarks are supported, but the existing UI/service allow one bookmark per exact location. Preserve that invariant and reject moves onto another bookmark's location.
10. Saving a verse and bookmarking a location remain separate actions; neither implies the other.

### Atomicity and concurrency

Implement save-plus-default-membership, unsave-plus-membership-cleanup, list deletion, and membership replacement as transactions over all touched stores. IndexedDB does not provide SQL foreign keys or cascading deletes; services enforce those relationships.

Use unique indexes and read/write transactions to enforce verse/bookmark uniqueness across tabs. A read-then-write check outside a transaction is insufficient. Default-list initialization should use the deterministic ID and be safe under two simultaneous tabs.

Resolve or fetch Scripture **before** entering a write transaction. Do not await fetch, a file picker, a confirmation dialog, or unrelated asynchronous work inside a Dexie transaction. Let transaction failures reject so the full operation rolls back; do not swallow one failed write and report success. [Dexie transaction documentation](https://dexie.org/docs/Dexie/Dexie.transaction()).

Start with schema version 1. Future upgrades should be explicit and tested using a previous-version fixture. Never respond to an upgrade failure by deleting the user's database. A blocked upgrade should ask the user to close older tabs and retry.

### Storage-backed UI updates

Adapt `useBibleReaderScreen`, `useSavedVersesScreen`, and Home bookmark reads to query the local services. Derive saved-verse keys, bookmark maps, and list membership views from those reads. Avoid maintaining a separate authoritative copy of each table in React.

Use local pending state for disabling controls. Show a success toast only after the transaction commits. On failure, keep existing data, restore the control state, and provide an actionable toast. A small `report-error.ts` helper plus Sonner is enough; do not copy the host's error/capability registry.

Remove **all** auth-gated reads and writes, including sign-in messages and bookmark-empty-state branches. Merely removing the AuthProvider while leaving `if (!user?.uid) return` would silently disable local functionality.

## 7. Preferences and translation identity

Namespace new keys, for example `bible:font-style`, `bible:font-size`, `bible:theme`, `bible:translation`, and `bible:last-location`. Preserve chosen settings across reloads and synchronize multiple hook instances/tabs where applicable.

Validate values at the boundary: allowed font sizes/styles, a supported translation, canonical book ID, positive chapter number, and a chapter that exists in the chosen book. A corrupt preference should reset that preference to a valid default without touching collections.

Separate these two concepts in types:

- A concrete translation ID, initially `web | asv | ylt | kjv`.
- A search scope, which can additionally be `all`.

The current `normalizeTranslationId()` accepts `all` and falls back to KJV for unknown IDs. Do not carry that behavior into writes or backup import. `all` must never be persisted as a saved verse's translation or used as a book folder. Unknown imported IDs must not be silently relabeled as WEB; reject them with a specific explanation in the baseline importer.

Use explicit catalog labels (`WEB`, `ASV`, `YLT`, `KJV`) rather than title-casing their identifiers. Saved verse keys must continue to include the normalized concrete translation ID. Bookmarks retain their translation-independent location identity.

The new origin cannot automatically read localStorage or IndexedDB from the OmniOS origin. Do not promise preference or collection continuity without an explicit export/import step.

## 8. Static text delivery, search, and exercises

### Data preparation

Write `scripts/import-translations.ts` to accept pinned source archives/files and generate the approved catalog. Keep a deterministic book-ID mapping compatible with the existing `BOOKS_LIST` (`psalm`, `song-of-solomon`, `1-corinthians`, etc.). Prefer an established structured source to scraping a live website.

A parser must handle verse boundaries, grouped/ranged verses, footnotes, headings, inline emphasis, and punctuation deliberately. Do not remove markup with an indiscriminate regex or interpret every number as a new verse. Preserve textual wording and document whitespace transformations. Test conversion fixtures before running a full import.

Keep the current runtime shape where practical: one JSON file per book with a book/chapter/verse mapping. If grouped verses or omissions require an extension, represent them explicitly and update reference resolution instead of inventing text to fit a numeric-only schema.

Generate counts, checksums, and source metadata from the actual output. Independently validate the expected source book set and reference coverage; generating a manifest from a truncated import does not prove completeness. Use source-edition-specific omission/range records instead of a universal 31,102-verse assertion.

Commit the approved generated text so a fresh clone can run and build without downloading assets from a private service. The importer is a maintenance tool, not a mandatory network step during installation or the normal build.

### Runtime file URLs

Replace the host helper with a local function that joins `import.meta.env.BASE_URL` and the Bible data path. It must work at `/` and at a subpath such as `/bible/`; hardcoded root-relative URLs break common repository-site deployments.

Vite's `public/` files are served as static assets and copied into the build. Keep book loading lazy and retain the existing in-memory cache/deduplication for repeated reads. [Vite static asset documentation](https://vite.dev/guide/assets.html).

A failed book load must produce a visible retry/error state. Unsupported translation IDs must be rejected before constructing URLs. Abort or ignore stale results when a user changes translation or chapter rapidly.

### Search

Retain the existing reference resolver and text search for the first extraction. Derive the all-translations search set from the approved catalog.

The current full-text search loads all selected books and scans them on the main thread. Reducing the catalog from twelve to four helps, but a cold all-translations search can still load about 18 MiB and scan roughly 124,000 verse entries. These are planning estimates; measure the generated four-translation corpus. Verify responsiveness on a mobile-sized browser and prevent stale searches from replacing newer results.

If measured responsiveness is poor, move scanning into a Web Worker with the same result shape, bounded loading concurrency, and a result cap. Do not introduce a server search endpoint or duplicate all Bible text into IndexedDB just to make search available. A sophisticated search index is a later optimization unless measurements show it is needed for the release.

### Exercises

`components/exercises/data/battle-packs.ts` embeds KJV verse strings. Retain exercise IDs, themes, references, and application-authored notes, but resolve the displayed Scripture from an approved translation. For the initial version, use WEB and label it explicitly; support active-translation rendering only if its behavior is tested.

Handle ranges such as Philippians 4:6–7 and 1 Corinthians 6:18–20. Do not relabel embedded KJV wording as WEB. Review the evening-prayer screen and any other embedded Scripture, fixtures, help text, screenshots, and sample exports for the same issue.

## 9. Backup and recovery

Include backup export/import before calling the local-data release complete. Browser persistence is origin-specific and normally best-effort; a user can clear it and the browser can evict it. Requesting persistent storage can reduce eviction risk but does not replace a user-controlled backup. [Browser storage and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

### Format

Export a versioned JSON envelope with `format`, `formatVersion`, `exportedAt`, `appVersion`, `savedVerses`, `lists`, `listItems`, `bookmarks`, and optional preferences. Include the saved text snapshots, but not the entire shipped Bible corpus or service-worker cache.

Use a clear app-specific format ID and a stable version independent of the internal database schema. Round-trip ISO timestamps, list ordering, colors, chapter bookmarks, and translation IDs. An export must represent a consistent collection snapshot, using a read transaction over the collection stores.

### Import behavior

For the first release, implement **restore/replace**, not a partially specified merge algorithm:

1. Choose a file and enforce a reasonable input-size limit before parsing.
2. Parse and validate the complete envelope in memory. Reject unknown format versions, unsupported translation IDs, malformed records, duplicate identities, invalid colors/references, and dangling memberships.
3. Show counts and explain that restore replaces the current collections. Offer export of the existing data before confirming.
4. Replace all collection stores in one write transaction; ensure the default system list exists.
5. Report success only after commit. A failed restore leaves the previous collections intact.
6. Validate and apply optional preferences separately: localStorage cannot participate in an IndexedDB transaction. Report a preference-write failure separately rather than misrepresenting the collection restore as rolled back.

Restore must not interpret imported notes/text as HTML. Use text rendering. Validate references against local source coverage before opening the write transaction. Arbitrary Bible-pack import, cloud sync, and importing a complete OmniOS/Supabase export are separate features.

Provide a distinct “Reset settings” action. Deleting collections requires explicit confirmation and must not be a side effect of clearing an offline cache or changing the theme.

## 10. Offline behavior and hosting

Local data storage and offline app delivery are separate. IndexedDB preserves collections; the browser still needs cached HTML/JS/CSS and Bible books to reopen the app without a connection.

After the core application works, use `vite-plugin-pwa` with generated Workbox precaching for the app shell and all approved translation JSON. Start with this conventional approach rather than a custom service worker. Ensure JSON is explicitly included in the precache patterns and the actual largest output file is within the configured precache size limit. The current candidate books are below the common 2 MiB limit, but check generated output rather than assuming it stays so. [PWA static asset handling](https://vite-pwa-org.netlify.app/guide/static-assets).

Precache all four translations for the initial offline release. This is approximately 18 MiB uncompressed plus the shell; actual transfer depends on host compression and the selected source output. Keep the interactive reader lazy even though the worker downloads the static corpus in the background.

Show “Preparing offline access,” “Available offline,” and an actionable failure/retry state. Only claim readiness after the appropriate worker installation/activation and full corpus caching complete. An interrupted first install must not be presented as a complete offline download.

Use update prompting rather than immediately reloading while a dialog or action is in progress. A new worker should not delete personal data. Updates may change static content and its version metadata; they must not run destructive database resets. [PWA update prompting](https://vite-pwa-org.netlify.app/guide/prompt-for-update).

Serve production over HTTPS, with localhost supported for development. Do not promise a working `file://` build. A locally served Vite build is compatible with the “no backend” requirement: it serves files without an application API or database.

Use local assets and system fonts. Runtime requests should be limited to the same-origin app files; the app must not require Google Fonts, Bible Gateway, OmniOS CDN endpoints, telemetry, or publisher APIs. External rights/source links belong in About and open only on user action.

Keep the current single-page tab navigation, so no router/rewrite configuration is needed initially. Configure and test Vite/PWA base paths and scope together. Changing deployment origin or port creates a separate storage origin; export/import is the supported way to move user data between origins.

## 11. Phased implementation

These phases describe future work in the **destination** repository. Only this plan and the research are being produced in OmniOS.

### Phase 0 — Create the destination and preserve source inputs

1. Create or open the separate repo. An empty repo is sufficient; if bootstrapped already, inspect its package manager/configuration first.
2. Scaffold the single React/TS/Vite app and add Bun scripts and a lockfile.
3. Copy this plan into the destination root.
4. Copy the feature, UI closure, preference hook, and token stylesheet described in section 5 while the source checkout remains available.
5. Copy the ten Bible tests as adaptation inputs; identify endpoint-only coverage rather than blindly importing its dependencies.
6. Retain the current local ASV/YLT/WEB/KJV files only as private comparison inputs until verified or regenerated. Do not copy the full twelve-translation asset directory into the public repo, even temporarily.

**Exit:** the destination contains all source code needed for adaptation and has no filesystem dependency on the OmniOS checkout. Excluded Bible texts have never been added to its Git history. Do not commit or push automatically; those actions require the user's request.

### Phase 1 — Prepare the approved content

1. Pin verified source editions for WEB, ASV, YLT, and KJV; document KJV's UK rights exception.
2. Implement source conversion, source metadata, omission/range handling, and validation.
3. Produce all supported book files and verify reference coverage against the source.
4. Replace the catalog and default translation, and add source/rights notices.
5. Replace exercise Scripture strings with approved text resolution.

**Exit:** the only bundled translations are WEB/ASV/YLT/KJV; source editions and rights, including KJV's UK exception, are documented; content validation passes for all four translations; known empty entries have an explicit resolution. This gate is about release-quality text, not simply JSON that parses.

### Phase 2 — Make the feature independently render

1. Rewrite aliases and UI/helper imports.
2. Mount `BibleApp` under a small app root with theme ownership, error boundary, and Sonner toaster.
3. Remove manifests/endpoints, Notes/assistant actions, auth imports, auth branches, and host error/storage dependencies.
4. Add local static URL construction and make reading/search work against the approved content.
5. Add small-screen layout, viewport height, scroll containment, and local theme/preferences.

**Exit:** the standalone reader, translation selection, reference lookup, and settings work without any OmniOS runtime. Typecheck and a production build pass. No sign-in affordances remain.

### Phase 3 — Implement local collections

1. Add the Dexie database, models, indexes, default-list initialization, and storage-neutral services.
2. Implement saved verses and membership operations transactionally.
3. Implement bookmarks and duplicate-location constraints, including chapter bookmarks.
4. Adapt storage reads to reactive queries and preserve pending/error states.
5. Test collection mutations with real service implementations over `fake-indexeddb`, including rollback and concurrent operations.

**Exit:** saving, unsaving, lists, and bookmark operations survive reloads, update active screens/tabs, and preserve the invariants in section 6. Storage tests and typecheck pass.

### Phase 4 — Backup and storage recovery

1. Implement versioned export and validated replace/restore.
2. Add a preview, replacement confirmation, and an export-existing-data opportunity.
3. Add failure handling for unavailable/quota-limited storage, blocked upgrades, and corrupt preferences.
4. Add a persistent-storage request at an appropriate user interaction, without making acceptance a prerequisite for reading.

**Exit:** a backup from a populated instance restores the same collections to a clean instance; invalid imports and failed transactions preserve existing data. The UI explains that collections live in this browser and provides working export/import controls.

### Phase 5 — Offline delivery and production browser checks

1. Configure generated precaching for the shell and every approved book, with update prompting.
2. Implement accurate offline readiness/failure UI.
3. Run browser scenarios against the built app at root and a deployment subpath.
4. Test all-translations search responsiveness; introduce a worker only if needed.
5. Check mobile dialogs, touch/swipe controls, keyboard navigation, theme, and internal scrolling.

**Exit:** after preparation, a production build reopens offline and can read previously unvisited books in every bundled translation. Update and interrupted-download scenarios preserve user data. No unexpected third-party network requests occur.

### Phase 6 — Public repository readiness

1. Add the selected code license and required third-party/source notices.
2. Write a short README covering install/dev/build, static deployment, supported translations, local-data behavior, backup, and offline setup.
3. Add scripts and CI for lint, typecheck, data validation, unit/integration tests, and production build; run focused browser tests against the build.
4. Check the complete source/build for OmniOS imports, workspace references, private URLs, unnecessary assets, credentials, excluded translation files, and accidental host documentation.
5. Test a fresh clone with no OmniOS checkout, credentials, or asset restore configuration.

**Exit:** the app is self-contained, reproducible, documented, and ready for the owner to review and publish. Publishing and choosing the final public project identity are separate owner actions.

## 12. Validation plan

### Baseline evidence

The existing source suite was run during the assessment using:

```sh
bun run --cwd packages/apps test tests/bible-app
```

Result on 2026-10-12: **10 test files passed; 69 tests passed**. Existing test logs include missing Supabase capability and unmocked relative asset-fetch messages; passing tests are not proof that persistence, source text fidelity, or a standalone production build works. Several UI tests mock the service or the entire screen hook.

The destination must have its own small test setup. Do not copy `packages/apps/tests/setup-tests.ts` wholesale, because it belongs to the monorepo environment.

### Port existing coverage deliberately

Retain relevant reference parsing, book display, verse-key, saved-verse grouping, reader, bookmark dialog, verse actions, and exercise coverage. Adapt fixtures to local record types and approved translation IDs. `bible-own-half.test.ts` primarily covers OmniOS endpoints; omit it along with the endpoints rather than bringing registry/auth code into the standalone app.

### New storage and backup tests

| Area | Required scenarios |
| --- | --- |
| Saved identity | Duplicate saves return one record; the same location in ASV and WEB remains two records; unsupported IDs and `all` are refused |
| Default list | Concurrent initialization creates one system list; it cannot be renamed/deleted; save adds its membership |
| Memberships | Multi-list membership; duplicate membership prevention; removing one membership keeps the saved verse; dangling references are refused |
| Unsave | Removes the verse and all memberships in one transaction |
| List deletion | Move mode preserves verses; delete mode removes only exclusive verses; shared memberships survive |
| Bookmarks | Multiple locations; chapter versus verse identity; move/rename/color; duplicate target rejection; concurrent creation |
| Transactions | Inject a failure after an intermediate mutation and verify full rollback |
| Persistence | A second connection sees committed data; closing/reopening preserves collections |
| Upgrade | Previous-version fixture upgrades without losing data; blocked upgrade is recoverable |
| Backups | Complete round trip; empty collections; invalid envelope; duplicate identities; unsupported version/translation; bad memberships; replacement rollback |
| Preferences | Invalid JSON/value fallback; write failure; same-tab/cross-tab synchronization; optional preference restore failure is reported separately |

Use `fake-indexeddb` for repository/transaction integration tests. Use actual browser IndexedDB for focused persistence, multi-tab, and offline scenarios; simulated IndexedDB alone cannot validate browser behavior.

### Text and catalog checks

- Catalog folders and generated manifest agree; only allowlisted translations are present in source and build output.
- Every supported source book appears exactly once, with an explicit canonical mapping and correct chapter coverage.
- Empty/ranged/missing references match source-edition records; no blanket requirement for all translations to have identical numbering.
- No headings, footnote labels, scraper navigation, or HTML enter verse text accidentally.
- Conversion fixtures preserve punctuation and verse boundaries; representative passages match the pinned source.
- All-translations search enumerates the allowed catalog and returns accurately labeled results.
- A failed/unsupported source load yields a visible state instead of a plausible result from another translation.
- Content checksums and a manifest are independently validated against pinned source coverage, not used as their own proof of completeness.

### Production browser scenarios

1. Open the app with no credentials and navigate books/chapters in each translation.
2. Resolve a single verse, chapter, range, numbered-book reference, and invalid reference.
3. Save a verse, add it to two lists, rename a list, remove one membership, and reload.
4. Exercise both list deletion modes with shared and exclusive verses.
5. Create chapter and verse bookmarks, move/rename/recolor them, reload, and jump to them.
6. Change font, size, theme, and reading location; verify persistence and an independent second tab.
7. Export, restore into a clean origin/profile, and compare collections.
8. Complete offline preparation, disable network, close/reopen, and read an unvisited book in every translation.
9. Interrupt initial caching and verify the app does not claim complete offline readiness.
10. Offer a new app version while a dialog is open; apply the update and verify collections remain intact.
11. Repeat asset/navigation/offline checks under a non-root base path.
12. Inspect network traffic and run without access to the source checkout or private mirrors.

### Destination commands

Define conventional scripts so the release gate can run:

```sh
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run data:check
bun run test
bun run build
bun run test:browser
```

The `test` script should invoke Vitest under its supported Node runtime; do not copy a `--bun` Vitest invocation. Keep browser checks focused and run them against the production build for offline testing. Report actual results and failures, not only that commands were scheduled.

## 13. Decisions and remaining owner choices

### Proposed defaults to proceed with

| Decision | Proposed choice |
| --- | --- |
| Extraction strategy | One-time source copy, independent repo |
| Framework | React + TypeScript + Vite; one Bun package |
| UI | Copy the current Base UI component subset |
| Scripture | Verified WEB/ASV/YLT/KJV sources, WEB default; document KJV UK exception |
| Storage | Dexie/IndexedDB collections; localStorage preferences |
| Notes and AI | Remove initially; local notes can follow |
| Backup | Versioned export and validated replace/restore |
| Offline | Precache the shell and all approved translations after core extraction |
| Routing | Existing local tab state |
| Existing cloud data | No automatic migration |
| Code license | MIT proposed; preserve third-party notices |

### Choices that do not block the extraction

The owner can choose the public name, repository URL, branding, hosting target, and final application-code license before publication. None requires building another architecture or bootstrapping the repo in advance.

KJV is included by owner decision, with its UK rights exception documented in section 3. Adding NET or another restricted translation is a separate distribution decision, supported by explicit rights evidence. An individual app license would also need to cover the intended public-repository and downstream-fork distribution; it must not be assumed to authorize sublicensing.

### First instruction for the next implementation session

> Read this file, inspect the destination repo, and implement Phase 0 followed by the numbered phases. Preserve the current reading/list/bookmark UX while removing host dependencies. Bundle only verified WEB/ASV/YLT/KJV text and document KJV's UK rights exception. Start by copying the source inputs while the OmniOS checkout is available. Keep status and verification evidence in this document until the destination establishes its own workflow. Do not commit, push, publish, contact third parties, or change the original OmniOS application unless separately requested.

The immediate next deliverable is a standalone buildable reader in the new repository, followed by tested local collections, backup, and offline delivery. The original Bible app remains available as an implementation reference rather than a synchronization target.
