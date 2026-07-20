# Engine request: keep multi-tier header super-groups contiguous under `column_order`

**Repo:** `budget-lab-chart-engine`
**Type:** fix / consistency (tables)
**Requested by:** State of Tariffs dashboard (etr-by-country, alternative scenarios)
**Follows:** the 1.3.0 row-grouping work (`group_order`, order-independent grouping)

## Problem

On a **two-tier header** (e.g. `header: [measure, substitution]`, super = Levels / Change-vs-default,
leaf = Pre-/Post-substitution), setting `column_order` on the leaf tier sorts **all** leaf columns
globally by that order, which **interleaves the super-groups** instead of letting each super span
its children:

```
        Levels | Change vs. default | Levels | Change vs. default     ← super repeats (colspan 1)
   Pre-sub     | Pre-sub            | Post-sub | Post-sub
```

Expected (super-major, each super spanning its leaves):

```
              Levels               |        Change vs. default
        Pre-sub   |   Post-sub     |    Pre-sub   |   Post-sub
```

This mirrors the row-side bug that 1.3.0 fixed: rows now gather by stub path (contiguous groups)
and take `group_order` per tier. Header columns did not get the same treatment — there's no
per-tier column order, and `column_order` breaks super-group contiguity.

## Workaround in the tool today

Drop `column_order` and rely on the **data's first-seen order** being super-major (level rows
before delta rows, presub before postsub within each). Works, but fragile: it silently depends on
the modeler's row order, and there's no way to reorder the super tier independent of the data.

## Desired behavior

- Header columns stay grouped by super tier (each super contiguous, `colspan` spanning its
  leaves), regardless of input row order — the column analogue of 1.3.0 row grouping.
- `column_order` orders the **leaf** tier **within** each super-group (not globally).
- Optionally a `column_group_order` (analogous to `group_order`) to order the super tier(s)
  explicitly.

## Proposed implementation

Mirror the row-side model that 1.3.0 already established for the stub, applied to the header:

1. **Gather by header path, not by leaf sort.** Build the column tree from the distinct header
   tuples (`[measure, substitution]`), grouping leaves under their parent so a super value's
   leaves are always contiguous — exactly as rows are now gathered by stub path. The leaf sort
   must never be allowed to split a super group.
2. **Per-tier ordering.**
   - Super tier(s): order by `column_group_order` when given (a `string[]` for one super tier, or
     `string[][]` per tier, matching the `group_order` shape); otherwise first-seen in data.
   - Leaf tier: order **within** each super group by `column_order` (unchanged meaning — it lists
     last-tier values), otherwise first-seen.
3. **Emit `colspan`.** Each super `<th>` spans its (now contiguous) leaf count. This already works
   once the leaves are contiguous; today `colspan` is 1 because the leaves are interleaved.

Net: `column_order` becomes a within-super sort (matching how `row_order` became within-group in
1.3.0), and `column_group_order` is the header analogue of `group_order`. Single-tier headers are
unaffected (there is no super tier to gather under).

## Acceptance criteria

- `header: [measure, substitution]` with `column_order: [presub, postsub]` renders two super
  columns (Levels, Change-vs-default), each `colspan=2` spanning Pre-/Post-substitution in that
  order, for **any** input row order.
- `column_group_order: [delta_vs_default, level]` flips the super order to Change-vs-default first
  without touching the data.
- Single-tier headers and existing `column_order` behavior on them are unchanged.
