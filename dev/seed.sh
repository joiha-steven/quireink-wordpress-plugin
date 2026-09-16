#!/usr/bin/env bash
# One post carrying every gesture, every ink, and both stroke lengths.
#
# Hand-written rather than fetched: this is a FIXTURE for looking at, so it has to contain the
# awkward cases on purpose -- a mark that wraps a line, two marks touching, a mark inside a
# heading, a mark inside a link -- rather than whatever a real post happened to have.
#
# The data-pen values are what assets/js/seed.js computes for these exact strings. They are
# not decorative: `check:contract` holds that function to the engine's answers, so a stroke
# that looks wrong here is a real disagreement and not a typo.
set -euo pipefail
cd "$(dirname "$0")"

wp() { docker compose exec -T cli wp --path=/var/www/html "$@"; }

TITLE="The pen, on any theme"
EXISTING=$(wp post list --post_type=post --title="$TITLE" --field=ID 2>/dev/null | head -1)

CONTENT=$(cat seed/marked-post.html)

if [ -n "$EXISTING" ]; then
  echo "    updating post $EXISTING"
  printf '%s' "$CONTENT" | wp post update "$EXISTING" - --post_title="$TITLE"
else
  printf '%s' "$CONTENT" | wp post create - --post_type=post --post_status=publish --post_title="$TITLE"
fi
