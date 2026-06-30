# Budget Lab Interactives

Interactive web tools published by [The Budget Lab at Yale](https://budgetlab.yale.edu). Each tool lives in its own subfolder and is served via GitHub Pages.

## Live tools

| Tool | URL | Source |
|---|---|---|
| AI Labor Market Tracker | https://interactives.budgetlab.yale.edu/tools/ai-labor-market-tracker/ | [`tools/ai-labor-market-tracker/`](tools/ai-labor-market-tracker/) |
| Deficit Impact Calculator | https://interactives.budgetlab.yale.edu/tools/deficit-impact-calculator/ | [`tools/deficit-impact-calculator/`](tools/deficit-impact-calculator/) |
| State of Tariffs | https://interactives.budgetlab.yale.edu/tools/state-of-tariffs/ | [`tools/state-of-tariffs/`](tools/state-of-tariffs/) |

## Embedding

### Universal embed (recommended)

Paste this into a Drupal Full-HTML block, a Squarespace Code Block, a WordPress Custom HTML block, or any host that allows third-party scripts:

```html
<script src="https://interactives.budgetlab.yale.edu/embed/v1/embed.js" data-tool="TOOL-NAME"></script>
<noscript>
  <p><a href="https://interactives.budgetlab.yale.edu/tools/TOOL-NAME/">Open the interactive in a new tab</a> (requires JavaScript).</p>
</noscript>
```

Replace `TOOL-NAME` with the slug of the tool you want to embed (see the table above — e.g. `ai-labor-market-tracker` or `deficit-impact-calculator`).

The script creates an iframe at runtime and auto-resizes it to the tool's content height via [iframe-resizer v4](https://github.com/davidjbradshaw/iframe-resizer/tree/v4) (MIT), vendored at `embed/v1/`.

Optional `data-*` attributes:

| Attribute | Default | Purpose |
|---|---|---|
| `data-tool` | _(required)_ | Which interactive to load (e.g. `deficit-impact-calculator`). |
| `data-title` | tool name | Iframe `title` for accessibility / screen readers. |
| `data-height` | `100` | Initial pixel height before iframe-resizer measures the tool's actual height (~100ms after load). Set to the tool's natural height to eliminate the brief flash. |
| `data-log` | _(off)_ | Any non-empty value enables iframe-resizer's verbose console logging — useful for diagnosing unexpected sizing. |
| `data-strip-host-classes` | `paragraph-embed-code` | Comma-separated list of host-wrapper class names whose width-proportional height (`padding-bottom: NN%` etc.) should be overridden. Override if your host uses a different wrapper class. |

### Fallback (advanced)

For the rare host that allows `<iframe>` but blocks third-party scripts:

```html
<iframe src="https://interactives.budgetlab.yale.edu/tools/TOOL-NAME/" width="100%" height="1000" style="border:0;" title="Tool title" loading="lazy"></iframe>
```

Doesn't auto-resize, so `height` needs tuning to fit the tool without inner scroll.

### Caching

GitHub Pages caches `embed.js`, tool files, and vendored assets for ~10 minutes. Updates propagate within that window after a push. For an immediate refresh, hard-refresh the host page (Ctrl/Cmd-Shift-R) or append a cache-busting query string (`embed.js?v=2`).

### Versioning

The directory `/embed/v1/` is **frozen as v1 behavior**. Any future breaking change to the loader's contract — `data-*` attributes, wrapper structure, postMessage protocol, iframe-resizer major version — will ship as a sibling `/embed/v2/` with its own pinned vendor copy. The `/embed/v1/` URL stays working indefinitely so existing embeds do not break. The same commitment applies to each tool URL.

See [CHANGELOG.md](CHANGELOG.md) for what's in each version.

### Analytics events

Tools can report usage to the **host page** (the page embedding the iframe) via `window.postMessage`, leaving the widget itself analytics-agnostic. The host decides whether to listen and where to forward events (e.g. into its own Google Tag Manager / GA4). Events fire **only when the tool is embedded** — never on the standalone tool page.

Each message uses this envelope:

```js
{
  type: 'BUDGET_LAB_GTM_EVENT',   // discriminator the host filters on
  event: '<event name>',          // GTM custom-event name
  data: { tool_name: '<tool slug>', /* event-specific fields */ }
}
```

Currently emitted by **deficit-impact-calculator**:

| `event` | Fires when | `data` (besides `tool_name`) |
|---|---|---|
| `calculator_submission` | User clicks **Calculate** | `loan_amount` (string), `loan_type` (`Auto` / `Mortgage` / `Small Business` / `None`), `calculate_choice` (`Historical Deficits` / `One-Time Debt Increase`), `debt_increase_amount` (string, or `None`) |
| `explainer_opened` | User opens the "How this estimate works" panel | _(none)_ |

Host pages forward these into their own analytics with a small listener — e.g. a GTM Custom HTML tag firing on All Pages:

```html
<script>
  window.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || m.type !== 'BUDGET_LAB_GTM_EVENT') return;   // ignore everything else
    // Optional: restrict to the widget origin
    // if (e.origin !== 'https://interactives.budgetlab.yale.edu') return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: m.event }, m.data));
  });
</script>
```

## Tool versioning

Each tool has a *canonical* URL (e.g. `/tools/deficit-impact-calculator/`) that follows the latest published state — embedders default to this and get future updates automatically.

For publications that need stable numbers, each tool also keeps dated *snapshots* at `/tools/<name>/versions/<YYYY-MM-DD>/`. A snapshot is a frozen copy preserved indefinitely.

To embed a snapshot, pass the snapshot path as `data-tool`:

```html
<script src="https://interactives.budgetlab.yale.edu/embed/v1/embed.js" data-tool="deficit-impact-calculator/versions/2026-05-11"></script>
```

Each tool has its own `CHANGELOG.md` (see [`tools/deficit-impact-calculator/CHANGELOG.md`](tools/deficit-impact-calculator/CHANGELOG.md)). The repo-wide [`CHANGELOG.md`](CHANGELOG.md) tracks embed-loader and shared-asset changes. When and how snapshots are taken is documented in [CONTRIBUTING.md](CONTRIBUTING.md).

## Local development

The published site has **no build step** — Pages serves the repo as-is. For local work there is a
dev-only server (pure Node, no npm dependencies):

```sh
npm run dev                                  # http://localhost:5173/
npm run dev -- --open                         # also open the browser
npm run dev -- --tool state-of-tariffs --open # open straight to one tool
```

It serves the whole repo (so each tool's `../../assets` / `../../embed` paths resolve exactly as in
production), **live-reloads** the browser on save, and — for tools that ship a
`scripts/build-manifest.py` — re-runs that build automatically when the tool's `data/` changes, then
reloads. Manifest builds require Python (`python` by default; override with `PYTHON=py npm run dev`).
The dev server is never deployed; `node_modules/` is git-ignored. A plain `python -m http.server` from
the repo root also works if you don't need live-reload.

## Adding a new interactive

1. Create a new subfolder under `tools/` named in `kebab-case` (e.g. `tools/tariff-calculator/`).
2. Add an `index.html` that is a complete, standalone HTML document. It will be served at `https://interactives.budgetlab.yale.edu/tools/<folder>/`.
3. Near `</body>`, include the iframe-resizer child script: `<script src="../../embed/v1/iframeResizer.contentWindow.min.js"></script>`. This enables auto-resize when the tool is embedded.
4. Add the tool to the table at the top of this README and to the root `index.html` landing page.
5. Open a PR or push to `main` — Pages will redeploy automatically.

### Per-tool validation (CI)

The single required check (`Validate site`) runs three repo-wide gates — JS syntax (`node --check`), local-reference resolution (`check-links.mjs`), and a render smoke test — and then auto-discovers per-tool needs. A tool opts in by adding either:

- **`tools/<slug>/ci/smoke.json`** — `{ "marker": "<string>", "budgetMs": <int> }`. The smoke step loads the tool in headless Chrome and asserts `marker` appears in the rendered DOM. Pick a marker that comes from local data (not a third-party CDN) so the check is deterministic. `budgetMs` (optional, default 5000) is the render budget for JS-heavy tools. **Every tool must have a `smoke.json`.**
- **`tools/<slug>/ci/validate.sh`** — optional. Run automatically if present (any language; installs its own deps). Use for build/data gates — e.g. regenerating a generated artifact and failing if the committed copy is stale.

Adding a tool requires **no edits to the workflow** and **no branch-protection changes** — drop the folder with its `ci/` descriptors. Tools whose `.js` uses ES-module `import`/`export` must include a `package.json` with `{"type": "module"}` so `node --check` parses them as modules.

## Support

Contact The Budget Lab at budgetlab@yale.edu.
