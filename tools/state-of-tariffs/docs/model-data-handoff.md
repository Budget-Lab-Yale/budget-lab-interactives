# State of Tariffs dashboard — data interface notes

The dashboard is built against your data guide and runs end-to-end on the sample vintage
(`interface_vintage 2026070114`). You can see it in **`Budget-Lab-Yale/budget-lab-interactives`**,
branch **`state-of-tariffs`**, under `tools/state-of-tariffs/`: `data/` mirrors the structure we
consume, and each figure's `config.md` shows how it's wired. `scripts/sync-model-data.py
<dashboard-dir>` copies your `data/**` + `manifest.json` in; `scripts/build-manifest.py` builds the
UI, reading your `unit` / `projected` / `scenario` columns and `manifest.json` directly.

Below: (1) the text/config split to decide, (2) output changes we're asking for, (3) decisions we
need. Nothing here is locked — it's all open to change; this is just to get us communicating.

## 1. Text & config ownership (open — let's decide)

Content that isn't data — narrative text, and each figure's config (title, layout, toggles) — could
be owned two ways. Either works; we just need to pick one and implement:

- **You provide narrative text only**, we own the figure configs. You'd ship Markdown through the
  pipeline (`dashboard/text/introduction.md`, `methodology.md`, optional per-figure files);
  anything omitted falls back to our copy.
- **You provide full figure configs** in the output, and the tool just renders them (you'd own
  titles, layout, toggles, sources).

  To discuss.

## 2. Output changes we're asking for

All small and additive; please add these to your output rather than have us derive them.

**2.1 Policy events** — for Tab 2's dashed markers + projected band. A **YAML list is easiest** (we
read YAML natively) — CSV is fine too. Just the major tariff-policy dates and the projection-band
start:

```yaml
major:
  - { date: 2025-02-04, label: Fentanyl tariffs }
  - { date: 2025-04-02, label: Liberation Day }
  - { date: 2026-07-23, label: Section 122 expiry }
projection_start: 2026-05-09
```

Add a `scenario` key only if the markers differ by scenario (see Q2).

**2.2 PCE total** — add a `Total` category to `consumer-prices`, per substitution (and per
`scenario`/`measure` in `alternative-scenarios/`): the overall PCE-weighted price effect.

```csv
category,value,group,substitution
Total,<overall %>,Total,presub
```

**2.3 Distribution — consolidate + total.** Replace `distribution-pct-income` +
`distribution-dollars` with one `distribution` slug carrying a `basis` column
(`% of after-tax income` / `2025 dollars`; keep `scenario`/`measure`). Add a `Total` category (all
households) per substitution × basis (× scenario × measure). Update `manifest.json → figures`.

```csv
category,value,substitution,basis
1,-0.66,presub,% of after-tax income
Total,<all-household>,presub,% of after-tax income
```

Definitions: `% of after-tax income` = burden as a share of total after-tax-and-transfer income;
`2025 dollars` = average burden per household. Confirm (Q3).

**2.4 `group` column on `gdp-by-category`** — drives the sector/country faceting.

```csv
category,value,dimension,category_code,group
Agriculture,...,sector,agriculture,Sectors
Durable Manufacturing,...,sector,durable,Manufacturing detail
USA,...,country,usa,Countries
EU,...,country,eu,Country Groups
```

Rule: sector → `Manufacturing detail` for `category_code ∈ {durable,nondurable,advanced}`, else
`Sectors`; country → `Countries` for individual countries (`usa,china,canada,mexico,japan,uk`),
else `Country Groups`.

## 3. Questions

1. **`projected` semantics.** In `statutory-rates/*`, `projected = 1` on a few short stretches in
   2025 (2025-03-12→13, 2025-06-01→03, 2025-09-01, 2025-11-14→20) in addition to the trailing
   2026-01-01→2026-12-31 range. Is that intended, or an error?
2. **Policy events** — do the markers differ by scenario, or are they common to all?
3. **Totals** — please confirm the §2.2 / §2.3 aggregation definitions (you compute them, so
   they're authoritative and consistent with the model).
4. **Tab 2 scenario** — statutory files carry all scenarios; we default to a scenario selector. Do
   statutory rates actually differ across scenarios, or only the projected effects?
5. **`daily-rate-by-category` size** — ~5.2 MB (45 sectors × daily × scenarios) and growing; it's
   committed to git and downloaded whole by the browser, so size matters (the other files are
   tiny). Is the date window bounded? OK to thin it (coarser history, or a headline-sector subset)?
   Is there a canonical headline-sector list?
6. **Revenue by year (suggestion)** — the 10-year total makes the grouped bar chart hard to read;
   would it make more sense as a **table**? We could also show both a table and a bar chart. No
   data change either way — just your preference.

## Known divergences (vintage 202607131919 — reconciled tool-side)

The dashboard renders against the contract above. The current artifact diverges from it in the
ways below; `scripts/reconcile-model-data.py` patches each after sync as an interim. Please fix
these upstream so the reconcile step can be retired:

1. **Distribution ships split.** The artifact emits `distribution-pct-income` and
   `distribution-dollars` as separate slugs; the dashboard expects one `distribution` slug with a
   `basis` column (`% of after-tax income` / `2025 dollars`). This is the consolidation asked for
   in §2.3. Reconcile merges them.
2. **`gdp-by-category` drops the `group` column.** The faceting column (`Sectors` /
   `Manufacturing detail` / `Countries`) requested in §2.4 is absent; reconcile re-derives it from
   `dimension` + `category_code`. Please emit `group` directly.
3. **Unemployment rate.** The summary CSV still carries an `Unemployment rate` row; the dashboard
   does not show it. Reconcile drops it — OK to omit it from the summary output?
4. **By Product = `daily-rate-by-hs`.** The dashboard's By Product figure now renders the HS
   product grouping (`daily-rate-by-hs`), not `daily-rate-by-category` (GTAP sectors). Please list
   `daily-rate-by-hs` in the artifact `figures` manifest; `daily-rate-by-category` can be dropped.
