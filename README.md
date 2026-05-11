# Budget Lab Interactives

Interactive web tools published by [The Budget Lab at Yale](https://budgetlab.yale.edu). Each tool lives in its own subfolder and is served via GitHub Pages.

## Live tools

| Tool | URL | Source |
|---|---|---|
| Deficits and Affordability | https://budget-lab-yale.github.io/budget-lab-interactives/tools/deficits-affordability/ | [`tools/deficits-affordability/`](tools/deficits-affordability/) |
| Deficit Impact Calculator | https://budget-lab-yale.github.io/budget-lab-interactives/tools/deficit-impact-calculator/ | [`tools/deficit-impact-calculator/`](tools/deficit-impact-calculator/) |

## Embedding

### Universal embed (recommended)

Paste this into a Drupal Full-HTML block, a Squarespace Code Block, a WordPress Custom HTML block, or any host that allows third-party scripts:

```html
<script src="https://budget-lab-yale.github.io/budget-lab-interactives/embed/v1/embed.js" data-tool="TOOL-NAME"></script>
<noscript>
  <p><a href="https://budget-lab-yale.github.io/budget-lab-interactives/tools/TOOL-NAME/">Open the interactive in a new tab</a> (requires JavaScript).</p>
</noscript>
```

Replace `TOOL-NAME` with the slug of the tool you want to embed (see the table above — e.g. `deficits-affordability` or `deficit-impact-calculator`).

The script creates an iframe at runtime and auto-resizes it to the tool's content height via [iframe-resizer v4](https://github.com/davidjbradshaw/iframe-resizer/tree/v4) (MIT), vendored at `embed/v1/`.

Optional `data-*` attributes:

| Attribute | Default | Purpose |
|---|---|---|
| `data-tool` | _(required)_ | Which interactive to load (e.g. `deficits-affordability`). |
| `data-title` | tool name | Iframe `title` for accessibility / screen readers. |
| `data-height` | `100` | Initial pixel height before iframe-resizer measures the tool's actual height (~100ms after load). Set to the tool's natural height to eliminate the brief flash. |
| `data-log` | _(off)_ | Any non-empty value enables iframe-resizer's verbose console logging — useful for diagnosing unexpected sizing. |
| `data-strip-host-classes` | `paragraph-embed-code` | Comma-separated list of host-wrapper class names whose width-proportional height (`padding-bottom: NN%` etc.) should be overridden. Override if your host uses a different wrapper class. |

### Fallback (advanced)

For the rare host that allows `<iframe>` but blocks third-party scripts:

```html
<iframe src="https://budget-lab-yale.github.io/budget-lab-interactives/tools/TOOL-NAME/" width="100%" height="1000" style="border:0;" title="Tool title" loading="lazy"></iframe>
```

Doesn't auto-resize, so `height` needs tuning to fit the tool without inner scroll.

### Caching

GitHub Pages caches `embed.js`, tool files, and vendored assets for ~10 minutes. Updates propagate within that window after a push. For an immediate refresh, hard-refresh the host page (Ctrl/Cmd-Shift-R) or append a cache-busting query string (`embed.js?v=2`).

### Versioning

The directory `/embed/v1/` is **frozen as v1 behavior**. Any future breaking change to the loader's contract — `data-*` attributes, wrapper structure, postMessage protocol, iframe-resizer major version — will ship as a sibling `/embed/v2/` with its own pinned vendor copy. The `/embed/v1/` URL stays working indefinitely so existing embeds do not break. The same commitment applies to each tool URL.

See [CHANGELOG.md](CHANGELOG.md) for what's in each version.

## Tool versioning

Each tool has a *canonical* URL (e.g. `/tools/deficits-affordability/`) that follows the latest published state — embedders default to this and get future updates automatically.

For publications that need stable numbers, each tool also keeps dated *snapshots* at `/tools/<name>/versions/<YYYY-MM-DD>/`. A snapshot is a frozen copy preserved indefinitely.

To embed a snapshot, pass the snapshot path as `data-tool`:

```html
<script src="https://budget-lab-yale.github.io/budget-lab-interactives/embed/v1/embed.js" data-tool="deficits-affordability/versions/2026-05-11"></script>
```

Each tool has its own `CHANGELOG.md` (see [`tools/deficits-affordability/CHANGELOG.md`](tools/deficits-affordability/CHANGELOG.md)). The repo-wide [`CHANGELOG.md`](CHANGELOG.md) tracks embed-loader and shared-asset changes. When and how snapshots are taken is documented in [CONTRIBUTING.md](CONTRIBUTING.md).

## Adding a new interactive

1. Create a new subfolder under `tools/` named in `kebab-case` (e.g. `tools/tariff-calculator/`).
2. Add an `index.html` that is a complete, standalone HTML document. It will be served at `https://budget-lab-yale.github.io/budget-lab-interactives/tools/<folder>/`.
3. Near `</body>`, include the iframe-resizer child script: `<script src="../../embed/v1/iframeResizer.contentWindow.min.js"></script>`. This enables auto-resize when the tool is embedded.
4. Add the tool to the table at the top of this README and to the root `index.html` landing page.
5. Open a PR or push to `main` — Pages will redeploy automatically.

## Support

Contact The Budget Lab at budgetlab@yale.edu.
