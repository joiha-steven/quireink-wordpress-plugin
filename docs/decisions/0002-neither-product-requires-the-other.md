# 0002 — The plugin and the theme never require each other

**In force.** This is the product decision; everything else here is engineering.

## Context

Quire Ink reaches WordPress as two downloads. The obvious shape is a theme that supplies the
reading surface and a plugin that supplies the pen, each assuming the other. That shape is
also the reason most theme-plus-plugin pairs are unusable alone, and it would throw away the
only distribution advantage either has: a plugin's audience is every WordPress site, not the
ten running this theme.

The failure is invisible from here. Every machine this is developed on has both installed.

## Decision

Neither product may require the other, at any layer.

- The plugin reads no custom property it does not itself define, except through a fallback.
- No rule in either product names the other's slug or a selector only the other emits.
- `add_theme_support( 'quireink-pen' )` is **consulted**, never required.
- The theme does not ship the ink.

The contract is held in a third, private repository — neither public repo may own it, because
whichever did would be the one the other had to read — and generated down into both as
[`pair.md`](../pair.md).

## Consequences

The plugin ships the engine's five measured inks and they do not change when a theme is
present. That is not a compromise: the colour is stamped into 300 SVG dies, there is no plain
colour value in the sheet to override, and the inks are photographed off a real highlighter box
rather than chosen from a palette.

What makes it fit anywhere is geometry, not coordination. Every stroke is sized in `em` against
the text it marks, so it follows the host theme's type by construction. The pen works on Twenty
Twenty-Five for the same reason it works on a Quire Ink.

`check:standalone` refuses the violations mechanically. It is invariant 1 and the first guard
in `check:all`.

Installing both remains the best experience and is what the readme.txt of each recommends. A
recommendation is not a dependency.
