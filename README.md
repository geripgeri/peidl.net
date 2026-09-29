# peidl.net

Personal website of Gergely Peidl: [https://peidl.net](https://peidl.net)

A hand-built, single-page static site: vanilla HTML, CSS and a little JavaScript.
No backend, no build step, no cookies, no trackers, no analytics.

## Design

Neovim-flavored variant of the terminal-native design

- gruvbox palette, light and dark, both first-class
- powerline statusline fixed to the bottom: mode (NORMAL, VISUAL when
  selecting text, cmdline with the typed command after :, E492 on
  unknown commands), the current section shown as the open file, a
  branch segment with icon, and a vim-style scroll position on the
  right (Top / 42% / Bot)
- the color toggle lives in the statusline and reads `bg=dark` / `bg=light`
- a handful of vim easter eggs for people who type commands; :h is documentation, not a spoiler
- The statusline lives here because it refused to stay inside Neovim. Credit to the Neovim and Powerline contributors for the inspiration.

## Local preview

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Any static file server works. Deploy target is GitHub Pages (`CNAME`: peidl.net).

## AI & SEO

- JSON-LD: ProfilePage + Person schema with knowsAbout skill list and a
  hasOccupation list of `Occupation` entries (name, startDate, endDate,
  occupationLocation) that mirrors the experience section
- JSON-LD: FAQPage built from the three delivered case studies, so an answer
  engine can lift a decision and cite it. The in-progress fourth one is left
  out on purpose, an unfinished decision is not an answer
- Open Graph and Twitter card tags, plus the social card image, whose copy
  lives in `img/og-cover.svg` so it is reviewable in a diff (see below)
- /llms.txt for AI agents that fetch it by convention, linked from the head
  via `rel="alternate"` and from the footer, so it is discoverable. It is
  written in the [llms.txt](https://llmstxt.org/) shape on purpose: an H1, a
  blockquote summary, then `##` sections whose entries are Markdown links.
  Naming a URL in prose is not linking it, so a reader parsing the file as
  Markdown finds a document with no links in it, which is the one thing the
  format is for. Every entry below the summary is a real `[title](url)`.
  `validate.yaml` checks the H1, that at least one Markdown link exists, and
  that every `peidl.net/#anchor` it links to is a section in `index.html`,
  so renaming a section cannot quietly break a link an agent follows
- robots.txt allows all crawlers; sitemap.xml lists the page, with no lastmod
  because a single URL gives a crawler no scheduling decision to make
- Contact email is published as plain mailto on purpose; ProtonMail's spam
  filtering is the anti-spam strategy, not obfuscation

## Stats automation

The ADR counter in the homelab section is kept in sync with the
[planet-express](https://github.com/geripgeri/planet-express) repo by CI:

```
.github/workflows/update-adrs.yaml   daily cron (04:17 UTC) + manual trigger
  1. counts ADR-*.md files in planet-express/docs/decisions via gh api
  2. rewrites the static ADR counter in index.html and the count in this README
  3. measures per-section byte sizes of index.html for the statusline,
     staging them in sections.json
  4. updates site-stats.json if anything changed
  5. opens a PR and enables auto-merge (squash), no review needed
```

The page fetches `site-stats.json` (same-origin, so visitors still make
zero external requests) and counts the number up when the stat scrolls
into view. The static `25` in the HTML is the no-JS and fetch-failure fallback;
step 2 above keeps it, and the number quoted here, in sync with the repo, so
neither can drift. Both rewrites assert that they matched exactly once, so
a rename that breaks either pattern fails the run loudly instead of
silently skipping the file.

`sections.json` is a build artifact, not a source file: it is the hand-off
between the measurement in step 3 and the `jq` call in step 4, and nothing
reads it afterwards. It is gitignored and deliberately never committed,
because a committed copy of a regenerated intermediate is a file that is
wrong from the moment it is written. It used to be tracked, which left a
permanently stale copy in the repo that no run ever updated.

Note: scheduled workflows run from the repo's default branch, so the
workflow takes effect once this branch is merged to `main`.
One-time repo setting: enable "Allow Auto-merge" under Settings >
General. If branch protection ever requires reviews, the bot PR will
wait until bots or admins are allowed to bypass.

## Freshness automation

Search crawlers and AI answer engines both weight "when was this last
touched", and a hand-maintained date is a date that goes stale:

```
.github/workflows/update-modified-date.yaml   on every merged PR + manual trigger
  1. checks out the merge commit
  2. derives the date of the last commit that changed index.html, skipping the
     bot's own stamps and any commit whose whole diff is the dateModified line
  3. rewrites "dateModified" in the index.html JSON-LD as an ISO 8601 DateTime
  4. opens a PR with auto-merge, and only when the date actually moved
```

The bump is idempotent: the rewrite only produces a diff when the stored date
is not already the derived one, so several merges in one day cost one commit.
Runs are serialized through a concurrency group rather than canceled, so
two merges in quick succession cannot race for the branch and the PR. Pull
requests closed without merging are skipped by the job-level `if`.

This workflow listens only to `pull_request: closed`, never `push`, so
the stamp landing on `main` through the PR cannot re-trigger it.

## Color modes

Light and dark themes are both first-class. The default follows the device
setting (`prefers-color-scheme`); the toggle stores an explicit choice in
`localStorage` only.

## Structure

```
index.html          single page, semantic sections
css/styles.css      design tokens + all styling
js/main.js          theme toggle, nav highlighting, stat counters, vim easter eggs
fonts/              self-hosted variable woff2 fonts + OFL license texts
img/favicon.svg     hand-made terminal-prompt mark
img/og-cover.svg    source of truth for the share card
img/og-cover.png    1200x630 share card, rendered from the svg above
img/apple-touch-icon.png  180x180 home-screen icon, rendered from favicon.svg
llms.txt            spec-shaped profile summary for AI agents (H1, summary, links)
site-stats.json     CI-updated facts (ADR count), animated on the page
sitemap.xml         one URL, no lastmod (see Freshness automation)
```

## Social card

`img/og-cover.svg` is the source of truth for the 1200x630 share card, and
`img/og-cover.png` is its build output. The copy is the text content of the
`<text>` elements in the SVG, so changing a line is a one-line edit that shows
up in a diff instead of hiding inside a binary blob.

The PNG is committed because Open Graph consumers (Facebook, LinkedIn, X,
Slack) reject SVG for `og:image`, so the raster has to exist on disk. The
renderer that turns the SVG into that raster is a local script and is
deliberately not part of this repo, so there is nothing to install and nothing
to run here, and the two have to be kept in step by hand. The SVG is committed
so the design and the copy stay reviewable even though the tool that builds it
is not.

Two things to know before editing the SVG:

- Each line carries a `data-maxw` width budget. The renderer measures the line
  against the real font metrics and shrinks `font-size` until it fits, so
  longer copy degrades instead of running off the card. Author the copy to fit
  its budget at the size you want, otherwise a shrunk line ends up close to the
  line below it and the hierarchy flattens.
- The card is 1200x630 and has to stay that way, because `og:image:width` and
  `og:image:height` in `index.html` must match the real PNG.

## Home-screen icon

`img/favicon.svg` is the source of truth for the prompt mark, and
`img/apple-touch-icon.png` is its build output at the one size iOS still reads.
The renderer is a local script and is deliberately not part of this repo, so
like the share card there is nothing to install and nothing to run here, and
the drawing and its raster have to be kept in step by hand.

The icon used to be a separate hand-drawn file, and it drifted: the chevron
arms ended up shallower than the favicon's, so the home-screen icon stopped
looking like the tab next to it. Rendering one from the other makes that
impossible. The only change the renderer makes is dropping the `rx` corner
radius, because iOS masks the icon with its own squircle and a radius baked
into the PNG would show up as a double curve.

## Asset licenses & sources

| Asset | Source | License |
| --- | --- | --- |
| Public Sans (variable) | [google/fonts repo](https://github.com/google/fonts/tree/main/ofl/publicsans), woff2 via [Fontsource](https://fontsource.org/) | [SIL OFL 1.1](fonts/PublicSans-OFL.txt) |
| JetBrains Mono (variable + italic) | [JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono), woff2 via [Fontsource](https://fontsource.org/) | [SIL OFL 1.1](fonts/JetBrainsMono-OFL.txt) |
| Interface icons (sun/moon/mail/arrows) | [Lucide](https://lucide.dev), inlined SVG | ISC |
| Brand marks (GitHub, LinkedIn) | [Simple Icons](https://simpleicons.org), inlined SVG | CC0 1.0 |
| Favicon, architecture diagram | drawn by hand for this site | same as repo |

All third-party assets are self-hosted; the site makes zero external requests.

Note: Public Sans is kept in `fonts/` for possible future use but the current
design loads JetBrains Mono only.
