#!/usr/bin/env bash
# BLSMM tool validation, auto-discovered by .github/workflows/ci.yml.
#   1. Asset cache-bust stamps are current (scripts/stamp-assets.mjs).
#   2. The vendored model is byte-identical to Budget-Lab-Small-Macro-Model at
#      the ref pinned in vendor/blsmm-model/VERSION. That repo's CI holds the JS
#      model to the R model, so a hand edit here would publish numbers no one
#      has checked against R.
#   3. Node tests for the tool's own logic.
set -euo pipefail
cd "$(dirname "$0")/.."   # tool root: tools/blsmm/

node scripts/stamp-assets.mjs --check

ref=$(tr -d '[:space:]' < vendor/blsmm-model/VERSION)
if [ -z "$ref" ]; then
  echo "::error::tools/blsmm/vendor/blsmm-model/VERSION is empty." >&2
  exit 1
fi
base="https://raw.githubusercontent.com/Budget-Lab-Yale/Budget-Lab-Small-Macro-Model/${ref}/js"
for f in blsmm-model.js model-data.json; do
  if ! upstream=$(curl -fsSL --retry 3 "$base/$f"); then
    echo "::error::Could not fetch $f at Budget-Lab-Small-Macro-Model@$ref. Is that ref pushed?" >&2
    exit 1
  fi
  if [ "$(printf '%s' "$upstream" | tr -d '\r')" != "$(tr -d '\r' < "vendor/blsmm-model/$f")" ]; then
    echo "::error::vendor/blsmm-model/$f differs from Budget-Lab-Small-Macro-Model@$ref/js/$f." >&2
    echo "Re-copy it from that ref (or update VERSION to the ref it came from); never edit it here." >&2
    exit 1
  fi
done
echo "blsmm: vendored model matches Budget-Lab-Small-Macro-Model@$ref"

node --test ci/*.test.mjs
