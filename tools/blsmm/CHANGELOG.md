# Budget Lab Small Macro Model — changelog

Entries are added at release. Snapshots: `node tools/blsmm/scripts/make-snapshot.mjs [date]`.

## Unreleased

- Launch. Replaces the Shiny app on Posit Connect with a static tool: the model (BLSMM v1.8) runs in
  the browser from the JavaScript port in `vendor/blsmm-model/`, so results update as inputs change
  and there is no Run button. Inputs run at full precision, so presets match the R scenario files
  (the Shiny app rounded every input to 0.01). The model includes the psi/RG_base corrections
  (model PR #10), which move the AI preset's final-year debt from -4.92 to -5.61 pp of GDP. Same inputs, presets, charts, tables and texts as the Shiny app;
  export is one zip of CSV files (the old CSV file plus the old Excel workbook's sheets); new
  shareable scenario links (embedded with `data-deep-link`, they open the article rather than the
  standalone tool). Figures: Levels/Deviations and a per-figure checklist in the sidebar; baseline always
  dashed, and the legend always shown, including at baseline (where only the baseline is drawn);
  two-variable legends one variable per row; chart cards the same height; hovering a chart marks
  the same year on the others; PNG downloads carry the source line and a scenario note (preset, or
  each changed input with its size and years). Version 2.0. Headline numbers drawn as open stats;
  "?" notes open on hover. Two chart columns at every laptop embed width (the Shiny app showed one),
  three on a wide standalone screen. Controls: Custom scenario, the presets as one divided pill
  (a line under them describes the active scenario, replacing the presets' "?" notes) and Reset;
  then Show and Download. They sit in a sidebar beside the charts, become a two-row toolbar above
  them below about 1100px, and a phone toolbar with a full-width Figures panel.
  Launch snapshot at `versions/<launch date>/`.
