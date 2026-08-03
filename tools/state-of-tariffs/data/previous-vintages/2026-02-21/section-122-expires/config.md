---
figureType: chart
spec:
  chartType: bar
  title: "Household Cost of Tariffs by Income Decile"
  subtitle: "By household income decile."
  source: "GTAP v7, Census, BLS, BEA, The Budget Lab analysis."
  scenario: "Section 122 Expires"
---

**Household Cost of Tariffs by Income Decile**

By household income decile.

_Scenario: Section 122 Expires_

_Notes: Two corrections. (1) Both the percentage-share rows (decile 1-10) and the dollar-value rows (decile 1-10) were labeled `basis` = "All 2025 Tariffs" -- a leftover placeholder matching neither "% of after-tax income" nor "2025 dollars" in `pane_order`, so the second pane never rendered. Relabeled the two blocks correctly, verified against the article text (e.g. decile 1/10 = 1.1%/0.4% and $430/$1,800 under this scenario). (2) Added `series_colors` (blue for "% of after-tax income", amber for "2025 dollars")._

_Source: GTAP v7, Census, BLS, BEA, The Budget Lab analysis._
