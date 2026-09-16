#!/usr/bin/env bash
# Bring the viewer up and put a marked post in it.
#
#   dev/up.sh            plugin on Twenty Twenty-Five  -- INVARIANT 1, the case nobody looks at
#   dev/up.sh --paired   plugin on the Quire Ink theme -- the pairing
#
# Idempotent: run it twice and the second run notices WordPress is installed and only re-seeds.
set -euo pipefail

cd "$(dirname "$0")"
URL="http://localhost:8098"
PAIRED=0
[ "${1:-}" = "--paired" ] && PAIRED=1

echo "==> containers"
docker compose up -d --wait

wp() { docker compose exec -T cli wp --path=/var/www/html "$@"; }

# The cli image races the web image: the volume is shared, but wp-config.php is written by the
# wordpress container's entrypoint and cli can start first.
echo "==> waiting for wp-config.php"
for _ in $(seq 1 60); do
  docker compose exec -T cli test -f /var/www/html/wp-config.php && break
  sleep 1
done

if wp core is-installed 2>/dev/null; then
  echo "==> already installed"
else
  echo "==> installing"
  wp core install --url="$URL" --title="Quire Ink Pen - local" \
    --admin_user=admin --admin_password=admin --admin_email=dev@example.com --skip-email
fi

echo "==> plugin"
wp plugin activate quire-ink-pen

if [ "$PAIRED" = "1" ]; then
  echo "==> theme: quire-ink (paired)"
  wp theme activate quire-ink
else
  echo "==> theme: leaving the default in place (invariant 1)"
  wp theme activate "$(wp theme list --status=active --field=name 2>/dev/null | head -1 | grep -qi quire && echo twentytwentyfive || wp theme list --field=name | grep '^twentytwenty' | tail -1)" >/dev/null 2>&1 || true
  wp theme list --field=name --status=active
fi

echo "==> settings"
wp rewrite structure '/%postname%/' --hard
wp option update date_format "j F, Y"

echo "==> seed"
./seed.sh

echo
echo "    $URL           the site"
echo "    $URL/wp-admin  admin / admin"
[ "$PAIRED" = "1" ] || echo "    (standalone. \`dev/up.sh --paired\` for the theme)"
