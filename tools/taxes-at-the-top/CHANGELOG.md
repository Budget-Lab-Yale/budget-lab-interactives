# Revenue from higher taxes at the top — changelog

Tool-specific change history. Embed-loader and shared-asset changes are tracked in the [root CHANGELOG](../../CHANGELOG.md).

## 2026-10-08

- Initial release, migrated from the staging repo. Data: Tax-Simulator top-tax surrogate fit for run vintage `toptax_v11_2026-09-28`. Chart engine 1.12.0, vendored at `vendor/chart-engine/`.
- Launch snapshot frozen at [`versions/2026-10-08/`](versions/2026-10-08/).
- Same day, after launch: the stack chart's x-axis tick labels stretched when embedded in a narrow column, and on window resize. The chart is now drawn at its rendered width and redrawn when that width changes. Layout only, no change to any number. Applied to the `versions/2026-10-08/` snapshot as well, as a deliberate exception to the never-edit rule: it had been live for under an hour.

## Pre-launch development

Built in the private `interactives-staging` repo and moved here at launch; this is its development log, unedited.

- Review pass on the branch (2026-08-24, two independent Codex reviews plus verification). Eight
  findings, all confirmed against the code before anything was changed:
  - **The page no longer claims a validation the artifact does not report.** `provenanceBadge` said
    "verified on 31 holdout runs" while `meta.surrogate.validation.passed` is `false` (worst holdout
    error 3.65% against the fit's own 3.0% `hard_bar_pct`). It now reads `passed`: "verified" only
    when the fit says so, "checked" otherwise, with the failing margin stated. Every figure is still
    read from the data, so a refit that clears the bar flips the wording back with no code change.
    The footer prose beside it carried two more stale claims — "the badge states the verified bound",
    and far-corner accuracy quoted as "roughly 2.6% off ... vs. under 1% across the rest of the
    space" when the data says corners max at 2.236% and the *rest* of the space is the worse half
    (median 0.742%, max 3.65%). Corrected. Those figures are hand-written in `index.html` while the
    badge beside them is generated; that asymmetry is what let them drift.
  - **The behavioral segment carries its sign instead of asserting one.** `lostToBehavior :=
    staticNew - collectedNew` goes negative under reachable states — toggling gains-at-death to
    `deemed` and touching nothing else drives every group above Quintile 2 negative, to -$45B in
    Quintile 5, under both income definitions. It is in the modelers' OWN runs, not a surrogate
    artifact: two of the 31 fixtures in `meta.surrogate.checks` report conventional revenue above
    their static totals in all three decades, and both are gains-at-death states
    (`pc_wealthr1t1000_deemed`, effectively that policy alone, runs 20% above). The mechanism is the
    standard one — taxing gains at death removes the step-up, which kills lock-in, so realizations
    rise and the base is bigger than the first-order estimate assumed.
    Five surfaces used to state the loss unconditionally (series label, subtitle, both captions, the
    identity note, the rate card's sentence). They now say one thing in one way: the segment is
    always **"Lost to behavior (not collected)"**, and the VALUE carries the direction — a negative prints its minus
    sign, a positive takes no explicit `+`. Nothing branches on the sign, so no surface can drift out
    of step with another. `model.js` is correct and was not touched.
    *Not disclosed anywhere on the page, and worth a modeler's read:* `afterTaxIncome` is
    `income - currentLawTax - staticNew`, i.e. it charges the household the FIRST-ORDER tax whatever
    is actually collected — so the after-tax income segment cannot move with behavior in either
    direction, and in the ordinary case shows households keeping less than they keep.

  - **Copy pass over both figures.** The reading key above the stack's bars is gone — the card's
    caption already explained the same three rungs, so the reader met the explanation twice before
    reaching the figure. Both captions were rebuilt as labelled lines rather than one block (the stack
    card's ran to 192 unbroken words) and then removed outright later in the same pass, along with
    the headline tile row and the "Build a package" heading — each restated something already on
    the page. Removing the stack caption briefly took the three rung names with it at narrow widths,
    where the .mtag column is dropped; `.mstack-note` now carries them and a test pins the pair. The tooltips took one canonical label per concept, shared with the legend
    through `MEASURE_LABELS` after the rate view's legend and its own card were found naming the same
    series two different ways; "Rate" came off every row, since the head, the axis title and the `%`
    all say it. A closing sentence now survives only where it says something the numbers above it do
    not: the dollar card has none (its identity is printed under the figure), the rate card keeps the
    denominator, the stack keeps its mechanism sentence.
  - **The identity note moved onto the spec's `note` field.** It was injected with
    `insertAdjacentHTML` after the mount, which put it below the whole figure instead of the engine's
    own note slot and left it out of every downloaded PNG. Same trap as the rest — the export
    re-renders from the spec. A test now fails on any `insertAdjacentHTML` in `render/distribution.js`.
  - **The stack's PNG stopped explaining the figure in wording the page no longer used.** A reading
    key was hardcoded in the export and had drifted twice: the page's own key had grown two clauses
    the export never picked up, and then the key was removed from the page entirely. The export
    already prints each rung's tag beside every row.
  - **Renames:** "Income kept after tax" → "After-tax income"; the top-decile pane → "Top decile
    breakout"; the distribution legend now runs bottom-up, the direction the stack is built. Both
    dollar views lead with the first-order estimate — total income is the figure's denominator, not
    its subject. **Note:** the pane title no longer spells out "within Quintile 5, not additional",
    so "breakout" is now the only thing telling a reader not to sum the two panes.
  - **The stack figure works below 700px again — and at 881-926px, where it was also broken.** Every
    `.mrow` child was `flex: 0 0 <fixed>`, needing 524px before the bar got a pixel, so `.mbar`
    collapsed to zero and the numbers overflowed the card. The second break was invisible to a
    viewport media query: at 881px the 280px rail is still beside the card, at 880px it drops below
    and the card jumps 483 -> 783, so card width is not monotonic in viewport width. Fixed with a
    `@container` query on `#stackCard`, not a media query — which also covers the iframed embed,
    where the shell padding differs at every width. Below 700 the chrome tightens to 358 (the rung-
    name column drops; its three names are already in the legend line); below 540 `.mstack` scrolls
    sideways, carrying the axis row in lockstep because it is a sibling of the data rows. Wide
    layouts are byte-identical to before.
  - **Rows can be reordered from the keyboard.** Reordering RECOMPUTES the attribution, so a
    pointer-only control was a functional gap, not a cosmetic one. The grip is a real `<button>` with
    an accessible name naming its policy; Arrow Up/Down move the row, keep focus on it through the
    re-render, and announce the move through a polite live region. The region lives on `<body>`, not
    inside the mount element, because `mountStack` re-renders by assigning `innerHTML` — a region in
    there would be a new node every move, and AT announces changes to an EXISTING region.
  - **The CSV download reconciles again.** `buildStackCsv` filtered its `base` rows through
    `usedHeads`, a $0.5B DISPLAY threshold, while emitting the `total` row from the unfiltered
    segment — so any base under $0.5B on every rung silently broke the decomposition. The CSV now
    unions every base key present in the row. `usedHeads` is unchanged and still correct for the
    on-screen render and the PNG legend, which is where a display threshold belongs.
  - **The PNG export draws the gridlines it labels.** The export emitted one line per row, at zero,
    while `axisSvg` printed a text label at every tick — labelled positions with nothing to read
    against. It now emits the live tick set, behind the bars, resolved to literal hex.
  - **Nine engine class names are pinned, not four.** The guard covered three; the tool also leans on
    `.figure-supertitle`/`.figure-title` for both card headers and `.figure-meta`/`.figure-meta-text`/
    `.figure-downloads`/`.figure-download-btn` for the stack's download control. Those have no look of
    their own here, so an engine repin that drops one renders them unstyled with a green suite. The
    guard matches on a boundary regex, not a substring: `.figure-titlebar` would otherwise satisfy a
    check for a dropped `.figure-title`.
  - **Engine-request docs corrected.** They are read by the ENGINE maintainer, so drift there gets
    built. Fixed: the rungs are not the same thickness (14/14/28 — the collected rung is the score);
    the gridlines are not dashed (the engine reserves dashes for reference markers); `headColor`'s
    second argument is a step, not a Style-Guide tier; the view uses a per-rung opacity ladder ON TOP
    of the palette tokens; and `results.phi` does not feed the headline tiles — nothing outside a
    test references it. The `render/shared.js` comment that was the source of the opacity error now
    says so.

- **Verified, not assumed:** the hover card survives a mixed-sign stack. The real specs were mounted
  against the vendored 1.12.0 bundle in jsdom under the negative state: the hook fired with the
  category resolved, and rect count, hatch `<pattern>` and legend order all matched the all-positive
  control. Negative segments draw below the axis at full height. The repo's invariant said an
  "all-positive stack" was what bought the card back; that was wrong and is corrected — what is
  load-bearing is `barStack.hover: 'tooltip'` plus a non-null `netMode`, which `netDisplay: 'none'`
  guarantees. Sign never reaches the hover decision.


- Card swatches key the mark again (2026-08-21, Sylva's review of the repin below): the hook's first
  version built each row's swatch from a CSS colour, which cannot express a pattern or a marker
  shape — so the hatch flattened to its ground blue and every dumbbell circle rendered as a square.
  The engine hands `hooks.tooltip` its own card in `ctx.rendered`, and 1.11.0 made those keys one
  drawing wherever they appear, so `engineSwatches` lifts them per series (in `ctx.series` order,
  skipping the Total row's empty spacer) and `tipCard` emits them verbatim. Verified through the
  shipped mount path: the dollar views key a hatch glyph plus rects, the rate view a circle, a hollow
  ring and a circle, with no CSS-box fallback anywhere. The colour path stays as the fallback for a
  card built outside a render, which is the stack figure's case.

- Re-vendored the chart engine 1.11.0 → **1.12.0** (2026-08-21) and moved the last hand-rolled
  customisation onto the engine's own surface (engine#29 and engine#30 both shipped):
  - **`barStack.hover: 'tooltip'`** buys the floating card without a net callout — the split this card
    spent two versions working around. `netDisplay` stays `'none'`, so no dot reaches the PNG export.
  - **`hooks.tooltip`** authors the card's content, so the engine keeps hit-testing, positioning and
    the band highlight. Deletes the hand-rolled hit-testers that re-derived category centres from
    `data-category` marks — one per figure — and the root-class CSS that suppressed the engine's card.
  - **`hooks.tickLabel`** does the thousands separators, replacing the `MutationObserver` that
    rewrote rendered tick text. It is guaranteed to fire identically in the PNG export, which the
    observer never could; `tickLabelHook` is a pure function, so the format is unit-tested.
  - **`chrome.valuePills: false`** turns off the numbers the hover painted on the marks, from the
    spec rather than three CSS rules against unclassed groups — including the `rect[rx]` selector that
    told a pill capsule from a band-echo rect.
  - **No override on engine internals remains** in `styles.css`. All four are now spec keys or hooks.
  - The card markup moved to a host-agnostic `.tt-card` wrapper, since the same string is now returned
    into the engine's `.tbl-tooltip` (distribution) and into the tool's `#tt` element (stack).
  - **Known cost, from the Codex review:** on a faceted stack, `barStack.hover: 'tooltip'` switches
    off cross-pane coordination (`coord = useCoord && !useTooltip` in the engine's pane path), so
    hovering a category now highlights only the pane under the pointer — measured at 1.12.0, hovered
    pane `hl-opacity=0.12`, other pane `0`. The hand-rolled card kept the echo because it left the
    engine's cursor alone. The rate view is unaffected: the dumbbell path has no such gate. Filed as
    engine#32, since the dumbbell proves the two features can coexist.
  - Two engine class-name *dependencies* remain and are now pinned by a test: the suppression of
    `.figure-titlebar`/`.figure-subtitle` inside `#distChart`, and the `.tbl-tooltip-*` classes
    `tipCard` emits so its card is styled by the vendored stylesheet in both hosts.
  - **Verified, not assumed:** both figures are two-pane coordinated small multiples, and a
    coordinated pane normally draws no card at all — which would have removed every hover card
    silently. All three real specs were mounted in jsdom with the engine's own `mockRect1to1`
    harness; the hook fires with the category resolved in each. Recorded in the repo's
    `## Hard invariants` so a repin re-checks it.

- Axis units and hover chrome (2026-08-18):
  - **`value_prefix: '$'`** on the dollar views and **`value_suffix: '%'`** on the rate view, so the
    value axes carry their units (`$0 … $20,000`, `5% … 40%`). These reach axis ticks, value labels
    and tooltips alike; a negative renders as `-$5,000`, the sign outside the prefix.
  - **Thousands separators are hand-rolled.** The engine's tick formatter is `d.toFixed()` with no
    grouping, and its `thousands` flag is a table FormatRule, not an axis option — so the spec stops
    at `$15000`, and the context view's axis reaches five figures. A pass scoped to the engine's own
    `tbl-y-tick-label` class groups the digits, re-applied through a MutationObserver because the
    engine re-renders on resize. `groupThousands` is idempotent, so the observer's own pass changes
    nothing and the cascade stops; it is scoped to the tick class rather than `<text>` because a
    category label ("Top 10%", "Quintile 5") carries digits too.
    *If the five-figure axis is the real problem, scaling the dollar views to trillions would retire
    this entirely — `$0 … $20` needs no separators, and it is how the hover card already reads.*
  - **All engine hover numbers suppressed**, not just the value pills: the coordinated cursor paints
    its own into `.tbl-coord`, text and a frosted capsule behind it. Hiding the text alone left empty
    pills, and neither the capsule nor the band-echo rect in that group carries a class — so they are
    told apart structurally: `addCoordPill` sets `rx="3"`, `addCoordRegion` sets no `rx`. `rect[rx]`
    takes the capsules and leaves the band echo across panes, which is the one piece of engine hover
    chrome worth keeping.

- The tool draws its own hover card for **every** distribution view (2026-08-18), and the two
  remaining overrides on engine internals are deleted:
  - `distTipCfg` gives the dollar views a card that leads with the group's total and lists the
    segments top-down, then states the identity they satisfy. `rateTipCfg` keeps the rate view's.
    Both raise the engine's own tooltip classes, so a reader cannot tell which figure is
    engine-rendered.
  - With nothing needing the engine's floating tooltip, the spec drops `barStack.netDisplay: 'dot'`
    for `'none'`. That dot was only ever pinned to buy the tooltip, and it **reached the PNG export**,
    which re-renders from the spec — so every downloaded image carried a net dot and a "Total" legend
    row the page did not show. Verified against 1.11.0: the figure the export builds now has neither.
    The card's Total-row reorder and the net-dot hide are both gone with it.
  - The engine's card and its `g.tbl-hl-pills` value pills are suppressed by a root class while a
    view is mounted (its tooltip is appended to `document.body`, so nothing under `#distChart` can
    reach it), set on mount and removed on teardown.
  - Filed upstream as engine#29 (hover treatment welded to the net callout) and engine#30 (a tooltip
    content hook), both assumed not to land — hence hand-rolled here. What the tool leans on is the
    engine's `data-category` tagging plus two class names, each pinned by a test.
  - Deleted `docs/superpowers/` (a plan and two design specs). Rationale for a change belongs in the
    commit that makes it.

- Re-vendored the chart engine 1.4.1 → **1.11.0** (2026-08-17) and replaced two CSS workarounds
  with the spec keys that release added:
  - **`series_patterns: { lostToBehavior: '/' }`** replaces the hand-rolled `<pattern>` in
    `index.html` and the `fill: url(…)` / legend-swatch overrides in `styles.css`. The hatch now
    reaches the marks, the legend key, the tooltip **and the PNG export** — the export re-renders
    from the spec, so a stylesheet could never reach it, and the caption's word "hatched" was
    previously wrong in a downloaded copy. Two consequences: the band colour is derived by the
    engine (three tonal tiers along the ground's own ramp — `#005794` over `blue-200`) rather than
    authored here, and the geometry is coarser than the prototype's (16px period / 7px band vs.
    7px / 3px).
  - **`barStack.segmentGap: 1`** replaces the background-coloured stroke, matching the 1px inset the
    stack figure gives its own segments. Subtractive geometry rather than paint, so a slice thinner
    than the gap survives as a hairline (verified at `height="0.5"`) instead of being swallowed;
    also carried into the export.
  - Both requests shipped upstream in PR #28 (engine#26, engine#27); both issues are closed.
  - Still worked around in CSS: the net dot and the tooltip's Total-row order — 1.11.0 keeps the
    tooltip tied to `netDisplay: dot`, so `docs/engine-requests/stacked-tooltip-without-net-dot.md`
    stays open.
  - The all-zero-stack bug was fixed in engine 1.7.0. The card's empty-state short-circuit stays as
    an editorial choice, and its comment no longer cites a live bug.
  - **The rate view is now the engine's own `chartType: dumbbell`** (`buildRateSpec`), not
    hand-rolled SVG. It was hand-rolled only because the dumbbell mark landed in engine 1.7.0,
    after the 1.4.1 pin. The repin is what exposed it: the hand-rolled legend borrowed the
    engine's `.tbl-legend-swatch.is-dot` class, and 1.11.0 retired the five swatch classes when it
    moved every key to SVG, so the legend's dots rendered as squares. `paneSvg`, `legendHtml`,
    `colorForMarker`, the view's bespoke hover card and its CSS are deleted; the view now gets the
    engine's band-highlight hover, coordinated cursor across panes, and a real PNG export. The
    hollow "ask" marker is a genuine hole in 1.11.0, so the connector stem shows through it. The
    toggles above the card stay tool chrome — the engine has no equivalent.
  - **The rate view keeps its own hover card**, now raised over the engine's marks
    (`rateTipCfg`): the pp change as the hero, the three rates as rows, and the
    denominator spelled out. The engine's dumbbell tooltip lists series values, which is
    the least of what this figure has to say. The engine exposes no tooltip-content hook
    and emits no hover event, so the category is resolved the way the engine's own
    `centersFromMarks` option does — off the x centres of its `data-category` dots, read
    live on each move, with nothing injected into its SVG (an engine-internal re-render
    would wipe an injection, and stale cached centres would mis-hit). Its own card and
    value pills are suppressed for this view by a root class, added on mount and removed
    on teardown, so the dollar views keep the engine card. The band highlight and the
    cursor coordinated across panes are the engine's and stay.
  - `tipCard` rows take `hollow`, drawing a ring instead of a filled swatch, so the card
    keys the marker it names — the same conclusion 1.11.0 reached for its own keys.
    `is-square` dropped from the swatch markup: 1.11.0 retired the swatch shape classes,
    so it styled nothing (harmless there, unlike `is-dot`, whose shape it carried).
  - **Fixed a latent bug the dumbbell exposed:** the Total-row reorder override was scoped to
    `.tbl-tooltip-row:last-child`, which reorders the last row of *any* engine tooltip — on the
    dumbbell (three series rows, no total) it would have pulled "collected" to the top with a
    divider. It targets the engine's own `.tbl-tooltip-row--total` class now. The old guard test
    asserted a `border-top` near the Total row and was passing against a different tooltip path;
    1.11.0's stacked Total row carries no top border at all.
  - Guard tests reworked: the bundle has been minified since engine 1.10.0, so identifier-based
    assertions (`NET_DOT_CLASS = "tbl-net-marker"`) can never work again — the surviving hooks are
    pinned on string and property literals only.

- Stack-view dial-in (2026-08-04, Sylva's review of the update above):
  - The collected rung is drawn at **double thickness** — it is the score, and it already carried
    the largest number. The caption no longer claims all three bars are the same weight.
  - Step deltas moved into their own aligned column. The three levels are set at three sizes, so
    inline deltas landed at a different x on every line.
  - **Palette:** payroll moved off `amber-400` (#985E00), a dark brown that read as a second russet,
    onto the lighter `amber-50/100/200` gold. Ladder steps are now named 1/2/3 per hue rather than
    by Style-Guide tier, since the tiers are no longer uniform across hues.
  - **Tax-base order is fixed** (`headsInOrder`, `shared.js`) for bar segments, legend, tooltip,
    CSV and export image. The legend previously ordered by first appearance, so dragging policies
    reshuffled it.
  - **One hover card per policy row**, replacing the per-segment cards: the row's three stages with
    their steps, then where the revenue lands by tax base with each base's mechanism named (the
    short `tag` on each copy entry, previously unused), then the full sentence for whichever channel
    moved most. Attached to the row element, so the label, tags, bar and numbers all raise it.
    Suppressed during a drag.
  - **Downloads are now Data + Image**, no SVG. The CSV (`buildStackCsv`) is the package score in
    tidy long form — `scope=total` rows give each policy's and the whole package's score at each
    stage, `scope=base` rows decompose them — carrying the budget window and each policy's dial
    settings. The PNG mirrors the screen: figure title, budget window, dial settings per row, both
    numeric columns, and a Budget Lab attribution line.
  - Values and steps that round to zero no longer print a sign or a direction arrow.
- Second dial-in pass (2026-08-04):
  - **Tooltips back to per slice.** The one-card-per-row version restated the stage levels, steps
    and dollars already printed beside the bar, and covered the figure to do it. Each segment now
    raises a compact card naming only what the bars cannot say: which base and stage the slice is,
    its value in both units, and the mechanism sentence. Rebuilt on the vendored engine's own
    tooltip idiom (`.tbl-tooltip*`, chart-engine.css) so this tool's hand-built figure and its
    engine-rendered one raise the same-looking card; the bespoke hero-number/meter/chips card is
    gone from `shared.js` and `styles.css`.
  - **Opacity on the thin bars** (0.55 / 0.75 / 1) on top of the existing tint ladder, so the score
    bar is what the eye lands on. Drained segments sit back a further notch.
  - **Export image reworked to the engine's own export layout** (`vendor/chart-engine/live.js`):
    1000px wide on a 40px margin, 22px bold navy title wrapped clear of the wordmark, muted
    subtitle, swatch legend, and the Budget Lab wordmark top right. The wordmark is vendored as a
    data URI in `render/logo.js`, byte-identical to the engine's own copy, so a downloaded stack
    chart and a downloaded distribution chart carry the same mark. Replaces the text attribution
    line.
  - **Budget-window selector moved into the controls rail**, above the policy switches, stacked
    vertically (three "First decade · 2027–36" labels don't fit side by side in a 240px rail).
    The headline card is now just the four tiles.
- Third dial-in pass (2026-08-04):
  - **Tooltip content brought back to the reference prototype's own readout** (its `barCfg`), still
    in the engine's visual idiom: the stage, base and budget window in the head; the hovered figure
    as the hero with its dollar equivalent; **this base** on all three stages (not the row totals,
    which are printed beside the bar already); the policy and its dial settings; then the mechanism
    sentence. The distribution card's dumbbell card got the same treatment from its own prototype
    counterpart (`combinedEtr`) — the pp change collected as the hero, the three rates as rows, and
    the denominator spelled out.
  - **Fixed text running off the card's right edge.** A compound row label plus a compound value
    ("+ behavioral effects · intended base" / "0.07% of GDP · $264B") in a `white-space: nowrap` row
    overflowed the 300px host. Each part of the card now carries one kind of thing — units and
    dollars live on the hero line, rows carry bare percentages — and the long strings (head, policy
    line, sentence) are the ones allowed to wrap. Host widened to the engine's own 320px, with
    `overflow-wrap` and label ellipsis as backstops. Verified by sweeping all 64 hoverable slices
    across both figures at extreme dial settings: nothing escapes its card.
- Fourth dial-in pass (2026-08-04):
  - **Card title is now the policy and the tax type** — "Annual wealth tax · Wealth" — with the dial
    settings and budget window on a smaller muted line beneath it ("rate 2% · $50M · FY2027–36").
    The repeated policy name and swatch that sat lower in the card are gone; the policy is named once.
    Same split on the distribution card's dumbbell ("Quintile 1 · Effective tax rate" over
    "2027 · cash income").
  - Since the title no longer names the stage, the stage row the pointer is on is marked as current
    (heavier label and value) — otherwise nothing in the card said which of the three you were
    reading.
  - The tax type uses the full label ("Individual income"), not the prototype's short form
    ("Ordinary income"), matching the legend and the CSV.
  - Title names the base as a base — "Annual wealth tax · Wealth base". The one compound label is
    shortened for the title only ("Estate base", not "Estate / deemed at death base"); the legend,
    export image and CSV keep the full label.
  - **Each stage row now pairs dollars with its share of GDP**, in a right-aligned lane of its own,
    so the three stages read down as two numeric columns. Verified across all 54 slices at extreme
    dial settings: no label truncation, nothing overflowing the 320px card.
- Figure headers synced (2026-08-04):
  - Both cards now head with the vendored engine's own header classes —
    `.figure-supertitle` eyebrow ("Distribution" / "How policies stack"), `.figure-title`,
    `.figure-subtitle` — replacing this tool's parallel `.card-step`/`.card-title` pair. Neither
    figure is an engine chart end to end (one is an engine chart under a custom header, the other is
    hand-built SVG), but the reader can't tell that from the heading.
  - Order in both: eyebrow → title → subtitle → selectors/legend → chart → downloads → caption. The
    stack view's legend and reading key moved from below the plot to above it, and its download
    control from the legend row to below the plot, matching where the engine puts each.
  - **The engine's own titlebar, subtitle and wordmark are suppressed inside the distribution card.**
    They were rendering a second title under ours, and the page header already carries the wordmark.
    Suppressed in CSS rather than by blanking `spec.title`: the download image is built from the
    spec, so a blank title there would strip the caption from the exported PNG too. Confirmed the
    engine's exported image still carries its title, subtitle, legend and logo.
  - The distribution card keeps its stable name, "Income and taxes by income group", as in the
    reference prototype — the card holds three views behind a toggle, so the heading names the CARD
    and the current view's description is the subtitle's job. (`VIEW_META`'s per-view titles still
    caption the engine chart itself, and so the downloaded image, where one specific view is what was
    exported.) The "Effective rate" view gained a subtitle, having had none.
  - Tooltip hero caret sized to the figure it qualifies (15px beside the 18px number); an 11px caret
    read as a speck.
  - A hero figure that rounds to zero now gets **no caret**, rather than a red ▾ over a printed
    "0.00%" — the rule the step arrows already followed, factored into `dirAtPrecision` and applied to
    both figures' cards.
- Distribution hover reworked (2026-08-04):
  - **The floating tooltip is now pinned on in both panes**, via `barStack.netDisplay: 'dot'` — the
    engine's switch for "tooltip, not per-segment value pills". Left on the default `auto` it resolved
    to the tooltip only while some group's lost-to-behavior happened to be negative, and flipped to
    pills when it wasn't, so the hover treatment changed with the package the reader had built.
  - **Tooltip and legend now read top-down, matching the stack.** `series_order` (which drives both)
    takes the reverse of the visual order, and `barStack.stackOrder` pins the picture, so kept income
    stays at the bottom of the bar while the readout starts at the top of it.
  - **Total impact leads the tooltip**, as in the reference prototype, instead of being appended last.
  - **The net dot and its "Total" legend entry are hidden.**
  - The last two are CSS overrides on engine internals, because the engine ties the tooltip to the dot
    (`useTooltip = showTotalDot === true`) and always appends the Total row last. Both are written up
    in `docs/engine-requests/stacked-tooltip-without-net-dot.md`, and `test/render.test.mjs` now greps
    the vendored bundle for the hooks they depend on, so a re-vendor that renames or reorders them
    fails the suite instead of silently reverting the design.
  - **Known gap:** the engine builds its PNG export from the spec, not the DOM, so the *downloaded*
    distribution image still carries the net dot and the Total legend entry. Closing that needs one of
    the three routes in the engine note; it is not fixable from this tool's CSS.

- Prototype update (2026-08-03): brought the port up to the author's revised reference build. See
  `docs/superpowers/specs/2026-08-03-taxes-at-the-top-prototype-update-design.md`.
  - **Data:** vintage `top_tax_dials_30y_v6` (was `v3`), 225 scenarios, 31 holdout checks (was 25).
  - **Model (`model.js`):** the `deemed` lever gained a gains-at-death **exclusion** dial
    (`interp: ladder_x` — a position axis crossed with a continuous $0–$5M axis). `evalGrid` now
    locates a discrete first axis by index rather than numerically and defaults omitted params to
    their `off` value; new `ladderRatio` and `exemInterp` scale and interpolate the measured
    interaction vectors, mirroring `fit_surrogate._ladder_ratio` / `_exem_interp`. The corporate
    dial's range widened to 21–35% with anchors at 24.5 / 28 / 31.5 / 35 (data-only).
  - **Stack view:** three rungs per row instead of two — first-order tax change, plus mechanical
    tax-base interactions, plus behavioral effects (the revenue collected) — reading the surrogate's
    new `mt`/`my`/`mh` quantities. Share of the selected decade's GDP is now the primary unit, with
    dollars beside it and a signed step against the rung above. Rungs are distinguished by
    Style-Guide tint tier (-200/-300/-400) within each tax base's hue, not by opacity as the
    prototype does. New `render/stack-copy.js` carries the author's per-policy × per-base mechanism
    explanations, shown in the hover card for the rung being read.
  - **Removed:** the revenue-frontier scatter (`render/frontier.js`, its section, its metric toggle,
    and its engine-request note), following the prototype's editorial call.
  - **Vocabulary:** "static estimate" is now "first-order estimate" page-wide, so one word names one
    quantity across the stack, the distribution card and the headline tiles.
  - **Open item — surrogate validation:** the v6 fit reports `validation.passed: false`. Its worst
    holdout error is 3.65% against its own 3.0% hard bar (quiz median 0.742%), and the page's
    provenance badge accordingly states ±3.7 / 4.5 / 4.9% by decade. The tool is built and tested
    against the data as shipped; whether that bound is publishable is a question for the modelers.


- Initial port of the top-tax simulator (chart-engine v1.4.1). The surrogate model
  (`model.js`, a pure transcription of the reference app's evaluator) is validated against 25
  held-out checks (17 quiz + 8 corner points; see `test/model.test.mjs` and
  `docs/model-data-handoff.md`). Shell, 8-lever controls, budget-window and income-definition
  selectors, and all three views are built: distribution via the engine's stacked bar, "how
  policies stack" and "revenue frontier" as hand-rolled SVG. The distribution card's engine
  reproduction diverges from the source mockup's dumbbell/dollar treatment — see
  `docs/engine-requests/distribution-measure-simplification.md` — and a faithful rebuild of
  that view is deferred to a future dial-in phase, not this initial port.
- Dial-in: rebuilt the distribution card (`render/distribution.js`) on `model.computeDistribution`
  (Task 9) instead of the per-tax-head ETR stack — dollar composition for "in context"/"new taxes"
  (engine `stacked` bar, faceted main/top-decile via `columns.facet` + `small_multiples`) and a
  custom-SVG dumbbell for "effective rate" (current-law/static/collected dots per group, two
  facet panes sharing scale/legend), per `docs/engine-requests/dumbbell-chart-type.md`. The
  measure toggle's third position is now `data-v="rate"` (was `etr`).
- Handoff contract confirmed: the modelers delivered the real `atlas2_data.json` plus its data
  guide (`README.md`), replacing the previously inferred contract in
  `docs/model-data-handoff.md`. Schema v3 is stable; `atlas2_data.json` is fit from run vintage
  `top_tax_dials_30y_v3` by `fit_surrogate.py` and validated by `check_atlas2_render.js`. Our
  `data/data.json` is confirmed value-identical to the handoff artifact (not byte-identical — our
  copy's Task-2 `JSON.parse`→`JSON.stringify` extraction reformats some numeric literals, e.g.
  `37` vs `37.0`, with no semantic difference); syncing against the real artifact will therefore
  produce a large but no-op textual diff, reformatting to match — expected, and the intended end
  state. `scripts/sync-model-data.py` now really syncs: validates the confirmed top-level
  contract and copies the artifact to `data/data.json`, rather than raising `NotImplementedError`.
