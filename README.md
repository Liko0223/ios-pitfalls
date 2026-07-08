# iOS Pitfalls

A publishable skill + static site for real iOS debugging pitfalls.

The project has one structured source of truth:

- `data/pitfalls.json`

The skill and site are generated/synchronized from that data:

- `ios-pitfalls-diagnose/` - installable Agent skill
- `site/` - static website with search, filters, and install command

## Install

After this repository is published on GitHub, users can install the skill with:

```bash
npx skills add Liko0223/ios-pitfalls@ios-pitfalls-diagnose
```

Update the owner/repo in the site if the final GitHub repository name changes.

## Iterate

1. Add or edit pitfall entries in `data/pitfalls.json`.
2. Optionally update the Obsidian source note.
3. Run:

```bash
npm run sync
npm run validate
```

`sync` copies data into the skill references and embeds it into the static site.

## Publish

Recommended first version:

- Host this repository on GitHub.
- Serve `site/` with GitHub Pages, Cloudflare Pages, or Vercel.
- Keep the skill directory in the same repository for `npx skills add owner/repo@skill`.

Before public release, review `references/source.md` and `data/pitfalls.json` for private project identifiers or details you do not want to publish.
