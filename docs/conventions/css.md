# CSS

There is one generated sheet and, at most, one hand-written one.

## The generated sheet

`assets/css/quireink-pen.css` comes from [`tools/extract.ts`](../../tools/extract.ts). Do not
edit it. The next extract overwrites it and `check:generated` is red until it does.

Its budget is **compressed**: 44,393 bytes measured, 56 KB ceiling. `check:filesize` gzips it
and compares. A raw byte count would have stayed green on the day a change made the sheet stop
compressing.

## The hand-written sheet

It exists only for what the generated sheet cannot know: where the marks sit on a page this
plugin does not own. It may contain positioning and the fallback wiring. It may not contain:

- a `var(--name)` without a fallback value
- the theme's slug, or any selector only the theme emits
- a colour that is not already coming from the engine or a documented fallback

`check:standalone` refuses all three. Invariant 1 explains why this is a guard and not a
habit: every machine this is developed on has the theme installed, so the failure is invisible
here and immediate on a stranger's site.

## Reading a custom property

The generated sheet defines its own (`--ink-stroke`, `--ink-h`, `--ink-y`, `--u-stroke`,
`--u-h`, `--u-y`, `--o-set`) and reads them back in the same cascade. Those are internal and
need no fallback.

A property the plugin does **not** define is a property the host page may not have, and it is
read with a fallback or not at all:

```css
/* right */
margin-block: var( --wp--style--block-gap, 1.5rem );

/* wrong: collapses to nothing on 99% of WordPress sites */
margin-block: var( --wp--style--block-gap );
```

`check:standalone` implements exactly that test: it collects every property the plugin's own
sheets define, then fails on any `var()` that reads a property outside that set without a
fallback. Anything else would flag the generated sheet's own internals.

## What the pairing is not

It is **not** colour. The ink is stamped into 300 SVG data-URIs; there is not one plain colour
value in the sheet to override. See [`../pair.md`](../pair.md).
