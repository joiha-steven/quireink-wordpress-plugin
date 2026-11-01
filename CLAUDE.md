# Quire Ink Pen for WordPress

The [Quire Ink](https://quireink.com) pen (highlight, underline, ring as hand strokes) as a WordPress plugin.
`quire-ink-pen/` is the plugin; everything else exists to generate it, run it, or explain it.
Two surfaces: three Gutenberg inline formats, and Quire Ink's own editor inside WordPress's post screen (it fills
only `<textarea name="content">`; `post.php` does the rest — ADR 0008, 0009).

**GNU GPL v2 or later** ([ADR 0005](./docs/decisions/0005-gpl-v2-or-later.md)) — what wordpress.org requires, and
the reason the ink sheet is generated rather than reasoned about: this copy of the pen is GPL, the blog engine is not.

**Neither this plugin nor [the theme](https://github.com/joiha-steven/quireink-wordpress-theme) requires the other.**
Guarded, not remembered: [`docs/pair.md`](./docs/pair.md) and `check:standalone`.

## Verify

```
bun run check:all     # ten static guards, seconds; check:generated skips with a warning without a Quire Ink checkout beside this one
dev/up.sh             # WordPress on http://localhost:8098, admin / admin
tools/shot.sh <url> .tmp/shots/<name>.png
```

`check:all` cannot see a misplaced stroke or an invisible button in the dark scheme: **open the editor and look.**
Measure the writing screen: open a post in Quire Ink and run, at **1440, 1024 and 600**:

```js
eval( await ( await fetch( '/qi-tools/screen-audit.js?t=' + Date.now(), { cache: 'no-store' } ) ).text() )
```

It checks one column with two edges, the gap ladder from `--quireink-*`, no clipped key, no sideways scroll,
contrast, target sizes, a visible focus rule. `shot.sh` is a fresh headless Chrome: to shoot the dark scheme set
`quireink_default_scheme` as a theme mod and put it back. Use `localhost:8098`, never `127.0.0.1` (CORS drops the
fonts silently). Port 8098, not 8099 (the theme's).

## Read first

| Doing | Read |
|---|---|
| Anything at all | [`docs/invariants.md`](./docs/invariants.md) — the 7 load-bearing rules |
| Finding your way | [`docs/README.md`](./docs/README.md) — the index |
| Anything that touches the theme, or could | [`docs/pair.md`](./docs/pair.md) — generated; edit the master |
| Touching the ink, a colour, a stroke | [`docs/conventions/extract.md`](./docs/conventions/extract.md) |
| **Quire Ink just released a new version** | [`docs/conventions/extract.md`](./docs/conventions/extract.md) — one command, three lines of reading |
| Touching PHP | [`docs/conventions/php.md`](./docs/conventions/php.md) |
| Touching the editor JS | [`docs/conventions/editor.md`](./docs/conventions/editor.md) |
| Going against a past decision | [`docs/decisions/`](./docs/decisions/README.md) — the in-force index first |
| Wondering what does not survive the trip | [`docs/gaps.md`](./docs/gaps.md) |

## Hard rules — each one is a bug that has already shipped in a sibling repository

- **Quire Ink is READ ONLY.** `../quireink` is a released product with production instances. Read it with ABSOLUTE
  paths and never `cd` into it: the shell keeps its working directory, so a later write lands in the wrong repository.
  Copying OUT is the job.
- **A note upstream saying "this belongs here" is a NOTE, not an assignment.** Report it.
- **Never hand-copy a value out of the blog engine.** The ink comes through `tools/extract.ts` or it does not come.
- **Never require the theme, and never name it in a rule.** Every `var(--…)` carries a fallback. `check:standalone` refuses the rest.
- **The markup is not ours.** `<mark data-pen>`, `<u data-pen>`, `<mark data-form="o">` belong to the engine's
  `../quireink/docs/pen.md` (ADR 0048). Emit exactly that; inventing an attribute means one stylesheet stops drawing both surfaces.
- **One implementation of the seed hash, AND ONE ARGUMENT.** It picks which of 80 strokes a mark gets. The engine hashes
  `node.raw` — the gesture's whole Markdown source, fences and `#colour` included — folded by the length of what is
  INSIDE the fences. `check:contract` probes the 28-character boundary.
- **Everything printed is escaped** at the point of printing. `phpcs:ignore` needs a reason.
- **Everything global is prefixed `quireink_`.** A plugin shares a namespace with every other plugin and the theme.
- **Never quote the owner** — not in code, comments, docs, ADRs or commit messages. State the fact or the measurement.
- **Build the authoring side first, or ship neither.** Markup nobody can author in the block editor is not shipped.

## Danger zones

- **`assets/css/quireink-pen.css`, `assets/css/quireink-editor.css` and `assets/js/quireink-engine.js` are GENERATED.**
  Editing them is pointless: the next extract overwrites it and `check:generated` is red until it does.
- **Size budget: 44,000 B gzip** for the sheet, enforced by `check:filesize`.
- **`dev/` throws its database away.** `dev/down.sh` is `docker compose down -v`.
- **All scratch goes under `.tmp/`** — one gitignored root, never a new one.

Find a file or a symptom: [`MAP.md`](./MAP.md). Why a rule exists: [`HISTORY.md`](./HISTORY.md).
