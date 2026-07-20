# Engine request: per-facet (pane-scoped) annotation marks

**Repo:** `budget-lab-chart-engine`
**Type:** feature (annotations + small multiples)
**Requested by:** State of Tariffs dashboard (distribution figure)

## Problem

Annotations (`annotations.yAxis` / `xAxis` / `points` / `bands`) are specified once in the spec
and applied uniformly to every pane. In a faceted small-multiples chart with **per-pane scales**
(`small_multiples.mode: per-pane`), a single static value can't be correct across panes: a
horizontal reference line at `y = -0.28` is right for a "% of income" pane but meaningless in a
"2025 dollars" pane (scale ≈ −1000…0).

Concretely, we want an **all-household "Total" reference line** on the distribution figure — one
value in the % pane, a different value in the $ pane — and there is no way to express that today.

This must cover **both orientations**, since the value axis flips:

- **Vertical bars** (distribution): the total is a **horizontal** reference line
  (`annotations.yAxis`), a different `y` per pane.
- **Horizontal bars** (consumer-prices): the total is a **vertical** reference line
  (`annotations.xAxis`), a different `x` per pane. (We may switch consumer-prices from a
  "Total" bar to this annotation approach.)

## Desired behavior

A way to scope annotation values to a facet (pane). Two possible shapes:

1. A per-annotation `facet` key — the annotation only renders in the pane whose facet value
   matches. Works for both `yAxis` (vertical bars) and `xAxis` (horizontal bars):
   ```yaml
   # vertical bars — horizontal reference line, per pane
   annotations:
     yAxis:
     - { facet: "% of after-tax income", y: -0.28, label: "All households" }
     - { facet: "2025 dollars",          y: -357,  label: "All households" }
   # horizontal bars — vertical reference line, per pane
   annotations:
     xAxis:
     - { facet: "Pre-substitution",  x: 0.33, label: "All items" }
     - { facet: "Post-substitution", x: 0.26, label: "All items" }
   ```
2. Or a `by_facet` map on the annotation block, keyed by facet value.

Annotations without a `facet` key keep applying to all panes (unchanged behavior).

**Related (nice-to-have): data-/selection-driven annotation values.** The dashboard's total also
changes with a runtime selector (pre- vs post-substitution). If per-facet annotations exist, the
dashboard can inject the correct per-pane value at render time from the selected data — so the
core ask is just per-facet support; the dashboard handles the "which value" part.

## Acceptance criteria

- A `per-pane` faceted **vertical**-bar chart can render a horizontal reference line at a
  **different y in each pane**, each labeled, placed against that pane's own scale.
- A faceted **horizontal**-bar chart can render a vertical reference line at a **different x in
  each pane**, each labeled.
- Annotations with no facet key still apply to all panes (no behavior change for existing specs).

## Dashboard context

Until this lands, the distribution figure (`default-scenario/distribution`) shows the decile
bars faceted by basis (% of income | 2025 dollars) with **no** in-chart total; the all-household
total lives only in the Summary of Results table. Once per-facet annotations exist, we'll add the
Total as a labeled reference line per pane.
