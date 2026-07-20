# Engine request: control legend visibility

**Repo:** `budget-lab-chart-engine`
**Type:** small feature (legend)
**Requested by:** State of Tariffs dashboard

## Problem

The legend renders automatically whenever a chart has more than one series, with no way to
suppress it. Sometimes the series encoding is already conveyed elsewhere (faceted pane titles, a
selector label, or an axis), making the legend redundant clutter; other times a chart uses
multiple series only as a coloring mechanism and a legend is noise.

## Desired behavior

An explicit `legend: false` (or `showLegend: false`) spec field that hides the legend while
keeping the multi-series coloring. Default unchanged (legend shown for ≥2 series).

## Acceptance criteria

- `legend: false` hides the legend for a multi-series chart; colors/interactivity otherwise
  unchanged. Absent the field, behavior is as today.

## Dashboard context

Came up styling a distribution chart where the second "series" existed only to color a Total bar
distinctly — the auto legend was redundant and we relabeled it as a workaround.
