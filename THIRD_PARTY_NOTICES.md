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

The app includes 21 translations in eight languages. The per-book files under
`public/bible/data/translations/` are sourced from
[scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases).
The repository maintainer reviewed these copies for the intended distribution.
The manifest records edition names and SHA-256 checksums; optional per-edition
source and rights details are not included.

Scripture rights are separate from the application's MIT license. Preserve
edition-specific notices alongside the text. See the README's Data,
attribution, and license section for the data workflow.

KJV is included by owner decision. Its UK Crown-rights exception must remain in
final source and distribution notices; do not describe this catalog as
unrestricted worldwide.
