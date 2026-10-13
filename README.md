# Bible Reader

A standalone Bible reader for browsing, searching, and saving Scripture. It runs
in the browser without an account or app server.

Created by [mrmendoza.dev](https://github.com/mrmendoza-dev).

## Getting started

Install [Bun 1.3.4](https://bun.sh/) and Node.js 24 or later, then run:

```sh
bun install
bun run dev
```

Vite starts the app at `http://localhost:3000` and loads the included Scripture
files.

Run the project checks with:

```sh
bun run ci
```

## Summary

Bible Reader is a client-side React, TypeScript, and Vite application. It has
Home, Reader, and Saved sections, and stores collections and preferences in
your browser. No account, API key, or app server is required.

## Translations available

The app supports 21 translations across eight languages. Book coverage varies,
and the app shows books with text for the selected translation.

| ID | Translation | Language |
| --- | --- | --- |
| `web` | World English Bible | English |
| `asv` | American Standard Version | English |
| `ylt` | Young's Literal Translation | English |
| `kjv` | King James Version | English |
| `akjv` | American King James Version | English |
| `bbe` | Bible in Basic English (1949/1964) | English |
| `bsb` | Berean Standard Bible | English |
| `darby` | Darby Bible (1889) | English |
| `oeb` | Open English Bible (US spelling) | English |
| `ukjv` | Updated King James Version | English |
| `webster` | Webster Bible | English |
| `dutsvv` | Dutch Statenvertaling Bijbel | Dutch |
| `frebbb` | Bible Bovet Bonnet (1900) | French |
| `frebdm1744` | Bible David Martin (1744) | French |
| `gerelb1871` | Elberfelder (1871) | German |
| `gerelb1905` | Unrevidierte Elberfelder (1905) | German |
| `korhkjv` | Hangul King James Version | Korean |
| `sparv` | Reina-Valera (1909) | Spanish |
| `sparv1865` | Reina-Valera (1865) | Spanish |
| `swe1917` | Swedish Bible (1917) | Swedish |
| `tagangbiblia` | Ang Biblia (1905) | Tagalog |

## Main features

- Read by book and chapter, with quick passage navigation.
- Search Scripture by translation and book. Results are capped at 500 and shown
  50 per page.
- Save individual verses or passages, including ranges across chapters or
  books, and organize them into lists.
- Add named, colored bookmarks and jump back to them from Home or Reader.
- Browse recently saved verses from Home and manage saved collections in Saved.
- Choose reading fonts and themes, then export or restore a backup of saved
  verses, lists, and bookmarks.
- Install the app as a PWA and keep the app shell and previously opened
  translation books available offline.

## Storage

Saved verses, lists, and bookmarks live in IndexedDB in the current browser.
Reading preferences, such as the selected translation, location, theme, and
fonts, use localStorage. Data does not sync between browsers or devices.

The installable PWA caches the app shell and translation books as you open them.
Books you have not opened yet need an internet connection the first time. Browser
storage can be cleared or evicted, which removes cached books too.

Use the Backup dialog to export collections before clearing browser data or
changing devices. Restores are validated before replacing collections. Browser
storage can still be cleared or evicted, so keep exported backups.

## Data, attribution, and license

### Bible data

Scripture text is separate from the application code. The included per-book
files are under `public/bible/data/translations/`; Vite serves them in
development and copies them into production builds. The checked-in manifest
records editions and SHA-256 checksums.

The ignored `translations/` directory is used for local source inputs to the
conversion scripts. Translation IDs are lowercase catalog IDs; book IDs use
the slugs in `src/bible/constants/index.ts`.

The development datasets were obtained from the open
[scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases)
project. The app's About dialog also credits this source. The converter and
validation scripts help format and check the data; they do not verify an
edition's accuracy or rights.

Available data commands:

```sh
# Split one combined source file into per-book JSON files
bun run data:split source.json translations/<translation-id>
bun run data:split --verify source.json translations/<translation-id>

# Import or verify the registered combined datasets in translations/
bun run data:import
bun run data:import --verify

# Check local development inputs and included release data
bun run data:check:inputs
bun run data:check
```

`bun run data:import` generates per-book files from registered combined
datasets and refreshes coverage metadata. `bun run data:check` validates the
included files against that metadata and their manifest checksums. Optional
provenance fields can be added to the manifest when available.

### Attribution and license

The app's About dialog and this README credit
[scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases)
for the included data. Scripture text has separate rights from the application
code. KJV's UK Crown-rights exception is documented in
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

Application code is licensed under [MIT](LICENSE). Third-party software notices
and Scripture rights details are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
