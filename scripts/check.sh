#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
cat src/0[2-6]*.js | node --check /dev/stdin

echo "JavaScript syntax OK"
