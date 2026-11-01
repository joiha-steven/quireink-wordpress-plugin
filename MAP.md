# Map — a symptom, and the files to open first

Not loaded automatically; `CLAUDE.md` points here. Open it when you do not know where a change belongs.

| Symptom / area | Read these first |
|---|---|
| A stroke is the wrong colour, weight or position | `tools/extract.ts`, then the engine's `src/pen/*.ts` — never edit the generated CSS |
| The toolbar buttons are missing | `quire-ink-pen/assets/js/formats.js`, then `inc/editor.php` |
| Marks look right in the editor, wrong on the page | `inc/enqueue.php` — the front end enqueues conditionally |
| Marks look right on the page, wrong in the editor | `inc/editor.php` — the editor takes the same sheet unconditionally |
| A mark loses its `data-pen` on save | `docs/gaps.md`, `wp_kses` — a contributor's HTML is filtered |
| The same words got a different stroke | `assets/js/seed.js` — the hash is of the GESTURE'S SOURCE, `==x==` and not `x`; `check:contract` probes the 28-character boundary |
| Nothing is styled although the markup is right | the `pen` class on `<body>`; `inc/enqueue.php` adds it |
| The toolbar is unstyled, or a bar will not hide | `tools/editor-css.ts` — the subset cut from the engine's Tailwind build |
| A bar's keys collapse to a glyph | `assets/css/screen.css` — the furniture preflight must weigh NOTHING (`:where()`), or it beats the `px-2` it sits under |
| The column looks ragged | run `tools/screen-audit.js`; it names the edge and the gap |
| The writing screen is blank, or throws | `quire-ink-pen/assets/js/app.js`, then `inc/compose.php` |
| The block editor opened when Quire Ink was asked for | `inc/compose.php` `quireink_pen_composing` — `?quireink=1`, or a Markdown source already stored |
| The writing is in wp-admin's sans, not a serif | `assets/css/screen.css` — the inheritance reset; then `tools/extract.ts`, which emits the reading tokens |
| The whole admin page slid under the menu | `tools/extract.ts` `SURFACE_SCOPE` — an `:is()` carrying an id lends its specificity to Tailwind's `*` preflight |
| Markdown lost a backslash between saves | `inc/store.php` — `update_post_meta` unslashes what it is given; `check:escape` pins it |
| Content opened in the wrong shape | `tools/engine-entry.ts` `htmlToNodes` — it returns CHILDREN, never a `doc` |
| A save kept the old text | `assets/js/app.js` `sync()` — `#content` is what WordPress saves, and it is filled from the document, not typed into |
| The post reopened with someone else's edit | `inc/store.php` — the hash says `foreign`, so the screen opens from `post_content`, which is the newer text |
| The editor refuses content with no error | `bun run check:deps` — two copies of ProseMirror |
| The local WordPress | `dev/docker-compose.yml`, `dev/up.sh` |
