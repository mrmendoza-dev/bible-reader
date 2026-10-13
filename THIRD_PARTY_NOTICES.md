# Third-party notices

The application's MIT license does not relicense Scripture or third-party code.

## Adapted source

The Bible feature, preference helper, theme tokens, and required UI wrappers were
developed for this standalone repository.
UI components include adaptations of [shadcn/ui](https://github.com/shadcn-ui/ui),
whose [MIT notice](licenses/shadcn.txt) is preserved.

`public/third-party-notices.txt` contains license texts for installed runtime
dependencies and bundled Workbox runtime packages, including React, Base UI,
Dexie, Lucide/Feather, and their dependencies.
Vite copies it into `dist/third-party-notices.txt`. Regenerate it with
`bun run licenses:generate` after dependency changes. Files under `licenses/`
preserve upstream notices missing from some npm packages:
[Radix UI](https://github.com/radix-ui/primitives/blob/main/LICENSE) and
[react-remove-scroll-bar](https://github.com/theKashey/react-remove-scroll-bar/blob/master/LICENSE).
The generated notices may include dependencies removed by bundling.

## Scripture

The development catalog contains 21 translations in eight languages. Combined
translation JSON used in development and for the book split pipeline is sourced from
[scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases).
Local copies under `translations/` are ignored development inputs, not
verified release editions. No Scripture text is currently bundled in production
assets, and the repository does not grant redistribution rights for those inputs.

Before distribution, record exact editions, authoritative source and rights
URLs, retrieval dates, rights statements, SHA-256 book checksums, and reviewed
omissions in `public/bible/translations-manifest.json`. Preserve edition-specific
notices alongside the text. See the README's Production data section for the
release checklist. Each translation still needs edition-specific rights and
provenance review before distribution.

KJV is included by owner decision. Its UK Crown-rights exception must remain in
final source and distribution notices; do not describe this catalog as
unrestricted worldwide.
