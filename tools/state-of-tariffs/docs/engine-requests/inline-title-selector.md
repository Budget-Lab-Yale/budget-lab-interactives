# Engine request: interactive selector inline in the figure title

**Repo:** `budget-lab-chart-engine`
**Type:** feature (figure chrome / interactivity)
**Requested by:** State of Tariffs dashboard (gdp-by-category dimension selector)

## Problem

We want an AILMT-style **in-title selector** — a dropdown embedded in the chart title, e.g.
"Long-Run Change in Real GDP by [Sector ▾]", where changing it switches the figure's dimension.
AILMT does this in its own bespoke renderer (HTML title + an injected `<select>` wired to a
callback). Tools built on the **vendored engine** can't: the engine owns the figure-card DOM,
renders the title as **non-interactive SVG text**, and re-renders on resize (wiping anything a
host injects). The host only passes a title *string*.

## Desired behavior

A first-class way to place an interactive single-select control inside the title. Preferred shape:
the engine renders the control itself and reports changes, so the host just supplies options +
a handler. For example, a `{selector}`-style token in the title bound to a spec block:

```yaml
title: "Long-Run Change in Real GDP by {dimension}"
title_selectors:
  dimension:
    options: [{ id: sector, label: Sector }, { id: country, label: Country }]
    default: sector
```

and `mountChart(el, { spec, rows, onSelect })` (or an event) firing `{ id: "dimension", value }`
when the user changes it — the engine re-renders the title control in place, surviving its own
resize re-renders. The label token (`{dimension}`) resolves to the active option, as today.

(Alternative: expose a stable, engine-preserved HTML slot in the title that the host populates —
but engine-owned rendering + a change callback is cleaner and keeps PNG export coherent.)

## Acceptance criteria

- A chart can render a working single-select control inline in its title; changing it fires a
  host callback / event and the title updates, persisting across engine re-renders.
- Titles without `title_selectors` are unchanged.

## Interim / dashboard context

The dashboard keeps the dimension selector in the **sidebar** for now (its normal selector UI).
Once this lands, gdp-by-category (and similar) can move the dimension picker into the title.
