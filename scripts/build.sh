#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
{
  cat src/01-shell-and-styles.html
  cat src/02-core.js src/03-home-search-paywall.js src/04-checkout-report-account.js src/05-content-and-legal.js src/06-admin-and-boot.js
  printf '\n</script>\n</body>\n</html>\n'
} > index.html

echo "Built index.html"
