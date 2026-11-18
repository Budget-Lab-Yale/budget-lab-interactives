# taxes-at-the-top

"Revenue from higher taxes at the top." Plain JS, no build step, like the rest of the repo. Run the
tests from this directory with `node --test test/*.test.mjs`; CI runs the same suite through
`ci/validate.sh`. `test/`, `docs/`, `scripts/`, `ci/` and this file are kept off the published site
by `.github/publish-exclude.txt`. A data refresh goes through `scripts/sync-model-data.py`; see
`docs/model-data-handoff.md`.

## Hard invariants

Constraints that no single file states and that a reviewer cannot infer from a diff. **Paste this
section verbatim into every code-review prompt.** A violation of anything here is top-severity.

### The chart engine is vendored, and its two render paths are not the same path

- **`vendor/chart-engine/` is a build artifact, never hand-edited.** It is produced by
  `npm run build` + `node dist/cli/index.js assets -o <dir>` in `budget-lab-chart-engine`, then
  copied in (`engine-<v>.js` → `live.js`, `chart-<v>.css` → `chart-engine.css`, version → `VERSION`).
  A local edit is lost on the next repin and invisible in review.
- **The PNG export re-renders from the spec; it does not serialise the live DOM.** So anything applied
  to the rendered DOM — a stylesheet rule, a `MutationObserver`, a post-mount patch — is silently
  absent from every downloaded image. This has bitten this repo three times (a hatch, a segment gap,
  a net dot), once shipping a caption that read "hatched" over an export that wasn't. **Customisation
  belongs in the spec or in `hooks`; CSS against engine internals is a bug, not a shortcut.**
  Engine `hooks.tickLabel`/`valueLabel`/`legendKey`/`afterRender` are guaranteed to run on both
  paths. `hooks.tooltip` is screen-only *by design* — a static PNG has no hover state.
- **The bundle has been minified since engine 1.10.0.** Guard tests may assert only on string and
  property literals; an identifier-based assertion (`NET_DOT_CLASS = "tbl-net-marker"`) cannot work
  and will pass vacuously or fail confusingly.
- **Engine class names are not a stable API.** 1.11.0 retired `.tbl-legend-swatch.is-dot` when every
  legend key moved to SVG, and a hand-rolled legend that borrowed the class rendered squares with no
  error. The tool no longer *overrides* engine internals, but it still *depends* on engine class
  names in four places, all pinned by `test/render.test.mjs`: it suppresses `.figure-titlebar` /
  `.figure-subtitle` inside `#distChart` and zeroes `.figure-card`'s margin there (the card draws its
  own header, and if those move the page shows both); `index.html` titles both cards with
  `.figure-supertitle` / `.figure-title` / `.figure-subtitle`; `render/stack.js` builds its download
  control out of `.figure-meta` / `.figure-meta-text` / `.figure-downloads` / `.figure-download-btn`;
  and `tipCard` emits the engine's `.tbl-tooltip-*` classes so its card is styled by the vendored
  stylesheet in both hosts. The two borrowed-markup cases have no look of their own here — the
  vendored stylesheet is the only thing styling them, so if the engine drops a class the card headers
  or the download buttons render unstyled with no error and a green suite. Anything else this repo
  leans on must be pinned the same way.
- **The stack's PNG export takes its font from the vendored stylesheet.** An SVG rasterised through
  `<img>` cannot see the page's fonts, so `render/stack.js` lifts the Figtree `@font-face` (a data
  URI) out of `chart-engine.css` at download time and embeds it. If the engine stops shipping that
  rule, the PNG silently falls back to the system face. Pinned by `test/stack-columns.test.mjs`, which
  also holds each export text's weight to the `styles.css` rule for the same text on screen.
- **Colours in a spec must be engine palette names or hex.** A `var(--tbl-*)` reference is refused
  at load since 1.11.0 — the palette resolver cannot read it.

### taxes-at-the-top

- **The distribution card's hover cards depend on the engine drawing a card in a coordinated pane.**
  Both figures are two-pane small multiples with the coordinated cursor on. A coordinated pane
  normally builds *no* floating card, which would silently remove all three views' hover content.
  Two things buy it back, and both must hold: `barStack.hover: 'tooltip'` on the stacked views, and
  the engine's own behaviour that a faceted `dumbbell` draws one.

  **What is load-bearing on the stacked views is `barStack.hover: 'tooltip'` PLUS a non-null
  `netMode`** — the bundle's resolver returns `"pills"` only when `netMode == null`, and our spec's
  `netDisplay: 'none'` makes it the non-null `"none"`, so `barStack.hover` wins outright. **The sign
  of the data is irrelevant here.** An earlier version of this note said "an all-positive stack at
  defaults hovers with pills and draws no card", which read as though all-positive-ness were the
  thing holding the card up. It is not. The engine does compute a has-negative flag, but feeds it
  only to the `'auto'` branch that the explicit `netDisplay` short-circuits. Verified 2026-08-24
  against 1.12.0 by mounting the real specs in jsdom under `{deemed:{pos:'deemed',exem:0}}`, which
  drives every group above Quintile 2 negative: the hook fired with the category resolved, and the
  rect count, the hatch `<pattern>` and the legend order all matched the all-positive control.

  **This is NOT gated by this repo's tests, and cannot be with the current suite** — there is no
  jsdom here, so nothing mounts the bundle or dispatches a hover. It was verified against 1.12.0 by
  hand, mounting all three real specs in jsdom with the engine's own `mockRect1to1` harness and
  asserting `hooks.tooltip` fires with the category resolved. **A repin must repeat that by hand.**
  If the behaviour regresses, all three hover cards disappear with no error and a green suite.
  CONFIG-SPEC's reach table is the contract; the engine's `test/hover-card-reach.test.ts` gates it
  upstream.

- **`barStack.hover: 'tooltip'` costs cross-pane coordination on a faceted stack.** In the engine's
  pane path, `coord = useCoord && !useTooltip` (`render-live.ts`), so asking for the card switches
  off the coordinated cursor: hovering a category highlights only the pane under the pointer, and the
  other pane's band stays dark. Measured on 1.12.0 — hovered pane `hl-opacity=0.12`, other pane `0`.
  The dumbbell path does not have this gate (its `onResolve` fires ahead of the `emitOnly` check), so
  the rate view keeps both. Filed as [engine#32](https://github.com/Budget-Lab-Yale/budget-lab-chart-engine/issues/32);
  the two features are orthogonal, and the dumbbell path proves it is implementable.
- **The stack figure (`render/stack.js`) is hand-rolled SVG with its own PNG export**, because no
  engine mark expresses three rungs per row with drag-to-reorder. It is not a version-pin
  workaround, and it does not get `series_patterns`/`barStack.segmentGap` — its 1px segment inset
  and square corners are its own code, deliberately matched to the engine's rendering by hand.
- **`data/data.json` is machine-generated** by the Tax-Simulator top-tax dials pipeline and replaced
  wholesale on a new vintage. Never hand-edit it; `model.js`'s evaluator must stay in lockstep with
  the pipeline's `fit_surrogate.py`.
- **The hover card markup is host-agnostic** (`.tt-card`, `render/shared.js tipCard`): the same
  string is returned into the engine's `.tbl-tooltip` for the distribution views and into the tool's
  own `#tt` element for the stack. Scoping its CSS to either host breaks the other.

### Gated in CI rather than restated here

- `test/*.test.mjs` (run in CI by `ci/validate.sh`) pins the engine internals that are checkable without a
  browser — the class names the tool depends on, the spec keys it sets, and the string/property
  literals in the vendored bundle — plus `styles.css` comment balance (a stray `*/` silently kills
  every rule after it, and nothing else reads that file as CSS). **It does not gate hover
  BEHAVIOUR**: with no jsdom in this repo nothing mounts the bundle, so the hover-card reach above is
  a manual check on every repin, not a test.

