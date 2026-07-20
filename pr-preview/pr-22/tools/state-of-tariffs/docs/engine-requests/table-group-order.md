# Engine request: explicit row-group order for tables

**Repo:** `budget-lab-chart-engine`
**Type:** small feature (table)
**Requested by:** State of Tariffs dashboard (grouped tables)

## Problem

Tables order their **row groups** (the non-last stub tiers) by first-seen data order only.
`row_order` controls the leaf (last stub) order and `column_order` the leaf columns, but there's
no equivalent for the group tiers — so to reorder groups you must reorder the source data.

## Desired behavior

A **`group_order`** (per stub level, or a single list for the first group tier) that orders row
groups explicitly, mirroring `row_order` / `column_order`; unlisted groups follow in first-seen
order.

```yaml
stub: [country, scenario]
group_order: [Total, China, Canada, ...]   # order the country groups
```

## Acceptance criteria

- `group_order` reorders the stub group tier; unlisted groups follow first-seen; no effect when
  absent.

## Dashboard context

The ETR-by-country table groups by trading partner; today the group order is whatever the model
CSV happens to emit. `group_order` would let the dashboard set it (e.g. put Total last) without
touching the data.
