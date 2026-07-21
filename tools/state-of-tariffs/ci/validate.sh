#!/usr/bin/env bash
# Fail if index.html's asset cache-bust stamp is stale — i.e. someone changed a runtime JS/CSS file
# without re-running build-manifest.py (which re-stamps ?v=<content-hash> on app.js/styles.css).
# Keeps deploys serving fresh code. Hash is over LF-normalized bytes to match build-manifest.py
# regardless of the checkout's line endings.
set -euo pipefail
cd "$(dirname "$0")/.."

stamp=$(cat app.js render.js download-all.js zip-store.js styles.css | tr -d '\r' | sha256sum | cut -c1-10)

if ! grep -q "app\.js?v=$stamp" index.html; then
  echo "::error::State of Tariffs asset stamp is stale (expected app.js?v=$stamp)." >&2
  echo "Run: python scripts/build-manifest.py  and commit the updated index.html." >&2
  exit 1
fi
echo "state-of-tariffs: asset stamp OK (?v=$stamp)"
