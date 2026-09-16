#!/usr/bin/env bash
# Screenshot a page with headless Chrome.
#
# Two things this has to work around, both learned the hard way:
#
#   * Chrome 136+ IGNORES the automation flags when they would touch the real profile, so
#     every run gets a throwaway --user-data-dir. Without it the browser silently starts with
#     the developer's own profile and extensions, and the screenshot is of a page nobody else
#     will ever see.
#   * `--screenshot` writes the file and then sometimes does not exit. The watchdog below
#     waits for the file rather than for the process, which is the thing actually wanted.
#     macOS has no `timeout(1)`, so this is spelled out rather than delegated.
#   * A PAGE WHOSE ASSETS LIVE ON ANOTHER ORIGIN renders without them, and says nothing. The
#     local WordPress has `siteurl` of http://localhost:8098, so it writes its script and font
#     URLs against `localhost`. Ask for the same page on `127.0.0.1` and every module script
#     and every font is a cross-origin fetch that CORS refuses: no JavaScript at all, and the
#     type falls back. `getComputedStyle` still answers "Literata" on both, because a computed
#     font-family is what was asked for and not what arrived - the honest measurement is
#     `document.fonts`, which reported `Literata:loaded` on localhost and `Literata:error` on
#     127.0.0.1. Weeks of screenshots in this repository were taken that way and the fallback
#     is close enough to the real face that nobody looked twice. Below, the requested origin is
#     compared against the origins the page's own scripts and stylesheets point at.
#   * headless=new opens a real window, and the window has an OS MINIMUM WIDTH. Ask for 390
#     and Chrome lays the page out at 500 and hands back the left 390 pixels of it, with no
#     warning and a file of exactly the size requested. Measured: 480, 460, 420 and 390 all
#     reproduce the 500px render line for line, with the header icons sliced by the right
#     edge; 500 and 600 wrap differently from each other and from all of them. Every phone
#     screenshot taken with this script before that was measured was a desktop page cropped,
#     which is worse than no screenshot - it invents overflow that is not there. Below the
#     floor this now REFUSES. Phone widths are checked in the browser pane, which emulates
#     the device rather than shrinking a window.
#
# Usage: shot.sh <url> <out.png> [width] [height]
set -euo pipefail

URL="$1"
OUT="$2"
W="${3:-1440}"
H="${4:-2400}"
WAIT="${SHOT_WAIT:-60}"
# 2 by default, because a screenshot for reading is a screenshot at retina density. The theme
# screenshot is the exception: WordPress.org wants a file that is EXACTLY 1200x900, so that
# one is taken at 1.
SCALE="${SHOT_SCALE:-2}"

# Chrome will not open a window narrower than this, and says nothing when it declines to.
FLOOR=500
if [ "$W" -lt "$FLOOR" ]; then
  echo "shot.sh: refusing ${W}px." >&2
  echo "  Chrome's window floor is ${FLOOR}px: it would render the page at ${FLOOR} and hand back" >&2
  echo "  the left ${W} pixels, which looks exactly like a theme that overflows." >&2
  echo "  For a phone, use the browser pane's mobile emulation instead." >&2
  exit 2
fi

# The page has to point its own assets at the origin we asked for, or the render is a page
# with its scripts and fonts missing. SHOT_ALLOW_CROSS_ORIGIN=1 for a site that legitimately
# serves assets from elsewhere.
if [ "${SHOT_ALLOW_CROSS_ORIGIN:-0}" != "1" ] && printf '%s' "$URL" | grep -qE '^https?://'; then
  ORIGIN=$(printf '%s' "$URL" | sed -E 's#^(https?://[^/]+).*#\1#')
  FOREIGN=$(curl -sL --max-time 20 "$URL" 2>/dev/null \
    | grep -oE '(src|href)="https?://[^"]+\.(js|css)[^"]*"' \
    | sed -E 's#^[a-z]+="(https?://[^/]+).*#\1#' | sort -u | grep -vxF "$ORIGIN" || true)
  if [ -n "$FOREIGN" ]; then
    echo "shot.sh: $URL serves its scripts and stylesheets from another origin:" >&2
    printf '  %s\n' $FOREIGN >&2
    echo "  A headless render drops all of them to CORS and looks almost right: no JavaScript," >&2
    echo "  and the type falls back to a metric substitute. Ask for the origin the page uses," >&2
    echo "  or set SHOT_ALLOW_CROSS_ORIGIN=1 if the other origin is meant to be there." >&2
    exit 3
  fi
fi

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PROFILE="$(mktemp -d)"

mkdir -p "$(dirname "$OUT")"
rm -f "$OUT"

"$CHROME" \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --hide-scrollbars \
  --force-device-scale-factor="$SCALE" \
  --user-data-dir="$PROFILE" \
  --window-size="${W},${H}" \
  --virtual-time-budget=20000 \
  --screenshot="$OUT" \
  "$URL" >/dev/null 2>&1 &
PID=$!

for _ in $(seq 1 "$WAIT"); do
  # Two ticks with the same size before believing it: the file appears the moment Chrome
  # opens it, and a screenshot read half-written is a corrupt PNG that looks like a
  # rendering bug.
  if [ -s "$OUT" ]; then
    a=$(wc -c < "$OUT")
    sleep 1
    b=$(wc -c < "$OUT")
    [ "$a" = "$b" ] && break
  fi
  kill -0 "$PID" 2>/dev/null || break
  sleep 1
done

kill "$PID" 2>/dev/null || true
wait "$PID" 2>/dev/null || true
rm -rf "$PROFILE"

test -s "$OUT" || { echo "no screenshot written: $OUT" >&2; exit 1; }
printf '%s  %s\n' "$(du -h "$OUT" | cut -f1)" "$OUT"
