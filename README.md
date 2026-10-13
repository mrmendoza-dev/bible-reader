# Bible Reader

A standalone React + TypeScript + Vite Bible reader. Read, search, save verses,
organize lists, and manage named, colored bookmarks without an account or server.
The development catalog has **21 translations in eight languages**, with **WEB as
default**. Names and language codes are in
`src/bible/translation-catalog.ts`; selectors show language and book counts.

Created by [mrmendoza.dev](https://github.com/mrmendoza-dev).

## Development

Use Bun (version pinned in `package.json`) and Node.js 24+ for Vitest.

```sh
bun install
bun run dev
```

See [Contributing](CONTRIBUTING.md) for the supported toolchain and checks.

Vite serves the app on port 3000. No environment variables or API keys are needed.
Place per-book translation files in `translations/<id>/<book>.json`, using the
lowercase translation IDs from the catalog and book stems from
`src/bible/constants/index.ts`. See [Attribution](#attribution) for
translation data sources. These ignored development inputs are served locally
and never copied into the production bundle automatically.

```sh
bun run data:check:inputs
bun run ci
```

`ci` checks Biome, TypeScript, Vitest, and the
production build. Vitest uses Node, jsdom, and fake IndexedDB; these tests do not
establish real-browser storage or offline behavior.

## Splitting a translation into books

The converter accepts the combined JSON shape used by `translations/Darby.json`:
`{ translation, books: [{ name, chapters: [{ chapter, verses: [{ verse, text }] }] }] }`.

```sh
bun run data:split translations/Darby.json translations/darby
bun run data:split --verify translations/Darby.json translations/darby
bun run data:check:inputs
```

The converter keeps the existing 66 slugs, including `psalm.json`,
`1-samuel.json`, and `revelation.json`, and supports registered additional books.
Roman numerals and known title variants map by name. Source book order is
preserved; a translation can contain a subset or additional books. Each present
book requires complete numbered chapter coverage. Unknown or duplicate books,
duplicate chapters/verses, overlapping ranges, and unsupported fields are rejected.
Text, Unicode, whitespace, punctuation, empty entries, and grouped verse numbers
are preserved. The command reports empty references and the input SHA-256 hash,
verifies the generated files, and refuses an existing output path.

For all registered combined files in `translations/`, run:

```sh
bun run data:import
bun run data:import --verify
bun run data:check:inputs
```

Batch import creates missing lowercase output folders and verifies existing ones
without overwriting them. It regenerates the committed coverage metadata at
`src/bible/data/translation-coverage.json` and an ignored report with
source hashes at `translations/import-report.json`. The verification command
also checks that coverage metadata still matches the actual inputs. Register a
new translation's factual name and language before importing it. Additional book
IDs and chapter limits belong in `src/bible/constants/index.ts`.

Book counts distinguish source slots from books containing text: the supplied OEB
has **28/66**, Dutch Statenvertaling **67/80**, and Swedish 1917 **78/83**. Entirely
blank books and chapters are preserved in the files but excluded from reading and
search selection. These counts describe these inputs, not a claimed canon or the
latest published editions. Additional books have their own stable IDs; Greek
Esther and additions to Esther remain separate from Esther. Saved verses,
bookmarks, and backups support these IDs. Future Catholic editions can supply
their own book coverage without changing the existing 66 IDs.

Synthetic converter tests run in CI without local datasets. With the local inputs,
integration tests write all 17 combined datasets to temporary directories and
compare every loaded chapter, verse identifier, and text against the originals.
The original Darby copy has three empty entries (Matthew 23:14, Acts 8:37, and
Acts 15:34), plus joined words such as `beginningGod`. These are source-review
issues; conversion verification does not establish the source's accuracy.

## Local collections

Collections live in IndexedDB through Dexie. Saving adds a verse to the system
**Saved** list. Removing a list membership keeps the verse; unsaving removes the
verse and all its memberships. **All** also shows unlisted verses. List deletion
can move members to Saved or delete verses belonging exclusively to that list.

In the reader's verse actions, **Range** expands an end-reference field. Enter
`8` for the same chapter, `2:8` for another chapter, or `Exodus 1:8` for another
book. The resolved reference appears before saving. Passages follow the selected
translation's book order and save as one item with a snapshot of the text; lists,
copying, and deletion apply to the entire passage. Missing references and partial
grouped source verses are rejected. Existing saved verses migrate automatically.

Saved passages display aligned verse numbers and headings at chapter or book
changes. Home shows the first three source rows with a link to the full passage.
Reader highlights join across saved verses and passage coverage, using one tint
for overlaps. Verse actions list links to each containing passage; saving or
unsaving an individual verse leaves those passages intact.

Text searches keep at most 500 matches and show 50 per page. Search loads four
books at a time, stops at the cap, and cancels when its input changes or the
dialog closes. Narrow broad searches by query, book, or translation.

Theme, fonts, selected translation, and reading location use localStorage.
Interface text uses Geist and headings use EB Garamond. Reading Settings has
separate Sans and Serif font choices for scripture in both Reader and Saved.
Fontsource packages serve fonts locally; font licenses are included in the
generated third-party notices.
The Backup dialog exports collections and previews a JSON restore before an
explicit replacement. Restore validates format, identities, memberships, and
source references before replacing collections in one transaction. Preferences
stay as they are. The import limit is 10 MiB. Export before clearing browser data
or changing devices; browser storage can be cleared or evicted.
Exports use backup format version 2 for passages; version 1 imports remain supported.

## Production data and hosting

Build with `bun run build`, then serve `dist/` over HTTPS. For a subdirectory,
use `bun run --bun vite build --base=/bible/`. Scripture requests respect that
base path, including navigation and the header logo. Home, Reader, and Saved use
`/`, `/reader`, and `/saved`. Browser back/forward and direct URLs work. The
reading settings in the header apply to both the reader and saved verses.

Configure the host to serve `index.html` for navigation requests to these routes
(relative to the deployment base), so refreshing a direct URL works. Keep static
asset requests and their missing-file responses separate from that fallback.

Production texts belong at `public/bible/data/translations/<id>/<book>.json`.
Verify the exact source editions, permissions, omissions, and wording before
adding them. The current copies are development inputs; source editions and
publication rights remain unverified. Import reports record empty entries for review. Do not fill
empty entries with another translation or renumber grouped verses.

`bun run data:check` validates release files and
`public/bible/translations-manifest.json`. Its `translations` array needs exactly
one record per supported ID. Each record needs `id`, `edition`, `sourceUrl`,
`rightsUrl`, `rightsStatement`, `retrievedAt` (ISO date or timestamp), `checksums`
(book filenames mapped to SHA-256 hex digests), and `omissions` (reviewed omission
descriptions). Hashes are checked against actual bytes. Provenance still requires
human source review.

The service worker caches the app shell and prompts before updates. Full Bible
caching, offline readiness/progress, real-browser storage checks, and the final
release content review remain follow-up work. A build alone does not establish
that Scripture is available offline or ready to publish.

## Structure

- `src/bible/`: Bible domain UI, reader/search services, translation data, and IndexedDB storage.
- `src/components/`: app-wide theme control, error screens, and shared UI primitives.
- `src/contexts/`, `src/hooks/`, `src/lib/`: app-wide theme, preference, and utility code.
- `src/styles/`: global, theme, font, and Bible-specific styles.
- `tests/`: Bible domain, storage, preference, and app integration tests.

## Attribution

Bible translation text used in development and prepared for release is sourced
from the open [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases)
project. Thank you to its maintainers for publishing version and cross-reference
databases in a form this app can split into per-book JSON.

Combined files under `translations/*.json` (for example when running
`bun run data:split`) follow that repository’s JSON shape. The in-app **About**
dialog repeats this credit for end users.

Each bundled translation (WEB, ASV, YLT, KJV) remains subject to its own
copyright and usage terms. Application code is MIT-licensed; Scripture is not.
See [third-party and Scripture notices](THIRD_PARTY_NOTICES.md) before
distribution.

## License

Application code uses [MIT](LICENSE). Scripture rights are separate; KJV's UK
rights exception remains part of the release review. See
[third-party and Scripture notices](THIRD_PARTY_NOTICES.md).
After dependency changes, run `bun run licenses:generate` to refresh software
notices included in static builds.
