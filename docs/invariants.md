# Invariants

The load-bearing rules. Break one and nothing crashes — the plugin just quietly stops being
the thing it was copied from, or quietly starts needing something it promised not to need, and
no test goes red.

Each is enforced in ONE place and pinned by a guard, all run by `bun run check:all`. A change
that weakens one updates its guard in the SAME commit, which is what makes the weakening
visible in review.

| # | Rule | Enforced at | Pinned by |
|---|---|---|---|
| 1 | **The plugin renders correctly with no Quire Ink theme present.** It reads no custom property it does not itself define, except through a fallback, and no rule names the theme or a theme-only selector | [`assets/css/`](../quire-ink-pen/assets/css/), [`inc/`](../quire-ink-pen/inc/) | `check:standalone` |
| 2 | **The markup belongs to the blog engine.** `<mark data-pen>`, `<u data-pen>`, `<mark data-form="o">`, wrapper class `pen`, dark class `dark`, variant 0-79. Published in the engine's `docs/pen.md` under ADR 0048 | [`assets/js/formats.js`](../quire-ink-pen/assets/js/formats.js) | `check:contract` |
| 3 | **One implementation of the seed hash, and one argument to it.** It decides which of 80 strokes a mark gets, and it hashes the GESTURE'S SOURCE — `==a phrase==` — not the words inside. Two copies, or one copy called with the wrong string, means two surfaces drawing the same phrase differently | [`assets/js/seed.js`](../quire-ink-pen/assets/js/seed.js) | `check:contract` |
| 4 | **Nothing is hand-copied out of the blog engine.** The ink comes through the extractor or it does not come | [`tools/extract.ts`](../tools/extract.ts) | `check:generated` |
| 5 | **Every value printed into a page is escaped** at the point of printing | every file under [`quire-ink-pen/`](../quire-ink-pen) | `check:escape` |
| 6 | **Everything global is prefixed `quireink_`.** A plugin shares one namespace with the theme and every other plugin on the site | every file under [`quire-ink-pen/`](../quire-ink-pen) | `check:prefix` |
| 7 | **The ink stays inside its compressed budget.** 44 KB gzip measured, 56 KB ceiling | [`assets/css/quireink-pen.css`](../quire-ink-pen/assets/css/), GENERATED | `check:filesize` |

## Why 1 is the first one

It is the product decision, and it is the one that cannot be seen from here.

Every machine this is developed on has the theme installed. Every screenshot is taken with
both active. The failure mode — a mark that is invisible, or grey, or drawn behind its own
text, on the 99% of WordPress sites that run something else — never appears during
development and appears immediately on a stranger's blog. It is the exact shape of a bug that
reaches the directory with five-star local testing behind it.

So it is not a discipline. `check:standalone` reads every stylesheet the plugin ships and
refuses:

- a `var(--name)` reading a property the plugin does not define, with no fallback
- the theme's slug, or a selector only the theme emits, in any rule
- `add_theme_support` being *required* rather than *consulted* in PHP

The rule runs the other way too, and is guarded on the other side: the theme may not name this
plugin, and may not ship the ink. [`pair.md`](./pair.md) carries the whole contract, generated
from a master neither repository owns.

## Why 7 counts compressed bytes

Raw, the pen is 531,446 bytes. Compressed it is 44,393 — measured on
`demo.quireink.com/pen.css`, 2026-09-16. The whole plugin is possible because of the second
number, and a guard reading the first one would have been green on the day a change made the
sheet stop compressing.

There is a second reason to hold it here rather than trust the CDN: page weight is how a
WordPress plugin earns one-star reviews, and the sheet only reaches a page that has a mark on
it. The budget and the conditional enqueue are two halves of one promise.

## Why 3 has a guard at all

Because the engine has the scar. `pen/grammar.ts` there exists as one exported regex SOURCE
read by four parsers, and the comment above it records what happened when two of them spelled
it out separately instead: they drifted within the hour and put the word "green" into every
excerpt on a live site.

The seed hash is smaller than that regex and exactly as load-bearing. It is thirteen lines and
it is tempting to write again in PHP the first time something server-side needs it. The guard
counts implementations and requires one.
