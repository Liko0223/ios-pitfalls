# iOS Pitfalls

A publishable skill + static site for real iOS debugging pitfalls.

The project has one structured source of truth:

- `data/pitfalls.json`

The skill and site are generated/synchronized from that data:

- `ios-pitfalls-diagnose/` - installable Agent skill
- `site/` - static website with search, filters, and install command

## Live site

https://liko0223.github.io/ios-pitfalls/

## Install

Users can install the skill with:

```bash
npx skills add Liko0223/ios-pitfalls
```

Update the owner/repo in the site if the final GitHub repository name changes.

## Iterate

1. Add or edit pitfall entries in `data/pitfalls.json`.
2. Run:

```bash
npm run sync
npm run validate
```

`sync` copies data into the skill references and embeds it into the static site.

## Publish

Recommended first version:

- Host this repository on GitHub.
- Serve `site/` with GitHub Pages, Cloudflare Pages, or Vercel.
- Keep the skill directory in the same repository for `npx skills add owner/repo`.

Before public release, review `data/pitfalls.json` for private identifiers or details you do not want to publish.
