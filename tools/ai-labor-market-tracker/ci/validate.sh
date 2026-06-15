#!/usr/bin/env bash
# Per-tool validation hook, auto-discovered by .github/workflows/pr-validation.yml.
#
# The AI Labor Market Tracker's data layer is generated: data/manifest.json is
# built by scripts/build-manifest.py from data/tracker.yaml + each figure's
# config.md. This hook rebuilds it and fails if the committed manifest is stale
# or any validation error (schema, CSV format, cross-reference) fires — the
# CI mirror of the local .pre-commit-config.yaml hook.
#
# Convention: a tool opts into custom CI by adding tools/<slug>/ci/validate.sh.
# The script runs from the tool's own directory and installs its own deps.
set -euo pipefail

cd "$(dirname "$0")/.."   # tool root: tools/ai-labor-market-tracker/

echo "Installing manifest build deps…"
pip install --quiet pyyaml markdown jsonschema

echo "Rebuilding manifest…"
python scripts/build-manifest.py

if ! git diff --quiet -- data/manifest.json; then
  echo "::error::data/manifest.json is stale. Run scripts/build-manifest.py and commit the result."
  git --no-pager diff -- data/manifest.json | head -200
  exit 1
fi

echo "Manifest is up to date."
