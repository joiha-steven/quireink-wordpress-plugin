# Quire Ink Pen for WordPress

Three buttons in the block editor toolbar: **highlight**, **underline**, **ring**. Not
rectangles — eighty hand-drawn strokes, and which one a mark gets is decided by the words
themselves, so no two marks on a page are the same shape.

The strokes come from [Quire Ink](https://quireink.com), a blog engine, where they were drawn
from a photographed highlighter box: five inks, plus a pencil and a red ballpoint.

```
quire-ink-pen/        the plugin, as wordpress.org receives it
docs/                 invariants, decisions, conventions, the pairing contract
tools/                the extractor and the nine guards
dev/                  a local WordPress on :8098
```

## It works with any theme

The plugin adds no layout, no typography and no colour of its own. Every stroke is sized and
positioned in `em` against the text it marks, so it takes the host theme's type as it finds it.
That is why it fits Twenty Twenty-Five and a Quire Ink equally, with no coordination at all.

**It does not need, and does not install, anything else.** Installed alongside
[the Quire Ink theme](https://github.com/joiha-steven/quireink-wordpress-theme) the two are the
whole thing, and neither requires the other — a decision, guarded rather than remembered:
[`docs/pair.md`](./docs/pair.md).

## Build and check

```bash
bun run extract      # regenerate the ink from the Quire Ink checkout beside this one
bun run check:all    # nine guards, seconds
dev/up.sh            # WordPress on http://localhost:8098, admin / admin
```

`check:all` proves the seams hold. It cannot tell you a stroke sits a line too high, or that
the toolbar button is invisible in the editor's dark scheme. **Open the editor and look.**

## Weight

| | |
|---|---:|
| Ink sheet, raw | 534,237 B |
| Ink sheet, gzip | 34,533 B |
| Loaded on a page with no mark | 0 B |

Measured by `check:filesize`, which gzips the sheet on every run. The budget is held
compressed on purpose: a raw byte count would have stayed green on the day a change made the
sheet stop compressing.

## Licence

GPL v2 or later, which is what wordpress.org requires
([ADR 0005](./docs/decisions/0005-gpl-v2-or-later.md)). The blog engine it is generated from is
not GPL; the grant runs one way, through the extractor, and that boundary is why nothing here
is hand-copied.
