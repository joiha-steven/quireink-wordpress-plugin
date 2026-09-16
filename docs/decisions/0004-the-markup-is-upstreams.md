# 0004 — The markup belongs to the blog engine

**In force.**

## Context

The engine publishes the pen's markup in its `docs/pen.md` under ADR 0048, and serves the
stylesheet that draws it at a stable `/pen.css` with CORS open. That document names a WordPress
theme as an intended consumer. The contract is already public and already has readers.

## Decision

This plugin emits exactly that markup and adds nothing to it:

| Gesture | Markup |
|---|---|
| Highlight | `<mark data-pen="N" [data-ink]>` |
| Underline | `<u data-pen="N" [data-ink]>` |
| Ring | `<mark data-form="o" data-pen="N" [data-ink]>` |

Wrapper class `pen`, dark-page class `dark`, `N` from 0 to 79, chosen by the published hash.

A new attribute, a new element, or a different class name is an upstream decision and is
proposed there, not implemented here.

## Consequences

One stylesheet draws a Quire Ink post and a WordPress post identically, which is what makes
the pen the same instrument on both rather than two things that look similar.

A post written here keeps its marks if its author later moves to the blog engine, and the
reverse. Neither direction needs a converter.

`check:contract` reads the engine's `docs/pen.md` when a checkout is present and fails if what
this plugin emits has drifted from what that document describes.
