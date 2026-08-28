#!/usr/bin/env bash
# Fail if index.html's asset cache-bust stamp is stale — i.e. someone changed a runtime JS/CSS file
# without re-running build-manifest.py (which re-stamps ?v=<content-hash> on app.js/styles.css).
# Keeps deploys serving fresh code. Hash is over LF-normalized bytes to match build-manifest.py
# regardless of the checkout's line endings.
set -euo pipefail
cd "$(dirname "$0")/.."

# Shape check first. An empty/truncated index.html serves a blank page, and it would otherwise trip
# the stamp check below with a misleading "stale stamp" error pointing at build-manifest.py.
if [ ! -s index.html ]; then
  echo "::error::State of Tariffs index.html is empty — the tool would render blank." >&2
  echo "Restore it: git checkout <last-good-ref> -- tools/state-of-tariffs/index.html" >&2
  exit 1
fi
if ! grep -q 'src="app\.js' index.html || ! grep -q 'href="styles\.css' index.html; then
  echo "::error::State of Tariffs index.html is missing its app.js/styles.css references." >&2
  exit 1
fi

stamp=$(cat app.js render.js download-all.js zip-store.js styles.css | tr -d '\r' | sha256sum | cut -c1-10)

if ! grep -q "app\.js?v=$stamp" index.html; then
  echo "::error::State of Tariffs asset stamp is stale (expected app.js?v=$stamp)." >&2
  echo "Run: python scripts/build-manifest.py  and commit the updated index.html." >&2
  exit 1
fi
echo "state-of-tariffs: asset stamp OK (?v=$stamp)"
