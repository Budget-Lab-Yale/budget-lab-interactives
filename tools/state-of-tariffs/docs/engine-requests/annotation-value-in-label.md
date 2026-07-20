# Engine request: `{value}` token (+ formatting) in annotation labels

**Repo:** `budget-lab-chart-engine`
**Type:** feature (annotations)
**Requested by:** State of Tariffs dashboard (gdp-by-category "Overall" reference line)

## Problem

Annotation labels are static strings. To show a reference line's **own value** in its label —
e.g. an "Overall" GDP line reading `Overall (-0.07%)` — the author must hard-code the number
into the label or compute it elsewhere. There's no way to say "put this line's value in its
label, formatted like so."

## What the dashboard does today (and would like to drop)

The dashboard renders a "Total" reference line by extracting a total row from the data and
injecting a `yAxis`/`xAxis` annotation at that value (a render-layer feature). To get the value
into the label, our render layer supports a `{value}` token plus a `value_format`
(`{decimals, prefix, suffix}`), substituting the formatted number before handing the plain label
to the engine:

```yaml
label: "Overall ({value})"
value_format: { suffix: "%", decimals: 2 }   # -> "Overall (-0.07%)"
```

This is a tool-side string substitution; the engine never sees `{value}`.

## Desired behavior

Support a `{value}` placeholder in annotation `label` (for `yAxis` / `xAxis` reference lines,
and ideally `points`), replaced with the annotation's own coordinate value (`y` / `x`),
formatted via an optional per-annotation `value_format` (`{decimals?, prefix?, suffix?}`) — or,
if omitted, the chart's value-axis format.

```yaml
annotations:
  yAxis:
  - { y: -0.0738, label: "Overall ({value})", value_format: { suffix: "%", decimals: 2 } }
```

## Acceptance criteria

- An annotation with `label: "… ({value})"` renders with its coordinate value substituted and
  formatted; no token means no substitution (unchanged behavior).
- `value_format` controls decimals / prefix / suffix; absent → fall back to the value-axis format.

## Impact

If this lands, the dashboard's render-layer `{value}`/`value_format` handling can be removed and
authors can express value-in-label annotations directly in the engine spec.
