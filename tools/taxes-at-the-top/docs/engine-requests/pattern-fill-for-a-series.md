# Engine request: pattern (hatch) fill for a series

> **SHIPPED in engine 1.11.0 (PR #28) and adopted here.** `render/distribution.js` declares
> `series_patterns: { lostToBehavior: '/' }`; the CSS override and the hand-rolled `<pattern>` in
> `index.html` are gone, and the hatch now reaches the PNG export. Two things landed differently
> from the proposal below: the band colour is **derived** (three tonal tiers along the ground's own
> ramp, CI-gated for contrast) rather than authored, and a legend/tooltip key draws **one centred
> glyph** rather than a patch of the tiling. Density repeats (`"//"`) were deliberately not
> implemented. Kept for the rationale — why one series in this card is textured at all — not as a
> live request. See CONFIG-SPEC "Series textures" for the shipped contract.

**Filed:** [budget-lab-chart-engine#26](https://github.com/Budget-Lab-Yale/budget-lab-chart-engine/issues/26)
**Repo:** `budget-lab-chart-engine`
**Type:** feature request (§9: engine gap, worked around in the tool)
**Requested by:** Revenue from higher taxes at the top (Distribution card)
**Vendored engine:** 1.4.1 — absent in `main` at 1.10.0 too (`grep -riE "hatch|<pattern|patternUnits" src/`
returns nothing)

## Problem

Every series fill in the engine is a flat color. A series can therefore only ever mean "another
category," and a chart that needs one segment to mean *a different kind of thing* has no way to say
so.

The distribution card needs exactly that. Its stack partitions a group's income into

| Series | Meaning |
|---|---|
| `afterTaxIncome` | income kept |
| `currentLawTax` | tax paid today |
| `collectedNew` | new tax the package **collects** |
| `lostToBehavior` | new tax the package **asks for and does not collect** |

`lostToBehavior` is not a fifth category of income — it is revenue that the first-order estimate
counts and behavior removes. The reference prototype encodes this with a hatch, and its captions
lean on it ("solid blue is what is **collected**, hatched is the part **lost to behavior**"). Read as
a flat tint, the segment reads as just another slice of the stack, and the collected-vs-forgone
distinction — the whole point of the card — flattens into a lighter shade of the same blue.

Hatching is also the accessible encoding here: the two segments currently differ only by lightness
of one hue, which is the hardest pair to separate for a reader with low vision or on a projector,
and it survives grayscale printing, which a blue/light-blue pair does not.

## Desired behavior

A series can declare a pattern fill alongside its color, e.g. in `series_fills` or as an extension
of `series_colors`:

```yaml
series_colors:
  lostToBehavior: blue-200
series_patterns:
  lostToBehavior: '/'
```

Direction is part of the encoding, not a house default: `/` and `\` are as distinguishable from each
other as two hues are, so a chart can use opposing leans to separate two series in one color family.
The values are **matplotlib's hatch characters**:

| Value | Renders |
|---|---|
| `/` | diagonal lines, ascending left→right |
| `\` | diagonal lines, descending left→right |
| `\|` | vertical lines |
| `-` | horizontal lines |
| `+` | vertical and horizontal, crossed |
| `x` | both diagonals, crossed |

Adopted rather than invented because the character is a picture of the result — no
`hatch-left`-vs-`hatch-right` ambiguity to resolve in prose — and anyone who has written `hatch='/'`
in a Python figure already knows it. Density comes free if wanted: matplotlib repeats the character
(`'//'` denser than `'/'`).

Four of the six need quoting in YAML (bare `-` is a sequence indicator, bare `|` a block scalar), so
the value should always be quoted, and an unrecognized value should fail loudly rather than render
flat.

The color stays the pattern's ground, so a consumer that ignores patterns degrades to today's
rendering. The pattern's stroke color should default to a darker step of the same hue (here
`blue` over `blue-200`), with an optional explicit override.

Requirements:

1. The legend swatch for that series carries the same texture, or the key stops matching the chart.
2. The tooltip swatch likewise.
3. The **PNG export** carries it. This is the part a consumer cannot do for itself — see below.
4. Hover dimming keeps working. Today's `.tbl-dimmed` class toggle is pattern-safe; an
   implementation that dimmed by rewriting `fill` would not be.

## Suggested implementation

Emit one `<pattern>` per patterned series into the plot's `<defs>` at assemble time, id-namespaced
per figure to survive several charts on a page, and set the mark's fill to `url(#…)` in the same
place `series_colors` is applied. Geometry the prototype uses, as a starting point for `hatch`:

```svg
<pattern id="…" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
  <rect width="7" height="7" fill="{ground}"/>
  <line x1="0" y1="0" x2="0" y2="7" stroke="{stroke}" stroke-width="3"/>
</pattern>
```

That vertical line plus `patternTransform` covers the whole set from one primitive: `rotate(45)` → `/`,
`rotate(-45)` → `\`, no rotation → `|`, `rotate(90)` → `-`. The crossed values are the corresponding
pair superimposed: `+` is `|` and `-` together, `x` is `/` and `\` together.

Legend and tooltip swatches can take a CSS `repeating-linear-gradient` equivalent rather than an
inline SVG, which is what this tool does today — but the angle must be the **negation** of the SVG
pattern's. SVG `rotate()` turns the pattern's line clockwise, while a CSS gradient angle names the
*gradient line* and lays its bands *perpendicular* to it, so equal numbers render as mirror images
and the key silently leans the opposite way from the bars:

```css
background-color: {ground};
background-image: repeating-linear-gradient(-45deg, {stroke} 0 3px, {ground} 3px 7px);
```

## What the tool does today, and what it can't reach

`styles.css` (override 3) points `#distChart rect[data-series="lostToBehavior"]` at a `<pattern>`
declared in a hidden inline `<svg>` in `index.html`. The pattern lives in the document rather than
in the chart's own `<svg>` because the engine owns and rebuilds that element on every re-mount,
while a CSS `fill: url(#…)` reference resolves against any inline SVG in the same document — so the
hatch survives dial changes with no JS hook. It relies on two engine internals:
`marks/stacked.ts` stamping `data-series` on each emitted `<rect>`, and dimming being a
`.tbl-dimmed` class toggle rather than a `fill` rewrite. `test/render.test.mjs` asserts both against
the vendored bundle so a re-vendor can't break the hatch silently.

**The downloaded PNG does not carry it.** As already noted in
[stacked-tooltip-without-net-dot.md](stacked-tooltip-without-net-dot.md), the engine builds its
export from the **spec** (`renderFigure(spec, rows)` in `src/embed/export-png.ts`) rather than
serializing the rendered DOM, so no CSS override can reach the image. The on-page chart hatches and
the download shows the flat tint, and the caption's word "hatched" is wrong in the downloaded copy.
This is the single reason the request is worth shipping in the engine rather than leaving to the
tool: acceptance criterion 3 is not something a consumer can work around.

## Acceptance criteria

- [ ] A series set to any of `/ \ | - + x` renders that texture on screen and in the PNG export, over
      its declared color as the ground.
- [ ] Each value renders as the character depicts it, and CONFIG-SPEC states the set.
- [ ] An unrecognized value fails loudly at load rather than rendering flat.
- [ ] Legend and tooltip swatches for that series carry the same texture, leaning the same way as
      the marks.
- [ ] A spec that declares no patterns renders byte-identically to today.
- [ ] Hover/legend dimming behaves as it does for flat fills.
- [ ] Patterns are id-namespaced per figure: two charts on one page, each with a patterned series,
      don't collide.
