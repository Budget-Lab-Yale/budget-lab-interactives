> **SHIPPED in engine 1.12.0 as `barStack.hover` ([engine#29](https://github.com/Budget-Lab-Yale/budget-lab-chart-engine/issues/29)), and ADOPTED.**
> The workaround this note described — suppressing the engine's card and value pills with a
> root-scoped class, and hand-rolling a hit-tester per figure — **is deleted**. The spec now sets
> `barStack.hover: 'tooltip'` with `netDisplay: 'none'`, which buys the floating card without a net
> callout, and [engine#30](https://github.com/Budget-Lab-Yale/budget-lab-chart-engine/issues/30)'s
> `hooks.tooltip` authors its content, so the engine keeps hit-testing, positioning and the band
> highlight. No net dot reaches the PNG export.
>
> **Live dependency a repin must re-check by hand:** what buys the card on these faceted stacks is
> `barStack.hover: 'tooltip'` PLUS a non-null `netMode` — the resolver returns `"pills"` only when
> `netMode == null`, and `netDisplay: 'none'` makes it non-null. A coordinated pane otherwise draws
> no card at all, so if that resolution changes, all three hover cards disappear with no error and a
> green suite. Verified in jsdom against 1.12.0; see the repo's `## Hard invariants`.
>
> Kept for the rationale.

# Engine note: the stacked tooltip is coupled to the net dot, and its Total row is pinned last

**Repo:** `budget-lab-chart-engine` (informational — two small capability gaps)
**Type:** design-fit note (§9: engine gap, worked around in the tool)
**Requested by:** Revenue from higher taxes at the top (Distribution card)
**Vendored engine:** 1.4.1 — both behaviours are unchanged in `main` at 1.8.1 (checked
`src/engine/render-live.ts:1028`, `src/engine/crosshair.ts:207`)

## 1. The floating tooltip can only be had along with the net dot

`barStack.netDisplay` chooses the net callout — `auto | text | dot | none` — and, per CONFIG-SPEC,
"when the net **dot** is shown, hovering a category shows the floating tooltip … not the per-segment
value pills." In the source that is literal:

```ts
const showTotalDot = netMode === "dot";
const useTooltip = showTotalDot === true;
```

So the hover treatment is not independently addressable. A chart that wants the tooltip (rather than
per-segment pills) in every pane **must** also draw a net dot on every bar, and gets a "Total" legend
entry with it.

This card wants the tooltip and no dot: the dot reads as a data mark of its own — a fifth thing in a
four-series stack — and on the faceted layout it lands at a different height in each pane, implying a
comparison that isn't there. The total is still wanted, but as a row in the tooltip, which is where
this card's reader looks for it.

There is a second, sharper problem with leaving `netDisplay` on `auto`: it resolves to `dot` only
when some value is negative. In this card the lost-to-behavior series is *usually* positive but goes
slightly negative for the lowest quintile at some dial settings — so the hover treatment silently
flipped between a tooltip and value pills depending on the package the reader had built. Pinning
`netDisplay: 'dot'` makes it deterministic.

**What would close the gap:** a hover-treatment field independent of the net callout, e.g.
`hover: 'tooltip' | 'pills'` (or `barStack.netDisplay: 'none'` no longer forcing pills). Then this
card would ask for `hover: 'tooltip'` with `netDisplay: 'none'` and need no override.

### Consequence worth knowing: the downloaded image still has the dot

The engine builds its PNG export from the **spec**, not from the rendered DOM, so a CSS override
cannot reach it. With `netDisplay: 'dot'` pinned for the tooltip's sake, the exported image carries
the net dot on every bar and a "Total" legend entry, while the on-page chart shows neither.

There is no spec-level way to split them today: the dot's fill/stroke are hardcoded in the mark
(`fill: WHITE`, black stroke), not exposed, and the export runs from the same spec object the mount
used. The three ways out, in order of preference:

1. **The engine decouples hover treatment from the net callout** (above). Then `netDisplay: 'none'`
   removes the dot from chart and export alike and the tooltip stays. One-line change here.
2. **The engine takes an export-time spec override**, so a card can export a variant of what it
   mounted.
3. **This tool stops using the engine's tooltip** and attaches its own `#tt` card to the engine's
   bars, as the dumbbell view already does. That buys full control of content and order and drops
   both overrides, at the cost of the distribution card no longer behaving like a stock engine chart
   on hover — which is the opposite of what was asked for here.

## 2. The tooltip's Total row is always last

`buildTooltipHtml` appends the Total row after the series rows, with a rule above it:

```ts
if (opts.showTotal && totalAny) {
  html += `<div class="tbl-tooltip-row" style="border-top:…;margin-top:3px;…">…Total:…`;
}
```

The reference prototype for this tool leads with the total — the headline figure first, the
composition under it — and that reads better for a card whose question is "how much does this group
pay in total, and of what." There is no field for it.

**What would close the gap:** `tooltip_total_position: 'first' | 'last'`, or more generally letting
the Total row be styled/placed like any other row.

## What this tool does instead

Both are CSS overrides in `styles.css`, scoped to `#distChart` / `.tbl-tooltip`:

- hides `g.tbl-net-marker` and the `.tbl-legend-item[data-series="__total__"]` legend entry;
- makes the engine's tooltip a column flex container and gives its last row `order: 1`, flipping the
  divider to the underside.

Neither touches the engine bundle, but both depend on engine-internal class names and on the Total
row being last in source order. `test/render.test.mjs` greps the vendored bundle for those hooks, so
a re-vendor that renames or reorders them fails the suite rather than silently reverting the design.

## Tool context

See `render/distribution.js`'s `buildDistSpec` (which sets `barStack.netDisplay`/`stackOrder` and the
reversed `series_order`) and the "vendored engine hooks" test in `test/render.test.mjs`.
