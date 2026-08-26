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
- content and structure are identical to the terminal-native branch

## Local preview

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Any static file server works. Deploy target is GitHub Pages (`CNAME`: peidl.net).

## AI & SEO

- JSON-LD: ProfilePage + Person schema with knowsAbout skill list
- Open Graph and Twitter card tags with a generated cover image
- /llms.txt for AI agents that fetch it by convention
- robots.txt allows all crawlers; sitemap.xml lists the page
- Contact email is published as plain mailto on purpose; ProtonMail's spam
  filtering is the anti-spam strategy, not obfuscation

## Stats automation

The ADR counter in the homelab section is kept in sync with the
[planet-express](https://github.com/geripgeri/planet-express) repo by CI:

```
.github/workflows/update-adrs.yaml   daily cron (04:17 UTC) + manual trigger
  1. counts ADR-*.md files in planet-express/docs/decisions via gh api
  2. measures per-section byte sizes of index.html for the statusline
  3. updates site-stats.json if anything changed
  4. opens a PR and enables auto-merge (squash), no review needed
```

The page fetches `site-stats.json` (same-origin, so visitors still make
zero external requests) and counts the number up when the stat scrolls
into view. The static `22` in the HTML is the no-JS and failure fallback;
it is updated by hand when the design changes, so it may drift until then.

Note: scheduled workflows run from the repo's default branch, so the
workflow takes effect once this branch is merged to `main`.
One-time repo setting: enable "Allow Auto-merge" under Settings >
General. If branch protection ever requires reviews, the bot PR will
wait until bots or admins are allowed to bypass.

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
img/og-cover.png    1200x630 share card for link previews
img/apple-touch-icon.png  iOS home-screen icon
llms.txt            machine-readable profile summary for AI agents
site-stats.json     CI-updated facts (ADR count), animated on the page
```

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
