#!/usr/bin/env bash
# Run the tool's node:test suite: the surrogate-fidelity checks against data/data.json, the stack
# and distribution rendering rules, and the pins on vendored chart-engine internals.
set -euo pipefail
cd "$(dirname "$0")/.."
node --test test/*.test.mjs
