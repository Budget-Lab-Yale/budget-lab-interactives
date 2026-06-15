# Changelog

All notable changes to this project will be documented in this file. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning: [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- New tool: **AI Labor Market Tracker** (`tools/ai-labor-market-tracker/`), migrated from the staging repo. Launch snapshot frozen at `versions/2026-06-15/`.
- Per-tool CI validation convention: the `Validate site` check now auto-discovers `tools/<slug>/ci/validate.sh` (build/data gates) and `tools/<slug>/ci/smoke.json` (render marker), so new tools need no workflow edits. Existing tools backfilled with `ci/smoke.json`.
- Local `.pre-commit-config.yaml` mirrors the tracker's manifest gate.

## [1.0.0] — 2026-05-11

Initial release.

- Universal embed loader at `embed/v1/embed.js` (single `<script>` snippet, auto-resizing iframe, host-CMS-wrapper compatibility).
- Two interactive tools: Deficits and Affordability (`tools/deficits-affordability/`) and Deficit Impact Calculator (`tools/deficit-impact-calculator/`).
- Per-tool dated snapshots for citation pinning.
- iframe-resizer v4 (MIT) vendored at `embed/v1/`.

[Unreleased]: https://github.com/Budget-Lab-Yale/budget-lab-interactives/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Budget-Lab-Yale/budget-lab-interactives/releases/tag/v1.0.0
