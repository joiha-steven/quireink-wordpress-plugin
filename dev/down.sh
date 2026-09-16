#!/usr/bin/env bash
# Throw the viewer away, database included.
#
# `-v` on purpose. Nothing in this stack is worth keeping, and a half-migrated database is the
# one way it could lie to you about what the plugin does on a clean install.
set -euo pipefail
cd "$(dirname "$0")"
docker compose down -v
