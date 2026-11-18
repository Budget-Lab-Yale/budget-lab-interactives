# Changelog

All notable changes to this project will be documented in this file. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning: [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Embed loader (`embed/v1/embed.js` v1.2.1): snapshot embeds (`data-tool="<slug>/versions/<date>"`) are now sized. The `/` in the iframe id made the resizer's selector invalid, so every snapshot embed stayed a 100px box. The resizer now gets the iframe element. Affects every published snapshot embed on next deploy, with no snippet change.
- Embed loader (`embed/v1/embed.js` v1.2.0): opt-in deep links (`data-deep-link`). A host URL ending `#<slug>:<state>` opens the embedded tool at that state, and tools can ask for the host page's URL to build such links. Embeds without the attribute are unchanged; `.github/scripts/embed-loader.test.mjs` (run in CI) pins that.
- New tool: **Budget Lab Small Macro Model** (`tools/blsmm/`), replacing the Shiny app on Posit Connect. The model runs in the browser from a JavaScript port vendored from `Budget-Lab-Small-Macro-Model` (whose CI holds it to the R model). Launch snapshot at `versions/<launch date>/`.
- New tool: **Revenue from Higher Taxes at the Top** (`tools/taxes-at-the-top/`), migrated from the staging repo. Launch snapshot frozen at `versions/2026-10-08/`. Its test suite, data-sync script and maintainer docs followed; the tests run in CI through `ci/validate.sh`. Publishing now also excludes `tools/*/test/`, that tool's `docs/`, and any `CLAUDE.md`.
- Embed loader (`embed/v1/embed.js` v1.1.0): tool iframes now load eagerly. `loading="lazy"` meant a non-scrolling renderer — a PDF builder, a social-card scraper — never brought a below-fold embed near the viewport, leaving it an empty 100px box. Measured under headless `page.pdf()` on a 16,000px article with three tools: 0 of 3 issued a request with `lazy`, 3 of 3 with `eager`. Affects every already-published embed on next deploy, with no snippet change.
- New tool: **AI Labor Market Tracker** (`tools/ai-labor-market-tracker/`), migrated from the staging repo. Launch snapshot frozen at `versions/2026-06-15/`.
- Per-tool CI validation convention: the `Validate site` check now auto-discovers `tools/<slug>/ci/validate.sh` (build/data gates) and `tools/<slug>/ci/smoke.json` (render marker), so new tools need no workflow edits. Existing tools backfilled with `ci/smoke.json`.
- Local `.pre-commit-config.yaml` mirrors the tracker's manifest gate.
- AI Labor Market Tracker: d3 and Observable Plot are now self-hosted (vendored at `tools/ai-labor-market-tracker/vendor/`) instead of loaded from `esm.sh`, so charts render behind corporate firewalls that intercept third-party CDNs. Applied to the canonical tool and the `versions/2026-06-15/` snapshot.

## [1.0.0] — 2026-05-11

Initial release.

- Universal embed loader at `embed/v1/embed.js` (single `<script>` snippet, auto-resizing iframe, host-CMS-wrapper compatibility).
- Two interactive tools: Deficits and Affordability (`tools/deficits-affordability/`) and Deficit Impact Calculator (`tools/deficit-impact-calculator/`).
- Per-tool dated snapshots for citation pinning.
- iframe-resizer v4 (MIT) vendored at `embed/v1/`.

[Unreleased]: https://github.com/Budget-Lab-Yale/budget-lab-interactives/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Budget-Lab-Yale/budget-lab-interactives/releases/tag/v1.0.0
