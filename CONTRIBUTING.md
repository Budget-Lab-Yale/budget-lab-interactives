# Contributing to Budget Lab Interactives

This document covers how to safely edit existing tools and add new ones, including when to take a versioned snapshot of a tool.

## Editing workflow

1. Branch from `main`.
2. Make and test changes locally (see [Testing](#testing) below).
3. Open a PR. Merging to `main` is the publish step — GitHub Pages redeploys automatically within ~10 minutes.

Don't push directly to `main` for anything beyond trivial fixes (typos, broken links). The PR step exists to give one beat to look at the diff before it's live.

## When to snapshot a tool

Take a snapshot **before merging any change that meaningfully alters the tool**, so that the previous state is preserved at a stable URL. "Meaningful" means:

- **Calculation parameter changes** — scenario data, elasticities, baseline projections, default principals.
- **Methodology changes** — formula updates, new data sources.
- **Significant layout or feature changes** — new sections, removed features, restructured UI.

Routine maintenance does **not** need a snapshot:

- Bug fixes that don't change calculation outputs.
- Minor copy edits.
- Branding refreshes that don't affect interactivity.
- Performance-only refactors.

If unsure, snapshot. The cost of a needless snapshot is a few extra files; the cost of *not* snapshotting before a change is silent drift in published embeds.

## How to take a snapshot

Before applying the change, copy the canonical files to a dated subfolder:

```bash
TOOL=tools/deficits-affordability
DATE=$(date +%F)
mkdir -p "$TOOL/versions/$DATE"
cp "$TOOL"/*.html "$TOOL"/*.js "$TOOL/versions/$DATE/"
```

Then **edit the snapshot's `index.html`** to fix any relative paths that go up to shared assets. Snapshots live two levels deeper than canonical, so:

| Canonical | Snapshot |
|---|---|
| `../../assets/logo.svg` | `../../../../assets/logo.svg` |
| `../../embed/v1/iframeResizer.contentWindow.min.js` | `../../../../embed/v1/iframeResizer.contentWindow.min.js` |

`tool.js` and any other JS files don't reference relative paths, so they can be byte-identical copies.

Then update the per-tool `CHANGELOG.md`:

```markdown
## YYYY-MM-DD
- What changed in this release (one or two short bullets).
- Previous version preserved at `versions/<previous-date>/`.
```

Verify the snapshot URL renders correctly *before* applying the new changes to canonical:

```
https://budget-lab-yale.github.io/budget-lab-interactives/tools/<name>/versions/<date>/
```

Once the snapshot is in place and verified, apply the new changes to the canonical `index.html` / `tool.js`.

## Testing

Before merging:

- Open `test/embed-test.html` locally (or after deploy on the live URL) and walk the smoke-test checklist.
- For tool calculation changes, manually verify a few inputs against expected outputs.
- Hard-refresh the embed-test page to bypass GitHub Pages' ~10 minute cache.

## Adding a new tool

See the [Adding a new interactive](README.md#adding-a-new-interactive) section in the README. A new tool starts at `tools/<name>/index.html` with no snapshot — the first snapshot is taken on the first meaningful change after launch (or, if a publication ships with the tool, snapshot at launch so the publication has a stable URL to cite).
