## What and why

## Testing
<!-- What was run and what it showed: CI checks, the tool's smoke marker, the PR preview link
     (/pr-preview/pr-N/), screenshots for anything visual. Paste results, not "works". -->

## Risk
<!-- Low: a new tool, or a change inside one tool's directory.
     High: anything under embed/v1/ (frozen; additions must be opt-in by snippet attribute), an edit
     to a published tools/<slug>/versions/<date>/ snapshot (never allowed), a re-vendored engine or model,
     CNAME, CI or publish-exclude. -->

## How to revert
<!-- Usually: revert this PR. gh-pages keeps files removed from main (keep_files), so a revert that
     deletes files needs them pruned from gh-pages by hand. Published URLs and snapshots must keep
     working after the revert. -->
