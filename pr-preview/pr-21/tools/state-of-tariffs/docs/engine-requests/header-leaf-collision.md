# Engine bug: multi-tier header leaves keyed by last value only (collision)

**Repo:** `budget-lab-chart-engine`
**Type:** bug (table header)
**Requested by:** State of Tariffs dashboard (alt ETR table: Levels | Change-vs-default super-columns)

## Problem

In a multi-tier table header (e.g. `header: [measure, substitution]`), the engine keys column
**leaves by the last header value only** (`src/table/model.ts:47`,
`const key = path[path.length - 1]`). So when the leaf value **repeats across banner groups** —
here `substitution` is `presub`/`postsub` under *both* the `Levels` and `Change vs. default`
measure groups — the second group's leaves collide with the first and are dropped. Result: only
the first banner group's columns render (we saw "Levels" with Pre/Post, but "Change vs. default"
missing).

This only works today if the leaf value is globally unique across the whole header (e.g. our
default-scenario ETR table uses distinct leaf keys `avg-pre`/`share-pre`/`contrib-pre` per tier).

## Desired behavior

Key header leaves by their **full header path**, not just the last value, so a repeated leaf
value under different banner groups produces distinct columns. `header_labels` / `column_order`
should resolve against the leaf's last value (or the full path) so authoring stays simple:

```yaml
header: [measure, substitution]      # Levels{Pre,Post} | Change{Pre,Post}
header_labels: { level: Levels, delta_vs_default: Change vs. default,
                 presub: Pre-substitution, postsub: Post-substitution }
```

## Acceptance criteria

- A 2-tier header whose last-tier values repeat across the upper tier renders all leaf columns
  under each banner group (no dropped columns).
- Existing tables with globally-unique leaf values are unchanged.

## Interim / dashboard context

Worked around tool-side in `render.js` (`dedupeHeaderLeaves`): when a collision is detected, it
synthesizes a unique leaf column (the full header path) and remaps `header_labels`. Removable once
the engine keys leaves by full path.
