# Quire Ink Pen for WordPress

The [Quire Ink](https://quireink.com) pen as a WordPress plugin. `quire-ink-pen/` is the
plugin; everything else exists to generate it, run it, or explain it.

Three gestures a WordPress author cannot otherwise make: a highlight, an underline and a ring,
drawn as hand strokes rather than rectangles. 80 stroke variants, dealt by hashing the marked
words, so no two marks on a page are the same shape.

**GNU GPL v2 or later** ([ADR 0005](./docs/decisions/0005-gpl-v2-or-later.md)) — what
wordpress.org requires, and the reason the ink sheet is generated rather than reasoned about:
this copy of the pen is GPL, the blog engine is not.

## It works alone. So does the theme.

> Neither this plugin nor [the theme](https://github.com/joiha-steven/quireink-wordpress-theme)
> requires the other. Together they are better.

That decision is invisible here, because this machine has both. It is what a user hits on day
one, so it is guarded, not remembered: [`docs/pair.md`](./docs/pair.md) and `check:standalone`.

## Verify

```
bun run check:all
```

Nine static guards — `standalone` · `contract` · `pair` · `filesize` · `escape` · `prefix` · `generated` · `headers` · `docs`. Seconds.
`check:generated` skips with a warning when there is no Quire Ink checkout beside this one.

`check:all` proves the seams hold. It cannot tell you the stroke sits a line too high, that
the highlight is behind the text instead of under it, or that the toolbar button is invisible
in the editor's dark scheme. **Open the editor and look.**

```
dev/up.sh        # WordPress on http://localhost:8098, admin / admin
tools/shot.sh <url> .tmp/shots/<name>.png
```

`shot.sh` runs a fresh headless Chrome, so a scheme you switched in YOUR browser is not in its.
Set `quireink_default_scheme` as a theme mod and put it back, or the file is named for a state
it does not contain: `docs/shots/paired-dark.png` was captured light the first time.

Port **8098**, not 8099: the theme's dev stack owns 8099 and both are often up at once, which
is the only way to see the pairing work.

## Read first

| Doing | Read |
|---|---|
| Anything at all | [`docs/invariants.md`](./docs/invariants.md) — the 7 load-bearing rules |
| Finding your way | [`docs/README.md`](./docs/README.md) — the index |
| Anything that touches the theme, or could | [`docs/pair.md`](./docs/pair.md) — generated; edit the master |
| Touching the ink, a colour, a stroke | [`docs/conventions/extract.md`](./docs/conventions/extract.md) |
| Touching PHP | [`docs/conventions/php.md`](./docs/conventions/php.md) |
| Touching the editor JS | [`docs/conventions/editor.md`](./docs/conventions/editor.md) |
| Going against a past decision | [`docs/decisions/`](./docs/decisions/README.md) — the in-force index first |
| Wondering what does not survive the trip | [`docs/gaps.md`](./docs/gaps.md) |

## Debug router — a symptom, and the files to open first

| Symptom / area | Read these first |
|---|---|
| A stroke is the wrong colour, weight or position | `tools/extract.ts`, then the engine's `src/pen/*.ts` — never edit the generated CSS |
| The toolbar buttons are missing | `quire-ink-pen/assets/js/formats.js`, then `inc/editor.php` |
| Marks look right in the editor, wrong on the page | `inc/enqueue.php` — the front end enqueues conditionally |
| Marks look right on the page, wrong in the editor | `inc/editor.php` — the editor takes the same sheet unconditionally |
| A mark loses its `data-pen` on save | `docs/gaps.md`, `wp_kses` — a contributor's HTML is filtered |
| The same words got a different stroke | `assets/js/seed.js` — the hash is the engine's, published in its `docs/pen.md` |
| Nothing is styled although the markup is right | the `pen` class on `<body>`; `inc/enqueue.php` adds it |
| The local WordPress | `dev/docker-compose.yml`, `dev/up.sh` |

## Hard rules — each one is a bug that has already shipped in a sibling repository

- **Quire Ink is READ ONLY.** `../quireink` is a released product with production instances.
  Read it with ABSOLUTE paths and never `cd` into it: the shell keeps its working directory
  between commands, so a later write lands in the wrong repository. Six files went in that way
  once, and the symptom lies — `php -l` passes on the file it just wrote, `ls` from here says
  the file does not exist, and you go looking for a disk problem. Copying OUT is the job.
- **A note upstream saying "this belongs here" is a NOTE, not an assignment.** Report it.
- **Never hand-copy a value out of the blog engine.** The ink comes through `tools/extract.ts`
  or it does not come.
- **Never require the theme, and never name it in a rule.** Every `var(--…)` carries a
  fallback. `check:standalone` refuses the rest.
- **The markup is not ours.** `<mark data-pen>`, `<u data-pen>`, `<mark data-form="o">` belong
  to the engine's `docs/pen.md` (ADR 0048). Emit exactly that; inventing an attribute means one
  stylesheet stops drawing both surfaces.
- **One implementation of the seed hash.** It decides which of 80 strokes a mark gets, and the
  engine's own scar tissue is about exactly this: four parsers once spelled one regex out
  separately and two drifted within the hour.
- **Everything printed is escaped** at the point of printing. `phpcs:ignore` needs a reason.
- **Everything global is prefixed `quireink_`.** A plugin shares a namespace with every other
  plugin and the theme.
- **Never quote the owner** — not in code, comments, docs, ADRs or commit messages. State the
  fact or the measurement.
- **Build the authoring side first, or ship neither.** Markup nobody can author in the block
  editor is not shipped. Inherited from the theme's ADR 0003 and it is why this plugin exists.

## Danger zones

- **`quire-ink-pen/assets/css/quireink-pen.css` is GENERATED.** Editing it is pointless: the
  next extract overwrites it and `check:generated` is red until it does.
- **The compressed size is the whole reason this is possible.** 534,237 B raw, **34,533 B
  gzip**, budget 44,000. `check:filesize` gzips the sheet on every run, because a raw byte
  comparison would have passed on the day a change made the sheet stop compressing.
- **`dev/` throws its database away.** `dev/down.sh` is `docker compose down -v`.
- **`localhost:8098`, never `127.0.0.1:8098`.** WordPress writes asset URLs against its
  `siteurl`; the same page on `127.0.0.1` loses every module script and font to CORS, silently,
  and the type falls back to something close enough that nobody looks twice.
- **All scratch goes under `.tmp/`** — one gitignored root, never a new one.
